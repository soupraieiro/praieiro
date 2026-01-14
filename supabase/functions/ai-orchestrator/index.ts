import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Capability detection patterns
const CAPABILITY_PATTERNS: Record<string, RegExp[]> = {
  vision: [
    /imagem|foto|picture|image|ver|olhar|analisar.*imagem/i,
    /o que.*vê|what.*see|descrever.*foto/i,
  ],
  image: [
    /gerar.*imagem|criar.*imagem|desenhar|generate.*image/i,
    /criar.*arte|make.*art|ilustrar/i,
  ],
  audio: [
    /transcrever|transcrição|áudio|audio|speech|voz/i,
    /ouvir|escutar|som.*arquivo/i,
  ],
  code: [
    /código|code|programar|função|debug|bug|erro.*código/i,
    /refatorar|implementar|typescript|javascript|python|sql/i,
  ],
  search: [
    /pesquisar|buscar|procurar|search|find|google/i,
    /notícias|news|últimas.*informações/i,
  ],
};

// Provider to Lovable AI Gateway model mapping
const PROVIDER_MODEL_MAP: Record<string, string> = {
  "gpt-4o": "google/gemini-2.5-pro",
  "gpt-4o-mini": "google/gemini-2.5-flash",
  "claude-3.5-sonnet": "google/gemini-3-flash-preview",
  "claude-3-opus": "google/gemini-2.5-pro",
  "gemini-pro": "google/gemini-2.5-flash",
  "gemini-1.5-pro": "google/gemini-2.5-pro",
  "llama-3.1-70b": "google/gemini-2.5-flash",
  "flux-1-dev": "google/gemini-3-pro-image-preview",
  "whisper-v3": "google/gemini-2.5-flash",
};

// Fallback chains by capability
const FALLBACK_CHAINS: Record<string, string[]> = {
  text: ["gpt-4o", "claude-3.5-sonnet", "gemini-pro"],
  vision: ["gpt-4o", "gemini-1.5-pro"],
  image: ["flux-1-dev", "gemini-1.5-pro"],
  audio: ["whisper-v3", "gemini-1.5-pro"],
  code: ["claude-3.5-sonnet", "gpt-4o", "gemini-pro"],
  search: ["gpt-4o", "claude-3.5-sonnet"],
};

interface AIProvider {
  provider_id: string;
  provider_name: string;
  status: string;
  priority: number;
  capabilities: Record<string, boolean>;
  max_tokens: number | null;
  cost_per_1k_tokens: number | null;
}

interface OrchestratorRequest {
  message: string;
  capability?: string;
  sessionId?: string;
  userId?: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

interface OrchestratorResponse {
  response: string;
  provider_used: string;
  fallback_used: boolean;
  fallback_chain: string[];
  latency_ms: number;
  tokens_used: number;
  capability_detected: string;
  audit: {
    hash: string;
    satoshi_timestamp: number;
  };
}

interface ProviderHealthRecord {
  id: string;
  provider: string;
  status: string;
  avg_latency_ms: number | null;
  total_requests: number | null;
  total_failures: number | null;
  consecutive_failures: number | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  updated_at: string;
}

// Detect capability from message
function detectCapability(message: string): string {
  for (const [capability, patterns] of Object.entries(CAPABILITY_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        return capability;
      }
    }
  }
  return "text"; // Default capability
}

// Generate Satoshi audit hash
async function generateSatoshiHash(payload: object): Promise<{ hash: string; timestamp: number }> {
  const timestamp = Date.now();
  const dataToHash = JSON.stringify({ ...payload, timestamp });
  const encoder = new TextEncoder();
  const data = encoder.encode(dataToHash);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return { hash, timestamp };
}

