import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AITask {
  id: string;
  provider: 'openai' | 'anthropic' | 'perplexity' | 'lovable';
  fallback_provider?: string;
  task_type: string;
  priority: string;
  is_critical: boolean;
  input_data: {
    prompt?: string;
    system_prompt?: string;
    model?: string;
    max_tokens?: number;
    fallback_provider?: string;
    affected_users_percent?: number;
    affected_economy_percent?: number;
  };
  provider_b?: string;
}

interface ConsensusResult {
  agreement: boolean;
  result_a: unknown;
  result_b: unknown;
  reasoning_a: string;
  reasoning_b: string;
}

// Gerar Satoshi Hash para auditoria
function generateSatoshiHash(data: unknown): string {
  const str = JSON.stringify(data) + Date.now();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `satoshi_${Math.abs(hash).toString(16)}_${Date.now().toString(36)}`;
}

// Chamar OpenAI
async function callOpenAI(prompt: string, systemPrompt: string): Promise<{ content: string; tokens: number }> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    tokens: data.usage?.total_tokens || 0,
  };
}

// Chamar Anthropic
async function callAnthropic(prompt: string, systemPrompt: string): Promise<{ content: string; tokens: number }> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.content[0].text,
    tokens: data.usage?.input_tokens + data.usage?.output_tokens || 0,
  };
}

// Chamar Perplexity
async function callPerplexity(prompt: string, systemPrompt: string): Promise<{ content: string; tokens: number }> {
  const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY not configured');

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    tokens: 0,
  };
}

// Chamar Lovable AI
async function callLovable(prompt: string, systemPrompt: string): Promise<{ content: string; tokens: number }> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Lovable AI error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    tokens: data.usage?.total_tokens || 0,
  };
}

