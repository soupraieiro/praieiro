/**
 * Widget de Localização e Tempo em Tempo Real
 * - Cidade, Estado
 * - Temperatura atual
 * - Relógio com horas:minutos:segundos em tempo real
 */

import { useState, useEffect, useCallback } from "react";
import { MapPin, Thermometer, Clock, Loader2 } from "lucide-react";
import { useOpenWeather } from "@/hooks/useOpenWeather";

interface LocationData {
  city: string;
  state: string;
  temp: number | null;
  loading: boolean;
  error: boolean;
}

const STATE_CODES: Record<string, string> = {
  'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM',
  'Bahia': 'BA', 'Ceará': 'CE', 'Distrito Federal': 'DF', 'Espírito Santo': 'ES',
  'Goiás': 'GO', 'Maranhão': 'MA', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG', 'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR',
  'Pernambuco': 'PE', 'Piauí': 'PI', 'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN',
  'Rio Grande do Sul': 'RS', 'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC',
  'São Paulo': 'SP', 'Sergipe': 'SE', 'Tocantins': 'TO'
};

export function LocationTimeWidget() {
  const { getCurrentWeather } = useOpenWeather();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<LocationData>({
    city: 'Salvador',
    state: 'BA',
    temp: null,
    loading: true,
    error: false
  });

  // Atualizar relógio a cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Buscar localização e temperatura
  const fetchLocationData = useCallback(async () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const weather = await getCurrentWeather({ lat: latitude, lon: longitude });
            if (weather) {
              let state = '';
              try {
                const geoResponse = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=pt-BR`
                );
                const geoData = await geoResponse.json();
                state = geoData.address?.state || '';
              } catch { /* ignore */ }
              
              const stateAbbr = STATE_CODES[state] || state?.slice(0, 2)?.toUpperCase() || '';
              
              setLocation({
                city: weather.city,
                state: stateAbbr,
                temp: Math.round(weather.temp),
                loading: false,
                error: false
              });
            } else {
              setLocation(prev => ({ ...prev, loading: false }));
            }
          } catch {
            setLocation(prev => ({ ...prev, loading: false, error: true }));
          }
        },
        async () => {
          // Fallback para Salvador
          try {
            const weather = await getCurrentWeather({ city: 'Salvador' });
            if (weather) {
              setLocation({
                city: weather.city,
                state: 'BA',
                temp: Math.round(weather.temp),
                loading: false,
                error: false
              });
            } else {
              setLocation(prev => ({ ...prev, loading: false }));
            }
          } catch {
            setLocation(prev => ({ ...prev, loading: false }));
          }
        },
        { timeout: 5000, maximumAge: 300000 }
      );
    } else {
      setLocation(prev => ({ ...prev, loading: false }));
    }
  }, [getCurrentWeather]);

  useEffect(() => {
    fetchLocationData();
    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchLocationData, 300000);
    return () => clearInterval(interval);
  }, [fetchLocationData]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-sm">
      {/* Localização */}
      <div className="flex items-center gap-1.5">
        <MapPin className="h-4 w-4 text-primary shrink-0" />
        {location.loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <span className="font-medium whitespace-nowrap">
            {location.city}, {location.state}
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-white/30" />

      {/* Temperatura */}
      {!location.loading && location.temp !== null && (
        <>
          <div className="flex items-center gap-1">
            <Thermometer className="h-4 w-4 text-orange-400 shrink-0" />
            <span className="font-bold text-orange-300">{location.temp}°C</span>
          </div>
          <div className="w-px h-4 bg-white/30" />
        </>
      )}

      {/* Relógio em tempo real */}
      <div className="flex items-center gap-1.5">
        <Clock className="h-4 w-4 text-cyan-400 shrink-0" />
        <span className="font-mono font-bold text-cyan-300 tabular-nums">
          {formatTime(currentTime)}
        </span>
      </div>
    </div>
  );
}
