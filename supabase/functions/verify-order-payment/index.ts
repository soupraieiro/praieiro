import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-ORDER-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { orderId } = await req.json();
    if (!orderId) throw new Error("Order ID is required");
    logStep("Verifying payment for order", { orderId });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find checkout sessions for this order
    const sessions = await stripe.checkout.sessions.list({
      limit: 10,
    });

    const orderSession = sessions.data.find(
      (session: Stripe.Checkout.Session) => session.metadata?.order_id === orderId
    );

    if (!orderSession) {
      logStep("No checkout session found for order");
      return new Response(JSON.stringify({ 
        paid: false, 
        status: "no_session" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found checkout session", { 
      sessionId: orderSession.id, 
      paymentStatus: orderSession.payment_status 
    });

    const isPaid = orderSession.payment_status === "paid";

    if (isPaid) {
      // Update order status - payment confirmed, but vendor wallet is updated ONLY after delivery confirmation
      const { error: updateError } = await supabaseClient
        .from("orders")
        .update({
          status: "pending", // Now pending vendor acceptance
          payment_status: "paid",
        })
        .eq("id", orderId);

      if (updateError) {
        logStep("Error updating order", { error: updateError.message });
      } else {
        logStep("Order updated to paid status - funds held until delivery confirmation");
      }

      // Store payment metadata for later transfer when order is completed
      const { data: order } = await supabaseClient
        .from("orders")
        .select("vendor_id, total_amount")
        .eq("id", orderId)
        .single();

      if (order) {
        const serviceFee = parseFloat(orderSession.metadata?.service_fee || "1");
        const distanceFee = parseFloat(orderSession.metadata?.distance_fee || "0");
        const vendorAmount = (order.total_amount || 0) - serviceFee - distanceFee;
        
        logStep("Payment recorded - vendor will receive after delivery", { 
          vendorAmount,
          serviceFee,
          distanceFee
        });
      }
    }

    return new Response(JSON.stringify({ 
      paid: isPaid,
      status: orderSession.payment_status,
      amountTotal: orderSession.amount_total,
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
