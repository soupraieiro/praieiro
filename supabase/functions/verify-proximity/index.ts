import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Vincenty distance calculation for geodetic accuracy
function calculateVincentyDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const a = 6378137.0; // WGS-84 semi-major axis
  const f = 1 / 298.257223563; // WGS-84 flattening
  const b = 6356752.314245; // WGS-84 semi-minor axis

  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const L = ((lon2 - lon1) * Math.PI) / 180;

  const U1 = Math.atan((1 - f) * Math.tan(phi1));
  const U2 = Math.atan((1 - f) * Math.tan(phi2));

  const sinU1 = Math.sin(U1);
  const cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2);
  const cosU2 = Math.cos(U2);

  let lambda = L;
  let lambdaP = 2 * Math.PI;
  let iterLimit = 100;

  let sinLambda: number, cosLambda: number, sinSigma: number, cosSigma: number, sigma: number;
  let sinAlpha: number, cosSqAlpha: number, cos2SigmaM: number;

  while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0) {
    sinLambda = Math.sin(lambda);
    cosLambda = Math.cos(lambda);
    sinSigma = Math.sqrt(
      Math.pow(cosU2 * sinLambda, 2) +
        Math.pow(cosU1 * sinU2 - sinU1 * cosU2 * cosLambda, 2)
    );

    if (sinSigma === 0) return 0;

    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    sigma = Math.atan2(sinSigma, cosSigma);

    sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
    cosSqAlpha = 1 - sinAlpha * sinAlpha;

    cos2SigmaM = cosSqAlpha !== 0 ? cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha : 0;

    const C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));

    lambdaP = lambda;
    lambda =
      L +
      (1 - C) *
        f *
        sinAlpha *
        (sigma +
          C *
            sinSigma *
            (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
  }

  if (iterLimit === 0) return NaN;

  const uSq = (cosSqAlpha! * (a * a - b * b)) / (b * b);
  const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));

  const deltaSigma =
    B *
    sinSigma! *
    (cos2SigmaM! +
      (B / 4) *
        (cosSigma! * (-1 + 2 * cos2SigmaM! * cos2SigmaM!) -
          (B / 6) *
            cos2SigmaM! *
            (-3 + 4 * sinSigma! * sinSigma!) *
            (-3 + 4 * cos2SigmaM! * cos2SigmaM!)));

  return b * A * (sigma! - deltaSigma);
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
  const data = `${orderId}:${clientLat.toFixed(7)}:${clientLng.toFixed(7)}:${vendorLat.toFixed(7)}:${vendorLng.toFixed(7)}:${timestamp}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PROXIMITY] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const body = await req.json();
    
    const orderId = body.orderId;
    const clientLatitude = typeof body.clientLatitude === 'number' ? body.clientLatitude : null;
    const clientLongitude = typeof body.clientLongitude === 'number' ? body.clientLongitude : null;
    const clientAccuracy = typeof body.clientAccuracy === 'number' ? body.clientAccuracy : null;
    const vendorLatitude = typeof body.vendorLatitude === 'number' ? body.vendorLatitude : null;
    const vendorLongitude = typeof body.vendorLongitude === 'number' ? body.vendorLongitude : null;
    const vendorAccuracy = typeof body.vendorAccuracy === 'number' ? body.vendorAccuracy : null;
    const maxDistanceMeters = typeof body.maxDistanceMeters === 'number' ? body.maxDistanceMeters : 50;

    // Input validation
    if (!orderId || typeof orderId !== 'string') {
      throw new Error("Order ID is required");
    }
    if (clientLatitude === null || clientLongitude === null) {
      throw new Error("Client coordinates are required");
    }
    if (vendorLatitude === null || vendorLongitude === null) {
      throw new Error("Vendor coordinates are required");
    }
    // Validate coordinate ranges
    if (clientLatitude < -90 || clientLatitude > 90 || vendorLatitude < -90 || vendorLatitude > 90) {
      throw new Error("Invalid latitude value");
    }
    if (clientLongitude < -180 || clientLongitude > 180 || vendorLongitude < -180 || vendorLongitude > 180) {
      throw new Error("Invalid longitude value");
    }

    logStep("Coordinates received", {
      orderId,
      client: { lat: clientLatitude, lng: clientLongitude, acc: clientAccuracy },
      vendor: { lat: vendorLatitude, lng: vendorLongitude, acc: vendorAccuracy }
    });

    // Calculate geodetic distance using Vincenty
    const distanceMeters = calculateVincentyDistance(
      clientLatitude,
      clientLongitude,
      vendorLatitude,
      vendorLongitude
    );

    // Calculate effective margin based on GPS accuracy
    const clientAcc = clientAccuracy || 0;
    const vendorAcc = vendorAccuracy || 0;
    const effectiveMargin = Math.sqrt(clientAcc * clientAcc + vendorAcc * vendorAcc);
    const maxAllowed = maxDistanceMeters + effectiveMargin;

    const isValid = distanceMeters <= maxAllowed;
    const timestamp = new Date().toISOString();

    logStep("Distance calculated", {
      distanceMeters: Math.round(distanceMeters * 100) / 100,
      effectiveMargin: Math.round(effectiveMargin * 100) / 100,
      maxAllowed: Math.round(maxAllowed * 100) / 100,
      isValid
    });

    // Generate cryptographic hash for location authentication
    const locationAuthHash = await generateLocationHash(
      orderId,
      clientLatitude,
      clientLongitude,
      vendorLatitude,
      vendorLongitude,
      timestamp
    );

    // Update order with proximity verification
    const { error: updateError } = await supabaseClient
      .from("orders")
      .update({
        proximity_verified: isValid,
        proximity_verified_at: timestamp,
        distance_at_checkout: Math.round(distanceMeters),
        location_auth_hash: locationAuthHash,
        client_latitude: clientLatitude,
        client_longitude: clientLongitude,
        client_accuracy_radius: clientAccuracy,
        vendor_latitude: vendorLatitude,
        vendor_longitude: vendorLongitude,
        vendor_accuracy_radius: vendorAccuracy
      })
      .eq("id", orderId);

    if (updateError) {
      logStep("Update error", { error: updateError.message });
      throw new Error(`Failed to update order: ${updateError.message}`);
    }

    logStep("Order updated", { orderId, isValid, hash: locationAuthHash.substring(0, 16) + "..." });

    const result = {
      is_valid: isValid,
      distance_meters: Math.round(distanceMeters * 100) / 100,
      effective_margin: Math.round(effectiveMargin * 100) / 100,
      max_allowed: maxAllowed,
      client_accuracy: clientAcc,
      vendor_accuracy: vendorAcc,
      location_auth_hash: locationAuthHash,
      verified_at: timestamp,
      message: isValid 
        ? `Proximidade verificada: ${Math.round(distanceMeters)}m (máx: ${Math.round(maxAllowed)}m)`
        : `Distância muito grande: ${Math.round(distanceMeters)}m excede limite de ${Math.round(maxAllowed)}m`
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    // Return generic error message, detailed error logged server-side
    const safeErrors = ["Order ID is required", "Client coordinates are required", "Vendor coordinates are required", "Invalid latitude value", "Invalid longitude value"];
    const isSafeError = safeErrors.some(e => errorMessage.includes(e));
    return new Response(JSON.stringify({ error: isSafeError ? errorMessage : "Erro ao verificar proximidade" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: isSafeError ? 400 : 500,
    });
  }
});
