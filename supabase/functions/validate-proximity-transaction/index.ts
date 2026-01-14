import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ===============================
// REGRA DE OURO - LIMITES DE PROXIMIDADE
// ===============================
const PROXIMITY_THRESHOLD_ALLOW = 3; // ≤ 3m: Checkout liberado
const PROXIMITY_THRESHOLD_QR = 10; // 3.1m - 10m: Requer QR Code
const MAX_ACCURACY_METERS = 10; // Rejeitar se accuracy > 10m

// Códigos de veredito
type ProximityVerdict = 
  | "APPROVED" 
  | "QR_REQUIRED" 
  | "GEOGRAPHIC_INCONSISTENCY" 
  | "POOR_SIGNAL" 
  | "COORDINATES_REQUIRED";

interface RadarDistanceResponse {
  meta: {
    code: number;
  };
  routes: {
    geodesic?: {
      distance: {
        value: number;
        text: string;
      };
    };
  };
}

interface ProximityResult {
  verdict: ProximityVerdict;
  distance_meters: number;
  client_accuracy: number;
  vendor_accuracy: number;
  message: string;
  can_proceed: boolean;
  requires_qr: boolean;
  verified_at: string;
  location_hash: string;
}

// Generate location authentication hash
async function generateLocationHash(
  orderId: string,
  clientLat: number,
  clientLng: number,
  vendorLat: number,
  vendorLng: number,
  timestamp: string
): Promise<string> {
  const data = `praieiro:${orderId}:${clientLat.toFixed(7)}:${clientLng.toFixed(7)}:${vendorLat.toFixed(7)}:${vendorLng.toFixed(7)}:${timestamp}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VALIDATE-PROXIMITY] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const radarSecretKey = Deno.env.get("RADAR_SECRET_KEY");
  if (!radarSecretKey) {
    return new Response(
      JSON.stringify({ error: "Radar API key not configured", verdict: "ERROR" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const {
      orderId,
      clientLatitude,
      clientLongitude,
      clientAccuracy,
      vendorLatitude,
      vendorLongitude,
      vendorAccuracy
    } = await req.json();

    // Validate required coordinates
    if (!orderId) throw new Error("Order ID is required");
    
    if (clientLatitude == null || clientLongitude == null || 
        vendorLatitude == null || vendorLongitude == null) {
      const result: ProximityResult = {
        verdict: "COORDINATES_REQUIRED",
        distance_meters: -1,
        client_accuracy: clientAccuracy || -1,
        vendor_accuracy: vendorAccuracy || -1,
        message: "Coordenadas de localização são obrigatórias. Ative o GPS.",
        can_proceed: false,
        requires_qr: false,
        verified_at: new Date().toISOString(),
        location_hash: ""
      };
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Coordinates received", {
      client: { lat: clientLatitude, lng: clientLongitude, acc: clientAccuracy },
      vendor: { lat: vendorLatitude, lng: vendorLongitude, acc: vendorAccuracy }
    });

    // ===============================
    // FILTRO DE QUALIDADE DE SINAL
    // ===============================
    const clientAcc = clientAccuracy || 0;
    const vendorAcc = vendorAccuracy || 0;

    if (clientAcc > MAX_ACCURACY_METERS || vendorAcc > MAX_ACCURACY_METERS) {
      logStep("POOR SIGNAL DETECTED", { clientAcc, vendorAcc, maxAllowed: MAX_ACCURACY_METERS });
      
      const result: ProximityResult = {
        verdict: "POOR_SIGNAL",
        distance_meters: -1,
        client_accuracy: clientAcc,
        vendor_accuracy: vendorAcc,
        message: `Sinal GPS insuficiente (precisão: ${Math.max(clientAcc, vendorAcc).toFixed(0)}m). Mova-se para uma área com céu mais limpo.`,
        can_proceed: false,
        requires_qr: false,
        verified_at: new Date().toISOString(),
        location_hash: ""
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // Return 200 so frontend can handle gracefully
      });
    }

    // ===============================
    // CALL RADAR DISTANCE API
    // ===============================
    const distanceUrl = new URL("https://api.radar.io/v1/route/distance");
    distanceUrl.searchParams.append("origin", `${clientLatitude},${clientLongitude}`);
    distanceUrl.searchParams.append("destination", `${vendorLatitude},${vendorLongitude}`);
    distanceUrl.searchParams.append("modes", "geodesic");
    distanceUrl.searchParams.append("units", "metric");

    logStep("Calling Radar API", { url: distanceUrl.toString() });

    const distanceResponse = await fetch(distanceUrl.toString(), {
      headers: {
        Authorization: radarSecretKey,
      },
    });

    if (!distanceResponse.ok) {
      const errorText = await distanceResponse.text();
      logStep("Radar API error", { status: distanceResponse.status, error: errorText });
      throw new Error(`Radar API error: ${distanceResponse.status}`);
    }

    const distanceData: RadarDistanceResponse = await distanceResponse.json();
    const distanceMeters = distanceData.routes?.geodesic?.distance?.value || 0;

    logStep("Radar distance received", { distanceMeters });

    // ===============================
    // REGRA DE OURO - VEREDITO
    // ===============================
    const timestamp = new Date().toISOString();
    const locationHash = await generateLocationHash(
      orderId,
      clientLatitude,
      clientLongitude,
      vendorLatitude,
      vendorLongitude,
      timestamp
    );

    let verdict: ProximityVerdict;
    let message: string;
    let canProceed: boolean;
    let requiresQr: boolean;

    if (distanceMeters <= PROXIMITY_THRESHOLD_ALLOW) {
      // ✅ APPROVED: ≤ 3 metros
      verdict = "APPROVED";
      message = `Proximidade verificada! Distância: ${distanceMeters.toFixed(1)}m`;
      canProceed = true;
      requiresQr = false;
      logStep("VERDICT: APPROVED", { distanceMeters });

    } else if (distanceMeters <= PROXIMITY_THRESHOLD_QR) {
      // ⚠️ QR_REQUIRED: 3.1m - 10m
      verdict = "QR_REQUIRED";
      message = `Distância de ${distanceMeters.toFixed(1)}m detectada. Escaneie o QR Code do vendedor para confirmar.`;
      canProceed = false;
      requiresQr = true;
      logStep("VERDICT: QR_REQUIRED", { distanceMeters });

    } else {
      // ❌ GEOGRAPHIC_INCONSISTENCY: > 10m
      verdict = "GEOGRAPHIC_INCONSISTENCY";
      message = `Inconsistência Geográfica: você está a ${distanceMeters.toFixed(1)}m do vendedor. Aproxime-se para pagar.`;
      canProceed = false;
      requiresQr = false;
      logStep("VERDICT: GEOGRAPHIC_INCONSISTENCY", { distanceMeters });
    }

    // ===============================
    // UPDATE ORDER WITH VERIFICATION
    // ===============================
    const { error: updateError } = await supabaseClient
      .from("orders")
      .update({
        proximity_verified: canProceed,
        proximity_verified_at: timestamp,
        distance_at_checkout: Math.round(distanceMeters * 100) / 100,
        location_auth_hash: locationHash,
        client_latitude: clientLatitude,
        client_longitude: clientLongitude,
        client_accuracy_radius: clientAcc,
        vendor_latitude: vendorLatitude,
        vendor_longitude: vendorLongitude,
        vendor_accuracy_radius: vendorAcc,
        client_location_timestamp: timestamp,
        vendor_location_timestamp: timestamp
      })
      .eq("id", orderId);

    if (updateError) {
      logStep("Update error", { error: updateError.message });
      // Don't fail the request, just log
    }

    const result: ProximityResult = {
      verdict,
      distance_meters: Math.round(distanceMeters * 100) / 100,
      client_accuracy: clientAcc,
      vendor_accuracy: vendorAcc,
      message,
      can_proceed: canProceed,
      requires_qr: requiresQr,
      verified_at: timestamp,
      location_hash: locationHash
    };

    logStep("Verification complete", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage,
      verdict: "ERROR",
      can_proceed: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
