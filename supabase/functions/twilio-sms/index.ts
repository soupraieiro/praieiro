import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error("Twilio credentials not configured");
    }

    const { action, to, message, templateId, templateData } = await req.json();
    console.log(`[TWILIO] Action: ${action}, To: ${to}`);

    if (action === "send_sms") {
      if (!to || !message) {
        throw new Error("'to' and 'message' are required");
      }

      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const auth = btoa(`${accountSid}:${authToken}`);

      const body = new URLSearchParams({
        To: to,
        From: fromNumber,
        Body: message,
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Twilio error: ${errorData.message || response.status}`);
      }

      const data = await response.json();

      return new Response(JSON.stringify({
        success: true,
        sid: data.sid,
        status: data.status,
        to: data.to,
        dateCreated: data.date_created,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send_whatsapp") {
      if (!to || !message) {
        throw new Error("'to' and 'message' are required");
      }

      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const auth = btoa(`${accountSid}:${authToken}`);

      // WhatsApp requires 'whatsapp:' prefix
      const whatsappTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
      const whatsappFrom = `whatsapp:${fromNumber}`;

      const body = new URLSearchParams({
        To: whatsappTo,
        From: whatsappFrom,
        Body: message,
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Twilio WhatsApp error: ${errorData.message || response.status}`);
      }

      const data = await response.json();

      return new Response(JSON.stringify({
        success: true,
        sid: data.sid,
        status: data.status,
        to: data.to,
        dateCreated: data.date_created,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify_start") {
      // Start phone verification
      if (!to) {
        throw new Error("'to' phone number is required");
      }

      const verifyServiceSid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");
      if (!verifyServiceSid) {
        throw new Error("TWILIO_VERIFY_SERVICE_SID not configured");
      }

      const url = `https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`;
      const auth = btoa(`${accountSid}:${authToken}`);

      const body = new URLSearchParams({
        To: to,
        Channel: "sms",
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Twilio Verify error: ${errorData.message || response.status}`);
      }

      const data = await response.json();

      return new Response(JSON.stringify({
        success: true,
        status: data.status,
        to: data.to,
        channel: data.channel,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: send_sms, send_whatsapp, verify_start" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[TWILIO] Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
