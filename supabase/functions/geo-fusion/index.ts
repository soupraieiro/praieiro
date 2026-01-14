import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * GEO-FUSION: Orquestrador de 4 fontes de geolocalização
 * 
 * 1. Photon API (Komoot) - Geocoding sem chave, ultra-rápido
 * 2. IP-API - Fallback via IP quando GPS falha
 * 3. Mapbox - Alta performance (requer chave)
 * 4. OpenStreetMap/Nominatim - Backup final
 * 
 * Princípio: Race condition - a primeira resposta válida vence
 */

interface GeoSource {
  name: string;
  lat: number;
  lng: number;
  accuracy: number;
  latency_ms: number;
  address?: string;
  city?: string;
  country?: string;
}

interface FusionResult {
  best_source: GeoSource;
  all_sources: GeoSource[];
  fusion_strategy: string;
  total_latency_ms: number;
  consensus: boolean;
  consensus_score: number;
  satoshi_hash: string;
}

// Gerar hash Satoshi para auditoria
async function generateHash(data: unknown): Promise<string> {
  const encoder = new TextEncoder();
  const dataStr = JSON.stringify({ ...data as object, timestamp: Date.now() });
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(dataStr));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// 1. PHOTON API (Komoot) - Geocoding gratuito
async function queryPhoton(query: string, lat?: number, lng?: number): Promise<GeoSource | null> {
  const start = Date.now();
  try {
    let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1&lang=pt`;
    if (lat && lng) {
      url += `&lat=${lat}&lon=${lng}`;
    }
    
    const response = await fetch(url, {
      headers: { "Accept": "application/json" }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const feature = data.features?.[0];
    
    if (!feature?.geometry?.coordinates) return null;
    
    const [lon, latitude] = feature.geometry.coordinates;
    const props = feature.properties || {};
    
    return {
      name: "photon",
      lat: latitude,
      lng: lon,
      accuracy: props.type === "house" ? 5 : props.type === "street" ? 50 : 100,
      latency_ms: Date.now() - start,
      address: [props.street, props.housenumber].filter(Boolean).join(", ") || props.name,
      city: props.city || props.town || props.village,
      country: props.country
    };
  } catch (error) {
    console.error("[GEO-FUSION] Photon error:", error);
    return null;
  }
}

// 2. PHOTON Geocoding Reverso
async function reversePhoton(lat: number, lng: number): Promise<GeoSource | null> {
  const start = Date.now();
  try {
    const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&lang=pt`;
    
    const response = await fetch(url, {
      headers: { "Accept": "application/json" }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const feature = data.features?.[0];
    
    if (!feature?.properties) return null;
    
    const props = feature.properties;
    
    return {
      name: "photon_reverse",
      lat,
      lng,
      accuracy: 10,
      latency_ms: Date.now() - start,
      address: [props.street, props.housenumber, props.name].filter(Boolean).join(", "),
      city: props.city || props.town || props.village,
      country: props.country
    };
  } catch (error) {
    console.error("[GEO-FUSION] Photon reverse error:", error);
    return null;
  }
}

// 3. IP-API - Geolocalização via IP
async function queryIPAPI(clientIP?: string): Promise<GeoSource | null> {
  const start = Date.now();
  try {
    // Use IP fornecido ou deixe a API detectar
    const url = clientIP 
      ? `http://ip-api.com/json/${clientIP}?fields=status,message,country,city,lat,lon,isp,org,query`
      : `http://ip-api.com/json/?fields=status,message,country,city,lat,lon,isp,org,query`;
    
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.status !== "success") return null;
    
    return {
      name: "ip_api",
      lat: data.lat,
      lng: data.lon,
      accuracy: 5000, // Precisão de IP é ~5km
      latency_ms: Date.now() - start,
      city: data.city,
      country: data.country,
      address: `${data.city}, ${data.country} (via ${data.isp || 'IP'})`
    };
  } catch (error) {
    console.error("[GEO-FUSION] IP-API error:", error);
    return null;
  }
}

// 4. NOMINATIM (OpenStreetMap) - Backup
async function queryNominatim(query: string, lat?: number, lng?: number): Promise<GeoSource | null> {
  const start = Date.now();
  try {
    let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;
    if (lat && lng) {
      url += `&viewbox=${lng-0.5},${lat+0.5},${lng+0.5},${lat-0.5}&bounded=1`;
    }
    
    const response = await fetch(url, {
      headers: { 
        "Accept": "application/json",
        "User-Agent": "Praieiro/1.0 (https://soupraieiro.lovable.app)"
      }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const place = data[0];
    
    if (!place) return null;
    
    const addr = place.address || {};
    
    return {
      name: "nominatim",
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
      accuracy: place.class === "building" ? 10 : place.class === "highway" ? 50 : 200,
      latency_ms: Date.now() - start,
      address: place.display_name,
      city: addr.city || addr.town || addr.village,
      country: addr.country
    };
  } catch (error) {
    console.error("[GEO-FUSION] Nominatim error:", error);
    return null;
  }
}

// 5. NOMINATIM Reverso
async function reverseNominatim(lat: number, lng: number): Promise<GeoSource | null> {
  const start = Date.now();
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: { 
        "Accept": "application/json",
        "User-Agent": "Praieiro/1.0 (https://soupraieiro.lovable.app)"
      }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (!data || data.error) return null;
    
    const addr = data.address || {};
    
    return {
      name: "nominatim_reverse",
      lat,
      lng,
      accuracy: 20,
      latency_ms: Date.now() - start,
      address: data.display_name,
      city: addr.city || addr.town || addr.village,
      country: addr.country
    };
  } catch (error) {
    console.error("[GEO-FUSION] Nominatim reverse error:", error);
    return null;
  }
}

// 6. MAPBOX - Alta performance (requer chave)
async function queryMapbox(query: string, lat?: number, lng?: number): Promise<GeoSource | null> {
  const start = Date.now();
  const token = Deno.env.get("MAPBOX_PUBLIC_TOKEN");
  
  if (!token) {
    console.log("[GEO-FUSION] Mapbox token not configured, skipping");
    return null;
  }
  
  try {
    let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=1&language=pt`;
    if (lat && lng) {
      url += `&proximity=${lng},${lat}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    const feature = data.features?.[0];
    
    if (!feature) return null;
    
    const [lon, latitude] = feature.center;
    
    return {
      name: "mapbox",
      lat: latitude,
      lng: lon,
      accuracy: feature.relevance > 0.9 ? 10 : 50,
      latency_ms: Date.now() - start,
      address: feature.place_name,
      city: feature.context?.find((c: any) => c.id.startsWith("place"))?.text,
      country: feature.context?.find((c: any) => c.id.startsWith("country"))?.text
    };
  } catch (error) {
    console.error("[GEO-FUSION] Mapbox error:", error);
    return null;
  }
}

// Calcular consenso entre fontes
function calculateConsensus(sources: GeoSource[]): { consensus: boolean; score: number } {
  if (sources.length < 2) return { consensus: true, score: 1 };
  
  // Calcular distância máxima entre pares
  let maxDistance = 0;
  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const dist = haversineDistance(
        sources[i].lat, sources[i].lng,
        sources[j].lat, sources[j].lng
      );
      maxDistance = Math.max(maxDistance, dist);
    }
  }
  
  // Consenso se todas as fontes concordam dentro de 1km
  const consensus = maxDistance < 1000;
  const score = Math.max(0, 1 - (maxDistance / 10000)); // Score diminui com distância
  
  return { consensus, score };
}

