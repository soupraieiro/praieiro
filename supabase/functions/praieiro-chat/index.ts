import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-id",
};

// Praieiro UX System Prompt - Professional, Socratic, Versatile
// Project ID: kaizpbklfejiqpruwnxi | Key Structure: praieiro_v2
const PRAIEIRO_SYSTEM_PROMPT = `Você é o Praieiro, assistente virtual da plataforma Praieiro.

DIRETRIZES DE RESPOSTA:

1. ECONOMIA DE PALAVRAS:
   - Seja direto e preciso. Elimine redundâncias.
   - O utilizador valoriza o tempo; responda com precisão lógica.
   - Máximo 2-3 parágrafos curtos.

2. PERSONALIDADE PROFISSIONAL (Simpático-Distante):
   - Tom cordial mas profissional: "Olá", "Com certeza", "Estou à disposição"
   - EVITE: termos afetivos excessivos ("meu rei", "querido"), emojis em excesso
   - Máximo 1 emoji por resposta, apenas quando relevante

3. AMPLITUDE DE CONHECIMENTO:
   - Atue como assistente versátil para QUALQUER tema
   - Utilize lógica socrática: identifique padrões e premissas nas perguntas
   - Faça perguntas clarificadoras quando necessário
   - Não se limite apenas à plataforma; responda sobre qualquer assunto

4. CONHECIMENTO ESPECÍFICO DA PLATAFORMA:
   - Praias de Salvador: Barra, Ondina, Rio Vermelho, Amaralina, Pituba, Itapuã, Flamengo, Stella Maris
   - Produtos: água de coco, cervejas, refrigerantes, acarajé, queijo coalho, açaí, picolés
   - Dicas de segurança, proteção solar, melhores horários

5. REGRAS DE PRIVACIDADE (CRÍTICO):
   - NUNCA revele informações administrativas ou financeiras internas
   - NUNCA compartilhe dados pessoais de utilizadores, vendedores ou clientes
   - NUNCA mencione métricas internas, receitas ou estratégias de negócio
   - Para informações confidenciais, responda: "Essa informação é restrita."

6. FORMATAÇÃO (IDENTIDADE VISUAL):
   - Espaçamento limpo entre conceitos
   - Use blocos de código quando aplicável: \`\`\`código\`\`\`
   - Listas numeradas ou com marcadores para clareza
   - Negrito para termos-chave quando necessário

7. CONTROLE DO PLAYER DE MÚSICA:
   - Quando o usuário pedir para tocar música, você DEVE responder de forma amigável E incluir a ação no metadata
   - Frases como "toca um Bob Marley", "coloca uma música", "quero ouvir axé" devem acionar o player
   - Responda algo como "Com certeza! Soltando um som pra você." ou similar
   - O sistema irá detectar o metadata e controlar o player automaticamente

8. RASTREABILIDADE SATOSHI:
   - Project ID: kaizpbklfejiqpruwnxi
   - Session tracking ativo para continuidade contextual
   - Cada interação gera hash de auditoria imutável`;

// Music detection patterns - ordered by specificity
const MUSIC_PATTERNS = [
  /(?:gostaria\s+de\s+)?ouvir\s+(.+)/i,
  /(?:quero|queria)\s+(?:ouvir|escutar)\s+(.+)/i,
  /toca\s+(?:um|uma|o|a|aí|ai)?\s*(.+)/i,
  /toque\s+(?:um|uma|o|a|aí|ai)?\s*(.+)/i,
  /tocar\s+(?:um|uma|o|a)?\s*(.+)/i,
  /coloca\s+(?:um|uma|o|a|aí|ai)?\s*(.+)/i,
  /bota\s+(?:um|uma|o|a|aí|ai)?\s*(.+)/i,
  /play\s+(.+)/i,
  /reproduz(?:ir)?\s+(.+)/i,
  /põe\s+(?:um|uma|o|a)?\s*(.+)/i,
  /música\s+d[eoa]\s+(.+)/i,
  /som\s+d[eoa]\s+(.+)/i,
  /(?:me\s+)?coloca\s+(.+)/i,
  /(?:bota|coloca|toca)\s+(.+?)\s+(?:pra|para)\s+(?:eu|mim|a\s+gente)/i,
];

