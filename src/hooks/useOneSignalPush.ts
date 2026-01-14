import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseOneSignalPushResult {
  isInitialized: boolean;
  playerId: string | null;
  permission: NotificationPermission | null;
  initialize: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
  updateLocation: (latitude: number, longitude: number) => Promise<void>;
  error: string | null;
}

declare global {
  interface Window {
    OneSignal?: any;
  }
}

/**
 * Hook para integração com OneSignal Push Notifications
 * Suporta notificações geolocalizadas
 */
export function useOneSignalPush(): UseOneSignalPushResult {
  const [isInitialized, setIsInitialized] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initialize = useCallback(async () => {
    if (isInitialized || typeof window === 'undefined') return;

    try {
      // Fetch app ID from edge function
      const { data, error: invokeError } = await supabase.functions.invoke("onesignal-push", {
        body: { action: "get_app_info" },
      });

      if (invokeError || data?.error) {
        throw new Error(invokeError?.message || data?.error || "Failed to get OneSignal config");
      }

      const appId = data.appId;

      // Load OneSignal SDK
      if (!window.OneSignal) {
        const script = document.createElement('script');
        script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
        script.async = true;
        
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load OneSignal SDK"));
          document.head.appendChild(script);
        });
      }

      // Initialize OneSignal
      await window.OneSignal.init({
        appId,
        allowLocalhostAsSecureOrigin: true,
        notifyButton: {
          enable: false, // We'll use custom UI
        },
      });

      setIsInitialized(true);

      // Check permission status
      const permissionStatus = await window.OneSignal.Notifications.permission;
      setPermission(permissionStatus ? 'granted' : 'default');

      // Get player ID if subscribed
      if (permissionStatus) {
        const id = await window.OneSignal.User.PushSubscription.id;
        setPlayerId(id);
      }

      console.log("[OneSignal] Initialized successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "OneSignal initialization failed";
      setError(errorMessage);
      console.error("[OneSignal] Error:", err);
    }
  }, [isInitialized]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isInitialized || !window.OneSignal) {
      await initialize();
    }

    try {
      await window.OneSignal.Notifications.requestPermission();
      
      const permissionStatus = await window.OneSignal.Notifications.permission;
      setPermission(permissionStatus ? 'granted' : 'denied');

      if (permissionStatus) {
        const id = await window.OneSignal.User.PushSubscription.id;
        setPlayerId(id);
        return true;
      }

      return false;
    } catch (err) {
      console.error("[OneSignal] Permission request failed:", err);
      return false;
    }
  }, [isInitialized, initialize]);

  const updateLocation = useCallback(async (latitude: number, longitude: number) => {
    if (!playerId) {
      console.warn("[OneSignal] Cannot update location: no player ID");
      return;
    }

    try {
      await supabase.functions.invoke("onesignal-push", {
        body: {
          action: "register_location",
          playerId,
          latitude,
          longitude,
        },
      });

      console.log("[OneSignal] Location updated");
    } catch (err) {
      console.error("[OneSignal] Failed to update location:", err);
    }
  }, [playerId]);

  // Auto-initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    isInitialized,
    playerId,
    permission,
    initialize,
    requestPermission,
    updateLocation,
    error,
  };
}

/**
 * Envia uma notificação geolocalizada para usuários próximos
 */
export async function sendGeoNotification(params: {
  title: string;
  message: string;
  latitude: number;
  longitude: number;
  beachName: string;
  radius?: number;
}) {
  const { data, error } = await supabase.functions.invoke("onesignal-push", {
    body: {
      action: "send_geo_notification",
      title: params.title,
      message: params.message,
      location: {
        latitude: params.latitude,
        longitude: params.longitude,
        beachName: params.beachName,
      },
      radius: params.radius || 500,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
