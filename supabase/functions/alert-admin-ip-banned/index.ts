import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAILS = [
  "tarimunzanzu@gmail.com",
  "soupraieiro.ssa@gmail.com"
];

interface BanAlertRequest {
  ip_address: string;
  reason: string;
  blocked_variable?: string;
  attack_type?: string;
  severity?: string;
  satoshi_hash?: string;
}

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Praieiro Security <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return response.json();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      ip_address, 
      reason, 
      blocked_variable, 
      attack_type, 
      severity,
      satoshi_hash 
    }: BanAlertRequest = await req.json();

    console.log(`[Alert Admin IP Banned] Sending alert for IP: ${ip_address}`);

    const currentDate = new Date().toLocaleString("pt-BR", { 
      timeZone: "America/Sao_Paulo" 
    });

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #dc2626, #991b1b); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .alert-box { background: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e5e5; }
    .info-row:last-child { border-bottom: none; }
    .label { color: #6b7280; font-weight: 500; }
    .value { color: #111827; font-weight: 600; font-family: monospace; }
    .sql-box { background: #1f2937; color: #10b981; border-radius: 8px; padding: 20px; margin-top: 20px; font-family: monospace; font-size: 14px; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 48px; margin-bottom: 10px;">🛡️</div>
      <h1>⚠️ ALERTA SATOSHI - IP BANIDO</h1>
      <p style="margin: 10px 0 0; opacity: 0.9;">Sistema de Segurança Praieiro</p>
    </div>
    
    <div class="content">
      <div class="alert-box">
        <p style="margin: 0; color: #991b1b; font-weight: 600;">
          🚨 Um IP foi banido pelo Sistema Satoshi. Se foi um erro, use os comandos SQL abaixo.
        </p>
      </div>
      
      <div class="info-row">
        <span class="label">📡 IP Banido:</span>
        <span class="value">${ip_address}</span>
      </div>
      
      <div class="info-row">
        <span class="label">📅 Data/Hora:</span>
        <span class="value">${currentDate}</span>
      </div>
      
      <div class="info-row">
        <span class="label">🎯 Tipo de Ataque:</span>
        <span class="value">${attack_type || 'Não especificado'}</span>
      </div>
      
      <div class="info-row">
        <span class="label">🔒 Variável Bloqueada:</span>
        <span class="value">${blocked_variable || 'N/A'}</span>
      </div>
      
      <div class="info-row">
        <span class="label">⚡ Severidade:</span>
        <span class="value">${(severity || 'medium').toUpperCase()}</span>
      </div>
      
      <div class="info-row">
        <span class="label">📝 Motivo:</span>
        <span class="value">${reason}</span>
      </div>
      
      <div class="sql-box">
        <div style="color: #9ca3af;">-- Remover completamente o IP da blacklist</div>
        <div><span style="color: #fbbf24;">DELETE FROM</span> banned_ips <span style="color: #fbbf24;">WHERE</span> ip_address = '${ip_address}';</div>
        <br>
        <div style="color: #9ca3af;">-- Ou apenas desativar (mantém histórico)</div>
        <div><span style="color: #fbbf24;">UPDATE</span> banned_ips <span style="color: #fbbf24;">SET</span> is_active = false <span style="color: #fbbf24;">WHERE</span> ip_address = '${ip_address}';</div>
      </div>
    </div>
    
    <div class="footer">
      <p>🛡️ Sistema de Segurança Satoshi v1.0</p>
      <p>Praieiro — Ledger Imutável de Proteção</p>
    </div>
  </div>
</body>
</html>`;

    // Send to all admin emails
    const results = await Promise.allSettled(
      ADMIN_EMAILS.map(email => 
        sendEmail(email, `🚨 [SATOSHI ALERT] IP Banido: ${ip_address}`, emailHtml)
      )
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failedCount = results.filter(r => r.status === 'rejected').length;

    console.log(`[Alert Admin IP Banned] Sent ${successCount}/${ADMIN_EMAILS.length} emails`);

    // Log to meeting room
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: session } = await supabase
      .from("ai_council_sessions")
      .select("id")
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (session) {
      await supabase.from("ai_council_meeting_messages").insert({
        session_id: session.id,
        sender_type: "agent",
        sender_id: "guardian",
        sender_name: "Sistema de Alertas Satoshi",
        message_content: `📧 **ALERTA ENVIADO POR EMAIL**\n\nIP banido: ${ip_address}\nEmails notificados: ${ADMIN_EMAILS.join(", ")}\nStatus: ${successCount}/${ADMIN_EMAILS.length} enviados`,
        message_type: "email_alert"
      });
    }

    return new Response(
      JSON.stringify({ success: true, emails_sent: successCount, emails_failed: failedCount }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("[Alert Admin IP Banned] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
