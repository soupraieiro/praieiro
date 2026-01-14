import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CurrentWeather {
  temp: number;
  feels_like: number;
  humidity: number;
  description: string;
  icon: string;
  wind_speed: number;
  city: string;
  country: string;
  sunrise: string;
  sunset: string;
}

interface ForecastItem {
  datetime: string;
  temp: number;
  humidity: number;
  description: string;
  icon: string;
  wind_speed: number;
  rain_probability: number;
}

interface UVData {
  value: number;
  date: string;
  level: "low" | "moderate" | "high" | "very_high" | "extreme";
}

interface UseOpenWeatherResult {
  getCurrentWeather: (params: { lat?: number; lon?: number; city?: string }) => Promise<CurrentWeather | null>;
  getForecast: (params: { lat?: number; lon?: number; city?: string }) => Promise<ForecastItem[]>;
  getUVIndex: (lat: number, lon: number) => Promise<UVData | null>;
  isLoading: boolean;
  error: string | null;
  currentWeather: CurrentWeather | null;
}

export function useOpenWeather(): UseOpenWeatherResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);

  const getCurrentWeather = useCallback(async (params: { lat?: number; lon?: number; city?: string }): Promise<CurrentWeather | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("openweather", {
        body: { action: "current", ...params },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      setCurrentWeather(data.weather);
      return data.weather;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao buscar clima";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getForecast = useCallback(async (params: { lat?: number; lon?: number; city?: string }): Promise<ForecastItem[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("openweather", {
        body: { action: "forecast", ...params },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      return data.forecasts || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao buscar previsão";
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getUVIndex = useCallback(async (lat: number, lon: number): Promise<UVData | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("openweather", {
        body: { action: "uv", lat, lon },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      return data.uv;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao buscar índice UV";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    getCurrentWeather,
    getForecast,
    getUVIndex,
    isLoading,
    error,
    currentWeather,
  };
}

export const uvLevelColors = {
  low: { bg: "bg-green-100", text: "text-green-700", label: "Baixo" },
  moderate: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Moderado" },
  high: { bg: "bg-orange-100", text: "text-orange-700", label: "Alto" },
  very_high: { bg: "bg-red-100", text: "text-red-700", label: "Muito Alto" },
  extreme: { bg: "bg-purple-100", text: "text-purple-700", label: "Extremo" },
};
