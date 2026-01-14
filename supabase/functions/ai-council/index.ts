import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// System prompt for Praieiro brand voice
const PRAIEIRO_SYSTEM_PROMPT = `Você é parte do Conselho de IAs do Praieiro - uma plataforma inovadora que conecta clientes a vendedores ambulantes nas praias do Brasil.

PERSONALIDADE DA MARCA PRAIEIRO:
- Ágil: Respostas diretas, práticas e orientadas à ação
- Técnica: Análises fundamentadas com dados e métricas quando disponíveis
- Solar: Tom otimista e encorajador, sempre buscando soluções

CONTEXTO DO NEGÓCIO:
- Marketplace de vendedores ambulantes de praia
- Foco em Salvador/BA e outras praias brasileiras
- Produtos: bebidas, açaí, sorvetes, artesanato, serviços de praia
- Sistema de geolocalização para encontrar vendedores próximos
- Pagamentos via PIX/carteira digital interna

Ao responder, mantenha a voz da marca Praieiro: seja direto, prático e sempre positivo.`;

interface AIRequest {
  category: 'TECNICA/SEGURANÇA' | 'COMERCIAL/ESTRATÉGIA';
  problem: string;
  includeErrorLogs?: boolean;
  includeStripeData?: boolean;
}

interface AIResponse {
  model: string;
  content: string;
  reasoning?: string;
}

async function callLovableAI(model: string, systemPrompt: string, userPrompt: string): Promise<AIResponse> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI Gateway error for ${model}:`, response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    return {
      model,
      content: data.choices?.[0]?.message?.content || "Sem resposta",
    };
  } catch (error) {
    console.error(`Error calling ${model}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return {
      model,
      content: `Erro ao consultar ${model}: ${errorMessage}`,
    };
  }
}

async function getErrorLogs(supabase: any): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('security_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    
    if (!data || data.length === 0) {
      return "Nenhum log de erro recente encontrado.";
    }

    return data.map((log: any) => 
      `[${log.created_at}] ${log.event_type}: ${log.identifier} - ${JSON.stringify(log.details)}`
    ).join('\n');
  } catch (error) {
    console.error('Error fetching error logs:', error);
    return "Não foi possível acessar os logs de erro.";
  }
}

async function getSalesData(supabase: any): Promise<string> {
  try {
    // Get recent orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, total_amount, status, payment_status, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (ordersError) throw ordersError;

    const totalOrders = orders?.length || 0;
    const completedOrders = orders?.filter((o: any) => o.status === 'completed').length || 0;
    const totalRevenue = orders?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0;
    const paidOrders = orders?.filter((o: any) => o.payment_status === 'paid').length || 0;

    // Get vendor stats
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('profile_id, status')
      .eq('status', 'active');

    const activeVendors = vendors?.length || 0;

    // Get client stats
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('profile_id');

    const totalClients = clients?.length || 0;

    return `
DADOS DE VENDAS RECENTES:
- Total de pedidos (últimos 50): ${totalOrders}
- Pedidos completados: ${completedOrders}
- Pedidos pagos: ${paidOrders}
- Receita total: R$ ${(totalRevenue / 100).toFixed(2)}
- Vendedores ativos: ${activeVendors}
- Total de clientes: ${totalClients}
- Taxa de conversão: ${totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : 0}%
`;
  } catch (error) {
    console.error('Error fetching sales data:', error);
    return "Não foi possível acessar os dados de vendas.";
  }
}

function synthesizeTechnicalConsensus(responses: AIResponse[]): string {
  const validResponses = responses.filter(r => !r.content.startsWith('Erro'));
  
  if (validResponses.length === 0) {
    return "Não foi possível obter consenso - todas as IAs falharam.";
  }

  if (validResponses.length === 1) {
    return validResponses[0].content;
  }

  // Find common themes and create a unified response
  const prompt = `
Analise as seguintes respostas de diferentes IAs para um problema técnico/segurança e crie uma ÚNICA resposta consensual que:
1. Identifique os pontos em comum
2. Resolva quaisquer contradições
3. Apresente a melhor solução unificada

RESPOSTA GEMINI:
${responses.find(r => r.model.includes('gemini'))?.content || 'N/A'}

RESPOSTA GPT:
${responses.find(r => r.model.includes('gpt'))?.content || 'N/A'}

RESPOSTA GEMINI-PRO:
${responses.find(r => r.model === 'google/gemini-2.5-pro')?.content || 'N/A'}

Crie a resposta consensual final mantendo a voz Praieiro (ágil, técnica, solar):
`;

  return prompt;
}

