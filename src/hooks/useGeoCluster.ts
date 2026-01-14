/**
 * CLUSTER DE GEORREFERENCIAMENTO UNIFICADO
 * Google Places (cérebro de busca) + Mapbox (motor visual)
 * 
 * Coordenadas geradas por um são espelhadas no outro para garantir
 * que usuário e vendedor vejam o mesmo 'pin' na areia de Salvador.
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UnifiedPin {
  id?: string;
  googlePlaceId?: string;
  mapboxFeatureId?: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  placeType?: string;
  metadata?: Record<string, unknown>;
  searchCount?: number;
}

export interface GeoSearchResult {
  pin: UnifiedPin;
  mapboxCenter: [number, number]; // [lng, lat] for Mapbox
  googleMapsLink: string;
  mapboxDeepLink: string;
}

interface UseGeoClusterResult {
  search: (query: string) => Promise<GeoSearchResult[]>;
  getPin: (placeId: string) => Promise<UnifiedPin | null>;
  syncPin: (pin: UnifiedPin) => Promise<UnifiedPin>;
  generateMapLinks: (pin: UnifiedPin) => { google: string; mapbox: string; universal: string };
  isSearching: boolean;
  lastResults: GeoSearchResult[];
  error: string | null;
}

// Cache local para reduzir latência
const pinCache = new Map<string, UnifiedPin>();

export function useGeoCluster(): UseGeoClusterResult {
  const [isSearching, setIsSearching] = useState(false);
  const [lastResults, setLastResults] = useState<GeoSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sessionId = useRef(`session_${Date.now()}_${Math.random().toString(36).slice(2)}`);

  /**
   * Busca unificada: Google Places como cérebro + Mapbox como motor visual
   * Salva no banco para aprendizado contínuo
   */
  const search = useCallback(async (query: string): Promise<GeoSearchResult[]> => {
    if (query.length < 2) return [];
    
    setIsSearching(true);
    setError(null);

    try {
      // 1. Busca via Google Places (cérebro de busca)
      const { data: placesData, error: placesError } = await supabase.functions.invoke('google-places', {
        body: {
          action: 'search',
          query: `${query} Salvador Bahia Brasil`,
          lat: -12.9714,
          lon: -38.5014,
          radius: 50000
        }
      });

      if (placesError) throw new Error(placesError.message);

      const places = placesData?.results || [];
      const results: GeoSearchResult[] = [];

      // 2. Processar cada resultado e sincronizar com banco
      for (const place of places.slice(0, 10)) {
        const pin: UnifiedPin = {
          googlePlaceId: place.place_id,
          name: place.name,
          address: place.formatted_address,
          latitude: place.geometry?.location?.lat,
          longitude: place.geometry?.location?.lng,
          placeType: place.types?.[0],
          metadata: {
            rating: place.rating,
            userRatingsTotal: place.user_ratings_total,
            businessStatus: place.business_status
          }
        };

        // Sincronizar pin no banco (upsert para aprendizado)
        const syncedPin = await syncPinToDatabase(pin);
        
        // Gerar links para ambas plataformas
        const links = generateMapLinks(syncedPin);

        results.push({
          pin: syncedPin,
          mapboxCenter: [syncedPin.longitude, syncedPin.latitude],
          googleMapsLink: links.google,
          mapboxDeepLink: links.mapbox
        });

        // Cache local
        if (syncedPin.googlePlaceId) {
          pinCache.set(syncedPin.googlePlaceId, syncedPin);
        }
      }

      // 3. Registrar intenção de busca para analytics
      await supabase.from('search_intents').insert({
        session_id: sessionId.current,
        query,
        result_count: results.length,
        search_source: 'google_places',
        device_info: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform
        }
      });

      setLastResults(results);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro na busca georreferenciada';
      setError(errorMessage);
      
      // Registrar erro para análise
      await supabase.from('search_intents').insert({
        session_id: sessionId.current,
        query,
        flow_success: false,
        error_type: errorMessage,
        search_source: 'google_places'
      });

      return [];
    } finally {
      setIsSearching(false);
    }
  }, []);

  /**
   * Obter pin do cache ou banco
   */
  const getPin = useCallback(async (placeId: string): Promise<UnifiedPin | null> => {
    // Checar cache primeiro
    if (pinCache.has(placeId)) {
      return pinCache.get(placeId)!;
    }

    try {
      const { data, error } = await supabase
        .from('unified_pins')
        .select('*')
        .eq('google_place_id', placeId)
        .single();

      if (error || !data) return null;

      const pin: UnifiedPin = {
        id: data.id,
        googlePlaceId: data.google_place_id,
        mapboxFeatureId: data.mapbox_feature_id,
        name: data.name,
        address: data.address,
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        placeType: data.place_type,
        metadata: data.metadata as Record<string, unknown>,
        searchCount: data.search_count
      };

      pinCache.set(placeId, pin);
      return pin;
    } catch {
      return null;
    }
  }, []);

  /**
   * Sincroniza pin entre Google Places e Mapbox
   */
  const syncPin = useCallback(async (pin: UnifiedPin): Promise<UnifiedPin> => {
    return syncPinToDatabase(pin);
  }, []);

  /**
   * Gera links de mapa para ambas plataformas
   */
  const generateMapLinks = useCallback((pin: UnifiedPin) => {
    const { latitude, longitude, name } = pin;
    const encodedName = encodeURIComponent(name);

    return {
      google: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}&query_place_id=${pin.googlePlaceId || ''}`,
      mapbox: `https://api.mapbox.com/styles/v1/mapbox/streets-v12.html?title=true&access_token=pk.placeholder#15/${latitude}/${longitude}`,
      universal: `https://maps.google.com/?q=${latitude},${longitude}`
    };
  }, []);

  return {
    search,
    getPin,
    syncPin,
    generateMapLinks,
    isSearching,
    lastResults,
    error
  };
}

