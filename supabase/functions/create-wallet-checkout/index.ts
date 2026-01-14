import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-WALLET-CHECKOUT] ${step}${detailsStr}`);
};

// ₿ Satoshi Audit System - Generate immutable hash for wallet deposits
async function generateSatoshiAuditHash(payload: object): Promise<string> {
  const timestamp = new Date().toISOString();
  const dataToHash = JSON.stringify({
    ...payload,
    timestamp,
    version: "1.0.0-satoshi-wallet",
  });

  const encoder = new TextEncoder();
  const data = encoder.encode(dataToHash);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  logStep(`₿ Satoshi Audit Hash: ${hash.substring(0, 16)}...`);
  return hash;
}

// Log AI Council event for wallet operations
// deno-lint-ignore no-explicit-any
async function logAICouncilEvent(
  supabase: any,
  eventType: string,
  payload: object,
  auditHash: string
) {
  try {
    await supabase.from("ai_council_events").insert({
      agent_id: "satoshi_wallet",
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
    logStep("₿ Satoshi-powered wallet checkout started");
    
    const { amount, paymentMethod } = await req.json();
    logStep("Request data", { amount, paymentMethod });
    
    if (!amount || amount <= 0 || amount > 9999999.99) {
      throw new Error("Valor inválido. Mínimo: R$ 0,01 - Máximo: R$ 9.999.999,99");
    }

    // Validate payment method
    const validMethods = ["pix", "card"];
    if (!validMethods.includes(paymentMethod)) {
      throw new Error("Método de pagamento inválido");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // ₿ Generate Satoshi audit hash for wallet deposit
    const satoshiHash = await generateSatoshiAuditHash({
      userId: user.id,
      email: user.email,
      amount,
      paymentMethod,
      action: "wallet_deposit_initiated",
    });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");
    logStep("Stripe key verified");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    // Convert amount to cents
    const amountInCents = Math.round(amount * 100);
    logStep("Amount in cents", { amountInCents });

    // Configure payment method types based on user selection
    let paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = [];
    
    switch (paymentMethod) {
      case "pix":
        paymentMethodTypes = ["pix"];
        break;
      case "card":
        paymentMethodTypes = ["card"];
        break;
      default:
        paymentMethodTypes = ["card", "pix"];
    }

    const origin = req.headers.get("origin") || "https://soupraieiro.lovable.app";
    logStep("Creating checkout session", { paymentMethodTypes, origin });

    // Create checkout session with dynamic pricing and Satoshi audit
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: "Depósito P-Wallet",
              description: `₿ Depósito de R$ ${amount.toFixed(2)} na sua P-Wallet Praieiro | Satoshi Verified`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_method_types: paymentMethodTypes,
      success_url: `${origin}/encontrar?payment=success&amount=${amount}`,
      cancel_url: `${origin}/encontrar?payment=cancelled`,
      metadata: {
        user_id: user.id,
        deposit_amount: amount.toString(),
        payment_method: paymentMethod,
        satoshi_hash: satoshiHash.substring(0, 32),
      },
    });

    logStep("₿ Checkout session created with Satoshi audit", { sessionId: session.id, satoshiHash: satoshiHash.substring(0, 16) + "..." });

    // ₿ Log AI Council event for wallet deposit
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await logAICouncilEvent(supabaseAdmin, "wallet_deposit_checkout_created", {
      sessionId: session.id,
      userId: user.id,
      amount,
      paymentMethod,
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
