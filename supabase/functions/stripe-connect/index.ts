import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CONNECT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) {
      throw new Error("Authentication failed");
    }

    const { action } = await req.json();
    const origin = req.headers.get('origin') || 'http://localhost:5173';

    logStep("Action requested", { action, userId: userData.user.id });

    if (action === 'create_account') {
      // Create a Stripe Connect Express account for a vendor
      const { vendorId, email, businessName } = await req.json();

      const account = await stripe.accounts.create({
        type: 'express',
        country: 'BR',
        email,
        business_type: 'individual',
        business_profile: {
          name: businessName,
          mcc: '5499', // Miscellaneous Food Stores
        },
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
      });

      logStep("Stripe Connect account created", { accountId: account.id });

      // Create onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${origin}/vendor/dashboard?refresh=true`,
        return_url: `${origin}/vendor/dashboard?stripe_connected=true`,
        type: 'account_onboarding',
      });

      return new Response(JSON.stringify({
        success: true,
        accountId: account.id,
        onboardingUrl: accountLink.url,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'check_account_status') {
      const { stripeAccountId } = await req.json();

      const account = await stripe.accounts.retrieve(stripeAccountId);

      return new Response(JSON.stringify({
        success: true,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        requirements: account.requirements,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'create_payment_with_split') {
      // Create a payment intent with automatic split
      const { 
        amount, 
        vendorStripeAccountId, 
        orderId,
        platformFeePercent = 10, // 10% platform fee
        proximityVerified,
      } = await req.json();

      // Validate proximity before processing payment
      if (!proximityVerified) {
        throw new Error("Proximity verification required before payment");
      }

      const platformFee = Math.round(amount * (platformFeePercent / 100));

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'brl',
        payment_method_types: ['card', 'pix'],
        application_fee_amount: platformFee,
        transfer_data: {
          destination: vendorStripeAccountId,
        },
        metadata: {
          orderId,
          vendorAccountId: vendorStripeAccountId,
          platformFee: platformFee.toString(),
          proximityVerified: 'true',
        },
      });

      logStep("Payment intent created with split", { 
        paymentIntentId: paymentIntent.id, 
        amount,
        platformFee,
        vendorAmount: amount - platformFee,
      });

      return new Response(JSON.stringify({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        platformFee,
        vendorAmount: amount - platformFee,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'create_login_link') {
      // Create a login link for the vendor's Express dashboard
      const { stripeAccountId } = await req.json();

      const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);

      return new Response(JSON.stringify({
        success: true,
        url: loginLink.url,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_balance') {
      const { stripeAccountId } = await req.json();

      const balance = await stripe.balance.retrieve({
        stripeAccount: stripeAccountId,
      });

      return new Response(JSON.stringify({
        success: true,
        available: balance.available,
        pending: balance.pending,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error("Invalid action");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
