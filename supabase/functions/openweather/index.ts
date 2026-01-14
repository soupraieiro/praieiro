import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { CACHE_PRESETS, getCacheHeaders, generateETag, checkConditionalRequest, createNotModifiedResponse } from "../_shared/cache-headers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CDN_CACHE_CONFIG = CACHE_PRESETS.DYNAMIC;

// Rate limiting: max 60 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 60;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT) {
    return false;
  }
  
  entry.count++;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract IP for rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || 
                     "unknown";
    
    // Check rate limit
    if (!checkRateLimit(clientIP)) {
      console.log(`[OPENWEATHER] Rate limit exceeded for IP: ${clientIP}`);
      return new Response(JSON.stringify({ 
        error: "Rate limit exceeded. Please try again later." 
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      });
    }

    // Optional: Verify authenticated user for priority access
    const authHeader = req.headers.get("Authorization");
    let isAuthenticated = false;
    
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        isAuthenticated = !!user;
      } catch {
        // Auth check failed, continue as unauthenticated
      }
    }

    console.log(`[OPENWEATHER] Request from IP: ${clientIP}, Authenticated: ${isAuthenticated}`);

    const apiKey = Deno.env.get("OPENWEATHER_API_KEY");
    if (!apiKey) {
      throw new Error("OPENWEATHER_API_KEY not configured");
    }

    const { action, lat, lon, city } = await req.json();
    console.log(`[OPENWEATHER] Action: ${action}, Lat: ${lat}, Lon: ${lon}, City: ${city}`);

    let url: string;

    if (action === "current") {
      if (lat && lon) {
        url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=pt_br`;
      } else if (city) {
        url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=pt_br`;
      } else {
        throw new Error("Either lat/lon or city required");
      }
    } else if (action === "forecast") {
      if (lat && lon) {
        url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=pt_br`;
      } else if (city) {
        url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=pt_br`;
      } else {
        throw new Error("Either lat/lon or city required");
      }
    } else if (action === "uv") {
      if (!lat || !lon) {
        throw new Error("lat/lon required for UV index");
      }
      url = `https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    } else {
      throw new Error("Invalid action. Use: current, forecast, or uv");
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OpenWeather API error: ${response.status}`);
    }

    const data = await response.json();

    // Helper to create cached response
    const createCachedResponse = async (body: object) => {
      const responseBody = JSON.stringify(body);
      const etag = await generateETag(responseBody);
      
      if (checkConditionalRequest(req, etag)) {
        return createNotModifiedResponse(corsHeaders, CDN_CACHE_CONFIG, etag);
      }
      
      return new Response(responseBody, {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          ...getCacheHeaders({ ...CDN_CACHE_CONFIG, etag }),
        },
      });
    };

    // Format response based on action
    if (action === "current") {
      return await createCachedResponse({
        success: true,
        weather: {
          temp: data.main.temp,
          feels_like: data.main.feels_like,
          humidity: data.main.humidity,
          description: data.weather[0].description,
          icon: data.weather[0].icon,
          wind_speed: data.wind.speed,
          city: data.name,
          country: data.sys.country,
          sunrise: new Date(data.sys.sunrise * 1000).toISOString(),
          sunset: new Date(data.sys.sunset * 1000).toISOString(),
        },
      });
    }

    if (action === "forecast") {
      const forecasts = data.list.map((item: {
        dt: number;
        main: { temp: number; humidity: number };
        weather: Array<{ description: string; icon: string }>;
        wind: { speed: number };
        pop: number;
      }) => ({
        datetime: new Date(item.dt * 1000).toISOString(),
        temp: item.main.temp,
        humidity: item.main.humidity,
        description: item.weather[0].description,
        icon: item.weather[0].icon,
        wind_speed: item.wind.speed,
        rain_probability: item.pop * 100,
      }));

      return await createCachedResponse({
        success: true,
        city: data.city.name,
        forecasts,
      });
    }

    if (action === "uv") {
      return await createCachedResponse({
        success: true,
        uv: {
          value: data.value,
          date: new Date(data.date * 1000).toISOString(),
          level: data.value < 3 ? "low" : data.value < 6 ? "moderate" : data.value < 8 ? "high" : data.value < 11 ? "very_high" : "extreme",
        },
      });
    }

    return await createCachedResponse(data);

  } catch (error) {
    console.error("[OPENWEATHER] Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        ...getCacheHeaders(CACHE_PRESETS.NO_CACHE),
      },
    });
  }
});