import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProximityResult {
  is_valid: boolean;
  distance_meters: number;
  effective_margin: number;
  max_allowed: number;
  client_accuracy: number;
  vendor_accuracy: number;
  location_auth_hash: string;
  verified_at: string;
  message: string;
}

interface UseProximityVerificationResult {
  verifyProximity: (params: VerifyParams) => Promise<ProximityResult | null>;
  isVerifying: boolean;
  error: string | null;
  lastResult: ProximityResult | null;
}

interface VerifyParams {
  orderId: string;
  clientLat: number;
  clientLng: number;
  clientAccuracy?: number;
  vendorLat: number;
  vendorLng: number;
  vendorAccuracy?: number;
  maxDistanceMeters?: number;
}

/**
 * Hook para verificar proximidade entre cliente e vendedor
 * Implementa a blindagem geo-financeira do Praieiro
 */
export function useProximityVerification(): UseProximityVerificationResult {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ProximityResult | null>(null);

  const verifyProximity = useCallback(async (params: VerifyParams): Promise<ProximityResult | null> => {
    setIsVerifying(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc("verify_transaction_proximity", {
        p_order_id: params.orderId,
        p_client_lat: params.clientLat,
        p_client_lng: params.clientLng,
        p_client_accuracy: params.clientAccuracy ?? 0,
        p_vendor_lat: params.vendorLat,
        p_vendor_lng: params.vendorLng,
        p_vendor_accuracy: params.vendorAccuracy ?? 0,
        p_max_distance_meters: params.maxDistanceMeters ?? 30,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      const result = data as unknown as ProximityResult;
      setLastResult(result);
      return result;
    } catch (err) {
      console.error("Erro na verificação de proximidade:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      return null;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  return {
    verifyProximity,
    isVerifying,
    error,
    lastResult,
  };
}

// Utilitário para calcular distância Vincenty no frontend (para preview)
export function calculateVincentyDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const a = 6378137.0; // WGS-84 semi-major axis
  const f = 1 / 298.257223563; // WGS-84 flattening
  const b = 6356752.314245; // WGS-84 semi-minor axis

  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const L = ((lon2 - lon1) * Math.PI) / 180;

  const U1 = Math.atan((1 - f) * Math.tan(phi1));
  const U2 = Math.atan((1 - f) * Math.tan(phi2));

  const sinU1 = Math.sin(U1);
  const cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2);
  const cosU2 = Math.cos(U2);

  let lambda = L;
  let lambdaP = 2 * Math.PI;
  let iterLimit = 100;

  let sinLambda, cosLambda, sinSigma, cosSigma, sigma;
  let sinAlpha, cosSqAlpha, cos2SigmaM;

  while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0) {
    sinLambda = Math.sin(lambda);
    cosLambda = Math.cos(lambda);
    sinSigma = Math.sqrt(
      Math.pow(cosU2 * sinLambda, 2) +
        Math.pow(cosU1 * sinU2 - sinU1 * cosU2 * cosLambda, 2)
    );

    if (sinSigma === 0) return 0; // Coincident points

    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    sigma = Math.atan2(sinSigma, cosSigma);

    sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
    cosSqAlpha = 1 - sinAlpha * sinAlpha;

    cos2SigmaM = cosSqAlpha !== 0 ? cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha : 0;

    const C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));

    lambdaP = lambda;
    lambda =
      L +
      (1 - C) *
        f *
        sinAlpha *
        (sigma +
          C *
            sinSigma *
            (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
  }

  if (iterLimit === 0) return NaN; // Formula failed to converge

  const uSq = (cosSqAlpha! * (a * a - b * b)) / (b * b);
  const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));

  const deltaSigma =
    B *
    sinSigma! *
    (cos2SigmaM! +
      (B / 4) *
        (cosSigma! * (-1 + 2 * cos2SigmaM! * cos2SigmaM!) -
          (B / 6) *
            cos2SigmaM! *
            (-3 + 4 * sinSigma! * sinSigma!) *
            (-3 + 4 * cos2SigmaM! * cos2SigmaM!)));

  return b * A * (sigma! - deltaSigma);
}

// Formatar distância para exibição
export function formatDistance(meters: number): string {
  if (meters < 1) {
    return "< 1m";
  }
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}