/**
 * Função interna para sincronizar pin no banco de dados
 * Implementa upsert para aprendizado contínuo
 */
async function syncPinToDatabase(pin: UnifiedPin): Promise<UnifiedPin> {
  try {
    // Primeiro, tentar buscar pin existente
    if (pin.googlePlaceId) {
      const { data: existing } = await supabase
        .from('unified_pins')
        .select('*')
        .eq('google_place_id', pin.googlePlaceId)
        .single();

      if (existing) {
        // Atualizar contagem de buscas
        const existingMetadata = existing.metadata ? JSON.parse(JSON.stringify(existing.metadata)) : {};
        const newMetadata = pin.metadata ? JSON.parse(JSON.stringify(pin.metadata)) : {};
        await supabase
          .from('unified_pins')
          .update({
            search_count: (existing.search_count || 0) + 1,
            last_searched_at: new Date().toISOString(),
            metadata: { ...existingMetadata, ...newMetadata }
          })
          .eq('id', existing.id);

        return {
          ...pin,
          id: existing.id,
          searchCount: (existing.search_count || 0) + 1
        };
      }
    }

    // Inserir novo pin
    const metadataJson = pin.metadata ? JSON.parse(JSON.stringify(pin.metadata)) : null;
    const { data: newPin, error } = await supabase
      .from('unified_pins')
      .insert([{
        google_place_id: pin.googlePlaceId || null,
        mapbox_feature_id: pin.mapboxFeatureId || null,
        name: pin.name,
        address: pin.address || null,
        latitude: pin.latitude,
        longitude: pin.longitude,
        place_type: pin.placeType || null,
        metadata: metadataJson,
        search_count: 1
      }])
      .select()
      .single();

    if (error) {
      console.error('Error syncing pin:', error);
      return pin;
    }

    return {
      ...pin,
      id: newPin.id,
      searchCount: 1
    };
  } catch (err) {
    console.error('Error in syncPinToDatabase:', err);
    return pin;
  }
}
