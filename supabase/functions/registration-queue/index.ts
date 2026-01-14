import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * REGISTRATION QUEUE - Sistema de Fila para Evitar Exaustão
 * 
 * Problema: Gmail rate limits causam falhas em picos de cadastro
 * Solução: Fila com retry exponencial + fallback para verificação por SMS
 * 
 * Arquitetura:
 * 1. Cadastro entra na fila (status: pending)
 * 2. Worker processa em batch respeitando rate limits
 * 3. Se Gmail falhar 3x, oferece verificação alternativa
 * 4. Dashboard mostra status em tempo real
 */

interface QueueItem {
  id: string;
  email: string;
  phone?: string;
  created_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'fallback';
  attempts: number;
  last_error?: string;
  processed_at?: string;
  metadata?: Record<string, unknown>;
}

interface QueueStats {
  total_pending: number;
  total_processing: number;
  total_completed: number;
  total_failed: number;
  avg_wait_time_ms: number;
  estimated_clear_time_ms: number;
  rate_limit_remaining: number;
  last_processed_at: string | null;
}

// Rate limit config (Gmail: ~100 emails/minuto conservador)
const RATE_LIMIT_PER_MINUTE = 60;
const MAX_BATCH_SIZE = 10;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [5000, 15000, 60000]; // 5s, 15s, 60s

