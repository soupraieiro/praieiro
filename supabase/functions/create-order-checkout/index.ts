import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Taxa de serviço fixa
const SERVICE_FEE_PRICE_ID = "price_1Sn6dPEAEvzPUWXXJeuv8yQP";
const PRICE_PER_METER = 0.01; // R$0.01 por metro
const MAX_PROXIMITY_DISTANCE_METERS = 100; // Distância máxima permitida para checkout

// Vincenty distance calculation for geodetic accuracy
function calculateVincentyDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const a = 6378137.0;
  const f = 1 / 298.257223563;
  const b = 6356752.314245;

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
  console.log(`[CREATE-ORDER-CHECKOUT] ${step}${detailsStr}`);
};

// ₿ Satoshi Audit System - Generate immutable hash for order checkouts
async function generateSatoshiAuditHash(payload: object): Promise<string> {
  const timestamp = new Date().toISOString();
  const dataToHash = JSON.stringify({
    ...payload,
    timestamp,
    version: "1.0.0-satoshi-order",
  });

  const encoder = new TextEncoder();
  const data = encoder.encode(dataToHash);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  logStep(`₿ Satoshi Audit Hash: ${hash.substring(0, 16)}...`);
  return hash;
}

// Log AI Council event for order operations
// deno-lint-ignore no-explicit-any
async function logAICouncilEvent(
  supabase: any,
  eventType: string,
  payload: object,
  auditHash: string
) {
  try {
    await supabase.from("ai_council_events").insert({
      agent_id: "satoshi_order",
      event_type: eventType,
      decision_payload: payload,
      audit_hash: auditHash,
      consensus_required: false,
      consensus_reached: true,
    });
    logStep(`₿ AI Council event logged: ${eventType}`);
  } catch (error) {
    logStep(`₿ Warning: Could not log AI Council event`, { error });
  }
}

