/**
 * CARDS EXECUTIVOS DO CONSELHO DE IA - PRODUÇÃO
 * CLO (Jurídico) | CFO (Financeiro) | CMO (Marketing)
 * 100% conectados às tabelas reais de governança - SEM DADOS SIMULADOS
 * Inclui Detector de Padrões de Cerco (Lei 3.1)
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Shield, 
  TrendingUp, 
  Users, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  DollarSign,
  MapPin,
  Hash,
  RefreshCw,
  Gavel,
  PiggyBank,
  Megaphone,
  Radio,
  Radar,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

// Tipos baseados no schema real do Supabase
type BoardGovernanceReport = Database['public']['Tables']['board_governance_reports']['Row'];
type AttackPatternAlert = Database['public']['Tables']['attack_pattern_alerts']['Row'];
type BannedIP = Database['public']['Tables']['banned_ips']['Row'];

interface CLOMetrics {
  activeBans: number;
  criticalAlerts: number;
  siegeAlerts: AttackPatternAlert[];
  integrityStatus: 'ÍNTEGRA' | 'ALERTA' | 'COMPROMETIDA';
  lastBanHash: string | null;
  lastReport: BoardGovernanceReport | null;
  hasData: boolean;
}

interface CFOMetrics {
  totalConchas: number;
  circulatingConchas: number;
  conchaPrice: number;
  suggestedPrice: number;
  demandIndex: number;
  lastReport: BoardGovernanceReport | null;
  hasData: boolean;
}

interface CMOMetrics {
  activeUsers: number;
  usersByRegion: Record<string, number>;
  engagementRate: number;
  topBeach: string;
  lastReport: BoardGovernanceReport | null;
  hasData: boolean;
  lastBroadcast: { created_at: string; title: string } | null;
}

export function ExecutiveCouncilCards() {
  const [loading, setLoading] = useState(true);
  const [cloMetrics, setCLOMetrics] = useState<CLOMetrics | null>(null);
  const [cfoMetrics, setCFOMetrics] = useState<CFOMetrics | null>(null);
  const [cmoMetrics, setCMOMetrics] = useState<CMOMetrics | null>(null);
  const [criticalNotification, setCriticalNotification] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [runningDetector, setRunningDetector] = useState(false);

  // Executar o Detector de Padrões de Cerco
  const runSiegeDetector = async () => {
    try {
      setRunningDetector(true);
      toast.loading('🏰 Executando Detector de Cerco...');
      
      const { data, error } = await supabase.functions.invoke('detect-siege-patterns', {
        method: 'POST'
      });

      if (error) throw error;

      toast.dismiss();
      
      if (data.alertsCreated > 0) {
        toast.warning(`🚨 ${data.alertsCreated} novos alertas de cerco detectados!`, {
          description: `${data.stats.totalIpsAnalyzed} IPs analisados em ${data.stats.regionsAnalyzed} regiões`
        });
      } else {
        toast.success('✅ Análise concluída. Nenhum padrão de cerco detectado.', {
          description: `${data.stats.totalIpsAnalyzed} IPs verificados`
        });
      }

      // Recarregar métricas
      loadMetrics();
    } catch (error: unknown) {
      toast.dismiss();
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro no detector de cerco:', errorMessage);
      toast.error('Erro ao executar detector de cerco', { description: errorMessage });
    } finally {
      setRunningDetector(false);
    }
  };

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);

      // ============ CLO DATA - IPs banidos e alertas ============
      const [bannedIpsRes, alertsRes, cloReportRes] = await Promise.all([
        supabase
          .from('banned_ips')
          .select('id, ip_address, satoshi_hash, severity, attack_type, blocked_at')
          .eq('is_active', true)
          .order('blocked_at', { ascending: false }),
        supabase
          .from('attack_pattern_alerts')
          .select('*')
          .eq('is_active', true)
          .order('last_detected_at', { ascending: false }),
        supabase
          .from('board_governance_reports')
          .select('*')
          .eq('report_type', 'clo')
          .order('created_at', { ascending: false })
          .limit(1)
      ]);

      const activeBans = bannedIpsRes.data?.length || 0;
      const alerts = alertsRes.data || [];
      const criticalAlerts = alerts.filter(a => 
        a.severity === 'high' || a.severity === 'critical'
      ).length;
      const siegeAlerts = alerts.filter(a => a.pattern_type === 'siege');

      // Determinar status de integridade baseado em dados REAIS
      let integrityStatus: 'ÍNTEGRA' | 'ALERTA' | 'COMPROMETIDA' = 'ÍNTEGRA';
      if (siegeAlerts.length > 0 || criticalAlerts > 0) {
        integrityStatus = 'COMPROMETIDA';
      } else if (activeBans > 10) {
        integrityStatus = 'ALERTA';
      }

      const cloReport = cloReportRes.data?.[0] || null;
      const lastBanHash = bannedIpsRes.data?.[0]?.satoshi_hash || cloReport?.satoshi_hash || null;
      
      setCLOMetrics({
        activeBans,
        criticalAlerts,
        siegeAlerts,
        integrityStatus,
        lastBanHash,
        lastReport: cloReport,
        hasData: activeBans > 0 || alerts.length > 0 || !!cloReport
      });

      if (integrityStatus === 'COMPROMETIDA') {
        setCriticalNotification(true);
      }

      // ============ CFO DATA - Conchas e parâmetros REAIS ============
      const [conchasRes, protocolRes, cfoReportRes, ordersRes] = await Promise.all([
        supabase
          .from('client_conchas')
          .select('balance, total_deposited, total_spent'),
        supabase
          .from('protocol_parameters')
          .select('param_value')
          .eq('param_key', 'concha_price_brl')
          .limit(1),
        supabase
          .from('board_governance_reports')
          .select('*')
          .eq('report_type', 'cfo')
          .order('created_at', { ascending: false })
          .limit(1),
        // Buscar volume de vendas real (últimas 24h)
        supabase
          .from('orders')
          .select('total_amount, created_at')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .eq('status', 'completed')
      ]);

      const totalConchas = (conchasRes.data || []).reduce(
        (sum, c) => sum + (Number(c.balance) || 0), 0
      );
      const totalDeposited = (conchasRes.data || []).reduce(
        (sum, c) => sum + (Number(c.total_deposited) || 0), 0
      );
      const totalSpent = (conchasRes.data || []).reduce(
        (sum, c) => sum + (Number(c.total_spent) || 0), 0
      );
      
      const currentPrice = Number(protocolRes.data?.[0]?.param_value) || 1.0;
      
      // Cálculo de demanda REAL baseado em transações
      const recentOrdersVolume = (ordersRes.data || []).reduce(
        (sum, o) => sum + (Number(o.total_amount) || 0), 0
      );
      
      // Índice de demanda baseado em circulação real
      const circulationRate = totalSpent > 0 && totalDeposited > 0 
        ? (totalSpent / totalDeposited) * 100 
        : 0;
      const demandIndex = Math.min(100, Math.round(circulationRate));
      
      // Sugestão de preço baseada em demanda REAL
      const suggestedPrice = demandIndex > 60 
        ? currentPrice * 1.05 
        : demandIndex < 30 
          ? currentPrice * 0.95 
          : currentPrice;

      const cfoReport = cfoReportRes.data?.[0] || null;

      setCFOMetrics({
        totalConchas,
        circulatingConchas: totalSpent,
        conchaPrice: currentPrice,
        suggestedPrice: Math.round(suggestedPrice * 100) / 100,
        demandIndex,
        lastReport: cfoReport,
        hasData: totalConchas > 0 || !!cfoReport || recentOrdersVolume > 0
      });

      // ============ CMO DATA - Usuários por região REAIS ============
      const [profilesRes, clientsRes, beachesRes, cmoReportRes, lastBroadcastRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, created_at'),
        supabase
          .from('clients')
          .select('profile_id, preferred_beach_id'),
        supabase
          .from('beaches')
          .select('id, beach_name, city'),
        supabase
          .from('board_governance_reports')
          .select('*')
          .eq('report_type', 'cmo')
          .order('created_at', { ascending: false })
          .limit(1),
        // Buscar último broadcast global
        supabase
          .from('ai_council_admin_notifications')
          .select('created_at, title')
          .eq('notification_type', 'global_broadcast')
          .order('created_at', { ascending: false })
          .limit(1)
      ]);

      const activeUsers = profilesRes.data?.length || 0;
      const beaches = beachesRes.data || [];
      const clients = clientsRes.data || [];
      
      // Calcular usuários por região REAIS
      const usersByRegion: Record<string, number> = {};
      clients.forEach(client => {
        const beach = beaches.find(b => b.id === client.preferred_beach_id);
        const regionName = beach?.beach_name || beach?.city || 'Sem região';
        usersByRegion[regionName] = (usersByRegion[regionName] || 0) + 1;
      });

      // Encontrar top praia REAL
      const sortedRegions = Object.entries(usersByRegion).sort((a, b) => b[1] - a[1]);
      const topBeach = sortedRegions[0]?.[0] || (beaches[0]?.beach_name || 'Sem dados');
      
      // Taxa de engajamento baseada em usuários ativos recentes (7 dias)
      const recentProfiles = (profilesRes.data || []).filter(p => 
        new Date(p.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
      );
      const engagementRate = activeUsers > 0 
        ? Math.round((recentProfiles.length / activeUsers) * 100) 
        : 0;

      const cmoReport = cmoReportRes.data?.[0] || null;
      const lastBroadcast = lastBroadcastRes.data?.[0] || null;

      setCMOMetrics({
        activeUsers,
        usersByRegion: Object.fromEntries(sortedRegions.slice(0, 5)),
        engagementRate: Math.min(100, engagementRate),
        topBeach,
        lastReport: cmoReport,
        hasData: activeUsers > 0 || !!cmoReport,
        lastBroadcast
      });

      setLastUpdate(new Date());

    } catch (error) {
      console.error('Erro ao carregar métricas do conselho:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();

    // Subscribe para atualizações em TEMPO REAL
    const channel = supabase
      .channel('executive-council-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'banned_ips' },
        (payload) => {
          console.log('🔴 Banned IP change detected:', payload);
          loadMetrics();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attack_pattern_alerts' },
        (payload) => {
          console.log('🚨 Attack pattern alert:', payload);
          loadMetrics();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'board_governance_reports' },
        (payload) => {
          console.log('📊 Governance report update:', payload);
          loadMetrics();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'client_conchas' },
        () => loadMetrics()
      )
      .subscribe((status) => {
        console.log('🎺 Executive Council realtime status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadMetrics]);

  const getRiskBadge = (level: string | null) => {
    const config = {
      low: { icon: CheckCircle2, label: 'Baixo', className: 'bg-green-500/20 text-green-400 border-green-500/50' },
      medium: { icon: AlertTriangle, label: 'Médio', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
      high: { icon: AlertTriangle, label: 'Alto', className: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
      critical: { icon: XCircle, label: 'Crítico', className: 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse' }
    };
    const cfg = config[(level || 'low') as keyof typeof config] || config.low;
    const Icon = cfg.icon;
    return (
      <Badge className={cfg.className}>
        <Icon className="w-3 h-3 mr-1" />
        {cfg.label}
      </Badge>
    );
  };

  const getIntegrityBadge = (status: string) => {
    const config = {
      'ÍNTEGRA': { className: 'bg-green-500/20 text-green-400 border-green-500/50', icon: Shield },
      'ALERTA': { className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 animate-pulse', icon: AlertTriangle },
      'COMPROMETIDA': { className: 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse', icon: XCircle }
    };
    const cfg = config[status as keyof typeof config] || config['ÍNTEGRA'];
    const Icon = cfg.icon;
    return (
      <Badge className={cfg.className}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const renderEmptyState = (message: string) => (
    <div className="flex flex-col items-center justify-center py-4 text-center">
      <Radio className="w-6 h-6 text-muted-foreground mb-2 animate-pulse" />
      <p className="text-sm text-muted-foreground italic">
        {message}
      </p>
    </div>
  );

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'agora mesmo';
    if (diffMins < 60) return `há ${diffMins} min`;
    if (diffHours < 24) return `há ${diffHours}h`;
    return date.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-card border-border">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com botão de refresh e indicador de última atualização */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          🏛️ Conselho Executivo de IA
          {criticalNotification && (
            <Badge className="bg-red-500/20 text-red-400 animate-pulse">
              <AlertTriangle className="w-3 h-3 mr-1" />
              ATENÇÃO CRÍTICA
            </Badge>
          )}
        </h2>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}
            </span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={runSiegeDetector} 
            disabled={runningDetector}
            className="bg-orange-500/10 border-orange-500/50 hover:bg-orange-500/20 text-orange-400"
          >
            {runningDetector ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Radar className="w-4 h-4 mr-2" />
            )}
            Detector de Cerco
          </Button>
          <Button variant="outline" size="sm" onClick={loadMetrics} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Siege Alerts Banner - DADOS REAIS */}
      {cloMetrics?.siegeAlerts && cloMetrics.siegeAlerts.length > 0 && (
        <Card className="bg-red-500/10 border-red-500/50 animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-500/20">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-red-400">🏰 ALERTAS DE CERCO ATIVOS</h3>
                <p className="text-sm text-muted-foreground">
                  {cloMetrics.siegeAlerts.length} região(ões) sob ataque coordenado. 
                  Total de {cloMetrics.siegeAlerts.reduce((sum, a) => sum + (a.attack_count || 0), 0)} IPs hostis detectados.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {cloMetrics.siegeAlerts.map(alert => (
                    <Badge key={alert.id} variant="destructive" className="text-xs">
                      {alert.affected_region || 'Região desconhecida'}: {alert.attack_count} IPs
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Executive Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CLO Card - Diretor Jurídico */}
        <Card className={cn(
          "bg-card border-border transition-all duration-300",
          cloMetrics?.integrityStatus === 'COMPROMETIDA' && "border-red-500/50 shadow-red-500/20 shadow-lg"
        )}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Gavel className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-lg">CLO</span>
              </div>
              {cloMetrics && getIntegrityBadge(cloMetrics.integrityStatus)}
            </CardTitle>
            <p className="text-sm text-muted-foreground">Diretor Jurídico de IA</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {!cloMetrics?.hasData ? (
              renderEmptyState('Aguardando Inteligência Satoshi...')
            ) : (
              <>
                {/* Integrity Status */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Integridade do Ledger</span>
                    <Shield className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {cloMetrics.integrityStatus}
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 rounded-lg bg-muted/30 text-center">
                    <div className="text-lg font-bold text-foreground">{cloMetrics.activeBans}</div>
                    <div className="text-xs text-muted-foreground">IPs Banidos</div>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30 text-center">
                    <div className={cn(
                      "text-lg font-bold",
                      cloMetrics.criticalAlerts > 0 ? "text-red-400" : "text-foreground"
                    )}>
                      {cloMetrics.criticalAlerts}
                    </div>
                    <div className="text-xs text-muted-foreground">Alertas Críticos</div>
                  </div>
                </div>

                {/* Satoshi Hash */}
                {cloMetrics.lastBanHash ? (
                  <div className="p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Hash className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Último Hash Satoshi</span>
                    </div>
                    <code className="text-xs text-primary font-mono break-all">
                      {cloMetrics.lastBanHash.slice(0, 32)}...
                    </code>
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground italic text-center">
                      Nenhum hash de banimento registrado
                    </div>
                  </div>
                )}

                {/* Last Report */}
                {cloMetrics.lastReport && (
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Último relatório</span>
                      {getRiskBadge(cloMetrics.lastReport.risk_level)}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* CFO Card - Diretor Financeiro */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <PiggyBank className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-lg">CFO</span>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                <DollarSign className="w-3 h-3 mr-1" />
                Operacional
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">Diretor Financeiro de IA</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {!cfoMetrics?.hasData ? (
              renderEmptyState('Aguardando Inteligência Satoshi...')
            ) : (
              <>
                {/* Treasury */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Tesouro de Conchas</span>
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    🐚 {cfoMetrics.totalConchas.toLocaleString('pt-BR')}
                  </div>
                </div>

                {/* Price Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 rounded-lg bg-muted/30 text-center">
                    <div className="text-lg font-bold text-foreground">
                      R$ {cfoMetrics.conchaPrice.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">Preço Atual</div>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30 text-center">
                    <div className={cn(
                      "text-lg font-bold",
                      cfoMetrics.suggestedPrice > cfoMetrics.conchaPrice 
                        ? "text-green-400" 
                        : cfoMetrics.suggestedPrice < cfoMetrics.conchaPrice
                          ? "text-red-400"
                          : "text-foreground"
                    )}>
                      R$ {cfoMetrics.suggestedPrice.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">Preço de Equilíbrio</div>
                  </div>
                </div>

                {/* Demand Index */}
                <div className="p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Índice de Demanda (Circulação)</span>
                    <span className="text-xs font-bold text-foreground">{cfoMetrics.demandIndex}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all",
                        cfoMetrics.demandIndex > 70 ? "bg-green-500" :
                        cfoMetrics.demandIndex > 40 ? "bg-yellow-500" : "bg-red-500"
                      )}
                      style={{ width: `${cfoMetrics.demandIndex}%` }}
                    />
                  </div>
                </div>

                {/* Recommendation */}
                <div className="pt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground">
                    {cfoMetrics.suggestedPrice > cfoMetrics.conchaPrice 
                      ? "💹 IA sugere aumento de preço baseado na demanda real"
                      : cfoMetrics.suggestedPrice < cfoMetrics.conchaPrice
                        ? "📉 IA sugere redução de preço para estimular circulação"
                        : "⚖️ Preço atual em equilíbrio com a demanda"
                    }
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* CMO Card - Diretor de Marketing */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Megaphone className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-lg">CMO</span>
              </div>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                <Users className="w-3 h-3 mr-1" />
                Ativo
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">Diretor de Marketing de IA</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {!cmoMetrics?.hasData ? (
              renderEmptyState('Aguardando Inteligência Satoshi...')
            ) : (
              <>
                {/* Beach Pulse */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Pulso da Praia</span>
                    <MapPin className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {cmoMetrics.activeUsers.toLocaleString('pt-BR')} usuários
                  </div>
                </div>

                {/* Engagement & Top Beach */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 rounded-lg bg-muted/30 text-center">
                    <div className="text-lg font-bold text-foreground">
                      {cmoMetrics.engagementRate}%
                    </div>
                    <div className="text-xs text-muted-foreground">Engajamento 7d</div>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30 text-center">
                    <div className="text-sm font-bold text-foreground truncate" title={cmoMetrics.topBeach}>
                      {cmoMetrics.topBeach}
                    </div>
                    <div className="text-xs text-muted-foreground">Top Praia</div>
                  </div>
                </div>

                {/* Regions */}
                <div className="p-2 rounded-lg bg-muted/30">
                  <div className="text-xs text-muted-foreground mb-2">Usuários por Região</div>
                  {Object.keys(cmoMetrics.usersByRegion).length > 0 ? (
                    <div className="space-y-1">
                      {Object.entries(cmoMetrics.usersByRegion).slice(0, 3).map(([region, count]) => (
                        <div key={region} className="flex items-center justify-between">
                          <span className="text-xs text-foreground truncate">{region}</span>
                          <span className="text-xs font-bold text-primary">{count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic text-center">
                      Sem dados regionais
                    </div>
                  )}
                </div>

                {/* Last Broadcast */}
                {cmoMetrics.lastBroadcast && (
                  <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30">
                    <div className="flex items-center gap-2">
                      <Megaphone className="w-3 h-3 text-purple-400" />
                      <div className="text-xs text-purple-300/80 truncate flex-1">
                        {cmoMetrics.lastBroadcast.title.replace('📢 ', '')}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Último Comunicado: {formatTimeAgo(cmoMetrics.lastBroadcast.created_at)}
                    </div>
                  </div>
                )}

                {/* Recommendation */}
                <div className="pt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground">
                    🎯 Foco recomendado: {cmoMetrics.topBeach}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
