import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REQUEST-PIX-WITHDRAWAL] ${step}${detailsStr}`);
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

    const { amount, pixKey, pixKeyType } = await req.json();
    
    if (!amount || amount <= 0) {
      throw new Error("Invalid withdrawal amount");
    }
    
    if (!pixKey) {
      throw new Error("PIX key is required");
    }
    
    logStep("Withdrawal request", { amount, pixKeyType });

    // Get vendor info
    const { data: vendor, error: vendorError } = await supabaseClient
      .from("vendors")
      .select("id, full_name")
      .eq("user_id", user.id)
      .single();

    if (vendorError || !vendor) {
      throw new Error("Vendor not found");
    }

    // Get current wallet balance
    const { data: wallet, error: walletError } = await supabaseClient
      .from("vendor_wallets")
      .select("balance")
      .eq("vendor_id", vendor.id)
      .single();

    if (walletError || !wallet) {
      throw new Error("Wallet not found");
    }

    const currentBalance = Number(wallet.balance);
    if (amount > currentBalance) {
      throw new Error(`Saldo insuficiente. Disponível: R$ ${currentBalance.toFixed(2)}`);
    }

    logStep("Balance check passed", { currentBalance, requestedAmount: amount });

    // Get current total_withdrawn
    const { data: currentWallet } = await supabaseClient
      .from("vendor_wallets")
      .select("total_withdrawn")
      .eq("vendor_id", vendor.id)
      .single();

    const currentWithdrawn = Number(currentWallet?.total_withdrawn) || 0;
    
    // Deduct from wallet balance and update total_withdrawn
    const newBalance = currentBalance - amount;
    const { error: updateError } = await supabaseClient
      .from("vendor_wallets")
      .update({
        balance: newBalance,
        total_withdrawn: currentWithdrawn + amount,
      })
      .eq("vendor_id", vendor.id);

    if (updateError) {
      throw new Error(`Failed to update wallet: ${updateError.message}`);
    }

    // Record withdrawal transaction
    await supabaseClient
      .from("vendor_transactions")
      .insert({
        vendor_id: vendor.id,
        amount: amount,
        type: "withdrawal",
        description: `Saque PIX - ${pixKeyType || 'Chave'}: ${pixKey.slice(0, 4)}***`,
      });

    logStep("Withdrawal processed", { 
      newBalance, 
      withdrawnAmount: amount 
    });

    // In production, this would integrate with a PIX API (e.g., Pagar.me, Stripe Pix, etc.)
    // For now, we just record the request and assume manual processing
    
    return new Response(JSON.stringify({ 
      success: true,
      message: "Saque PIX solicitado com sucesso! O valor será transferido em até 2 dias úteis.",
      newBalance,
      withdrawnAmount: amount,
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
