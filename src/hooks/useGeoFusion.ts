/**
 * HOOK DE FUSÃO GEOGRÁFICA - 4 FONTES SIMULTÂNEAS
 * 
 * Implementa a Matriz de Georreferenciamento do Praieiro:
 * 1. Leaflet.js + OpenStreetMap (motor visual principal)
 * 2. Mapbox API (alta performance + tráfego)
 * 3. Photon API (Komoot) - geocoding sem latência de chave
 * 4. IP-API - fallback quando GPS falha
 * 
 * Princípio: Race condition - a resposta mais rápida E precisa vence
 * Axioma: Soberania do Usuário sobre sua localização
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GeoSource {
  name: string;
  lat: number;
  lng: number;
  accuracy: number;
  latency_ms: number;
  address?: string;
  city?: string;
  country?: string;
}

export interface FusionResult {
  best_source: GeoSource;
  all_sources: GeoSource[];
  fusion_strategy: string;
  total_latency_ms: number;
  consensus: boolean;
  consensus_score: number;
  satoshi_hash: string;
}

export interface UseGeoFusionResult {
  // Ações principais
  searchLocation: (query: string, options?: SearchOptions) => Promise<FusionResult | null>;
  reverseGeocode: (lat: number, lng: number) => Promise<FusionResult | null>;
  getIPFallback: () => Promise<FusionResult | null>;
  fusionSearch: (query: string, lat?: number, lng?: number) => Promise<FusionResult | null>;
  
  // Estado
  isSearching: boolean;
  lastResult: FusionResult | null;
  error: string | null;
  
  // Navegador GPS
  browserLocation: GeolocationPosition | null;
  requestBrowserLocation: () => void;
  isBrowserLocationLoading: boolean;
  
  // Métricas
  sourceMetrics: Map<string, { avgLatency: number; successRate: number; totalCalls: number }>;
}

interface SearchOptions {
  strategy?: 'fastest' | 'most_accurate' | 'consensus' | 'priority';
  lat?: number;
  lng?: number;
  timeout?: number;
}

// Métricas por fonte
const sourceMetricsMap = new Map<string, { totalLatency: number; successCount: number; failCount: number }>();

export function useGeoFusion(): UseGeoFusionResult {
  const [isSearching, setIsSearching] = useState(false);
  const [lastResult, setLastResult] = useState<FusionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [browserLocation, setBrowserLocation] = useState<GeolocationPosition | null>(null);
  const [isBrowserLocationLoading, setIsBrowserLocationLoading] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const locationWatchIdRef = useRef<number | null>(null);

  // Atualizar métricas
  const updateMetrics = useCallback((source: string, latency: number, success: boolean) => {
    const current = sourceMetricsMap.get(source) || { totalLatency: 0, successCount: 0, failCount: 0 };
    current.totalLatency += latency;
    if (success) {
      current.successCount++;
    } else {
      current.failCount++;
    }
    sourceMetricsMap.set(source, current);
  }, []);

  // Obter métricas formatadas
  const getSourceMetrics = useCallback(() => {
    const metrics = new Map<string, { avgLatency: number; successRate: number; totalCalls: number }>();
    sourceMetricsMap.forEach((value, key) => {
      const total = value.successCount + value.failCount;
      metrics.set(key, {
        avgLatency: total > 0 ? Math.round(value.totalLatency / total) : 0,
        successRate: total > 0 ? (value.successCount / total) * 100 : 0,
        totalCalls: total
      });
    });
    return metrics;
  }, []);

  /**
   * Busca de localização via fusão de fontes
   */
  const searchLocation = useCallback(async (
    query: string, 
    options: SearchOptions = {}
  ): Promise<FusionResult | null> => {
    if (query.length < 2) return null;

    // Cancelar busca anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsSearching(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('geo-fusion', {
        body: {
          action: 'search',
          query: `${query} Salvador Bahia Brasil`,
          lat: options.lat || browserLocation?.coords.latitude,
          lng: options.lng || browserLocation?.coords.longitude,
          strategy: options.strategy || 'priority'
        }
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.best_source) throw new Error('Nenhum resultado encontrado');

      const result = data as FusionResult;
      
      // Atualizar métricas
      result.all_sources.forEach(source => {
        updateMetrics(source.name, source.latency_ms, true);
      });

      setLastResult(result);
      return result;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro na busca geográfica';
      setError(message);
      console.error('[GEO-FUSION] Search error:', err);
      return null;
    } finally {
      setIsSearching(false);
    }
  }, [browserLocation, updateMetrics]);

  /**
   * Geocoding reverso: Coordenadas → Endereço
   */
  const reverseGeocode = useCallback(async (
    lat: number, 
    lng: number
  ): Promise<FusionResult | null> => {
    setIsSearching(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('geo-fusion', {
        body: {
          action: 'reverse',
          lat,
          lng,
          strategy: 'fastest'
        }
      });

      if (fnError) throw new Error(fnError.message);
      
      const result = data as FusionResult;
      setLastResult(result);
      return result;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro no geocoding reverso';
      setError(message);
      return null;
    } finally {
      setIsSearching(false);
    }
  }, []);

  /**
   * Fallback via IP quando GPS falha
   */
  const getIPFallback = useCallback(async (): Promise<FusionResult | null> => {
    setIsSearching(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('geo-fusion', {
        body: {
          action: 'ip_fallback',
          strategy: 'priority'
        }
      });

      if (fnError) throw new Error(fnError.message);
      
      const result = data as FusionResult;
      setLastResult(result);
      
      console.log('[GEO-FUSION] IP fallback successful:', result.best_source.city);
      return result;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro no fallback via IP';
      setError(message);
      return null;
    } finally {
      setIsSearching(false);
    }
  }, []);

  /**
   * Fusão completa: Query + GPS + IP (todas as 4 fontes)
   */
  const fusionSearch = useCallback(async (
    query: string,
    lat?: number,
    lng?: number
  ): Promise<FusionResult | null> => {
    setIsSearching(true);
    setError(null);

    try {
      // Se não tiver coordenadas, tentar do browser ou IP
      let finalLat = lat || browserLocation?.coords.latitude;
      let finalLng = lng || browserLocation?.coords.longitude;

      if (!finalLat || !finalLng) {
        // Tentar IP fallback primeiro
        const ipResult = await getIPFallback();
        if (ipResult) {
          finalLat = ipResult.best_source.lat;
          finalLng = ipResult.best_source.lng;
        }
      }

      const { data, error: fnError } = await supabase.functions.invoke('geo-fusion', {
        body: {
          action: 'multi_source',
          query: `${query} Salvador Bahia Brasil`,
          lat: finalLat,
          lng: finalLng,
          strategy: 'consensus'
        }
      });

      if (fnError) throw new Error(fnError.message);
      
      const result = data as FusionResult;
      
      // Log de consenso
      console.log('[GEO-FUSION] Fusion result:', {
        sources: result.all_sources.length,
        consensus: result.consensus,
        score: result.consensus_score,
        best: result.best_source.name
      });

      setLastResult(result);
      return result;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro na fusão multi-fonte';
      setError(message);
      return null;
    } finally {
      setIsSearching(false);
    }
  }, [browserLocation, getIPFallback]);

  /**
   * Solicitar localização do navegador
   */
  const requestBrowserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada neste navegador');
      // Fallback para IP
      getIPFallback();
      return;
    }

    setIsBrowserLocationLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBrowserLocation(position);
        setIsBrowserLocationLoading(false);
        console.log('[GEO-FUSION] Browser location:', position.coords);
      },
      async (geoError) => {
        console.warn('[GEO-FUSION] Browser location failed:', geoError.message);
        setIsBrowserLocationLoading(false);
        
        // Fallback automático para IP
        console.log('[GEO-FUSION] Activating IP fallback...');
        await getIPFallback();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, [getIPFallback]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (locationWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    searchLocation,
    reverseGeocode,
    getIPFallback,
    fusionSearch,
    isSearching,
    lastResult,
    error,
    browserLocation,
    requestBrowserLocation,
    isBrowserLocationLoading,
    sourceMetrics: getSourceMetrics()
  };
}
