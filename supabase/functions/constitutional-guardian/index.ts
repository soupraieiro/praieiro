import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * IA CONSTITUCIONAL (CAMADA 3)
 * Guardião da Constituição Técnica Satoshi
 * 
 * Funções:
 * - Kill-Switch (Lei 6.3): Congela governança instantaneamente
 * - Validação Constitucional: Verifica decisões contra invariantes
 * - Detecção de Drift: Identifica padrões de "escada" de preços
 */

// Gera hash SHA-256 para auditoria imutável (Lei 1.1)
async function generateSatoshiHash(data: Record<string, unknown>): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(JSON.stringify(data) + Date.now().toString());
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Extrai IP de forma segura (Lei 5.1)
function extractClientIP(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const sanitized = forwardedFor.split(",")[0].trim().replace(/[^\d.a-fA-F:]/g, "");
    return sanitized || "unknown";
  }
  return request.headers.get("x-real-ip")?.replace(/[^\d.a-fA-F:]/g, "") || "unknown";
}

function logStep(step: string, details?: Record<string, unknown>) {
  console.log(`[Constitutional Guardian] ${step}`, details ? JSON.stringify(details) : "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, payload } = await req.json();
    const clientIP = extractClientIP(req);
    
    logStep(`Action received: ${action}`, { clientIP });

    switch (action) {
      // ========================================
      // KILL-SWITCH (Lei 6.3)
      // Congela TODAS as automações de IA instantaneamente
      // ========================================
      case "freeze_governance": {
        const { reason, admin_id } = payload;
        
        logStep("KILL-SWITCH ATIVADO", { reason, admin_id });

        const satoshiHash = await generateSatoshiHash({
          action: "freeze_governance",
          reason,
          admin_id,
          timestamp: new Date().toISOString(),
          ip: clientIP
        });

        // Atualiza estado constitucional
        const { error: updateError } = await supabase
          .from("constitutional_state")
          .update({
            governance_frozen: true,
            frozen_at: new Date().toISOString(),
            frozen_by: admin_id,
            frozen_reason: reason,
            last_updated: new Date().toISOString(),
            satoshi_hash: satoshiHash
          })
          .eq("id", "global");

        if (updateError) {
          logStep("Erro ao congelar governança", { error: updateError.message });
          throw new Error(`Falha no Kill-Switch: ${updateError.message}`);
        }

        // Registra log de validação
        await supabase.from("constitutional_validation_logs").insert({
          validation_type: "kill_switch",
          agent_id: "ADMIN",
          action_type: "freeze_governance",
          is_allowed: true,
          reasoning_logic: `Kill-Switch ativado manualmente. Razão: ${reason}. Todas as automações de IA foram congeladas para proteção do ecossistema.`,
          satoshi_hash: satoshiHash
        });

        // Cancela todas as decisões pendentes
        await supabase
          .from("governance_decisions")
          .update({ status: "cancelled", confirmed_by: "KILL_SWITCH" })
          .eq("status", "pending_confirmation");

        logStep("Governança congelada com sucesso");

        return new Response(
          JSON.stringify({
            success: true,
            message: "🔴 GOVERNANÇA CONGELADA - Todas as automações de IA foram desativadas",
            satoshi_hash: satoshiHash,
            frozen_at: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ========================================
      // DESCONGELAR GOVERNANÇA
      // ========================================
      case "unfreeze_governance": {
        const { reason, admin_id } = payload;
        
        logStep("DESCONGELANDO GOVERNANÇA", { reason, admin_id });

        const satoshiHash = await generateSatoshiHash({
          action: "unfreeze_governance",
          reason,
          admin_id,
          timestamp: new Date().toISOString()
        });

        const { error: updateError } = await supabase
          .from("constitutional_state")
          .update({
            governance_frozen: false,
            frozen_at: null,
            frozen_by: null,
            frozen_reason: null,
            last_updated: new Date().toISOString(),
            satoshi_hash: satoshiHash
          })
          .eq("id", "global");

        if (updateError) throw new Error(updateError.message);

        await supabase.from("constitutional_validation_logs").insert({
          validation_type: "unfreeze",
          agent_id: "ADMIN",
          action_type: "unfreeze_governance",
          is_allowed: true,
          reasoning_logic: `Governança restaurada. Razão: ${reason}. Automações de IA podem operar normalmente.`,
          satoshi_hash: satoshiHash
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: "🟢 GOVERNANÇA RESTAURADA - Automações de IA reativadas",
            satoshi_hash: satoshiHash
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ========================================
      // VALIDAR DECISÃO CONTRA CONSTITUIÇÃO (Lei 7.3)
      // ========================================
      case "validate_decision": {
        const { 
          decision_type, 
          agent_id, 
          current_value, 
          proposed_value, 
          target_entity,
          metadata 
        } = payload;

        logStep("Validando decisão", { decision_type, agent_id, current_value, proposed_value });

        // 1. Verificar se governança está congelada
        const { data: state } = await supabase
          .from("constitutional_state")
          .select("*")
          .eq("id", "global")
          .single();

        if (state?.governance_frozen) {
          const log = {
            validation_type: "frozen_check",
            agent_id,
            action_type: decision_type,
            is_allowed: false,
            reasoning_logic: "BLOQUEADO: Governança está congelada. Kill-Switch ativo.",
            satoshi_hash: await generateSatoshiHash({ blocked: true, reason: "frozen" })
          };
          await supabase.from("constitutional_validation_logs").insert(log);

          return new Response(
            JSON.stringify({
              allowed: false,
              reason: "Governança congelada",
              invariant_violated: "KILL_SWITCH_ACTIVE"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // 2. Calcular drift de preço
        const changePercent = current_value > 0 
          ? Math.abs(((proposed_value - current_value) / current_value) * 100)
          : 0;

        const invariantsChecked: string[] = [];
        const invariantsViolated: string[] = [];
        let reasoningLogic = "";

        // 3. Invariante 1: Limite de 15% por alteração (Lei 6.1)
        invariantsChecked.push("DRIFT_LIMIT_15_PERCENT");
        if (changePercent > (state?.max_price_drift_percent || 15)) {
          invariantsViolated.push("DRIFT_LIMIT_15_PERCENT");
          reasoningLogic += `VIOLAÇÃO: Alteração de ${changePercent.toFixed(2)}% excede limite de 15%. `;
        }

        // 4. Invariante 2: Detecção de padrão de escada (Lei 6.1 + 7.3)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: recentDrifts } = await supabase
          .from("price_drift_history")
          .select("*")
          .eq("agent_id", agent_id)
          .eq("entity_type", decision_type)
          .gte("created_at", oneHourAgo)
          .order("created_at", { ascending: false });

        invariantsChecked.push("STAIRCASE_PATTERN_DETECTION");
        
        if (recentDrifts && recentDrifts.length >= 3) {
          // Calcula drift cumulativo na última hora
          const cumulativeDrift = recentDrifts.reduce(
            (sum, d) => sum + Math.abs(Number(d.change_percent)), 
            0
          ) + changePercent;

          if (cumulativeDrift > 15) {
            invariantsViolated.push("STAIRCASE_PATTERN_DETECTION");
            reasoningLogic += `VIOLAÇÃO ESCADA: Drift cumulativo de ${cumulativeDrift.toFixed(2)}% em 1h (${recentDrifts.length + 1} alterações). `;
          }
        }

        // 5. Invariante 3: Banimentos em massa (>100 IPs)
        if (decision_type === "mass_ban") {
          invariantsChecked.push("MASS_BAN_LIMIT_100");
          const banCount = metadata?.ban_count || 0;
          if (banCount > 100) {
            invariantsViolated.push("MASS_BAN_LIMIT_100");
            reasoningLogic += `VIOLAÇÃO: Banimento em massa de ${banCount} IPs requer aprovação manual. `;
          }
        }

        const isAllowed = invariantsViolated.length === 0;
        
        if (isAllowed) {
          reasoningLogic = `APROVADO: Todos os ${invariantsChecked.length} invariantes verificados. Alteração de ${changePercent.toFixed(2)}% dentro dos limites.`;
        }

        const satoshiHash = await generateSatoshiHash({
          decision_type,
          agent_id,
          current_value,
          proposed_value,
          isAllowed,
          invariantsViolated
        });

        // 6. Criar decisão com Time-Lock de 15 minutos (Lei 7.4)
        const { data: decision } = await supabase
          .from("governance_decisions")
          .insert({
            decision_type,
            agent_id,
            target_entity,
            current_value,
            proposed_value,
            change_percent: changePercent,
            status: isAllowed ? "pending_confirmation" : "rejected",
            reasoning_logic: reasoningLogic,
            invariants_checked: invariantsChecked,
            invariants_violated: invariantsViolated,
            satoshi_hash: satoshiHash,
            metadata
          })
          .select()
          .single();

        // 7. Registrar log de validação
        await supabase.from("constitutional_validation_logs").insert({
          decision_id: decision?.id,
          validation_type: "invariant_check",
          agent_id,
          action_type: decision_type,
          is_allowed: isAllowed,
          reasoning_logic: reasoningLogic,
          threshold_value: state?.max_price_drift_percent || 15,
          actual_value: changePercent,
          drift_history: recentDrifts,
          satoshi_hash: satoshiHash
        });

        // 8. Registrar histórico de drift
        if (isAllowed && decision_type.includes("price")) {
          await supabase.from("price_drift_history").insert({
            agent_id,
            entity_type: decision_type,
            entity_id: target_entity,
            old_value: current_value,
            new_value: proposed_value,
            change_percent: changePercent,
            window_start: oneHourAgo,
            window_end: new Date().toISOString(),
            cumulative_drift: (recentDrifts?.reduce((s, d) => s + Math.abs(Number(d.change_percent)), 0) || 0) + changePercent,
            satoshi_hash: satoshiHash
          });
        }

        logStep("Validação concluída", { isAllowed, invariantsViolated });

        return new Response(
          JSON.stringify({
            allowed: isAllowed,
            decision_id: decision?.id,
            change_percent: changePercent,
            invariants_checked: invariantsChecked,
            invariants_violated: invariantsViolated,
            reasoning_logic: reasoningLogic,
            time_lock_deadline: decision?.confirmation_deadline,
            satoshi_hash: satoshiHash
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ========================================
      // OBTER ESTADO CONSTITUCIONAL
      // ========================================
      case "get_state": {
        const { data: state } = await supabase
          .from("constitutional_state")
          .select("*")
          .eq("id", "global")
          .single();

        const { data: pendingDecisions } = await supabase
          .from("governance_decisions")
          .select("*")
          .eq("status", "pending_confirmation")
          .order("created_at", { ascending: false });

        const { data: recentLogs } = await supabase
          .from("constitutional_validation_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);

        return new Response(
          JSON.stringify({
            state,
            pending_decisions: pendingDecisions || [],
            recent_logs: recentLogs || [],
            invariants_active: [
              "DRIFT_LIMIT_15_PERCENT",
              "STAIRCASE_PATTERN_DETECTION",
              "MASS_BAN_LIMIT_100",
              "KILL_SWITCH_CHECK"
            ]
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ========================================
      // CONFIRMAR/CANCELAR DECISÃO (após Time-Lock)
      // ========================================
      case "confirm_decision": {
        const { decision_id, confirm, admin_id, reason } = payload;

        const { data: decision } = await supabase
          .from("governance_decisions")
          .select("*")
          .eq("id", decision_id)
          .single();

        if (!decision) {
          throw new Error("Decisão não encontrada");
        }

        const now = new Date();
        const deadline = new Date(decision.confirmation_deadline);

        // Verifica se ainda está dentro do período de Time-Lock
        if (now < deadline && confirm) {
          const remainingMinutes = Math.ceil((deadline.getTime() - now.getTime()) / 60000);
          return new Response(
            JSON.stringify({
              success: false,
              message: `Time-Lock ativo. Aguarde ${remainingMinutes} minutos para confirmar.`
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const newStatus = confirm ? "approved" : "cancelled";
        const satoshiHash = await generateSatoshiHash({
          decision_id,
          action: newStatus,
          admin_id,
          timestamp: now.toISOString()
        });

        await supabase
          .from("governance_decisions")
          .update({
            status: newStatus,
            confirmed_at: now.toISOString(),
            confirmed_by: admin_id,
            executed_at: confirm ? now.toISOString() : null,
            satoshi_hash: satoshiHash
          })
          .eq("id", decision_id);

        await supabase.from("constitutional_validation_logs").insert({
          decision_id,
          validation_type: confirm ? "approval" : "cancellation",
          agent_id: "ADMIN",
          action_type: decision.decision_type,
          is_allowed: true,
          reasoning_logic: `Decisão ${confirm ? "aprovada" : "cancelada"} por ${admin_id}. ${reason || ""}`,
          satoshi_hash: satoshiHash
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: `Decisão ${confirm ? "aprovada e executada" : "cancelada"}`,
            satoshi_hash: satoshiHash
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

  } catch (error) {
    console.error("[Constitutional Guardian] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro interno do Guardian" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
