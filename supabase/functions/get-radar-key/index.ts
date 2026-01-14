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
    // Return the publishable key for Radar SDK initialization
    // Note: This is a PUBLISHABLE key, safe for client-side use
    // The secret key is only used server-side in validate-proximity-transaction
    const publishableKey = Deno.env.get("RADAR_PUBLISHABLE_KEY");
    
    if (!publishableKey) {
      console.log("[GET-RADAR-KEY] No publishable key configured");
      return new Response(
        JSON.stringify({ publishableKey: null, message: "Radar not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log("[GET-RADAR-KEY] Returning publishable key");
    
    return new Response(
      JSON.stringify({ publishableKey }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[GET-RADAR-KEY] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