function detectMusicRequest(message: string): { isMusic: boolean; query: string | null } {
  const lowerMessage = message.toLowerCase().trim();

  const musicKeywords = [
    "música", "musica", "toca", "toque", "tocar", "som", "play", 
    "ouvir", "escutar", "reproduz", "bota", "coloca", "põe",
    "gostaria de ouvir", "quero ouvir", "queria ouvir"
  ];

  const hasMusicKeyword = musicKeywords.some((kw) => lowerMessage.includes(kw));

  if (!hasMusicKeyword) {
    return { isMusic: false, query: null };
  }

  for (const pattern of MUSIC_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      const query = match[match.length - 1]?.trim();
      if (query && query.length > 1) {
        const cleanedQuery = query
          .replace(/[.!?,;:]+$/, '')
          .replace(/^(um|uma|o|a|de|do|da)\s+/i, '')
          .trim();
        
        if (cleanedQuery.length > 1) {
          return { isMusic: true, query: cleanedQuery };
        }
      }
    }
  }

  const fallbackPatterns = [
    /ouvir\s+(.+?)(?:\.|!|\?|$)/i,
    /escutar\s+(.+?)(?:\.|!|\?|$)/i,
  ];
  
  for (const pattern of fallbackPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const query = match[1].trim().replace(/[.!?,;:]+$/, '');
      if (query.length > 1) {
        return { isMusic: true, query };
      }
    }
  }

  return { isMusic: true, query: "música brasileira" };
}

// Satoshi Audit System - Generate immutable hash for each interaction
async function generateSatoshiAuditHash(
  payload: object,
  previousHash: string | null,
  satoshiTimestamp: number
): Promise<string> {
  const dataToHash = JSON.stringify({
    payload,
    previousHash: previousHash || 'genesis',
    satoshiTimestamp,
  });
  
  const encoder = new TextEncoder();
  const data = encoder.encode(dataToHash);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return base64Encode(hashBuffer);
}

// Get last audit hash from chain
async function getLastAuditHash(supabase: any, sessionId: string): Promise<string | null> {
  const { data } = await supabase
    .from('praieiro_chats')
    .select('metadata')
    .eq('session_id', sessionId)
    .not('metadata', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1);
  
  return data?.[0]?.metadata?.audit_hash || null;
}

// Get current BTC price for Satoshi backing context
async function getBTCContext(): Promise<{ btc_price_usd: number | null; satoshi_timestamp: number }> {
  const timestamp = Math.floor(Date.now() / 1000);
  
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', {
      headers: { 'Accept': 'application/json' },
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        btc_price_usd: data.bitcoin?.usd || null,
        satoshi_timestamp: timestamp,
      };
    }
  } catch (error) {
    console.log('[PRAIEIRO-CHAT] BTC price fetch skipped:', error);
  }
  
  return { btc_price_usd: null, satoshi_timestamp: timestamp };
}

