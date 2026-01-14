import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface IPCheckResult {
  ip: string;
  is_banned: boolean;
  ban_details?: {
    reason: string;
    blocked_variable: string | null;
    attack_type: string | null;
    severity: string | null;
    blocked_at: string;
    satoshi_hash: string | null;
  };
  clo_analysis?: string;
}

export function SatoshiIPGuard() {
  const [hasChecked, setHasChecked] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Skip check on blocked page to prevent loops
    if (location.pathname === "/acesso-bloqueado") {
      return;
    }

    // Only check once per session
    if (hasChecked) return;

    const checkIP = async () => {
      try {
        const { data, error } = await supabase.functions.invoke<IPCheckResult>("get-request-ip");

        if (error) {
          console.error("[Satoshi IP Guard] Error:", error);
          setHasChecked(true);
          return;
        }

        if (data?.is_banned) {
          console.warn(`[Satoshi Security] IP BANNED: ${data.ip}`);
          console.log(`[CLO] ${data.clo_analysis}`);
          
          // Log to meeting minutes
          await logToMeetingMinutes(data);
          
          // Redirect to blocked page
          navigate("/acesso-bloqueado", { replace: true });
        }
      } catch (err) {
        console.error("[Satoshi IP Guard] Exception:", err);
      } finally {
        setHasChecked(true);
      }
    };

    checkIP();
  }, [navigate, location.pathname, hasChecked]);

  return null; // This component renders nothing
}

async function logToMeetingMinutes(data: IPCheckResult) {
  try {
    // Get active session
    const { data: session } = await supabase
      .from("ai_council_sessions")
      .select("id")
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (session) {
      // Add CLO message to meeting
      await supabase.from("ai_council_meeting_messages").insert({
        session_id: session.id,
        sender_type: "agent",
        sender_id: "auditor",
        sender_name: "CLO - Diretor Jurídico Satoshi",
        message_content: `⚖️ **REGISTRO NA ATA DE REUNIÃO**\n\n${data.clo_analysis}\n\n📋 Ajuste técnico documentado: Função get_request_ip() validada com sucesso para verificação de blacklist. Redirecionamento para página de bloqueio executado conforme Protocolo Satoshi.\n\n🔐 Severidade: ${data.ban_details?.severity || 'medium'}\n📅 Data do bloqueio: ${data.ban_details?.blocked_at ? new Date(data.ban_details.blocked_at).toLocaleString('pt-BR') : 'N/A'}`,
        message_type: "security_log"
      });
    }

    // Register information flow
    await supabase.rpc('register_information_flow', {
      p_source_table: 'banned_ips',
      p_source_id: data.ip,
      p_flow_type: 'ip_blocked_access_attempt',
      p_flow_data: {
        ip: data.ip,
        reason: data.ban_details?.reason,
        blocked_variable: data.ban_details?.blocked_variable,
        action_details: 'Acesso bloqueado e redirecionado para página de bloqueio'
      }
    });
  } catch (err) {
    console.error("[Satoshi IP Guard] Failed to log to meeting:", err);
  }
}