// Dispatcher principal
async function callProvider(
  provider: string,
  prompt: string,
  systemPrompt: string
): Promise<{ content: string; tokens: number }> {
  switch (provider) {
    case 'openai':
      return callOpenAI(prompt, systemPrompt);
    case 'anthropic':
      return callAnthropic(prompt, systemPrompt);
    case 'perplexity':
      return callPerplexity(prompt, systemPrompt);
    case 'lovable':
      return callLovable(prompt, systemPrompt);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// Avaliar consenso entre dois resultados
function evaluateConsensus(resultA: string, resultB: string): { agreement: boolean; similarity: number } {
  // Normalizar respostas
  const normalizeResponse = (text: string) => {
    const lower = text.toLowerCase();
    // Extrair decisão principal
    if (lower.includes('aprovar') || lower.includes('approve') || lower.includes('aceitar')) {
      return 'approve';
    }
    if (lower.includes('rejeitar') || lower.includes('reject') || lower.includes('negar') || lower.includes('bloquear')) {
      return 'reject';
    }
    if (lower.includes('manter') || lower.includes('preserve') || lower.includes('status quo')) {
      return 'maintain';
    }
    return 'unclear';
  };

  const decisionA = normalizeResponse(resultA);
  const decisionB = normalizeResponse(resultB);

  // Calcular similaridade básica
  const wordsA = new Set(resultA.toLowerCase().split(/\s+/));
  const wordsB = new Set(resultB.toLowerCase().split(/\s+/));
  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const similarity = intersection.size / Math.max(wordsA.size, wordsB.size);

  return {
    agreement: decisionA === decisionB && decisionA !== 'unclear',
    similarity,
  };
}

// Atualizar saúde do provider
async function updateProviderHealth(
  supabaseClient: any,
  provider: string,
  success: boolean,
  latencyMs: number
) {
  try {
    const { data: current } = await supabaseClient
      .from('ai_provider_health')
      .select('*')
      .eq('provider', provider)
      .single();

    if (current) {
      const currentData = current as Record<string, any>;
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
        total_requests: (currentData.total_requests || 0) + 1,
      };

      if (success) {
        updates.status = 'healthy';
        updates.last_success_at = new Date().toISOString();
        updates.consecutive_failures = 0;
        updates.avg_latency_ms = Math.round(((currentData.avg_latency_ms || latencyMs) + latencyMs) / 2);
      } else {
        updates.last_failure_at = new Date().toISOString();
        updates.consecutive_failures = (currentData.consecutive_failures || 0) + 1;
        updates.total_failures = (currentData.total_failures || 0) + 1;
        updates.status = (currentData.consecutive_failures || 0) >= 2 ? 'down' : 'degraded';
      }

      await supabaseClient
        .from('ai_provider_health')
        .update(updates)
        .eq('provider', provider);
    }
  } catch (err) {
    console.error('Error updating provider health:', err);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, task_id } = await req.json();

    // Ação: Processar próxima tarefa pendente
    if (action === 'process_next' || !action) {
      // Buscar próxima tarefa pendente por prioridade
      const { data: tasks, error: fetchError } = await supabase
        .from('ai_external_tasks')
        .select('*')
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1);

      if (fetchError) throw fetchError;
      if (!tasks || tasks.length === 0) {
        return new Response(JSON.stringify({ message: 'No pending tasks' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const task = tasks[0] as AITask;

      // Marcar como processando
      await supabase
        .from('ai_external_tasks')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', task.id);

      const prompt = task.input_data.prompt || '';
      const systemPrompt = task.input_data.system_prompt || 'Você é um assistente de governança empresarial.';
      
      // Verificar se precisa de Consenso Multi-IA (Lei 2.2)
      const needsConsensus = task.is_critical && (
        (task.input_data.affected_users_percent || 0) > 10 ||
        (task.input_data.affected_economy_percent || 0) > 10
      );

      let result: {
        output_data: unknown;
        output_data_b?: unknown;
        reasoning_logic: string;
        reasoning_logic_b?: string;
        consensus_status?: string;
        status: string;
        tokens_used: number;
        provider_b?: string;
      };

      if (needsConsensus) {
        // Protocolo de Consenso Multi-IA
        console.log(`[CONSENSUS] Task ${task.id} requires multi-AI consensus`);
        
        const providerA = task.provider;
        const providerB = task.provider_b || (providerA === 'openai' ? 'anthropic' : 'openai');

        try {
          // Chamar ambos providers em paralelo
          const [resultA, resultB] = await Promise.all([
            callProvider(providerA, prompt, systemPrompt),
            callProvider(providerB, prompt, systemPrompt),
          ]);

          const consensus = evaluateConsensus(resultA.content, resultB.content);

          if (consensus.agreement) {
            // CONCORDÂNCIA: Entra em Time-Lock
            result = {
              output_data: { provider: providerA, response: resultA.content },
              output_data_b: { provider: providerB, response: resultB.content },
              reasoning_logic: resultA.content,
              reasoning_logic_b: resultB.content,
              consensus_status: 'agreement',
              status: 'completed',
              tokens_used: resultA.tokens + resultB.tokens,
              provider_b: providerB,
            };

            // Registrar decisão para Time-Lock
            await supabase.from('governance_decisions').insert({
              decision_type: task.task_type,
              proposed_value: JSON.stringify(task.input_data),
              previous_value: null,
              status: 'pending',
              ai_justification: `Consenso alcançado entre ${providerA} e ${providerB}`,
              consensus_level: consensus.similarity,
              satoshi_hash: generateSatoshiHash({ task, consensus }),
            });

          } else {
            // DIVERGÊNCIA: Congela governança e notifica
            result = {
              output_data: { provider: providerA, response: resultA.content },
              output_data_b: { provider: providerB, response: resultB.content },
              reasoning_logic: resultA.content,
              reasoning_logic_b: resultB.content,
              consensus_status: 'conflict_detected',
              status: 'conflict_detected',
              tokens_used: resultA.tokens + resultB.tokens,
              provider_b: providerB,
            };

            // Congelar governança preventivamente
            await supabase
              .from('constitutional_state')
              .update({
                governance_frozen: true,
                frozen_reason: `Conflito de Consenso: ${providerA} vs ${providerB}`,
                frozen_at: new Date().toISOString(),
                satoshi_hash: generateSatoshiHash({ conflict: true, task_id: task.id }),
              })
              .eq('id', (await supabase.from('constitutional_state').select('id').single()).data?.id);

            // Criar notificação de emergência
            await supabase.from('ai_council_admin_notifications').insert({
              notification_type: 'conflict_detected',
              title: '⚠️ CONFLITO DE CONSENSO DETECTADO',
              message: `Divergência entre ${providerA} e ${providerB} na tarefa: ${task.task_type}`,
              priority: 'critical',
              action_required: true,
              action_type: 'founder_intervention',
              action_data: { task_id: task.id, provider_a: providerA, provider_b: providerB },
            });
          }

          await updateProviderHealth(supabase, providerA, true, Date.now() - startTime);
          await updateProviderHealth(supabase, providerB, true, Date.now() - startTime);

        } catch (consensusError) {
          console.error('[CONSENSUS ERROR]', consensusError);
          result = {
            output_data: { error: String(consensusError) },
            reasoning_logic: 'Erro no protocolo de consenso',
            consensus_status: 'pending',
            status: 'failed',
            tokens_used: 0,
          };
        }

      } else {
        // Processamento normal (sem consenso)
        try {
          const aiResult = await callProvider(task.provider, prompt, systemPrompt);
          
          result = {
            output_data: { provider: task.provider, response: aiResult.content },
            reasoning_logic: aiResult.content,
            status: 'completed',
            tokens_used: aiResult.tokens,
          };

          await updateProviderHealth(supabase, task.provider, true, Date.now() - startTime);

        } catch (providerError) {
          console.error(`[PROVIDER ERROR] ${task.provider}:`, providerError);

          // Tentar fallback se disponível (Lei de Redundância)
          if (task.fallback_provider || task.input_data.fallback_provider) {
            const fallback = task.fallback_provider || task.input_data.fallback_provider!;
            console.log(`[FALLBACK] Trying ${fallback}`);

            try {
              const fallbackResult = await callProvider(fallback, prompt, systemPrompt);
              
              result = {
                output_data: { 
                  provider: fallback, 
                  response: fallbackResult.content,
                  fallback_used: true,
                  original_provider: task.provider,
                },
                reasoning_logic: fallbackResult.content,
                status: 'completed',
                tokens_used: fallbackResult.tokens,
              };

              await updateProviderHealth(supabase, task.provider, false, Date.now() - startTime);
              await updateProviderHealth(supabase, fallback, true, Date.now() - startTime);

            } catch (fallbackError) {
              await updateProviderHealth(supabase, task.provider, false, Date.now() - startTime);
              result = {
                output_data: { error: String(fallbackError), fallback_failed: true },
                reasoning_logic: 'Falha no provider principal e fallback',
                status: 'failed',
                tokens_used: 0,
              };
            }
          } else {
            await updateProviderHealth(supabase, task.provider, false, Date.now() - startTime);
            result = {
              output_data: { error: String(providerError) },
              reasoning_logic: 'Falha no processamento',
              status: 'failed',
              tokens_used: 0,
            };
          }
        }
      }

      // Atualizar tarefa com resultado
      const { error: updateError } = await supabase
        .from('ai_external_tasks')
        .update({
          ...result,
          completed_at: new Date().toISOString(),
          processing_time_ms: Date.now() - startTime,
          satoshi_hash: generateSatoshiHash(result),
        })
        .eq('id', task.id);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ 
        success: true, 
        task_id: task.id,
        status: result.status,
        consensus_status: result.consensus_status,
        processing_time_ms: Date.now() - startTime,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ação: Criar nova tarefa
    if (action === 'create_task') {
      const { provider, task_type, input_data, is_critical, fallback_provider, priority } = await req.json();

      const { data, error } = await supabase
        .from('ai_external_tasks')
        .insert({
          provider: provider || 'lovable',
          task_type,
          input_data,
          is_critical: is_critical || false,
          fallback_provider,
          priority: priority || 'normal',
          satoshi_hash: generateSatoshiHash({ provider, task_type, input_data }),
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, task: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ação: Obter status de providers
    if (action === 'get_health') {
      const { data, error } = await supabase
        .from('ai_provider_health')
        .select('*')
        .order('provider');

      if (error) throw error;

      return new Response(JSON.stringify({ providers: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[PROCESS-EXTERNAL-AI ERROR]', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