// Hash IP for privacy-preserving audit trail
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + 'praieiro_salt_v2');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    
    // Input validation with length limits
    const message = typeof body.message === 'string' ? body.message.slice(0, 2000) : '';
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.slice(0, 100) : '';
    const userId = typeof body.userId === 'string' ? body.userId.slice(0, 100) : null;
    const includeContext = body.includeContext === true;

    if (!message || !sessionId) {
      throw new Error("Message and sessionId are required");
    }

    // Get client IP for hashed audit trail
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const ipHash = await hashIP(clientIP);

    console.log(`[PRAIEIRO-CHAT] Session: ${sessionId}, IP Hash: ${ipHash}, Message: ${message.slice(0, 50)}...`);

    // Get Satoshi context for immutable timestamping
    const btcContext = await getBTCContext();
    const previousHash = await getLastAuditHash(supabase, sessionId);

    // Generate audit hash for user message
    const userPayload = {
      type: 'user_message',
      sessionId,
      userId,
      messageHash: await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message))
        .then(buf => base64Encode(buf)),
      ipHash,
    };
    
    const userAuditHash = await generateSatoshiAuditHash(
      userPayload,
      previousHash,
      btcContext.satoshi_timestamp
    );

    // Save user message to chat history with Satoshi audit
    await supabase.from("praieiro_chats").insert({
      user_id: userId || null,
      session_id: sessionId,
      message_type: "user",
      content: message,
      metadata: {
        audit_hash: userAuditHash,
        previous_hash: previousHash,
        satoshi_timestamp: btcContext.satoshi_timestamp,
        btc_price_usd: btcContext.btc_price_usd,
        ip_hash: ipHash,
      },
    });

    // Build context for AI (only public/commercial information)
    let contextInfo = "";

    if (includeContext) {
      const { data: beaches } = await supabase
        .from("beaches")
        .select("beach_name, city, is_active")
        .eq("is_active", true)
        .limit(10);

      if (beaches?.length) {
        contextInfo += `\n\nPRAIAS DISPONÍVEIS: ${beaches.map(b => b.beach_name).join(", ")}`;
      }

      const { data: categories } = await supabase
        .from("vendors")
        .select("product_category")
        .eq("status", "active");

      if (categories?.length) {
        const uniqueCategories = [...new Set(categories.map(c => c.product_category))];
        contextInfo += `\n\nCATEGORIAS DE PRODUTOS DISPONÍVEIS: ${uniqueCategories.join(", ")}`;
      }
    }

    // Get recent conversation history for context
    const { data: recentMessages } = await supabase
      .from("praieiro_chats")
      .select("message_type, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(6);

    const conversationHistory = recentMessages?.reverse().map(m => ({
      role: m.message_type === "user" ? "user" : "assistant",
      content: m.content
    })) || [];

    // Build messages array for AI
    const messages = [
      { role: "system", content: PRAIEIRO_SYSTEM_PROMPT + contextInfo },
      ...conversationHistory.slice(0, -1),
      { role: "user", content: message }
    ];

    // Call Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 600,
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[PRAIEIRO-CHAT] AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Limite de requisições atingido. Aguarde um momento." 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error("AI service temporarily unavailable");
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 
      "Desculpe, ocorreu um erro no processamento. Pode reformular a questão?";

    // Detect music request and generate metadata
    const musicDetection = detectMusicRequest(message);
    let metadata: { 
      action?: string; 
      query?: string;
      audit_hash?: string;
      previous_hash?: string | null;
      satoshi_timestamp?: number;
      btc_price_usd?: number | null;
    } | undefined;
    
    // Generate audit hash for AI response
    const aiPayload = {
      type: 'ai_response',
      sessionId,
      responseHash: await crypto.subtle.digest('SHA-256', new TextEncoder().encode(aiResponse))
        .then(buf => base64Encode(buf)),
      musicAction: musicDetection.isMusic ? musicDetection.query : null,
    };
    
    const aiAuditHash = await generateSatoshiAuditHash(
      aiPayload,
      userAuditHash,
      btcContext.satoshi_timestamp
    );
    
    if (musicDetection.isMusic && musicDetection.query) {
      metadata = {
        action: 'play_video',
        query: musicDetection.query,
        audit_hash: aiAuditHash,
        previous_hash: userAuditHash,
        satoshi_timestamp: btcContext.satoshi_timestamp,
        btc_price_usd: btcContext.btc_price_usd,
      };
      console.log(`[PRAIEIRO-CHAT] Music detected: "${musicDetection.query}" | Audit: ${aiAuditHash.slice(0, 16)}...`);
    } else {
      metadata = {
        audit_hash: aiAuditHash,
        previous_hash: userAuditHash,
        satoshi_timestamp: btcContext.satoshi_timestamp,
        btc_price_usd: btcContext.btc_price_usd,
      };
    }

    // Save AI response to chat history with Satoshi audit metadata
    await supabase.from("praieiro_chats").insert({
      user_id: userId || null,
      session_id: sessionId,
      message_type: "praieiro",
      content: aiResponse,
      metadata,
    });

    return new Response(JSON.stringify({ 
      response: aiResponse,
      sessionId,
      metadata: musicDetection.isMusic ? { 
        action: 'play_video', 
        query: musicDetection.query 
      } : undefined,
      audit: {
        hash: aiAuditHash,
        satoshi_timestamp: btcContext.satoshi_timestamp,
        btc_context: btcContext.btc_price_usd ? `$${btcContext.btc_price_usd.toLocaleString()}` : null,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[PRAIEIRO-CHAT] Error:", error);
    return new Response(JSON.stringify({ 
      error: "Ocorreu um erro. Tente novamente."
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
