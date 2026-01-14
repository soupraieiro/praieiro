import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeatherData {
  source: string;
  temp: number;
  feels_like: number;
  humidity: number;
  description: string;
  icon: string;
  wind_speed: number;
  uv_index?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon, beachName } = await req.json();

    if (!lat || !lon) {
      throw new Error("Latitude and longitude are required");
    }

    console.log(`[WEATHER-MULTI] Fetching weather for ${beachName || 'location'}: ${lat}, ${lon}`);

    const openWeatherKey = Deno.env.get("OPENWEATHER_API_KEY");
    
    const results: WeatherData[] = [];
    const errors: string[] = [];

    // Fetch from OpenWeatherMap
    if (openWeatherKey) {
      try {
        const owmUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${openWeatherKey}&units=metric&lang=pt_br`;
        const owmResponse = await fetch(owmUrl);
        
        if (owmResponse.ok) {
          const owmData = await owmResponse.json();
          results.push({
            source: "openweathermap",
            temp: owmData.main.temp,
            feels_like: owmData.main.feels_like,
            humidity: owmData.main.humidity,
            description: owmData.weather[0].description,
            icon: owmData.weather[0].icon,
            wind_speed: owmData.wind.speed,
          });
        }
      } catch (e) {
        errors.push(`OpenWeatherMap: ${e}`);
      }
    }

    // Fetch from Open-Meteo (free, no API key required)
    try {
      const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,uv_index&timezone=America/Bahia`;
      const omResponse = await fetch(omUrl);
      
      if (omResponse.ok) {
        const omData = await omResponse.json();
        const current = omData.current;
        
        // Map weather code to description
        const weatherCodes: Record<number, { description: string; icon: string }> = {
          0: { description: "céu limpo", icon: "01d" },
          1: { description: "principalmente limpo", icon: "02d" },
          2: { description: "parcialmente nublado", icon: "03d" },
          3: { description: "nublado", icon: "04d" },
          45: { description: "neblina", icon: "50d" },
          48: { description: "neblina com geada", icon: "50d" },
          51: { description: "chuvisco leve", icon: "09d" },
          53: { description: "chuvisco moderado", icon: "09d" },
          55: { description: "chuvisco intenso", icon: "09d" },
          61: { description: "chuva leve", icon: "10d" },
          63: { description: "chuva moderada", icon: "10d" },
          65: { description: "chuva forte", icon: "10d" },
          80: { description: "pancadas de chuva leves", icon: "09d" },
          81: { description: "pancadas de chuva moderadas", icon: "09d" },
          82: { description: "pancadas de chuva fortes", icon: "09d" },
          95: { description: "tempestade", icon: "11d" },
        };
        
        const weatherInfo = weatherCodes[current.weather_code] || { description: "tempo variável", icon: "03d" };
        
        results.push({
          source: "open-meteo",
          temp: current.temperature_2m,
          feels_like: current.apparent_temperature,
          humidity: current.relative_humidity_2m,
          description: weatherInfo.description,
          icon: weatherInfo.icon,
          wind_speed: current.wind_speed_10m / 3.6, // Convert km/h to m/s
          uv_index: current.uv_index,
        });
      }
    } catch (e) {
      errors.push(`Open-Meteo: ${e}`);
    }

    if (results.length === 0) {
      throw new Error("No weather data available from any source");
    }

    // Calculate average/consensus values from multiple sources
    const avgTemp = results.reduce((sum, r) => sum + r.temp, 0) / results.length;
    const avgFeelsLike = results.reduce((sum, r) => sum + r.feels_like, 0) / results.length;
    const avgHumidity = results.reduce((sum, r) => sum + r.humidity, 0) / results.length;
    const avgWindSpeed = results.reduce((sum, r) => sum + r.wind_speed, 0) / results.length;
    const uvIndex = results.find(r => r.uv_index !== undefined)?.uv_index;

    // Use the most detailed description (prefer OpenWeatherMap if available)
    const primarySource = results.find(r => r.source === "openweathermap") || results[0];

    const consensus = {
      temp: Math.round(avgTemp * 10) / 10,
      feels_like: Math.round(avgFeelsLike * 10) / 10,
      humidity: Math.round(avgHumidity),
      description: primarySource.description,
      icon: primarySource.icon,
      wind_speed: Math.round(avgWindSpeed * 10) / 10,
      uv_index: uvIndex,
      uv_level: uvIndex ? (uvIndex < 3 ? "low" : uvIndex < 6 ? "moderate" : uvIndex < 8 ? "high" : uvIndex < 11 ? "very_high" : "extreme") : null,
      sources: results.map(r => r.source),
      beachName,
    };

    console.log(`[WEATHER-MULTI] Success: ${results.length} sources, temp: ${consensus.temp}°C`);

    return new Response(JSON.stringify({
      success: true,
      weather: consensus,
      rawSources: results,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[WEATHER-MULTI] Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Weather fetch failed" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
