import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// ₿ Satoshi Audit System - Generate immutable hash for checkout sessions
async function generateSatoshiAuditHash(payload: object): Promise<string> {
  const timestamp = new Date().toISOString();
  const dataToHash = JSON.stringify({
    ...payload,
    timestamp,
    version: "1.0.0-satoshi-checkout",
  });

  const encoder = new TextEncoder();
  const data = encoder.encode(dataToHash);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  logStep(`₿ Satoshi Audit Hash: ${hash.substring(0, 16)}...`);
  return hash;
}

// Log AI Council event for checkout
// deno-lint-ignore no-explicit-any
async function logAICouncilEvent(
  supabase: any,
  eventType: string,
  payload: object,
  auditHash: string
) {
  try {
    await supabase.from("ai_council_events").insert({
      agent_id: "satoshi_checkout",
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("₿ Satoshi-powered checkout started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Usuário não autenticado");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Erro de autenticação: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("Usuário não autenticado ou email não disponível");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const { amount, productName, productDescription } = await req.json();
    
    if (!amount || amount <= 0) {
      throw new Error("Valor inválido");
    }
    logStep("Request data", { amount, productName });

    // ₿ Generate Satoshi audit hash for this checkout session
    const satoshiHash = await generateSatoshiAuditHash({
      userId: user.id,
      email: user.email,
      amount,
      productName,
      action: "checkout_initiated",
    });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY não configurada");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }
    logStep("Customer check", { customerId: customerId || "new customer" });

    // Create Stripe checkout session
    const origin = req.headers.get("origin") || "https://soupraieiro.lovable.app";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: productName || "Compra Praieiro",
              description: productDescription || "Pagamento via Praieiro",
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}?payment=cancelled`,
      metadata: {
        user_id: user.id,
        amount: amount.toString(),
        satoshi_hash: satoshiHash.substring(0, 32),
      },
    });

    logStep("₿ Checkout session created with Satoshi audit", { sessionId: session.id, satoshiHash: satoshiHash.substring(0, 16) + "..." });

    // Insert payment record with pending status and Satoshi hash
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { error: insertError } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: user.id,
        stripe_session_id: session.id,
        status: "pending",
        amount: amount,
        currency: "brl",
      });

    if (insertError) {
      logStep("Error inserting payment record", { error: insertError.message });
    } else {
      logStep("Payment record created with pending status");
    }

    // ₿ Log AI Council event
    await logAICouncilEvent(supabaseAdmin, "stripe_checkout_created", {
      sessionId: session.id,
      userId: user.id,
      amount,
      productName,
      satoshiHash: satoshiHash.substring(0, 16) + "...",
    }, satoshiHash);

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id,
      satoshiHash: satoshiHash.substring(0, 16) + "...",
    }), {
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
