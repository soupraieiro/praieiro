import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sun, 
  Cloud, 
  CloudRain, 
  CloudSun, 
  Wind, 
  Droplets,
  Thermometer,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { uvLevelColors } from "@/hooks/useOpenWeather";

interface BeachWeatherData {
  temp: number;
  feels_like: number;
  humidity: number;
  description: string;
  icon: string;
  wind_speed: number;
  uv_index?: number;
  uv_level?: "low" | "moderate" | "high" | "very_high" | "extreme";
  sources: string[];
}

interface BeachWeatherCardProps {
  beachName: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  compact?: boolean;
}

const weatherIcons: Record<string, React.ReactNode> = {
  "01d": <Sun className="h-8 w-8 text-amber-500" />,
  "01n": <Sun className="h-8 w-8 text-amber-400" />,
  "02d": <CloudSun className="h-8 w-8 text-amber-400" />,
  "02n": <CloudSun className="h-8 w-8 text-gray-400" />,
  "03d": <Cloud className="h-8 w-8 text-gray-400" />,
  "03n": <Cloud className="h-8 w-8 text-gray-500" />,
  "04d": <Cloud className="h-8 w-8 text-gray-500" />,
  "04n": <Cloud className="h-8 w-8 text-gray-600" />,
  "09d": <CloudRain className="h-8 w-8 text-blue-500" />,
  "09n": <CloudRain className="h-8 w-8 text-blue-600" />,
  "10d": <CloudRain className="h-8 w-8 text-blue-500" />,
  "10n": <CloudRain className="h-8 w-8 text-blue-600" />,
  "11d": <CloudRain className="h-8 w-8 text-purple-500" />,
  "50d": <Cloud className="h-8 w-8 text-gray-400" />,
};

export function BeachWeatherCard({ 
  beachName, 
  city = "Salvador", 
  latitude, 
  longitude,
  compact = false 
}: BeachWeatherCardProps) {
  const [weather, setWeather] = useState<BeachWeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    if (!latitude || !longitude) {
      setError("Coordenadas não disponíveis");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: invokeError } = await supabase.functions.invoke("weather-multi", {
        body: { lat: latitude, lon: longitude, beachName },
      });

      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);

      setWeather(data.weather);
    } catch (err) {
      console.error("Weather fetch error:", err);
      setError("Erro ao carregar clima");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    // Refresh every 10 minutes
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [latitude, longitude, beachName]);

  if (loading) {
    return (
      <Card className={compact ? "p-2" : "p-4"}>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card className={`${compact ? "p-2" : "p-4"} border-orange-200 bg-orange-50`}>
        <div className="flex items-center gap-2 text-orange-600">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">{error || "Clima indisponível"}</span>
          <Button variant="ghost" size="sm" onClick={fetchWeather} className="ml-auto">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        {weatherIcons[weather.icon] || <Sun className="h-5 w-5 text-amber-500" />}
        <span className="font-bold">{Math.round(weather.temp)}°C</span>
        <span className="text-muted-foreground capitalize">{weather.description}</span>
      </div>
    );
  }

  const uvColors = weather.uv_level ? uvLevelColors[weather.uv_level] : null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-semibold text-lg">{beachName}</h4>
            <p className="text-sm text-muted-foreground">{city}</p>
          </div>
          {weatherIcons[weather.icon] || <Sun className="h-10 w-10 text-amber-500" />}
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-4xl font-bold">{Math.round(weather.temp)}°</span>
          <span className="text-muted-foreground capitalize">{weather.description}</span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Thermometer className="h-4 w-4 text-red-400" />
            <div>
              <p className="text-xs text-muted-foreground">Sensação</p>
              <p className="font-medium">{Math.round(weather.feels_like)}°</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Droplets className="h-4 w-4 text-blue-400" />
            <div>
              <p className="text-xs text-muted-foreground">Umidade</p>
              <p className="font-medium">{weather.humidity}%</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Wind className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-muted-foreground">Vento</p>
              <p className="font-medium">{weather.wind_speed.toFixed(1)} m/s</p>
            </div>
          </div>
        </div>

        {uvColors && weather.uv_index !== undefined && (
          <div className="mt-4">
            <Badge className={`${uvColors.bg} ${uvColors.text}`}>
              UV: {weather.uv_index.toFixed(1)} - {uvColors.label}
            </Badge>
          </div>
        )}

        <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
          <span>Fontes: {weather.sources.join(", ")}</span>
        </div>
      </CardContent>
    </Card>
  );
}