// Call AI provider through Lovable Gateway
async function callProvider(
  provider: AIProvider,
  message: string,
  systemPrompt: string,
  maxTokens: number,
  temperature: number,
  apiKey: string
): Promise<{ success: boolean; response?: string; error?: string; latency_ms: number }> {
  const startTime = Date.now();
  const model = PROVIDER_MODEL_MAP[provider.provider_id] || "google/gemini-2.5-flash";

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    const latency_ms = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI-ORCHESTRATOR] Provider ${provider.provider_id} failed:`, response.status, errorText);
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText.slice(0, 100)}`,
        latency_ms,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: "Empty response from AI",
        latency_ms,
      };
    }

    return {
      success: true,
      response: content,
      latency_ms,
    };
  } catch (error) {
    const latency_ms = Date.now() - startTime;
    console.error(`[AI-ORCHESTRATOR] Provider ${provider.provider_id} exception:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      latency_ms,
    };
  }
}

// Update provider health metrics
async function updateProviderHealth(
  supabase: any,
  providerId: string,
  success: boolean,
  latencyMs: number
) {
  try {
    // First check if record exists
    const { data: existing } = await supabase
      .from("ai_provider_health")
      .select("*")
      .eq("provider", providerId)
      .single();

    if (existing) {
      const existingRecord = existing as ProviderHealthRecord;
      const totalReqs = existingRecord.total_requests || 0;
      const consecutiveFailures = existingRecord.consecutive_failures || 0;
      
      const updates: Record<string, unknown> = {
        total_requests: totalReqs + 1,
        updated_at: new Date().toISOString(),
      };

      if (success) {
        updates.last_success_at = new Date().toISOString();
        updates.consecutive_failures = 0;
        updates.status = "healthy";
        // Running average for latency
        updates.avg_latency_ms = Math.round(
          ((existingRecord.avg_latency_ms || 0) * totalReqs + latencyMs) / (totalReqs + 1)
        );
      } else {
        updates.last_failure_at = new Date().toISOString();
        updates.total_failures = (existingRecord.total_failures || 0) + 1;
        updates.consecutive_failures = consecutiveFailures + 1;
        
        // Degrade status based on consecutive failures
        const newConsecutive = consecutiveFailures + 1;
        if (newConsecutive >= 5) {
          updates.status = "down";
        } else if (newConsecutive >= 2) {
          updates.status = "degraded";
        }
      }

      await supabase
        .from("ai_provider_health")
        .update(updates)
        .eq("provider", providerId);
    } else {
      // Insert new record
      await supabase.from("ai_provider_health").insert({
        provider: providerId,
        total_requests: 1,
        total_failures: success ? 0 : 1,
        consecutive_failures: success ? 0 : 1,
        avg_latency_ms: latencyMs,
        status: success ? "healthy" : "degraded",
        last_success_at: success ? new Date().toISOString() : null,
        last_failure_at: success ? null : new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("[AI-ORCHESTRATOR] Failed to update health metrics:", error);
  }
}

// Log usage to ai_provider_usage_logs
async function logUsage(
  supabase: any,
  providerId: string,
  success: boolean,
  latencyMs: number,
  tokensUsed: number,
  errorMessage?: string,
  userId?: string
) {
  try {
    const { hash } = await generateSatoshiHash({
      provider_id: providerId,
      success,
      latency_ms: latencyMs,
      tokens_used: tokensUsed,
    });

    await supabase.from("ai_provider_usage_logs").insert({
      provider_id: providerId,
      request_type: "chat_completion",
      success,
      latency_ms: latencyMs,
      input_tokens: Math.floor(tokensUsed * 0.3),
      output_tokens: Math.floor(tokensUsed * 0.7),
      error_message: errorMessage || null,
      user_id: userId || null,
      satoshi_hash: hash,
    });
  } catch (error) {
    console.error("[AI-ORCHESTRATOR] Failed to log usage:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: OrchestratorRequest = await req.json();

    // Validate input
    const message = body.message?.slice(0, 4000) || "";
    if (!message) {
      throw new Error("Message is required");
    }

    const capability = body.capability || detectCapability(message);
    const systemPrompt = body.systemPrompt || "You are a helpful AI assistant. Be concise and accurate.";
    const maxTokens = Math.min(body.maxTokens || 800, 2000);
    const temperature = Math.min(Math.max(body.temperature || 0.7, 0), 1);

    console.log(`[AI-ORCHESTRATOR] Capability: ${capability}, Message length: ${message.length}`);

    // Get active providers ordered by priority
    const { data: providers, error: providerError } = await supabase
      .from("ai_providers")
      .select("*")
      .eq("status", "active")
      .order("priority", { ascending: true });

    if (providerError || !providers?.length) {
      console.error("[AI-ORCHESTRATOR] No active providers:", providerError);
      throw new Error("No active AI providers available");
    }

    // Filter providers by capability and sort by priority
    const capableProviders = providers.filter((p: any) => {
      const caps = p.capabilities as Record<string, boolean> | null;
      return caps?.[capability] === true || capability === "text";
    });

    // Build fallback chain
    const fallbackChain = FALLBACK_CHAINS[capability] || FALLBACK_CHAINS.text;
    const sortedProviders = [...capableProviders].sort((a: any, b: any) => {
      const aIdx = fallbackChain.indexOf(a.provider_id);
      const bIdx = fallbackChain.indexOf(b.provider_id);
      if (aIdx === -1 && bIdx === -1) return a.priority - b.priority;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });

    console.log(
      `[AI-ORCHESTRATOR] Sorted providers: ${sortedProviders.map((p: any) => p.provider_id).join(" → ")}`
    );

    let lastError = "";
    let fallbackUsed = false;
    const attemptedProviders: string[] = [];

    // Try providers in order with fallback
    for (let i = 0; i < Math.min(sortedProviders.length, 3); i++) {
      const provider = sortedProviders[i] as AIProvider;
      attemptedProviders.push(provider.provider_id);

      if (i > 0) {
        fallbackUsed = true;
        console.log(`[AI-ORCHESTRATOR] Fallback attempt ${i + 1}: ${provider.provider_id}`);
      }

      const result = await callProvider(
        provider,
        message,
        systemPrompt,
        maxTokens,
        temperature,
        LOVABLE_API_KEY
      );

      // Update health metrics
      await updateProviderHealth(supabase, provider.provider_id, result.success, result.latency_ms);

      if (result.success && result.response) {
        // Estimate tokens (rough approximation)
        const tokensUsed = Math.ceil((message.length + result.response.length) / 4);

        // Log successful usage
        await logUsage(
          supabase,
          provider.provider_id,
          true,
          result.latency_ms,
          tokensUsed,
          undefined,
          body.userId
        );

        // Generate audit hash
        const audit = await generateSatoshiHash({
          provider: provider.provider_id,
          capability,
          fallback_used: fallbackUsed,
          response_length: result.response.length,
        });

        const totalLatency = Date.now() - startTime;

        const response: OrchestratorResponse = {
          response: result.response,
          provider_used: provider.provider_id,
          fallback_used: fallbackUsed,
          fallback_chain: attemptedProviders,
          latency_ms: totalLatency,
          tokens_used: tokensUsed,
          capability_detected: capability,
          audit: {
            hash: audit.hash,
            satoshi_timestamp: audit.timestamp,
          },
        };

        console.log(
          `[AI-ORCHESTRATOR] Success | Provider: ${provider.provider_id} | Latency: ${totalLatency}ms | Fallback: ${fallbackUsed}`
        );

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Log failed attempt
      await logUsage(
        supabase,
        provider.provider_id,
        false,
        result.latency_ms,
        0,
        result.error,
        body.userId
      );

      lastError = result.error || "Unknown error";
    }

    // All providers failed
    console.error(`[AI-ORCHESTRATOR] All providers failed. Last error: ${lastError}`);

    const audit = await generateSatoshiHash({
      error: "all_providers_failed",
      attempted: attemptedProviders,
    });

    return new Response(
      JSON.stringify({
        error: "Todos os provedores de IA falharam. Tente novamente em instantes.",
        fallback_chain: attemptedProviders,
        audit: {
          hash: audit.hash,
          satoshi_timestamp: audit.timestamp,
        },
      }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[AI-ORCHESTRATOR] Error:", error);

    const audit = await generateSatoshiHash({
      error: error instanceof Error ? error.message : "unknown",
    });

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro interno do orquestrador",
        audit: {
          hash: audit.hash,
          satoshi_timestamp: Date.now(),
        },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