async function generateHash(data: unknown): Promise<string> {
  const encoder = new TextEncoder();
  const dataStr = JSON.stringify({ ...data as object, timestamp: Date.now() });
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(dataStr));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const { action } = body;

    console.log(`[REG-QUEUE] Action: ${action}`);

    switch (action) {
      case "enqueue": {
        // Adicionar novo cadastro à fila
        const { email, phone, metadata } = body;
        
        if (!email) {
          return new Response(
            JSON.stringify({ error: "Email é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verificar se já existe na fila
        const { data: existing } = await supabase
          .from("registration_queue")
          .select("id, status")
          .eq("email", email)
          .in("status", ["pending", "processing"])
          .single();

        if (existing) {
          return new Response(
            JSON.stringify({ 
              message: "Cadastro já está na fila",
              queue_id: existing.id,
              status: existing.status
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Calcular posição estimada
        const { count: queueSize } = await supabase
          .from("registration_queue")
          .select("*", { count: "exact", head: true })
          .in("status", ["pending", "processing"]);

        const position = (queueSize || 0) + 1;
        const estimatedWait = Math.ceil(position / RATE_LIMIT_PER_MINUTE) * 60000;

        // Inserir na fila
        const { data: newItem, error } = await supabase
          .from("registration_queue")
          .insert({
            email,
            phone,
            status: "pending",
            attempts: 0,
            metadata: {
              ...metadata,
              enqueued_at: new Date().toISOString(),
              estimated_position: position
            }
          })
          .select()
          .single();

        if (error) throw error;

        const hash = await generateHash({ email, action: "enqueue" });

        return new Response(
          JSON.stringify({
            success: true,
            queue_id: newItem.id,
            position,
            estimated_wait_ms: estimatedWait,
            satoshi_hash: hash
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "process_batch": {
        // Worker: Processar batch da fila
        const { batch_size = MAX_BATCH_SIZE } = body;

        // Verificar rate limit global
        const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
        const { count: recentProcessed } = await supabase
          .from("registration_queue")
          .select("*", { count: "exact", head: true })
          .gte("processed_at", oneMinuteAgo)
          .eq("status", "completed");

        const remaining = RATE_LIMIT_PER_MINUTE - (recentProcessed || 0);
        if (remaining <= 0) {
          return new Response(
            JSON.stringify({ 
              message: "Rate limit atingido, aguarde",
              retry_after_ms: 60000,
              processed_last_minute: recentProcessed
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Buscar itens pendentes
        const effectiveBatchSize = Math.min(batch_size, remaining);
        const { data: pendingItems, error: fetchError } = await supabase
          .from("registration_queue")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(effectiveBatchSize);

        if (fetchError) throw fetchError;

        if (!pendingItems?.length) {
          return new Response(
            JSON.stringify({ message: "Fila vazia", items_processed: 0 }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Marcar como processing
        const itemIds = pendingItems.map(i => i.id);
        await supabase
          .from("registration_queue")
          .update({ status: "processing" })
          .in("id", itemIds);

        // Processar cada item
        const results = [];
        for (const item of pendingItems) {
          try {
            // Simular envio de email (aqui entraria a lógica real)
            // Na produção: integrar com Resend, SendGrid, etc.
            const success = Math.random() > 0.1; // 90% success rate simulado

            if (success) {
              await supabase
                .from("registration_queue")
                .update({
                  status: "completed",
                  processed_at: new Date().toISOString(),
                  attempts: item.attempts + 1
                })
                .eq("id", item.id);

              results.push({ id: item.id, status: "completed" });
            } else {
              throw new Error("Email service temporarily unavailable");
            }

          } catch (err) {
            const newAttempts = item.attempts + 1;
            const shouldFallback = newAttempts >= MAX_RETRIES;

            await supabase
              .from("registration_queue")
              .update({
                status: shouldFallback ? "fallback" : "pending",
                attempts: newAttempts,
                last_error: err instanceof Error ? err.message : "Unknown error",
                metadata: {
                  ...item.metadata as object,
                  last_attempt: new Date().toISOString(),
                  next_retry_ms: shouldFallback ? null : RETRY_DELAYS[newAttempts - 1]
                }
              })
              .eq("id", item.id);

            results.push({ 
              id: item.id, 
              status: shouldFallback ? "fallback" : "retry",
              error: err instanceof Error ? err.message : "Unknown"
            });
          }
        }

        return new Response(
          JSON.stringify({
            items_processed: results.length,
            results,
            rate_limit_remaining: remaining - results.filter(r => r.status === "completed").length
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_stats": {
        // Dashboard: Estatísticas da fila
        const [pending, processing, completed, failed] = await Promise.all([
          supabase.from("registration_queue").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("registration_queue").select("*", { count: "exact", head: true }).eq("status", "processing"),
          supabase.from("registration_queue").select("*", { count: "exact", head: true }).eq("status", "completed"),
          supabase.from("registration_queue").select("*", { count: "exact", head: true }).in("status", ["failed", "fallback"])
        ]);

        // Calcular tempo médio de espera
        const { data: recentCompleted } = await supabase
          .from("registration_queue")
          .select("created_at, processed_at")
          .eq("status", "completed")
          .order("processed_at", { ascending: false })
          .limit(100);

        let avgWaitTime = 0;
        if (recentCompleted?.length) {
          const waitTimes = recentCompleted.map(item => {
            const created = new Date(item.created_at).getTime();
            const processed = new Date(item.processed_at).getTime();
            return processed - created;
          });
          avgWaitTime = waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length;
        }

        // Rate limit restante
        const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
        const { count: recentProcessed } = await supabase
          .from("registration_queue")
          .select("*", { count: "exact", head: true })
          .gte("processed_at", oneMinuteAgo)
          .eq("status", "completed");

        // Último processamento
        const { data: lastItem } = await supabase
          .from("registration_queue")
          .select("processed_at")
          .eq("status", "completed")
          .order("processed_at", { ascending: false })
          .limit(1)
          .single();

        const totalPending = (pending.count || 0) + (processing.count || 0);
        const estimatedClearTime = Math.ceil(totalPending / RATE_LIMIT_PER_MINUTE) * 60000;

        const stats: QueueStats = {
          total_pending: pending.count || 0,
          total_processing: processing.count || 0,
          total_completed: completed.count || 0,
          total_failed: failed.count || 0,
          avg_wait_time_ms: Math.round(avgWaitTime),
          estimated_clear_time_ms: estimatedClearTime,
          rate_limit_remaining: RATE_LIMIT_PER_MINUTE - (recentProcessed || 0),
          last_processed_at: lastItem?.processed_at || null
        };

        return new Response(
          JSON.stringify(stats),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "check_position": {
        // Verificar posição de um cadastro específico
        const { queue_id, email } = body;
        
        let query = supabase
          .from("registration_queue")
          .select("*");
        
        if (queue_id) {
          query = query.eq("id", queue_id);
        } else if (email) {
          query = query.eq("email", email);
        } else {
          return new Response(
            JSON.stringify({ error: "queue_id ou email é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: item } = await query.single();

        if (!item) {
          return new Response(
            JSON.stringify({ error: "Item não encontrado na fila" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Calcular posição se pending
        let position = null;
        if (item.status === "pending") {
          const { count } = await supabase
            .from("registration_queue")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending")
            .lt("created_at", item.created_at);
          position = (count || 0) + 1;
        }

        return new Response(
          JSON.stringify({
            queue_id: item.id,
            email: item.email,
            status: item.status,
            position,
            attempts: item.attempts,
            created_at: item.created_at,
            processed_at: item.processed_at,
            estimated_wait_ms: position ? Math.ceil(position / RATE_LIMIT_PER_MINUTE) * 60000 : 0
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Ação inválida" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

  } catch (error) {
    console.error("[REG-QUEUE] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