// Rate limiting cache (in-memory for edge function)
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5; // Max checkout attempts per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitCache.get(userId);
  
  if (!entry || now > entry.resetAt) {
    rateLimitCache.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  entry.count++;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("₿ Satoshi-powered order checkout started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    
    // Rate limiting check
    if (!checkRateLimit(user.id)) {
      logStep("RATE LIMITED", { userId: user.id });
      return new Response(JSON.stringify({ 
        error: "Muitas tentativas de pagamento",
        code: "RATE_LIMITED",
        message: "Aguarde um momento antes de tentar novamente."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    const body = await req.json();
    
    // Validate and sanitize inputs
    const orderId = body.orderId;
    const vendorLatitude = typeof body.vendorLatitude === 'number' ? body.vendorLatitude : null;
    const vendorLongitude = typeof body.vendorLongitude === 'number' ? body.vendorLongitude : null;
    const clientLatitude = typeof body.clientLatitude === 'number' ? body.clientLatitude : null;
    const clientLongitude = typeof body.clientLongitude === 'number' ? body.clientLongitude : null;
    const clientAccuracy = typeof body.clientAccuracy === 'number' ? body.clientAccuracy : null;
    const vendorAccuracy = typeof body.vendorAccuracy === 'number' ? body.vendorAccuracy : null;
    const skipProximityCheck = body.skipProximityCheck === true;
    
    if (!orderId || typeof orderId !== 'string') {
      throw new Error("Order ID is required");
    }
    
    // Validate coordinate ranges if provided
    if (clientLatitude !== null && (clientLatitude < -90 || clientLatitude > 90)) {
      throw new Error("Invalid client latitude");
    }
    if (clientLongitude !== null && (clientLongitude < -180 || clientLongitude > 180)) {
      throw new Error("Invalid client longitude");
    }
    if (vendorLatitude !== null && (vendorLatitude < -90 || vendorLatitude > 90)) {
      throw new Error("Invalid vendor latitude");
    }
    if (vendorLongitude !== null && (vendorLongitude < -180 || vendorLongitude > 180)) {
      throw new Error("Invalid vendor longitude");
    }
    
    logStep("Request data", { orderId, vendorLatitude, vendorLongitude, clientLatitude, clientLongitude });

    // Fetch order details
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select(`
        id,
        total_amount,
        client_id,
        vendor_id,
        status,
        proximity_verified,
        order_items(id, quantity, unit_price, total_price, product:products(name))
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) throw new Error("Order not found");
    logStep("Order fetched", { orderId: order.id, totalAmount: order.total_amount });

    // ₿ Generate Satoshi audit hash for order checkout
    const satoshiHash = await generateSatoshiAuditHash({
      orderId: order.id,
      userId: user.id,
      totalAmount: order.total_amount,
      clientId: order.client_id,
      vendorId: order.vendor_id,
      action: "order_checkout_initiated",
    });

    // Calculate distance using Vincenty formula (geodetic accuracy)
    let distanceFee = 0;
    let distanceMeters = 0;
    let proximityVerified = false;
    let locationAuthHash = "";
    const verifiedAt = new Date().toISOString();
    
    if (vendorLatitude && vendorLongitude && clientLatitude && clientLongitude) {
      // Use Vincenty for geodetic precision
      distanceMeters = calculateVincentyDistance(
        clientLatitude,
        clientLongitude,
        vendorLatitude,
        vendorLongitude
      );
      
      // Calculate effective margin based on GPS accuracy
      const clientAcc = clientAccuracy || 0;
      const vendorAcc = vendorAccuracy || 0;
      const effectiveMargin = Math.sqrt(clientAcc * clientAcc + vendorAcc * vendorAcc);
      const maxAllowed = MAX_PROXIMITY_DISTANCE_METERS + effectiveMargin;
      
      proximityVerified = distanceMeters <= maxAllowed;
      
      logStep("Proximity verification", { 
        distanceMeters: Math.round(distanceMeters), 
        maxAllowed: Math.round(maxAllowed),
        proximityVerified
      });

      // SECURITY: Block checkout if proximity not verified (unless admin override)
      if (!proximityVerified && !skipProximityCheck) {
        logStep("BLOCKED: Distance exceeds limit", { distanceMeters, maxAllowed });
        return new Response(JSON.stringify({ 
          error: "Distância muito grande para pagamento",
          code: "PROXIMITY_EXCEEDED",
          distance_meters: Math.round(distanceMeters),
          max_allowed_meters: Math.round(maxAllowed),
          message: `Você está a ${Math.round(distanceMeters)}m do vendedor. Máximo permitido: ${Math.round(maxAllowed)}m. Aproxime-se do vendedor para pagar.`
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403, // Forbidden
        });
      }

      // Generate cryptographic hash for location authentication
      locationAuthHash = await generateLocationHash(
        orderId,
        clientLatitude,
        clientLongitude,
        vendorLatitude,
        vendorLongitude,
        verifiedAt
      );

      distanceFee = Math.round(distanceMeters * PRICE_PER_METER * 100) / 100;
      logStep("Distance calculated", { distanceMeters: Math.round(distanceMeters), distanceFee, locationAuthHash: locationAuthHash.substring(0, 16) + "..." });
    } else if (!skipProximityCheck) {
      // SECURITY: Require coordinates for checkout
      logStep("BLOCKED: Coordinates required");
      return new Response(JSON.stringify({ 
        error: "Localização obrigatória para pagamento",
        code: "LOCATION_REQUIRED",
        message: "Ative a localização do dispositivo para realizar o pagamento com segurança."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }
    logStep("Customer check", { customerId: customerId || "new customer" });

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    // Add order products
    const orderTotal = order.total_amount || 0;
    if (orderTotal > 0) {
      lineItems.push({
        price_data: {
          currency: "brl",
          product_data: {
            name: "Produtos do Pedido",
            description: order.order_items?.map((item: any) => 
              `${item.quantity}x ${item.product?.name || 'Produto'}`
            ).join(", ") || "Itens do pedido",
          },
          unit_amount: Math.round(orderTotal * 100), // Convert to cents
        },
        quantity: 1,
      });
    }

    // Add service fee (fixed R$1)
    lineItems.push({
      price: SERVICE_FEE_PRICE_ID,
      quantity: 1,
    });

    // Add distance fee if applicable
    if (distanceFee > 0) {
      lineItems.push({
        price_data: {
          currency: "brl",
          product_data: {
            name: "Taxa de Distância",
            description: `${distanceMeters}m x R$0,01/metro`,
          },
          unit_amount: Math.round(distanceFee * 100), // Convert to cents
        },
        quantity: 1,
      });
    }

    logStep("Line items prepared", { itemCount: lineItems.length });

    // Create checkout session
    const origin = req.headers.get("origin") || "http://localhost:5173";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/meus-pedidos?payment=success&order=${orderId}`,
      cancel_url: `${origin}/meus-pedidos?payment=cancelled&order=${orderId}`,
      metadata: {
        order_id: orderId,
        distance_meters: distanceMeters.toString(),
        distance_fee: distanceFee.toString(),
        service_fee: "1.00",
        satoshi_hash: satoshiHash.substring(0, 32),
      },
    });

    logStep("₿ Checkout session created with Satoshi audit", { sessionId: session.id, satoshiHash: satoshiHash.substring(0, 16) + "..." });

    // ₿ Log AI Council event for order checkout
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await logAICouncilEvent(supabaseAdmin, "order_checkout_created", {
      sessionId: session.id,
      orderId: order.id,
      userId: user.id,
      totalAmount: order.total_amount,
      distanceMeters,
      satoshiHash: satoshiHash.substring(0, 16) + "...",
    }, satoshiHash);

    

    // Update order with checkout session info and proximity verification
    const updateData: Record<string, unknown> = {
      payment_status: "checkout_initiated",
    };

    // Store proximity verification data if coordinates were provided
    if (vendorLatitude && vendorLongitude && clientLatitude && clientLongitude) {
      updateData.proximity_verified = proximityVerified;
      updateData.proximity_verified_at = verifiedAt;
      updateData.distance_at_checkout = Math.round(distanceMeters);
      updateData.location_auth_hash = locationAuthHash;
      updateData.client_latitude = clientLatitude;
      updateData.client_longitude = clientLongitude;
      updateData.client_accuracy_radius = clientAccuracy || null;
      updateData.vendor_latitude = vendorLatitude;
      updateData.vendor_longitude = vendorLongitude;
      updateData.vendor_accuracy_radius = vendorAccuracy || null;
      updateData.client_location_timestamp = verifiedAt;
      updateData.vendor_location_timestamp = verifiedAt;
    }

    await supabaseClient
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id,
      distanceMeters,
      distanceFee,
      serviceFee: 1.00,
      productTotal: orderTotal,
      grandTotal: orderTotal + 1 + distanceFee,
      satoshiHash: satoshiHash.substring(0, 16) + "...",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    // Return generic error message for security, detailed error logged server-side
    const safeErrors = ["Order ID is required", "Invalid client latitude", "Invalid client longitude", "Invalid vendor latitude", "Invalid vendor longitude", "Order not found"];
    const isSafeError = safeErrors.some(e => errorMessage.includes(e));
    return new Response(JSON.stringify({ error: isSafeError ? errorMessage : "Erro ao processar pagamento" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: isSafeError ? 400 : 500,
    });
  }
});
