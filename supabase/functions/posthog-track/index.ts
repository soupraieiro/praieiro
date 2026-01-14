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
    const apiKey = Deno.env.get("POSTHOG_API_KEY");
    const host = Deno.env.get("POSTHOG_HOST") || "https://app.posthog.com";
    
    if (!apiKey) {
      throw new Error("POSTHOG_API_KEY not configured");
    }

    const { action, event, distinctId, properties, userProperties, featureFlag } = await req.json();
    console.log(`[POSTHOG] Action: ${action}, Event: ${event}, DistinctId: ${distinctId}`);

    if (action === "capture") {
      if (!event || !distinctId) {
        throw new Error("'event' and 'distinctId' are required");
      }

      const response = await fetch(`${host}/capture/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          event,
          distinct_id: distinctId,
          properties: {
            ...properties,
            $lib: "praieiro-backend",
          },
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`PostHog capture error: ${response.status}`);
      }

      return new Response(JSON.stringify({
        success: true,
        event,
        distinctId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "identify") {
      if (!distinctId) {
        throw new Error("'distinctId' is required for identify");
      }

      const response = await fetch(`${host}/capture/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          event: "$identify",
          distinct_id: distinctId,
          properties: {
            $set: userProperties || {},
          },
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`PostHog identify error: ${response.status}`);
      }

      return new Response(JSON.stringify({
        success: true,
        distinctId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "alias") {
      const { alias } = await req.json();
      if (!distinctId || !alias) {
        throw new Error("'distinctId' and 'alias' are required");
      }

      const response = await fetch(`${host}/capture/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          event: "$create_alias",
          distinct_id: distinctId,
          properties: {
            alias,
          },
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`PostHog alias error: ${response.status}`);
      }

      return new Response(JSON.stringify({
        success: true,
        distinctId,
        alias,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "feature_flag") {
      if (!distinctId || !featureFlag) {
        throw new Error("'distinctId' and 'featureFlag' are required");
      }

      const response = await fetch(`${host}/decide/?v=3`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          distinct_id: distinctId,
        }),
      });

      if (!response.ok) {
        throw new Error(`PostHog feature flag error: ${response.status}`);
      }

      const data = await response.json();
      const flagValue = data.featureFlags?.[featureFlag];

      return new Response(JSON.stringify({
        success: true,
        featureFlag,
        enabled: !!flagValue,
        value: flagValue,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "batch") {
      const { events } = await req.json();
      if (!events || !Array.isArray(events)) {
        throw new Error("'events' array is required for batch");
      }

      const batch = events.map((e: {
        event: string;
        distinctId: string;
        properties?: Record<string, unknown>;
      }) => ({
        event: e.event,
        distinct_id: e.distinctId,
        properties: e.properties || {},
        timestamp: new Date().toISOString(),
      }));

      const response = await fetch(`${host}/batch/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          batch,
        }),
      });

      if (!response.ok) {
        throw new Error(`PostHog batch error: ${response.status}`);
      }

      return new Response(JSON.stringify({
        success: true,
        processed: batch.length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: capture, identify, alias, feature_flag, batch" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[POSTHOG] Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
