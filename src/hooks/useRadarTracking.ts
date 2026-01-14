import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Tipos do Radar SDK
declare global {
  interface Window {
    Radar?: {
      initialize: (publishableKey: string) => void;
      setUserId: (userId: string) => void;
      setDescription: (description: string) => void;
      setMetadata: (metadata: Record<string, string>) => void;
      startTracking: (options: RadarTrackingOptions) => void;
      stopTracking: () => void;
      trackOnce: () => Promise<RadarTrackResult>;
      getLocation: () => Promise<RadarLocation>;
      on: (event: string, callback: (data: unknown) => void) => void;
      off: (event: string, callback: (data: unknown) => void) => void;
    };
  }
}

interface RadarTrackingOptions {
  desiredStoppedUpdateInterval?: number;
  desiredMovingUpdateInterval?: number;
  desiredSyncInterval?: number;
  desiredAccuracy?: "high" | "medium" | "low";
  stopDuration?: number;
  stopDistance?: number;
  sync?: "all" | "stopsAndExits" | "none";
  replay?: "all" | "stops" | "none";
  showBlueBar?: boolean;
}

interface RadarLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number;
  heading?: number;
  altitude?: number;
}

interface RadarTrackResult {
  status: string;
  location: RadarLocation;
  user?: {
    userId: string;
  };
}

export interface ProximityStatus {
  verdict: "APPROVED" | "QR_REQUIRED" | "GEOGRAPHIC_INCONSISTENCY" | "POOR_SIGNAL" | "COORDINATES_REQUIRED" | "CHECKING" | "ERROR" | "IDLE";
  distanceMeters: number;
  clientAccuracy: number;
  vendorAccuracy: number;
  message: string;
  canProceed: boolean;
  requiresQr: boolean;
  lastUpdated: Date | null;
}

interface UseRadarTrackingResult {
  isInitialized: boolean;
  isTracking: boolean;
  currentLocation: RadarLocation | null;
  proximityStatus: ProximityStatus;
  error: string | null;
  startTracking: (userId: string, userType: "client" | "vendor") => Promise<void>;
  stopTracking: () => void;
  checkProximity: (params: CheckProximityParams) => Promise<ProximityStatus>;
  refreshLocation: () => Promise<RadarLocation | null>;
}

interface CheckProximityParams {
  orderId: string;
  vendorLatitude: number;
  vendorLongitude: number;
  vendorAccuracy?: number;
}

const RADAR_SDK_URL = "https://js.radar.io/v4.4.6/radar.min.js";

// Preset de tracking para alta performance
const RESPONSIVE_TRACKING_OPTIONS: RadarTrackingOptions = {
  desiredStoppedUpdateInterval: 30, // 30 segundos parado
  desiredMovingUpdateInterval: 5, // 5 segundos em movimento
  desiredSyncInterval: 10,
  desiredAccuracy: "high",
  stopDuration: 60,
  stopDistance: 50,
  sync: "all",
  replay: "all",
  showBlueBar: true,
};

