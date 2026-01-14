import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RadarContextResponse {
  meta: {
    code: number;
  };
  context: {
    geofences: Array<{
      tag: string;
      externalId: string;
      description: string;
    }>;
    country?: {
      code: string;
      name: string;
    };
    state?: {
      code: string;
      name: string;
    };
    dma?: {
      code: string;
      name: string;
    };
    postalCode?: {
      code: string;
    };
  };
  fraud?: {
    passed: boolean;
    bypassed: boolean;
    verified: boolean;
    proxy: boolean;
    mocked: boolean;
    compromised: boolean;
    jumped: boolean;
    sharing: boolean;
    inaccurate: boolean;
  };
}

interface RadarDistanceResponse {
  meta: {
    code: number;
  };
  routes: {
    geodesic: {
      distance: {
        value: number;
        text: string;
      };
    };
    foot?: {
      distance: {
        value: number;
        text: string;
      };
      duration: {
        value: number;
        text: string;
      };
    };
  };
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RADAR-VERIFY] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const radarSecretKey = Deno.env.get("RADAR_SECRET_KEY");
  if (!radarSecretKey) {
    return new Response(
      JSON.stringify({ error: "Radar API key not configured" }),
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
      vendorLatitude,
      vendorLongitude,
      deviceId,
      verifyFraud = true
    } = await req.json();

    if (!orderId) throw new Error("Order ID is required");
    if (clientLatitude == null || clientLongitude == null) {
      throw new Error("Client coordinates are required");
    }
    if (vendorLatitude == null || vendorLongitude == null) {
      throw new Error("Vendor coordinates are required");
    }

    logStep("Request data", { orderId, clientLatitude, clientLongitude, vendorLatitude, vendorLongitude });

    // 1. Verify client context and fraud detection
    let fraudResult = null;
    if (verifyFraud) {
      const contextUrl = new URL("https://api.radar.io/v1/context");
      contextUrl.searchParams.append("coordinates", `${clientLatitude},${clientLongitude}`);
      
      if (deviceId) {
        contextUrl.searchParams.append("deviceId", deviceId);
      }

      const contextResponse = await fetch(contextUrl.toString(), {
        headers: {
          Authorization: radarSecretKey,
        },
      });

      if (contextResponse.ok) {
        const contextData: RadarContextResponse = await contextResponse.json();
        fraudResult = contextData.fraud || null;
        logStep("Radar context received", { 
          country: contextData.context?.country?.code,
          fraud: fraudResult 
        });
      } else {
        logStep("Radar context failed", { status: contextResponse.status });
      }
    }

    // 2. Calculate geodesic distance using Radar
    const distanceUrl = new URL("https://api.radar.io/v1/route/distance");
    distanceUrl.searchParams.append("origin", `${clientLatitude},${clientLongitude}`);
    distanceUrl.searchParams.append("destination", `${vendorLatitude},${vendorLongitude}`);
    distanceUrl.searchParams.append("modes", "geodesic,foot");
    distanceUrl.searchParams.append("units", "metric");

    const distanceResponse = await fetch(distanceUrl.toString(), {
      headers: {
        Authorization: radarSecretKey,
      },
    });

    let distanceMeters = 0;
    let walkingDistanceMeters = 0;
    let walkingDurationSeconds = 0;

    if (distanceResponse.ok) {
      const distanceData: RadarDistanceResponse = await distanceResponse.json();
      distanceMeters = distanceData.routes?.geodesic?.distance?.value || 0;
      walkingDistanceMeters = distanceData.routes?.foot?.distance?.value || 0;
      walkingDurationSeconds = distanceData.routes?.foot?.duration?.value || 0;
      
      logStep("Radar distance received", { 
        geodesic: distanceMeters,
        walking: walkingDistanceMeters,
        walkingDuration: walkingDurationSeconds
      });
    } else {
      logStep("Radar distance failed", { status: distanceResponse.status });
      throw new Error("Failed to calculate distance via Radar");
    }

    // 3. Analyze fraud indicators
    const fraudFlags: string[] = [];
    let fraudScore = 0;

    if (fraudResult) {
      if (fraudResult.proxy) {
        fraudFlags.push("proxy_detected");
        fraudScore += 30;
      }
      if (fraudResult.mocked) {
        fraudFlags.push("location_mocked");
        fraudScore += 50;
      }
      if (fraudResult.compromised) {
        fraudFlags.push("device_compromised");
        fraudScore += 40;
      }
      if (fraudResult.jumped) {
        fraudFlags.push("location_jumped");
        fraudScore += 25;
      }
      if (fraudResult.sharing) {
        fraudFlags.push("location_sharing");
        fraudScore += 15;
      }
      if (fraudResult.inaccurate) {
        fraudFlags.push("location_inaccurate");
        fraudScore += 20;
      }
    }

    const fraudPassed = fraudResult?.passed ?? true;
    const timestamp = new Date().toISOString();

    logStep("Fraud analysis complete", { 
      passed: fraudPassed,
      score: fraudScore,
      flags: fraudFlags
    });

    // 4. Update order with Radar verification
    const { error: updateError } = await supabaseClient
      .from("orders")
      .update({
        distance_at_checkout: Math.round(distanceMeters),
        client_latitude: clientLatitude,
        client_longitude: clientLongitude,
        vendor_latitude: vendorLatitude,
        vendor_longitude: vendorLongitude,
        // Store Radar data in location_auth_hash as JSON
        location_auth_hash: JSON.stringify({
          provider: "radar",
          verified_at: timestamp,
          distance_geodesic: distanceMeters,
          distance_walking: walkingDistanceMeters,
          walking_duration: walkingDurationSeconds,
          fraud_passed: fraudPassed,
          fraud_score: fraudScore,
          fraud_flags: fraudFlags
        })
      })
      .eq("id", orderId);

    if (updateError) {
      logStep("Update error", { error: updateError.message });
      throw new Error(`Failed to update order: ${updateError.message}`);
    }

    const result = {
      verified: true,
      fraud_passed: fraudPassed,
      fraud_score: fraudScore,
      fraud_flags: fraudFlags,
      distance: {
        geodesic_meters: distanceMeters,
        walking_meters: walkingDistanceMeters,
        walking_duration_seconds: walkingDurationSeconds,
        walking_duration_text: walkingDurationSeconds > 0 
          ? `${Math.round(walkingDurationSeconds / 60)} min` 
          : null
      },
      verified_at: timestamp,
      provider: "radar",
      recommendation: fraudScore >= 50 
        ? "block" 
        : fraudScore >= 25 
          ? "review" 
          : "allow"
    };

    logStep("Verification complete", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
