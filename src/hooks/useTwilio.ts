import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SendResult {
  success: boolean;
  sid: string;
  status: string;
  to: string;
  dateCreated: string;
}

interface UseTwilioResult {
  sendSMS: (to: string, message: string) => Promise<SendResult | null>;
  sendWhatsApp: (to: string, message: string) => Promise<SendResult | null>;
  startVerification: (phoneNumber: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

export function useTwilio(): UseTwilioResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendSMS = useCallback(async (to: string, message: string): Promise<SendResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("twilio-sms", {
        body: { action: "send_sms", to, message },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao enviar SMS";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendWhatsApp = useCallback(async (to: string, message: string): Promise<SendResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("twilio-sms", {
        body: { action: "send_whatsapp", to, message },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao enviar WhatsApp";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startVerification = useCallback(async (phoneNumber: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("twilio-sms", {
        body: { action: "verify_start", to: phoneNumber },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      return data.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao iniciar verificação";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    sendSMS,
    sendWhatsApp,
    startVerification,
    isLoading,
    error,
  };
}
