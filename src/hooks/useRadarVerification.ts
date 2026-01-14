import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RadarVerificationResult {
  verified: boolean;
  fraud_passed: boolean;
  fraud_score: number;
  fraud_flags: string[];
  distance: {
    geodesic_meters: number;
    walking_meters: number;
    walking_duration_seconds: number;
    walking_duration_text: string | null;
  };
  verified_at: string;
  provider: string;
  recommendation: "allow" | "review" | "block";
}

interface UseRadarVerificationResult {
  verifyWithRadar: (params: VerifyParams) => Promise<RadarVerificationResult | null>;
  isVerifying: boolean;
  error: string | null;
  lastResult: RadarVerificationResult | null;
}

interface VerifyParams {
  orderId: string;
  clientLatitude: number;
  clientLongitude: number;
  vendorLatitude: number;
  vendorLongitude: number;
  deviceId?: string;
  verifyFraud?: boolean;
}

/**
 * Hook para verificar localização e detectar fraude GPS via Radar.com
 * Oferece geofencing profissional e detecção de spoofing
 */
export function useRadarVerification(): UseRadarVerificationResult {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<RadarVerificationResult | null>(null);

  const verifyWithRadar = useCallback(async (params: VerifyParams): Promise<RadarVerificationResult | null> => {
    setIsVerifying(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("radar-verify", {
        body: {
          orderId: params.orderId,
          clientLatitude: params.clientLatitude,
          clientLongitude: params.clientLongitude,
          vendorLatitude: params.vendorLatitude,
          vendorLongitude: params.vendorLongitude,
          deviceId: params.deviceId,
          verifyFraud: params.verifyFraud ?? true,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const result = data as RadarVerificationResult;
      setLastResult(result);
      return result;
    } catch (err) {
      console.error("Erro na verificação Radar:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      return null;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  return {
    verifyWithRadar,
    isVerifying,
    error,
    lastResult,
  };
}

// Descrição das flags de fraude
export const fraudFlagDescriptions: Record<string, string> = {
  proxy_detected: "Conexão via proxy/VPN detectada",
  location_mocked: "Localização falsa detectada (GPS spoofing)",
  device_compromised: "Dispositivo comprometido (root/jailbreak)",
  location_jumped: "Salto impossível de localização",
  location_sharing: "Compartilhamento de localização detectado",
  location_inaccurate: "Localização imprecisa ou inválida",
};

// Cores e ícones para recomendações
export const recommendationStyles = {
  allow: {
    color: "text-green-600",
    bgColor: "bg-green-100",
    icon: "✓",
    label: "Aprovado",
  },
  review: {
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    icon: "⚠",
    label: "Revisar",
  },
  block: {
    color: "text-red-600",
    bgColor: "bg-red-100",
    icon: "✕",
    label: "Bloqueado",
  },
};