// Haversine distance em metros
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Raio da Terra em metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Selecionar melhor fonte baseado em estratégia
function selectBestSource(sources: GeoSource[], strategy: string): GeoSource {
  switch (strategy) {
    case "fastest":
      return sources.reduce((a, b) => a.latency_ms < b.latency_ms ? a : b);
    case "most_accurate":
      return sources.reduce((a, b) => a.accuracy < b.accuracy ? a : b);
    case "consensus":
      // Média ponderada das coordenadas
      const weights = sources.map(s => 1 / s.accuracy);
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      const avgLat = sources.reduce((sum, s, i) => sum + s.lat * weights[i], 0) / totalWeight;
      const avgLng = sources.reduce((sum, s, i) => sum + s.lng * weights[i], 0) / totalWeight;
      return {
        name: "consensus_fusion",
        lat: avgLat,
        lng: avgLng,
        accuracy: Math.min(...sources.map(s => s.accuracy)),
        latency_ms: Math.max(...sources.map(s => s.latency_ms)),
        address: sources.find(s => s.address)?.address,
        city: sources.find(s => s.city)?.city,
        country: sources.find(s => s.country)?.country
      };
    default:
      // Priority: Mapbox > Photon > Nominatim > IP-API
      const priority = ["mapbox", "photon", "photon_reverse", "nominatim", "nominatim_reverse", "ip_api"];
      return sources.sort((a, b) => {
        const aIdx = priority.indexOf(a.name);
        const bIdx = priority.indexOf(b.name);
        return aIdx - bIdx;
      })[0];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    const { 
      action,
      query,
      lat,
      lng,
      client_ip,
      strategy = "priority" // fastest | most_accurate | consensus | priority
    } = body;

    console.log(`[GEO-FUSION] Action: ${action}, Query: ${query}, Strategy: ${strategy}`);

    let sources: GeoSource[] = [];

    if (action === "search" && query) {
      // BUSCA: Race condition entre Photon, Mapbox e Nominatim
      const promises = [
        queryPhoton(query, lat, lng),
        queryMapbox(query, lat, lng),
        queryNominatim(query, lat, lng)
      ];

      const results = await Promise.allSettled(promises);
      sources = results
        .filter((r): r is PromiseFulfilledResult<GeoSource | null> => r.status === "fulfilled")
        .map(r => r.value)
        .filter((s): s is GeoSource => s !== null);

    } else if (action === "reverse" && lat && lng) {
      // GEOCODING REVERSO: Coordenadas → Endereço
      const promises = [
        reversePhoton(lat, lng),
        reverseNominatim(lat, lng)
      ];

      const results = await Promise.allSettled(promises);
      sources = results
        .filter((r): r is PromiseFulfilledResult<GeoSource | null> => r.status === "fulfilled")
        .map(r => r.value)
        .filter((s): s is GeoSource => s !== null);

    } else if (action === "ip_fallback") {
      // FALLBACK VIA IP quando GPS falha
      const ipResult = await queryIPAPI(client_ip);
      if (ipResult) {
        sources.push(ipResult);
        
        // Enriquecer com geocoding reverso
        const reverseResults = await Promise.allSettled([
          reversePhoton(ipResult.lat, ipResult.lng),
          reverseNominatim(ipResult.lat, ipResult.lng)
        ]);
        
        for (const result of reverseResults) {
          if (result.status === "fulfilled" && result.value) {
            sources.push(result.value);
          }
        }
      }

    } else if (action === "multi_source" && lat && lng && query) {
      // FUSÃO COMPLETA: Todas as 4 fontes
      const promises = [
        queryPhoton(query, lat, lng),
        queryMapbox(query, lat, lng),
        queryNominatim(query, lat, lng),
        queryIPAPI(client_ip)
      ];

      const results = await Promise.allSettled(promises);
      sources = results
        .filter((r): r is PromiseFulfilledResult<GeoSource | null> => r.status === "fulfilled")
        .map(r => r.value)
        .filter((s): s is GeoSource => s !== null);
    }

    if (sources.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Nenhuma fonte de geolocalização retornou dados válidos",
          action,
          query 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Calcular consenso
    const { consensus, score } = calculateConsensus(sources);

    // Selecionar melhor fonte
    const bestSource = selectBestSource(sources, strategy);

    // Gerar hash de auditoria
    const satoshiHash = await generateHash({
      sources: sources.map(s => s.name),
      best: bestSource.name,
      consensus,
      strategy
    });

    const result: FusionResult = {
      best_source: bestSource,
      all_sources: sources,
      fusion_strategy: strategy,
      total_latency_ms: Date.now() - startTime,
      consensus,
      consensus_score: score,
      satoshi_hash: satoshiHash
    };

    console.log(`[GEO-FUSION] Success | Sources: ${sources.length} | Best: ${bestSource.name} | Latency: ${result.total_latency_ms}ms`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[GEO-FUSION] Error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro interno de fusão geográfica" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
