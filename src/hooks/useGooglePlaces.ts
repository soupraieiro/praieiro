import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Place {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  totalRatings?: number;
  types: string[];
  photoReference?: string;
  isOpen?: boolean;
}

interface PlaceDetails extends Place {
  phone?: string;
  website?: string;
  openingHours?: string[];
  reviews?: Array<{
    author: string;
    rating: number;
    text: string;
    date: string;
  }>;
  photos?: string[];
}

interface AutocompletePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface UseGooglePlacesResult {
  searchPlaces: (query: string, lat?: number, lon?: number, radius?: number) => Promise<Place[]>;
  searchNearby: (lat: number, lon: number, radius?: number, type?: string) => Promise<Place[]>;
  getPlaceDetails: (placeId: string) => Promise<PlaceDetails | null>;
  autocomplete: (query: string, lat?: number, lon?: number) => Promise<AutocompletePrediction[]>;
  isLoading: boolean;
  error: string | null;
}

export function useGooglePlaces(): UseGooglePlacesResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchPlaces = useCallback(async (
    query: string,
    lat?: number,
    lon?: number,
    radius?: number
  ): Promise<Place[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("google-places", {
        body: { action: "search", query, lat, lon, radius },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      return data.places || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro na busca";
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchNearby = useCallback(async (
    lat: number,
    lon: number,
    radius?: number,
    type?: string
  ): Promise<Place[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("google-places", {
        body: { action: "nearby", lat, lon, radius, type },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      return data.places || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro na busca";
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPlaceDetails = useCallback(async (placeId: string): Promise<PlaceDetails | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("google-places", {
        body: { action: "details", placeId },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      return data.place;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao buscar detalhes";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const autocomplete = useCallback(async (
    query: string,
    lat?: number,
    lon?: number
  ): Promise<AutocompletePrediction[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("google-places", {
        body: { action: "autocomplete", query, lat, lon },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      return data.predictions || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro no autocomplete";
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    searchPlaces,
    searchNearby,
    getPlaceDetails,
    autocomplete,
    isLoading,
    error,
  };
}
