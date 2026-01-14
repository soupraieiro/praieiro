import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, ChevronRight, Sparkles, Sun, Cloud, CloudRain } from "lucide-react";
import { cn } from "@/lib/utils";

interface Beach {
  id: string;
  beach_name: string;
  city: string;
  is_active: boolean;
  latitude?: number;
  longitude?: number;
}

interface BeachWeather {
  temp: number;
  description: string;
  icon: string;
}

interface BeachSelectorProps {
  onSelectBeach: (beach: Beach) => void;
  selectedBeachId?: string;
}

const weatherIcons: Record<string, React.ReactNode> = {
  "01d": <Sun className="h-4 w-4 text-amber-500" />,
  "01n": <Sun className="h-4 w-4 text-amber-400" />,
  "02d": <Sun className="h-4 w-4 text-amber-400" />,
  "02n": <Cloud className="h-4 w-4 text-gray-400" />,
  "03d": <Cloud className="h-4 w-4 text-gray-400" />,
  "03n": <Cloud className="h-4 w-4 text-gray-500" />,
  "04d": <Cloud className="h-4 w-4 text-gray-500" />,
  "04n": <Cloud className="h-4 w-4 text-gray-600" />,
  "09d": <CloudRain className="h-4 w-4 text-blue-500" />,
  "10d": <CloudRain className="h-4 w-4 text-blue-500" />,
  "10n": <CloudRain className="h-4 w-4 text-blue-600" />,
};

export function BeachSelector({ onSelectBeach, selectedBeachId }: BeachSelectorProps) {
  const [beaches, setBeaches] = useState<Beach[]>([]);
  const [loading, setLoading] = useState(true);
  const [weatherData, setWeatherData] = useState<Record<string, BeachWeather>>({});

  useEffect(() => {
    async function fetchBeaches() {
      const { data, error } = await supabase
        .from("beaches")
        .select("*")
        .order("is_active", { ascending: false })
        .order("beach_name");

      if (!error && data) {
        setBeaches(data);
        // Fetch weather for each beach
        data.forEach((beach) => {
          if (beach.latitude && beach.longitude) {
            fetchWeatherForBeach(beach);
          }
        });
      }
      setLoading(false);
    }

    fetchBeaches();
  }, []);

  const fetchWeatherForBeach = async (beach: Beach) => {
    try {
      const { data } = await supabase.functions.invoke("weather-multi", {
        body: { lat: beach.latitude, lon: beach.longitude, beachName: beach.beach_name },
      });
      if (data?.weather) {
        setWeatherData((prev) => ({
          ...prev,
          [beach.id]: {
            temp: data.weather.temp,
            description: data.weather.description,
            icon: data.weather.icon,
          },
        }));
      }
    } catch (err) {
      console.error(`Weather fetch error for ${beach.beach_name}:`, err);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {beaches.map((beach) => {
        const weather = weatherData[beach.id];
        return (
          <button
            key={beach.id}
            onClick={() => onSelectBeach(beach)}
            className={cn(
              "flex items-center justify-between rounded-xl border-2 p-4 text-left transition-all hover:shadow-lg",
              selectedBeachId === beach.id
                ? "border-primary bg-primary/5 shadow-lg"
                : beach.is_active
                ? "border-accent bg-white hover:border-accent shadow-md"
                : "border-border bg-white hover:border-primary/50"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full",
                beach.is_active ? "bg-accent text-white" : "bg-muted text-muted-foreground"
              )}>
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-foreground text-lg">{beach.beach_name}</p>
                  {beach.is_active && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent">
                      <Sparkles className="h-3 w-3" />
                      Ativo
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{beach.city}</p>
                {/* Weather display */}
                {weather && (
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                    {weatherIcons[weather.icon] || <Sun className="h-4 w-4 text-amber-500" />}
                    <span className="font-medium">{Math.round(weather.temp)}°C</span>
                    <span className="capitalize">{weather.description}</span>
                  </div>
                )}
              </div>
            </div>
            <ChevronRight className={cn(
              "h-5 w-5",
              beach.is_active ? "text-accent" : "text-muted-foreground"
            )} />
          </button>
        );
      })}
    </div>
  );
}
