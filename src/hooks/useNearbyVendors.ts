import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface NearbyVendor {
  profile_id: string;
  distance_meters: number;
  full_name: string;
  email: string;
  phone: string | null;
  product_category: string;
  whatsapp_number: string;
  profile_photo_url: string | null;
}

interface UseNearbyVendorsResult {
  vendors: NearbyVendor[];
  isLoading: boolean;
  error: Error | null;
  fetchNearbyVendors: (lat: number, lng: number, radiusMeters?: number) => Promise<void>;
  lastFetchedAt: number | null;
}

/**
 * Hook para buscar vendedores próximos usando a função RPC find_nearby_vendors
 * 
 * IMPORTANTE: Este hook NÃO utiliza cache para garantir dados SEMPRE em tempo real.
 * A distância do vendedor deve ser sempre precisa e atualizada.
 * 
 * Utiliza índice GIST para busca geográfica otimizada
 */
export function useNearbyVendors(): UseNearbyVendorsResult {
  const [vendors, setVendors] = useState<NearbyVendor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  
  // Ref para evitar race conditions, mas SEM cache
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchNearbyVendors = useCallback(
    async (lat: number, lng: number, radiusMeters: number = 5000) => {
      // Cancelar requisição anterior se existir
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      // Log para debug - mostra que NÃO está usando cache
      console.log("[useNearbyVendors] Buscando vendedores em tempo real (sem cache)", {
        lat,
        lng,
        radiusMeters,
        timestamp: new Date().toISOString(),
      });

      try {
        // Busca DIRETA no banco - sem cache intermediário
        const { data, error: rpcError } = await supabase.rpc("find_nearby_vendors", {
          p_lat: lat,
          p_lng: lng,
          p_radius_meters: radiusMeters,
        });

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        const vendorData = (data as NearbyVendor[]) || [];
        
        // Log das distâncias para verificação
        console.log("[useNearbyVendors] Vendedores encontrados:", 
          vendorData.map(v => ({
            name: v.full_name,
            distance: `${v.distance_meters.toFixed(1)}m`,
          }))
        );

        setVendors(vendorData);
        setLastFetchedAt(Date.now());
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          console.log("[useNearbyVendors] Requisição cancelada");
          return;
        }
        console.error("[useNearbyVendors] Erro ao buscar vendedores:", err);
        setError(err instanceof Error ? err : new Error("Erro desconhecido"));
        setVendors([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    vendors,
    isLoading,
    error,
    fetchNearbyVendors,
    lastFetchedAt,
  };
}