export function useRadarTracking(): UseRadarTrackingResult {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<RadarLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [proximityStatus, setProximityStatus] = useState<ProximityStatus>({
    verdict: "IDLE",
    distanceMeters: -1,
    clientAccuracy: -1,
    vendorAccuracy: -1,
    message: "Aguardando localização...",
    canProceed: false,
    requiresQr: false,
    lastUpdated: null,
  });

  const publishableKeyRef = useRef<string | null>(null);
  const locationUpdateCallback = useRef<((data: unknown) => void) | null>(null);

  // Load Radar SDK
  useEffect(() => {
    const loadRadarSDK = async () => {
      // Check if already loaded
      if (window.Radar) {
        setIsInitialized(true);
        return;
      }

      // Load script
      const script = document.createElement("script");
      script.src = RADAR_SDK_URL;
      script.async = true;
      
      script.onload = async () => {
        try {
          // Fetch publishable key from backend
          const { data, error: fetchError } = await supabase.functions.invoke("get-radar-key");
          
          if (fetchError || !data?.publishableKey) {
            console.warn("Radar key not available, using fallback tracking");
            return;
          }

          publishableKeyRef.current = data.publishableKey;
          
          if (window.Radar) {
            window.Radar.initialize(data.publishableKey);
            setIsInitialized(true);
            console.log("[Radar] SDK initialized");
          }
        } catch (err) {
          console.error("[Radar] Initialization error:", err);
          setError("Falha ao inicializar Radar SDK");
        }
      };

      script.onerror = () => {
        console.warn("[Radar] Failed to load SDK, using fallback");
      };

      document.head.appendChild(script);
    };

    loadRadarSDK();

    return () => {
      if (window.Radar && locationUpdateCallback.current) {
        window.Radar.off("location", locationUpdateCallback.current);
      }
    };
  }, []);

  // Start tracking with responsive mode
  const startTracking = useCallback(async (userId: string, userType: "client" | "vendor") => {
    if (!window.Radar || !isInitialized) {
      console.warn("[Radar] SDK not ready, using browser geolocation");
      // Fallback to browser geolocation
      startBrowserGeolocation();
      return;
    }

    try {
      // Configure user
      window.Radar.setUserId(userId);
      window.Radar.setDescription(userType === "vendor" ? "Vendedor Praieiro" : "Cliente Praieiro");
      window.Radar.setMetadata({ userType, appVersion: "1.0.0" });

      // Setup location update listener
      locationUpdateCallback.current = (data: unknown) => {
        const trackResult = data as RadarTrackResult;
        if (trackResult.location) {
          setCurrentLocation(trackResult.location);
          console.log("[Radar] Location updated:", trackResult.location);
        }
      };

      window.Radar.on("location", locationUpdateCallback.current);

      // Start responsive tracking
      window.Radar.startTracking(RESPONSIVE_TRACKING_OPTIONS);
      setIsTracking(true);
      console.log("[Radar] Tracking started with responsive mode");

      // Get initial location
      const result = await window.Radar.trackOnce();
      if (result.location) {
        setCurrentLocation(result.location);
      }
    } catch (err) {
      console.error("[Radar] Start tracking error:", err);
      setError("Falha ao iniciar rastreamento");
      // Fallback
      startBrowserGeolocation();
    }
  }, [isInitialized]);

  // Browser geolocation fallback
  const startBrowserGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocalização não suportada");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed || undefined,
          heading: position.coords.heading || undefined,
          altitude: position.coords.altitude || undefined,
        });
        setIsTracking(true);
      },
      (err) => {
        console.error("[Geolocation] Error:", err);
        setError("Erro ao obter localização: " + err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    // Store watchId for cleanup
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (window.Radar) {
      window.Radar.stopTracking();
      if (locationUpdateCallback.current) {
        window.Radar.off("location", locationUpdateCallback.current);
      }
    }
    setIsTracking(false);
    console.log("[Radar] Tracking stopped");
  }, []);

  // Refresh location on demand
  const refreshLocation = useCallback(async (): Promise<RadarLocation | null> => {
    if (window.Radar && isInitialized) {
      try {
        const result = await window.Radar.trackOnce();
        if (result.location) {
          setCurrentLocation(result.location);
          return result.location;
        }
      } catch (err) {
        console.error("[Radar] TrackOnce error:", err);
      }
    }

    // Fallback to browser
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: RadarLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed || undefined,
            heading: position.coords.heading || undefined,
          };
          setCurrentLocation(loc);
          resolve(loc);
        },
        (err) => {
          console.error("[Geolocation] Error:", err);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, [isInitialized]);

  // Check proximity with backend validation
  const checkProximity = useCallback(async (params: CheckProximityParams): Promise<ProximityStatus> => {
    setProximityStatus(prev => ({ ...prev, verdict: "CHECKING", message: "Verificando proximidade..." }));

    // Get fresh location
    const location = await refreshLocation();
    
    if (!location) {
      const status: ProximityStatus = {
        verdict: "COORDINATES_REQUIRED",
        distanceMeters: -1,
        clientAccuracy: -1,
        vendorAccuracy: params.vendorAccuracy || -1,
        message: "Ative o GPS para verificar proximidade",
        canProceed: false,
        requiresQr: false,
        lastUpdated: new Date(),
      };
      setProximityStatus(status);
      return status;
    }

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("validate-proximity-transaction", {
        body: {
          orderId: params.orderId,
          clientLatitude: location.latitude,
          clientLongitude: location.longitude,
          clientAccuracy: location.accuracy,
          vendorLatitude: params.vendorLatitude,
          vendorLongitude: params.vendorLongitude,
          vendorAccuracy: params.vendorAccuracy || 0,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const status: ProximityStatus = {
        verdict: data.verdict,
        distanceMeters: data.distance_meters,
        clientAccuracy: data.client_accuracy,
        vendorAccuracy: data.vendor_accuracy,
        message: data.message,
        canProceed: data.can_proceed,
        requiresQr: data.requires_qr,
        lastUpdated: new Date(),
      };

      setProximityStatus(status);
      return status;
    } catch (err) {
      console.error("[Proximity] Check error:", err);
      const status: ProximityStatus = {
        verdict: "ERROR",
        distanceMeters: -1,
        clientAccuracy: location.accuracy,
        vendorAccuracy: params.vendorAccuracy || -1,
        message: err instanceof Error ? err.message : "Erro ao verificar proximidade",
        canProceed: false,
        requiresQr: false,
        lastUpdated: new Date(),
      };
      setProximityStatus(status);
      return status;
    }
  }, [refreshLocation]);

  return {
    isInitialized,
    isTracking,
    currentLocation,
    proximityStatus,
    error,
    startTracking,
    stopTracking,
    checkProximity,
    refreshLocation,
  };
}
