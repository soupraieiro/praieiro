import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONFIRM-DELIVERY] ${step}${detailsStr}`);
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
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { orderId } = await req.json();
    if (!orderId) throw new Error("Order ID is required");
    logStep("Confirming delivery for order", { orderId });

    // Get order details
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("id, vendor_id, total_amount, status, payment_status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    if (order.payment_status !== "paid") {
      throw new Error("Order payment not confirmed");
    }

    if (order.status === "completed") {
      logStep("Order already completed");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Pedido já foi concluído" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verify user is the vendor for this order
    const { data: vendor } = await supabaseClient
      .from("vendors")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!vendor || vendor.id !== order.vendor_id) {
      throw new Error("Unauthorized - not the vendor for this order");
    }

    // Calculate vendor amount (product value only, fees go to platform)
    // Service fee = R$1.00, Distance fee = R$0.01/meter (already deducted from total in checkout)
    const totalAmount = Number(order.total_amount) || 0;
    
    // Get original product total from order_items
    const { data: orderItems } = await supabaseClient
      .from("order_items")
      .select("total_price")
      .eq("order_id", orderId);

    const productTotal = orderItems?.reduce((sum, item) => sum + Number(item.total_price), 0) || 0;
    
    // Vendor receives only the product value
    const vendorAmount = productTotal;
    
    logStep("Calculated amounts", { 
      totalAmount, 
      productTotal,
      vendorAmount 
    });

    // Update order status to completed
    const { error: updateError } = await supabaseClient
      .from("orders")
      .update({ status: "completed" })
      .eq("id", orderId);

    if (updateError) {
      throw new Error(`Failed to update order: ${updateError.message}`);
    }

    // Transfer funds to vendor wallet
    if (vendorAmount > 0) {
      // Record transaction
      await supabaseClient
        .from("vendor_transactions")
        .insert({
          vendor_id: order.vendor_id,
          order_id: orderId,
          amount: vendorAmount,
          type: "sale",
          description: `Venda - Pedido #${orderId.slice(0, 8)}`,
        });

      // Update vendor wallet balance
      const { data: wallet } = await supabaseClient
        .from("vendor_wallets")
        .select("balance, total_received")
        .eq("vendor_id", order.vendor_id)
        .single();

      if (wallet) {
        await supabaseClient
          .from("vendor_wallets")
          .update({
            balance: Number(wallet.balance) + vendorAmount,
            total_received: Number(wallet.total_received) + vendorAmount,
          })
          .eq("vendor_id", order.vendor_id);
      } else {
        await supabaseClient
          .from("vendor_wallets")
          .insert({
            vendor_id: order.vendor_id,
            balance: vendorAmount,
            total_received: vendorAmount,
          });
      }

      logStep("Vendor wallet updated", { vendorAmount });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "Entrega confirmada e saldo transferido",
      vendorAmount,
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
