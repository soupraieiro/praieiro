import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SecurityAlertRequest {
  eventType: string;
  identifier: string;
  ipAddress?: string;
  details?: Record<string, unknown>;
  adminEmail: string;
}

const eventTypeMessages: Record<string, { subject: string; description: string }> = {
  rate_limit_exceeded: {
    subject: "⚠️ Alerta: Limite de tentativas excedido",
    description: "Múltiplas tentativas de autenticação foram bloqueadas",
  },
  login_failed_multiple: {
    subject: "🚨 Alerta: Múltiplas falhas de login",
    description: "Várias tentativas de login falharam para esta conta",
  },
  suspicious_activity: {
    subject: "🔴 Alerta: Atividade suspeita detectada",
    description: "Foi detectada atividade suspeita no sistema",
  },
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventType, identifier, ipAddress, details, adminEmail }: SecurityAlertRequest = await req.json();

    if (!eventType || !identifier || !adminEmail) {
      return new Response(
        JSON.stringify({ error: "eventType, identifier and adminEmail are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const eventInfo = eventTypeMessages[eventType] || {
      subject: `⚠️ Alerta de Segurança: ${eventType}`,
      description: `Evento de segurança: ${eventType}`,
    };

    const timestamp = new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Alerta de Segurança</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin: 0;">🛡️ Alerta de Segurança</h1>
            <p style="color: #666; margin-top: 10px;">Praieiro - Sistema de Monitoramento</p>
          </div>
          
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
            <h2 style="color: #dc2626; margin: 0 0 10px 0; font-size: 18px;">${eventInfo.description}</h2>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #333;">Evento:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">${eventType}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #333;">Identificador:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666; font-family: monospace;">${identifier}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #333;">Endereço IP:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666; font-family: monospace;">${ipAddress || "Não disponível"}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #333;">Data/Hora:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">${timestamp}</td>
            </tr>
            ${details ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #333;">Detalhes:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666; font-family: monospace; font-size: 12px;">${JSON.stringify(details, null, 2)}</td>
            </tr>
            ` : ""}
          </table>
          
          <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="color: #0369a1; margin: 0; font-size: 14px;">
              <strong>Recomendação:</strong> Acesse o painel administrativo para revisar os logs de segurança e tomar as medidas necessárias.
            </p>
          </div>
          
          <div style="text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p>Este é um email automático do sistema de segurança Praieiro.</p>
            <p>Não responda a este email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email using Resend API directly
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Praieiro Security <onboarding@resend.dev>",
        to: [adminEmail],
        subject: `${eventInfo.subject} - Praieiro`,
        html: htmlContent,
      }),
    });

    const emailResponse = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", emailResponse);
      return new Response(
        JSON.stringify({ success: false, error: emailResponse.message || "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Security alert email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error sending security alert:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
