import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CaptureEvent {
  event: string;
  distinctId: string;
  properties?: Record<string, unknown>;
}

interface UsePostHogResult {
  capture: (event: string, distinctId: string, properties?: Record<string, unknown>) => Promise<boolean>;
  identify: (distinctId: string, userProperties?: Record<string, unknown>) => Promise<boolean>;
  alias: (distinctId: string, alias: string) => Promise<boolean>;
  getFeatureFlag: (distinctId: string, featureFlag: string) => Promise<{ enabled: boolean; value: unknown } | null>;
  batch: (events: CaptureEvent[]) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

export function usePostHog(): UsePostHogResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(async (
    event: string,
    distinctId: string,
    properties?: Record<string, unknown>
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("posthog-track", {
        body: { action: "capture", event, distinctId, properties },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      return data.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao capturar evento";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const identify = useCallback(async (
    distinctId: string,
    userProperties?: Record<string, unknown>
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("posthog-track", {
        body: { action: "identify", distinctId, userProperties },
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

  const alias = useCallback(async (distinctId: string, aliasId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("posthog-track", {
        body: { action: "alias", distinctId, alias: aliasId },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      return data.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao criar alias";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getFeatureFlag = useCallback(async (
    distinctId: string,
    featureFlag: string
  ): Promise<{ enabled: boolean; value: unknown } | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("posthog-track", {
        body: { action: "feature_flag", distinctId, featureFlag },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      return { enabled: data.enabled, value: data.value };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao buscar feature flag";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const batch = useCallback(async (events: CaptureEvent[]): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("posthog-track", {
        body: { action: "batch", events },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      return data.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro no batch";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    capture,
    identify,
    alias,
    getFeatureFlag,
    batch,
    isLoading,
    error,
  };
}
