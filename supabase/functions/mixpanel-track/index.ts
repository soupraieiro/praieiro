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
    const token = Deno.env.get("MIXPANEL_TOKEN");
    if (!token) {
      throw new Error("MIXPANEL_TOKEN not configured");
    }

    const { action, events, userId, properties, profileData } = await req.json();
    console.log(`[MIXPANEL] Action: ${action}, UserId: ${userId}`);

    if (action === "track") {
      if (!events || !Array.isArray(events)) {
        throw new Error("'events' array is required");
      }

      const formattedEvents = events.map((event: {
        name: string;
        properties?: Record<string, unknown>;
        distinctId?: string;
      }) => ({
        event: event.name,
        properties: {
          token,
          distinct_id: event.distinctId || userId || "anonymous",
          time: Math.floor(Date.now() / 1000),
          ...event.properties,
        },
      }));

      const response = await fetch("https://api.mixpanel.com/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/plain",
        },
        body: JSON.stringify(formattedEvents),
      });

      if (!response.ok) {
        throw new Error(`Mixpanel track error: ${response.status}`);
      }

      const result = await response.text();

      return new Response(JSON.stringify({
        success: result === "1",
        tracked: formattedEvents.length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "identify") {
      if (!userId) {
        throw new Error("'userId' is required for identify");
      }

      const data = {
        $token: token,
        $distinct_id: userId,
        $set: profileData || {},
      };

      const encodedData = btoa(JSON.stringify(data));

      const response = await fetch(`https://api.mixpanel.com/engage?data=${encodedData}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`Mixpanel identify error: ${response.status}`);
      }

      const result = await response.text();

      return new Response(JSON.stringify({
        success: result === "1",
        userId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "profile_set") {
      if (!userId || !profileData) {
        throw new Error("'userId' and 'profileData' are required");
      }

      const data = {
        $token: token,
        $distinct_id: userId,
        $set: profileData,
      };

      const encodedData = btoa(JSON.stringify(data));

      const response = await fetch(`https://api.mixpanel.com/engage?data=${encodedData}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`Mixpanel profile_set error: ${response.status}`);
      }

      const result = await response.text();

      return new Response(JSON.stringify({
        success: result === "1",
        userId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "increment") {
      if (!userId || !properties) {
        throw new Error("'userId' and 'properties' are required for increment");
      }

      const data = {
        $token: token,
        $distinct_id: userId,
        $add: properties,
      };

      const encodedData = btoa(JSON.stringify(data));

      const response = await fetch(`https://api.mixpanel.com/engage?data=${encodedData}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`Mixpanel increment error: ${response.status}`);
      }

      const result = await response.text();

      return new Response(JSON.stringify({
        success: result === "1",
        userId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: track, identify, profile_set, increment" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[MIXPANEL] Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
