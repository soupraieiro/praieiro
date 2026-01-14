import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract IP address from request headers
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const cfConnectingIp = req.headers.get("cf-connecting-ip");
    
    // Priority: CF > Forwarded-For > Real-IP > fallback
    let ipAddress = cfConnectingIp || 
                    (forwardedFor ? forwardedFor.split(",")[0].trim() : null) || 
                    realIp || 
                    "unknown";

    console.log(`[Satoshi IP Check] IP detected: ${ipAddress}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if IP is banned
    const { data: bannedIp, error } = await supabase
      .from("banned_ips")
      .select("id, ip_address, reason, blocked_variable, attack_type, severity, blocked_at, satoshi_hash")
      .eq("ip_address", ipAddress)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("[Satoshi IP Check] Database error:", error);
      // Fail open - don't block on errors
      return new Response(
        JSON.stringify({ 
          ip: ipAddress, 
          is_banned: false, 
          error: "Verification error" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (bannedIp) {
      console.log(`[Satoshi IP Check] BANNED IP DETECTED: ${ipAddress}`);
      console.log(`[Satoshi IP Check] Reason: ${bannedIp.reason}`);
      console.log(`[Satoshi IP Check] Blocked variable: ${bannedIp.blocked_variable}`);

      // Log CLO analysis to meeting
      const cloAnalysis = `Doutor, o sistema baniu o IP ${ipAddress} por tentar acessar a variável dinâmica ${bannedIp.blocked_variable || 'protegida'}. A integridade do Ledger permanece intacta. Hash: ${bannedIp.satoshi_hash || 'N/A'}`;
      
      console.log(`[CLO Analysis] ${cloAnalysis}`);

      return new Response(
        JSON.stringify({ 
          ip: ipAddress, 
          is_banned: true,
          ban_details: {
            reason: bannedIp.reason,
            blocked_variable: bannedIp.blocked_variable,
            attack_type: bannedIp.attack_type,
            severity: bannedIp.severity,
            blocked_at: bannedIp.blocked_at,
            satoshi_hash: bannedIp.satoshi_hash
          },
          clo_analysis: cloAnalysis
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // IP is clean
    return new Response(
      JSON.stringify({ 
        ip: ipAddress, 
        is_banned: false 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Satoshi IP Check] Error:", error);
    
    return new Response(
      JSON.stringify({ 
        ip: "unknown", 
        is_banned: false, 
        error: "Internal error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
