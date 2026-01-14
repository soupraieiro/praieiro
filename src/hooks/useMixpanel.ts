import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TrackEvent {
  name: string;
  properties?: Record<string, unknown>;
  distinctId?: string;
}

interface UseMixpanelResult {
  track: (events: TrackEvent[]) => Promise<boolean>;
  trackSingle: (eventName: string, properties?: Record<string, unknown>) => Promise<boolean>;
  identify: (userId: string, profileData?: Record<string, unknown>) => Promise<boolean>;
  setProfile: (userId: string, profileData: Record<string, unknown>) => Promise<boolean>;
  increment: (userId: string, properties: Record<string, number>) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

export function useMixpanel(): UseMixpanelResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const track = useCallback(async (events: TrackEvent[]): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("mixpanel-track", {
        body: { action: "track", events },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      return data.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao rastrear evento";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const trackSingle = useCallback(async (
    eventName: string,
    properties?: Record<string, unknown>
  ): Promise<boolean> => {
    return track([{ name: eventName, properties }]);
  }, [track]);

  const identify = useCallback(async (
    userId: string,
    profileData?: Record<string, unknown>
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("mixpanel-track", {
        body: { action: "identify", userId, profileData },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      return data.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao identificar usuário";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setProfile = useCallback(async (
    userId: string,
    profileData: Record<string, unknown>
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("mixpanel-track", {
        body: { action: "profile_set", userId, profileData },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      return data.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao atualizar perfil";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const increment = useCallback(async (
    userId: string,
    properties: Record<string, number>
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("mixpanel-track", {
        body: { action: "increment", userId, properties },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      return data.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao incrementar";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    track,
    trackSingle,
    identify,
    setProfile,
    increment,
    isLoading,
    error,
  };
}
