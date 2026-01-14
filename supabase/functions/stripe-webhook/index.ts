import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Satoshi Audit System - Generate immutable hash for financial transactions
async function generateSatoshiAuditHash(
  payload: object,
  previousHash: string | null
): Promise<string> {
  const timestamp = new Date().toISOString();
  const data = JSON.stringify({
    ...payload,
    timestamp,
    previousHash: previousHash || "GENESIS_STRIPE",
    version: "1.0.0-satoshi",
  });

  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  console.log(`[STRIPE-WEBHOOK] ₿ Satoshi Audit: ${hash.substring(0, 16)}...`);
  return hash;
}

// Log AI Council event for Stripe operations
// deno-lint-ignore no-explicit-any
async function logAICouncilEvent(supabase: any, eventType: string, payload: object, auditHash: string) {
  try {
    await supabase.from("ai_council_events").insert({
      agent_id: "satoshi_financial",
      event_type: eventType,
      decision_payload: payload,
      audit_hash: auditHash,
      consensus_required: eventType.includes("refund") || eventType.includes("failed"),
      consensus_reached: true,
    });
    logStep("AI Council event logged", { eventType });
  } catch (error) {
    console.error("Failed to log AI Council event:", error);
  }
}

// Process Concha Webhook - Register concha operations via RPC
// deno-lint-ignore no-explicit-any
async function processConchaWebhook(
  supabase: any,
  webhookType: string,
  payload: object
): Promise<{ success: boolean; error?: string; [key: string]: unknown }> {
  logStep("₿ Chamando process_concha_webhook RPC", { webhookType });

  try {
    const { data, error } = await supabase.rpc("process_concha_webhook", {
      p_webhook_type: webhookType,
      p_webhook_payload: payload,
      p_signature: null,
      p_source_ip: null,
    });

    if (error) {
      logStep("Erro no process_concha_webhook", { error: error.message });
      return { success: false, error: error.message };
    }

    logStep("₿ Concha registrada no Ledger", { result: data });
    return data || { success: true };
  } catch (err) {
    logStep("Exceção no process_concha_webhook", { error: String(err) });
    return { success: false, error: String(err) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  
  if (!stripeKey) {
    logStep("ERROR: STRIPE_SECRET_KEY not configured");
    return new Response(JSON.stringify({ error: "Configuration error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  // SECURITY: Webhook secret is REQUIRED - never process unsigned webhooks
  if (!webhookSecret) {
    logStep("ERROR: STRIPE_WEBHOOK_SECRET not configured - rejecting request");
    return new Response(JSON.stringify({ error: "Configuration error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  // SECURITY: Signature is REQUIRED - reject requests without it
  if (!signature) {
    logStep("ERROR: Missing stripe-signature header");
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    logStep("Webhook signature verified", { eventType: event.type });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logStep("Webhook signature verification failed", { error: errorMessage });
    return new Response(JSON.stringify({ error: "Webhook signature verification failed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Generate Satoshi audit hash for all financial events
    const auditPayload = {
      eventType: event.type,
      eventId: event.id,
      livemode: event.livemode,
      created: event.created,
    };

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        const satoshiHash = await generateSatoshiAuditHash({
          ...auditPayload,
          sessionId: session.id,
          amount: session.amount_total,
          currency: session.currency,
          paymentStatus: session.payment_status,
          customerId: session.customer,
        }, null);

        logStep("₿ Processing checkout.session.completed", { 
          sessionId: session.id, 
          paymentStatus: session.payment_status,
          metadata: session.metadata,
          satoshiHash: satoshiHash.substring(0, 16) + "..."
        });

        // Log to AI Council
        await logAICouncilEvent(supabase, "stripe_checkout_completed", {
          sessionId: session.id,
          amount: session.amount_total,
          currency: session.currency,
          metadata: session.metadata,
        }, satoshiHash);

        if (session.payment_status === "paid") {
          const metadata = session.metadata;
          
          // Calculate conchas to earn (1 concha per R$10 spent)
          const amountInReais = (session.amount_total || 0) / 100;
          const conchasToEarn = Math.floor(amountInReais / 10);
          
          // Register conchas via RPC if applicable
          if (conchasToEarn > 0 && metadata?.client_id) {
            logStep("₿ Registrando conchas para cliente", { 
              clientId: metadata.client_id, 
              conchas: conchasToEarn,
              amountPaid: amountInReais
            });
            
            await processConchaWebhook(supabase, "stripe.checkout.session.completed", {
              client_id: metadata.client_id,
              conchas_amount: conchasToEarn,
              order_id: metadata.order_id || null,
              amount_total: session.amount_total,
              session_id: session.id,
              metadata: session.metadata
            });
          }
          
          // Handle wallet deposits
          if (metadata?.user_id && metadata?.deposit_amount) {
            await handleWalletDeposit(supabase, metadata.user_id, parseFloat(metadata.deposit_amount), satoshiHash);
          } 
          // Handle order payments
          else if (metadata?.order_id) {
            await handleOrderPayment(supabase, metadata.order_id, satoshiHash);
          }
          
          // Update payments table status to completed
          const { error: paymentUpdateError } = await supabase
            .from("payments")
            .update({ status: "completed" })
            .eq("stripe_session_id", session.id);
            
          if (paymentUpdateError) {
            logStep("Error updating payment status", { error: paymentUpdateError.message });
          } else {
            logStep("Payment status updated to completed", { sessionId: session.id });
          }
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        const satoshiHash = await generateSatoshiAuditHash({
          ...auditPayload,
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        }, null);

        logStep("₿ Payment intent succeeded", { 
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          metadata: paymentIntent.metadata,
          satoshiHash: satoshiHash.substring(0, 16) + "..."
        });

        await logAICouncilEvent(supabase, "stripe_payment_succeeded", {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        }, satoshiHash);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        const satoshiHash = await generateSatoshiAuditHash({
          ...auditPayload,
          paymentIntentId: paymentIntent.id,
          errorMessage: paymentIntent.last_payment_error?.message,
          failureCode: paymentIntent.last_payment_error?.code,
        }, null);

        logStep("₿ Payment intent failed", { 
          paymentIntentId: paymentIntent.id,
          error: paymentIntent.last_payment_error?.message,
          satoshiHash: satoshiHash.substring(0, 16) + "..."
        });

        await logAICouncilEvent(supabase, "stripe_payment_failed", {
          paymentIntentId: paymentIntent.id,
          errorMessage: paymentIntent.last_payment_error?.message,
          failureCode: paymentIntent.last_payment_error?.code,
        }, satoshiHash);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        
        const satoshiHash = await generateSatoshiAuditHash({
          ...auditPayload,
          chargeId: charge.id,
          amountRefunded: charge.amount_refunded,
          currency: charge.currency,
        }, null);

        logStep("₿ Charge refunded", { 
          chargeId: charge.id,
          amount: charge.amount_refunded,
          satoshiHash: satoshiHash.substring(0, 16) + "..."
        });

        await logAICouncilEvent(supabase, "stripe_refund", {
          chargeId: charge.id,
          amountRefunded: charge.amount_refunded,
          currency: charge.currency,
        }, satoshiHash);
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR processing webhook", { message: errorMessage });
    // Return generic error to client, detailed error logged server-side
    return new Response(JSON.stringify({ error: "Internal error processing webhook" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// deno-lint-ignore no-explicit-any
async function handleWalletDeposit(supabase: any, userId: string, amount: number, satoshiHash: string) {
  logStep("₿ Processing wallet deposit with Satoshi audit", { userId, amount, satoshiHash: satoshiHash.substring(0, 16) + "..." });

  try {
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (clientError || !client) {
      logStep("Client not found", { userId, error: clientError?.message });
      return;
    }

    const clientId = client.id;

    let { data: wallet } = await supabase
      .from("client_conchas")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle();

    if (!wallet) {
      const { data: newWallet, error: createError } = await supabase
        .from("client_conchas")
        .insert({
          client_id: clientId,
          balance: 0,
          reais_balance: 0,
          total_deposited: 0,
          total_spent: 0,
          total_earned: 0,
        })
        .select()
        .single();

      if (createError) {
        logStep("Failed to create wallet", { error: createError.message });
        return;
      }
      wallet = newWallet;
    }

    const newReaisBalance = Number(wallet?.reais_balance || 0) + amount;
    const newTotalDeposited = Number(wallet?.total_deposited || 0) + amount;

    const { error: updateError } = await supabase
      .from("client_conchas")
      .update({
        reais_balance: newReaisBalance,
        total_deposited: newTotalDeposited,
        updated_at: new Date().toISOString(),
      })
      .eq("client_id", clientId);

    if (updateError) {
      logStep("Failed to update wallet", { error: updateError.message });
      return;
    }

    // Record transaction with Satoshi audit hash
    const { error: txError } = await supabase
      .from("client_transactions")
      .insert({
        client_id: clientId,
        type: "deposit",
        amount: amount,
        description: `₿ Depósito via Stripe - R$ ${amount.toFixed(2)} | Satoshi: ${satoshiHash.substring(0, 12)}`,
      });

    if (txError) {
      logStep("Failed to create transaction record", { error: txError.message });
    }

    logStep("₿ Wallet deposit completed successfully", { 
      clientId, 
      amount, 
      newBalance: newReaisBalance,
      satoshiHash: satoshiHash.substring(0, 16) + "..."
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Error in handleWalletDeposit", { message: errorMessage });
  }
}

// deno-lint-ignore no-explicit-any
async function handleOrderPayment(supabase: any, orderId: string, satoshiHash: string) {
  logStep("₿ Processing order payment with Satoshi audit", { orderId, satoshiHash: satoshiHash.substring(0, 16) + "..." });

  try {
    const { error } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      logStep("Failed to update order", { error: error.message });
      return;
    }

    logStep("₿ Order payment completed successfully", { orderId, satoshiHash: satoshiHash.substring(0, 16) + "..." });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Error in handleOrderPayment", { message: errorMessage });
  }
}