function synthesizeStrategicSolutions(responses: AIResponse[]): object[] {
  const solutions = [
    {
      type: 'Conservadora',
      description: 'Abordagem de menor risco, mantendo estabilidade',
      details: ''
    },
    {
      type: 'Moderada',
      description: 'Equilíbrio entre inovação e segurança',
      details: ''
    },
    {
      type: 'Agressiva',
      description: 'Máximo crescimento, aceita riscos maiores',
      details: ''
    }
  ];

  responses.forEach((response, index) => {
    if (!response.content.startsWith('Erro')) {
      if (index < solutions.length) {
        solutions[index].details = response.content;
      }
    }
  });

  return solutions;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (!roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado - apenas administradores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();
    const { category, problem, includeErrorLogs, includeStripeData }: AIRequest = await req.json();

    if (!category || !problem) {
      return new Response(
        JSON.stringify({ error: 'Categoria e problema são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context
    let contextData: any = {};
    let enhancedPrompt = problem;

    if (includeErrorLogs) {
      const errorLogs = await getErrorLogs(supabase);
      contextData.errorLogs = errorLogs;
      enhancedPrompt += `\n\nLOGS DE ERRO DO SISTEMA:\n${errorLogs}`;
    }

    if (includeStripeData) {
      const salesData = await getSalesData(supabase);
      contextData.salesData = salesData;
      enhancedPrompt += `\n\n${salesData}`;
    }

    console.log(`AI Council request - Category: ${category}, Problem length: ${problem.length}`);

    // Call multiple AI models in parallel
    let responses: AIResponse[];
    let finalVerdict: string;
    let solutions: object[] = [];
    let consensusReached = false;

    if (category === 'TECNICA/SEGURANÇA') {
      // For technical issues: debate and reach consensus
      const technicalPrompt = `${PRAIEIRO_SYSTEM_PROMPT}

CATEGORIA: ${category}
PROBLEMA: ${enhancedPrompt}

Analise este problema técnico/de segurança e forneça uma solução detalhada e prática.
Inclua:
1. Diagnóstico do problema
2. Solução recomendada com passos claros
3. Medidas preventivas para o futuro`;

      // Call Gemini Flash, GPT-5-mini, and Gemini Pro in parallel
      responses = await Promise.all([
        callLovableAI('google/gemini-2.5-flash', technicalPrompt, enhancedPrompt),
        callLovableAI('openai/gpt-5-mini', technicalPrompt, enhancedPrompt),
        callLovableAI('google/gemini-2.5-pro', technicalPrompt, enhancedPrompt),
      ]);

      // Synthesize consensus
      const synthesisPrompt = synthesizeTechnicalConsensus(responses);
      const consensusResponse = await callLovableAI(
        'google/gemini-2.5-pro',
        PRAIEIRO_SYSTEM_PROMPT,
        synthesisPrompt
      );
      
      finalVerdict = consensusResponse.content;
      consensusReached = true;

    } else {
      // For strategic issues: provide 3 distinct approaches
      const approaches = [
        { type: 'Conservadora', prompt: 'Proponha uma abordagem CONSERVADORA (baixo risco, crescimento estável)' },
        { type: 'Moderada', prompt: 'Proponha uma abordagem MODERADA (equilíbrio entre risco e crescimento)' },
        { type: 'Agressiva', prompt: 'Proponha uma abordagem AGRESSIVA (alto crescimento, aceita riscos)' },
      ];

      const strategicPrompt = `${PRAIEIRO_SYSTEM_PROMPT}

CATEGORIA: ${category}
PROBLEMA: ${enhancedPrompt}`;

      responses = await Promise.all(
        approaches.map(approach => 
          callLovableAI(
            'google/gemini-2.5-flash',
            strategicPrompt,
            `${approach.prompt}\n\nProblema: ${enhancedPrompt}\n\nForneça:\n1. Estratégia detalhada\n2. Métricas de sucesso\n3. Riscos e mitigações\n4. Timeline de implementação`
          )
        )
      );

      solutions = responses.map((response, index) => ({
        type: approaches[index].type,
        description: approaches[index].prompt,
        details: response.content,
        model: response.model,
      }));

      finalVerdict = `Análise estratégica concluída com 3 abordagens distintas para: "${problem.substring(0, 100)}..."`;
    }

    const processingTime = Date.now() - startTime;

    // Save verdict to database
    const { data: verdict, error: insertError } = await supabase
      .from('admin_ai_verdicts')
      .insert({
        category,
        problem_description: problem,
        context_data: contextData,
        gemini_response: responses.find(r => r.model.includes('gemini-2.5-flash'))?.content,
        gpt_response: responses.find(r => r.model.includes('gpt'))?.content,
        deepseek_response: responses.find(r => r.model === 'google/gemini-2.5-pro')?.content,
        final_verdict: finalVerdict,
        solutions,
        consensus_reached: consensusReached,
        processing_time_ms: processingTime,
        requested_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving verdict:', insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        verdict: {
          id: verdict?.id,
          category,
          finalVerdict,
          solutions: category === 'COMERCIAL/ESTRATÉGIA' ? solutions : undefined,
          consensusReached,
          processingTimeMs: processingTime,
          responses: responses.map(r => ({
            model: r.model,
            preview: r.content.substring(0, 200) + '...',
          })),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI Council error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
