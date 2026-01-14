/**
 * DETECTOR DE PADRÕES DE CERCO - LEI 3.1 CONSTITUCIONAL
 * Edge Function que analisa IPs banidos por região e gera Alertas de Cerco
 * se 3+ IPs da mesma região tentarem acessar iscas diferentes
 * 
 * IDEMPOTÊNCIA: Usa satoshi_hash único para evitar alertas duplicados
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BannedIP {
  id: string;
  ip_address: string;
  blocked_at: string;
  attack_type: string | null;
  blocked_variable: string | null;
  severity: string | null;
  metadata: Record<string, unknown> | null;
}

interface SiegePattern {
  region: string;
  ipAddresses: string[];
  attackTypes: Set<string>;
  attackCount: number;
  firstDetected: string;
  lastDetected: string;
}

// Gerar satoshi_hash único para rastreabilidade
async function generateSatoshiHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Extrair região do IP usando geolocalização aproximada ou metadata
function extractRegion(ip: BannedIP): string {
  // Primeiro, tentar extrair de metadata se disponível
  if (ip.metadata && typeof ip.metadata === 'object') {
    const meta = ip.metadata as Record<string, unknown>;
    if (meta.region && typeof meta.region === 'string') return meta.region;
    if (meta.city && typeof meta.city === 'string') return meta.city;
    if (meta.country && typeof meta.country === 'string') return meta.country;
  }
  
  // Fallback: extrair classe A do IP como "região virtual"
  const ipParts = ip.ip_address.split('.');
  if (ipParts.length >= 2) {
    return `Rede ${ipParts[0]}.${ipParts[1]}.x.x`;
  }
  
  return 'Região Desconhecida';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🏰 Iniciando análise de padrões de cerco...');

    // Buscar IPs banidos nas últimas 24 horas
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: bannedIps, error: fetchError } = await supabase
      .from('banned_ips')
      .select('*')
      .eq('is_active', true)
      .gte('blocked_at', twentyFourHoursAgo)
      .order('blocked_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Erro ao buscar IPs banidos: ${fetchError.message}`);
    }

    if (!bannedIps || bannedIps.length === 0) {
      console.log('✅ Nenhum IP banido nas últimas 24h');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum padrão de cerco detectado',
          siegeAlerts: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Analisando ${bannedIps.length} IPs banidos...`);

    // Agrupar IPs por região
    const regionPatterns: Map<string, SiegePattern> = new Map();

    for (const ip of bannedIps) {
      const region = extractRegion(ip);
      
      if (!regionPatterns.has(region)) {
        regionPatterns.set(region, {
          region,
          ipAddresses: [],
          attackTypes: new Set(),
          attackCount: 0,
          firstDetected: ip.blocked_at,
          lastDetected: ip.blocked_at
        });
      }

      const pattern = regionPatterns.get(region)!;
      if (!pattern.ipAddresses.includes(ip.ip_address)) {
        pattern.ipAddresses.push(ip.ip_address);
      }
      if (ip.attack_type) {
        pattern.attackTypes.add(ip.attack_type);
      }
      pattern.attackCount++;
      
      // Atualizar timestamps
      if (new Date(ip.blocked_at) < new Date(pattern.firstDetected)) {
        pattern.firstDetected = ip.blocked_at;
      }
      if (new Date(ip.blocked_at) > new Date(pattern.lastDetected)) {
        pattern.lastDetected = ip.blocked_at;
      }
    }

    // Detectar padrões de cerco: 3+ IPs da mesma região com tipos de ataque diferentes
    const siegeAlerts: SiegePattern[] = [];
    
    for (const [region, pattern] of regionPatterns) {
      // Condição de cerco: 3+ IPs E pelo menos 2 tipos de ataque diferentes (iscas diferentes)
      if (pattern.ipAddresses.length >= 3 && pattern.attackTypes.size >= 2) {
        siegeAlerts.push(pattern);
        console.log(`🚨 CERCO DETECTADO: ${region} - ${pattern.ipAddresses.length} IPs, ${pattern.attackTypes.size} tipos de ataque`);
      }
    }

    // Inserir alertas no banco de dados (com idempotência via satoshi_hash)
    let alertsCreated = 0;
    
    for (const siege of siegeAlerts) {
      // Gerar hash único para este padrão específico (idempotência)
      const hashData = `siege:${siege.region}:${siege.ipAddresses.sort().join(',')}:${siege.firstDetected}`;
      const satoshiHash = await generateSatoshiHash(hashData);

      // Verificar se já existe alerta com este hash (idempotência)
      const { data: existingAlert } = await supabase
        .from('attack_pattern_alerts')
        .select('id')
        .eq('satoshi_hash', satoshiHash)
        .limit(1);

      if (existingAlert && existingAlert.length > 0) {
        console.log(`⏭️ Alerta já existe para ${siege.region}, pulando...`);
        continue;
      }

      // Determinar severidade baseada no número de IPs
      const severity = siege.ipAddresses.length >= 10 ? 'critical' 
        : siege.ipAddresses.length >= 5 ? 'high' 
        : 'medium';

      // Criar alerta de cerco
      const { error: insertError } = await supabase
        .from('attack_pattern_alerts')
        .insert({
          pattern_type: 'siege',
          alert_name: `Cerco em ${siege.region}`,
          description: `Ataque coordenado detectado: ${siege.ipAddresses.length} IPs da região ${siege.region} tentaram acessar ${siege.attackTypes.size} iscas diferentes.`,
          affected_region: siege.region,
          ip_addresses: siege.ipAddresses,
          attack_count: siege.ipAddresses.length,
          severity,
          first_detected_at: siege.firstDetected,
          last_detected_at: siege.lastDetected,
          is_active: true,
          satoshi_hash: satoshiHash,
          metadata: {
            attack_types: Array.from(siege.attackTypes),
            detection_timestamp: new Date().toISOString(),
            detector_version: '1.0.0'
          }
        });

      if (insertError) {
        console.error(`Erro ao inserir alerta para ${siege.region}:`, insertError);
        continue;
      }

      alertsCreated++;
      console.log(`✅ Alerta de cerco criado para ${siege.region}`);

      // Criar notificação crítica para o Conselho (O Trompete Real)
      const notificationHash = await generateSatoshiHash(`notification:siege:${siege.region}:${Date.now()}`);
      
      await supabase
        .from('ai_council_admin_notifications')
        .insert({
          notification_type: 'siege_alert',
          title: `🏰 ALERTA DE CERCO: ${siege.region}`,
          message: `Padrão de ataque coordenado detectado. ${siege.ipAddresses.length} IPs hostis tentando múltiplos vetores de ataque.`,
          priority: severity === 'critical' ? 'critical' : 'high',
          action_required: true,
          action_type: 'review_siege',
          action_data: {
            region: siege.region,
            ip_count: siege.ipAddresses.length,
            attack_types: Array.from(siege.attackTypes),
            ip_addresses: siege.ipAddresses.slice(0, 10) // Limitar para não sobrecarregar
          },
          satoshi_hash: notificationHash
        });
    }

    const response = {
      success: true,
      message: `Análise completa. ${alertsCreated} novos alertas de cerco criados.`,
      stats: {
        totalIpsAnalyzed: bannedIps.length,
        regionsAnalyzed: regionPatterns.size,
        siegePatternsDetected: siegeAlerts.length,
        alertsCreated
      }
    };

    console.log('🏰 Análise de cerco finalizada:', response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro no detector de cerco:', errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
