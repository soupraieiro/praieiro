import { useState, useEffect, useCallback } from "react";

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface UseUserGeolocationResult {
  location: UserLocation | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => void;
  isWatching: boolean;
  startWatching: () => void;
  stopWatching: () => void;
}

export function useUserGeolocation(): UseUserGeolocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [isWatching, setIsWatching] = useState(false);

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    setLocation({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
    });
    setLoading(false);
    setError(null);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    let message = "Erro ao obter localização";
    switch (err.code) {
      case err.PERMISSION_DENIED:
        message = "Permissão de localização negada. Ative nas configurações do navegador.";
        break;
      case err.POSITION_UNAVAILABLE:
        message = "Localização indisponível.";
        break;
      case err.TIMEOUT:
        message = "Tempo esgotado ao obter localização.";
        break;
    }
    setError(message);
    setLoading(false);
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocalização não suportada neste navegador.");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    });
  }, [handleSuccess, handleError]);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocalização não suportada neste navegador.");
      return;
    }

    setLoading(true);
    setIsWatching(true);

    const id = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000,
    });

    setWatchId(id);
  }, [handleSuccess, handleError]);

  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setIsWatching(false);
    }
  }, [watchId]);

  // Try to get cached location on mount
  useEffect(() => {
    const cached = localStorage.getItem("user_location");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Check if less than 5 minutes old
        if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          setLocation(parsed);
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Cache location updates
  useEffect(() => {
    if (location) {
      localStorage.setItem("user_location", JSON.stringify(location));
    }
  }, [location]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return {
    location,
    loading,
    error,
    requestLocation,
    isWatching,
    startWatching,
    stopWatching,
  };
}
