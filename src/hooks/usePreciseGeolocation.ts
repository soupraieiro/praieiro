import { useState, useCallback, useRef, useEffect } from "react";

export interface PreciseLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  source: "gps" | "wifi" | "cellular" | "fused";
}

interface KalmanState {
  x: number; // latitude estimate
  y: number; // longitude estimate
  vx: number; // latitude velocity
  vy: number; // longitude velocity
  p: number; // error covariance
}

interface DeadReckoningState {
  lastUpdate: number;
  predictedLat: number;
  predictedLng: number;
}

interface UsePreciseGeolocationResult {
  location: PreciseLocation | null;
  predictedLocation: { latitude: number; longitude: number } | null;
  isWatching: boolean;
  error: string | null;
  accuracy: "high" | "medium" | "low" | null;
  startWatching: () => void;
  stopWatching: () => void;
  getCurrentPosition: () => Promise<PreciseLocation | null>;
}

// Kalman Filter implementation for GPS smoothing
class KalmanFilter {
  private state: KalmanState | null = null;
  private readonly processNoise = 0.0001; // Process noise
  private readonly measurementNoise = 10; // Measurement noise (meters)

  update(lat: number, lng: number, accuracy: number): { lat: number; lng: number } {
    if (!this.state) {
      this.state = {
        x: lat,
        y: lng,
        vx: 0,
        vy: 0,
        p: accuracy * accuracy,
      };
      return { lat, lng };
    }

    // Predict step
    const dt = 1; // Time step (assume 1 second)
    const predictedX = this.state.x + this.state.vx * dt;
    const predictedY = this.state.y + this.state.vy * dt;
    const predictedP = this.state.p + this.processNoise;

    // Update step
    const r = accuracy * accuracy; // Measurement variance
    const k = predictedP / (predictedP + r); // Kalman gain

    const newX = predictedX + k * (lat - predictedX);
    const newY = predictedY + k * (lng - predictedY);
    const newP = (1 - k) * predictedP;

    // Update velocity estimate
    this.state.vx = (newX - this.state.x) / dt;
    this.state.vy = (newY - this.state.y) / dt;
    this.state.x = newX;
    this.state.y = newY;
    this.state.p = newP;

    return { lat: newX, lng: newY };
  }

  reset(): void {
    this.state = null;
  }
}

// Dead Reckoning for visual interpolation
function predictPosition(
  lastLat: number,
  lastLng: number,
  heading: number | null,
  speed: number | null,
  elapsedMs: number
): { lat: number; lng: number } {
  if (heading === null || speed === null || speed < 0.1) {
    return { lat: lastLat, lng: lastLng };
  }

  const elapsedSec = elapsedMs / 1000;
  const distance = speed * elapsedSec;

  // Convert heading to radians (heading is in degrees, 0 = north)
  const headingRad = (heading * Math.PI) / 180;

  // Calculate displacement
  const dLat = (distance * Math.cos(headingRad)) / 111320; // meters to degrees lat
  const dLng =
    (distance * Math.sin(headingRad)) /
    (111320 * Math.cos((lastLat * Math.PI) / 180)); // meters to degrees lng

  return {
    lat: lastLat + dLat,
    lng: lastLng + dLng,
  };
}

function determineSource(coords: GeolocationCoordinates): PreciseLocation["source"] {
  if (coords.accuracy <= 5) return "gps";
  if (coords.accuracy <= 20) return "fused";
  if (coords.accuracy <= 50) return "wifi";
  return "cellular";
}

function getAccuracyLevel(accuracy: number): "high" | "medium" | "low" {
  if (accuracy <= 10) return "high";
  if (accuracy <= 30) return "medium";
  return "low";
}

export function usePreciseGeolocation(): UsePreciseGeolocationResult {
  const [location, setLocation] = useState<PreciseLocation | null>(null);
  const [predictedLocation, setPredictedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<"high" | "medium" | "low" | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const kalmanFilterRef = useRef<KalmanFilter>(new KalmanFilter());
  const deadReckoningRef = useRef<DeadReckoningState | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Dead Reckoning animation loop
  const updatePredictedPosition = useCallback(() => {
    if (!location || !deadReckoningRef.current) {
      animationFrameRef.current = requestAnimationFrame(updatePredictedPosition);
      return;
    }

    const now = Date.now();
    const elapsed = now - deadReckoningRef.current.lastUpdate;

    if (elapsed > 0 && elapsed < 5000) {
      const predicted = predictPosition(
        location.latitude,
        location.longitude,
        location.heading,
        location.speed,
        elapsed
      );
      setPredictedLocation({ latitude: predicted.lat, longitude: predicted.lng });
    }

    animationFrameRef.current = requestAnimationFrame(updatePredictedPosition);
  }, [location]);

  // Start dead reckoning loop when watching
  useEffect(() => {
    if (isWatching) {
      animationFrameRef.current = requestAnimationFrame(updatePredictedPosition);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isWatching, updatePredictedPosition]);

  const processPosition = useCallback((position: GeolocationPosition): PreciseLocation | null => {
    const coords = position.coords;

    // Reject low-accuracy readings (>50m) - Kalman filter threshold
    if (coords.accuracy > 50) {
      console.warn(`[GeoLocation] Rejecting low accuracy reading: ${coords.accuracy}m`);
      return null;
    }

    // Apply Kalman filter
    const filtered = kalmanFilterRef.current.update(
      coords.latitude,
      coords.longitude,
      coords.accuracy
    );

    const processedLocation: PreciseLocation = {
      latitude: filtered.lat,
      longitude: filtered.lng,
      accuracy: coords.accuracy,
      altitude: coords.altitude,
      altitudeAccuracy: coords.altitudeAccuracy,
      heading: coords.heading,
      speed: coords.speed,
      timestamp: position.timestamp,
      source: determineSource(coords),
    };

    return processedLocation;
  }, []);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocalização não suportada neste navegador");
      return;
    }

    setIsWatching(true);
    setError(null);
    kalmanFilterRef.current.reset();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const processed = processPosition(position);
        if (processed) {
          setLocation(processed);
          setAccuracy(getAccuracyLevel(processed.accuracy));
          deadReckoningRef.current = {
            lastUpdate: Date.now(),
            predictedLat: processed.latitude,
            predictedLng: processed.longitude,
          };
        }
      },
      (err) => {
        console.error("[GeoLocation] Error:", err);
        if (err.code === err.PERMISSION_DENIED) {
          setError("Permissão de localização negada");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError("Localização indisponível");
        } else if (err.code === err.TIMEOUT) {
          setError("Tempo esgotado obtendo localização");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [processPosition]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsWatching(false);
    kalmanFilterRef.current.reset();
    deadReckoningRef.current = null;
    setPredictedLocation(null);
  }, []);

  const getCurrentPosition = useCallback(async (): Promise<PreciseLocation | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setError("Geolocalização não suportada");
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const processed = processPosition(position);
          if (processed) {
            setLocation(processed);
            setAccuracy(getAccuracyLevel(processed.accuracy));
          }
          resolve(processed);
        },
        (err) => {
          console.error("[GeoLocation] Error:", err);
          setError(err.message);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  }, [processPosition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWatching();
    };
  }, [stopWatching]);

  return {
    location,
    predictedLocation,
    isWatching,
    error,
    accuracy,
    startWatching,
    stopWatching,
    getCurrentPosition,
  };
}
