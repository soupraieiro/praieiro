/**
 * DASHBOARD DE GOVERNANÇA - WAR ROOM
 * Controle de Centavos + Motor de Fases + Central de Decodificação
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Shield, Users, Coins, TrendingUp, AlertTriangle, 
  Power, Terminal, Copy, RefreshCw, Zap, Lock, Unlock,
  Activity, Database, Code, CheckCircle, XCircle, Eye
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

interface GovernanceState {
  id: string;
  current_phase: number;
  governance_frozen: boolean;
  sentinel_chat_active: boolean;
  base_fixed_fee: number;
  linear_meter_fee: number;
  ads_active: boolean;
  withdrawal_blocked: boolean;
  satoshi_hash: string | null;
  phase_activated_at: string;
}

interface MassMetrics {
  total_users: number;
  total_clientes: number;
  total_praieiros: number;
  total_admins: number;
  total_shells_distributed: number;
  current_phase: number;
  projected_revenue: number;
  alert_message: string | null;
}

interface EngineeringLog {
  id: string;
  error_code: string;
  error_message: string;
  error_category: string;
  business_impact: string;
  suggested_sql: string;
  created_at: string;
  is_resolved: boolean;
}

const PHASE_CONFIG = [
  { 
    phase: 0, 
    name: 'FASE 0: Crescimento Puro', 
    description: 'Gratuito, Ads ativos, Chat aberto',
    fee: 'R$ 0,00',
    color: 'bg-emerald-500',
    features: ['Ads Twitter/X', 'Chat Livre', 'Sem Taxa'],
    edgeLogic: `// Fast-Path: Sem validação de taxa
if (phase === 0) return { fee: 0, sentinel: false };`,
    sql: `UPDATE system_governance SET current_phase = 0, base_fixed_fee = 0.00, sentinel_chat_active = false, ads_active = true;`
  },
  { 
    phase: 1, 
    name: 'FASE 1: Ativação (100k)', 
    description: 'Taxa R$ 0,01 + Sentinela de Chat',
    fee: 'R$ 0,01',
    color: 'bg-blue-500',
    features: ['Taxa Fixa R$ 0,01', 'Sentinela Ativo', 'Bloqueio PII'],
    edgeLogic: `// Slow-Path: Validação de taxa + Sentinela
const fee = 0.01;
const sentinel = filterPII(message);
return { fee, sentinel: true, hash: generateSatoshiHash(userId, fee) };`,
    sql: `UPDATE system_governance SET current_phase = 1, base_fixed_fee = 0.01, sentinel_chat_active = true, ads_active = false;`
  },
  { 
    phase: 2, 
    name: 'FASE 2: Ocupação (250k)', 
    description: 'R$ 0,01 + Metro Linear',
    fee: 'R$ 0,01 + R$ 0,01/m',
    color: 'bg-amber-500',
    features: ['Taxa Base + Metragem', 'Cobrança por Área', 'Liberação Saque'],
    edgeLogic: `// Cálculo de metragem linear
const baseFee = 0.01;
const meterFee = linearMeters * 0.01;
return { fee: baseFee + meterFee, hash: generateSatoshiHash(userId, baseFee + meterFee) };`,
    sql: `UPDATE system_governance SET current_phase = 2, base_fixed_fee = 0.01, linear_meter_fee = 0.01, withdrawal_blocked = false;`
  },
  { 
    phase: 3, 
    name: 'FASE 3: Tributação Dinâmica', 
    description: 'R$ 0,10 a R$ 1,00 regional',
    fee: 'R$ 0,10 - R$ 1,00',
    color: 'bg-purple-500',
    features: ['Taxa Regional', 'Algoritmo Dinâmico', 'Densidade'],
    edgeLogic: `// Algoritmo de densidade regional
const dynamicFee = calculateRegionalDensity(region, activeVendors, activeClients);
const fee = Math.max(0.10, Math.min(1.00, dynamicFee));
return { fee: fee + (linearMeters * 0.01) };`,
    sql: `UPDATE system_governance SET current_phase = 3, dynamic_min_fee = 0.10, dynamic_max_fee = 1.00;`
  },
  { 
    phase: 4, 
    name: 'FASE FINAL: Estrutura Ideal', 
    description: 'R$ 1,00 + Metragem + Exposição',
    fee: 'R$ 1,00 + R$ 0,01/m',
    color: 'bg-rose-500',
    features: ['Taxa Consolidada', 'Planos Bronze/Prata/Ouro', 'Leilão de Ads'],
    edgeLogic: `// Estrutura final consolidada
const baseFee = 1.00;
const meterFee = linearMeters * 0.01;
const exposureFee = getExposurePlan(vendorId); // Bronze: 0, Prata: 50, Ouro: 100
return { fee: baseFee + meterFee + exposureFee };`,
    sql: `UPDATE system_governance SET current_phase = 4, base_fixed_fee = 1.00, linear_meter_fee = 0.01;`
  }
];

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function GovernanceDashboard() {
  const [governance, setGovernance] = useState<GovernanceState | null>(null);
  const [metrics, setMetrics] = useState<MassMetrics | null>(null);
  const [logs, setLogs] = useState<EngineeringLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorInput, setErrorInput] = useState('');
  const [decodedError, setDecodedError] = useState<any>(null);
  const [showCode, setShowCode] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      // Carregar governança
      const { data: govData } = await supabase
        .from('system_governance')
        .select('*')
        .limit(1)
        .single();
      
      if (govData) setGovernance(govData);

      // Carregar métricas via RPC
      const { data: metricsData } = await supabase.rpc('get_mass_metrics');
      if (metricsData) setMetrics(metricsData as unknown as MassMetrics);

      // Carregar logs de engenharia
      const { data: logsData } = await supabase
        .from('engineering_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (logsData) setLogs(logsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Realtime subscription
    const channel = supabase
      .channel('governance-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'system_governance' },
        () => loadData()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const switchPhase = async (newPhase: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      const { data, error } = await supabase.rpc('switch_governance_phase', {
        p_new_phase: newPhase,
        p_admin_id: user.id
      });

      if (error) throw error;

      const result = data as unknown as { success: boolean; satoshi_hash?: string; error?: string };
      if (result?.success) {
        toast.success(`Fase alterada para ${newPhase}`, {
          description: `Hash: ${result.satoshi_hash?.slice(0, 16)}...`
        });
        loadData();
      } else {
        toast.error(result?.error || 'Erro ao mudar fase');
      }
    } catch (error: any) {
      toast.error('Erro ao mudar fase', { description: error.message });
    }
  };

  const toggleKillSwitch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('toggle_kill_switch', {
        p_admin_id: user.id,
        p_freeze: !governance?.governance_frozen
      });

      if (error) throw error;

      const result = data as unknown as { success: boolean; governance_frozen: boolean } | null;
      if (result?.success) {
        toast.success(result.governance_frozen ? 'Kill-Switch ATIVADO' : 'Sistema DESBLOQUEADO');
        loadData();
      }
    } catch (error: any) {
      toast.error('Erro ao alternar Kill-Switch');
    }
  };

  const decodeError = async () => {
    if (!errorInput.trim()) return;

    // Extrair código de erro PostgreSQL
    const codeMatch = errorInput.match(/(\d{5})/);
    const errorCode = codeMatch ? codeMatch[1] : 'UNKNOWN';

    try {
      const { data } = await supabase.rpc('log_engineering_error', {
        p_error_code: errorCode,
        p_error_message: errorInput.slice(0, 500),
        p_source_component: 'Admin Dashboard',
        p_risk_level: 'MEDIUM'
      });

      if (data) {
        setDecodedError(data);
        toast.success('Erro decodificado e registrado');
        loadData();
      }
    } catch (error) {
      toast.error('Erro ao decodificar');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const userDistribution = metrics ? [
    { name: 'Clientes', value: metrics.total_clientes, color: COLORS[0] },
    { name: 'Praieiros', value: metrics.total_praieiros, color: COLORS[1] },
    { name: 'Admins', value: metrics.total_admins, color: COLORS[3] }
  ] : [];

  const revenueProjection = PHASE_CONFIG.map(p => ({
    name: `Fase ${p.phase}`,
    revenue: metrics ? metrics.total_users * (p.phase === 0 ? 0 : p.phase === 4 ? 1 : 0.01) : 0
  }));

  return (
    <div className="space-y-6 p-6">
      {/* Alerta de Meta */}
      {metrics?.alert_message && (
        <Alert variant="destructive" className="animate-pulse border-2 border-red-500">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">🚨 ALERTA SOBERANO</AlertTitle>
          <AlertDescription className="text-base">{metrics.alert_message}</AlertDescription>
        </Alert>
      )}

      {/* Kill-Switch Banner */}
      {governance?.governance_frozen && (
        <Alert className="bg-red-900/50 border-red-500">
          <Lock className="h-5 w-5 text-red-400" />
          <AlertTitle>H-03: GOVERNANÇA CONGELADA</AlertTitle>
          <AlertDescription>Kill-Switch ativo. Todas as escritas críticas bloqueadas.</AlertDescription>
        </Alert>
      )}

      {/* Header com Kill-Switch */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            War Room - Dashboard de Governança
          </h1>
          <p className="text-muted-foreground">Controle de Centavos + Motor de Fases Tier-0</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant={governance?.governance_frozen ? "destructive" : "outline"}
            onClick={toggleKillSwitch}
            className="gap-2"
          >
            {governance?.governance_frozen ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            Kill-Switch: {governance?.governance_frozen ? 'ATIVO' : 'INATIVO'}
          </Button>
          <Button onClick={loadData} variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="metrics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="metrics" className="gap-2">
            <Activity className="w-4 h-4" /> Métricas
          </TabsTrigger>
          <TabsTrigger value="phases" className="gap-2">
            <Zap className="w-4 h-4" /> Controle de Fases
          </TabsTrigger>
          <TabsTrigger value="decoder" className="gap-2">
            <Terminal className="w-4 h-4" /> Decodificador
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Database className="w-4 h-4" /> Logs
          </TabsTrigger>
        </TabsList>

        {/* Tab: Métricas */}
        <TabsContent value="metrics" className="space-y-6">
          {/* Cards de Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" /> Total de Usuários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics?.total_users?.toLocaleString() || 0}</div>
                <Progress 
                  value={Math.min((metrics?.total_users || 0) / 1000, 100)} 
                  className="mt-2" 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Meta: 100k para Fase 1
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Coins className="w-4 h-4" /> Conchas Distribuídas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">🐚 {metrics?.total_shells_distributed?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  1 Concha a cada 10 acessos
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Receita Projetada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  R$ {(metrics?.projected_revenue || 0).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Fase {governance?.current_phase || 0}: {PHASE_CONFIG[governance?.current_phase || 0]?.fee}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Fase Atual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  Fase {governance?.current_phase || 0}
                </div>
                <Badge className={`mt-2 ${PHASE_CONFIG[governance?.current_phase || 0]?.color} text-white`}>
                  {PHASE_CONFIG[governance?.current_phase || 0]?.name}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Usuários</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={userDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {userDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Simulador de Receita por Fase</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueProjection}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary) / 0.3)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Controle de Fases */}
        <TabsContent value="phases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Interruptores de Soberania
              </CardTitle>
              <CardDescription>
                Cada interruptor exibe a lógica Edge e SQL correspondente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {PHASE_CONFIG.map((config) => (
                <div key={config.phase} className="space-y-2">
                  <div className={`p-4 rounded-lg border-2 ${
                    governance?.current_phase === config.phase 
                      ? 'border-primary bg-primary/10' 
                      : 'border-muted'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Switch
                          checked={governance?.current_phase === config.phase}
                          onCheckedChange={() => switchPhase(config.phase)}
                          disabled={governance?.governance_frozen}
                        />
                        <div>
                          <h4 className="font-semibold">{config.name}</h4>
                          <p className="text-sm text-muted-foreground">{config.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={config.color}>{config.fee}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCode(showCode === config.phase ? null : config.phase)}
                        >
                          <Code className="w-4 h-4 mr-1" />
                          {showCode === config.phase ? 'Ocultar' : 'Ver Código'}
                        </Button>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="flex gap-2 mt-2">
                      {config.features.map((f, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{f}</Badge>
                      ))}
                    </div>

                    {/* Code Display */}
                    {showCode === config.phase && (
                      <div className="mt-4 space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-amber-400">Edge Logic (TypeScript)</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => copyToClipboard(config.edgeLogic)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <pre className="bg-zinc-900 text-emerald-400 p-3 rounded text-xs overflow-x-auto font-mono">
                            {config.edgeLogic}
                          </pre>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-blue-400">SQL Equivalente</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => copyToClipboard(config.sql)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <pre className="bg-zinc-900 text-blue-400 p-3 rounded text-xs overflow-x-auto font-mono">
                            {config.sql}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Satoshi Hash Display */}
          {governance?.satoshi_hash && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Último Satoshi Hash (Auditoria)</CardTitle>
              </CardHeader>
              <CardContent>
                <code className="text-xs bg-muted p-2 rounded block break-all">
                  {governance.satoshi_hash}
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  Ativado em: {new Date(governance.phase_activated_at).toLocaleString('pt-BR')}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Decodificador de Erros */}
        <TabsContent value="decoder" className="space-y-4">
          <Card className="bg-zinc-950 border-amber-500/50">
            <CardHeader>
              <CardTitle className="text-amber-400 flex items-center gap-2 font-mono">
                <Terminal className="w-5 h-5" />
                CENTRAL DE DECODIFICAÇÃO DE ERROS
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Cole um erro do Supabase/PostgreSQL para análise automática
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={errorInput}
                onChange={(e) => setErrorInput(e.target.value)}
                placeholder="Cole aqui o erro do console ou do Supabase..."
                className="font-mono text-sm bg-zinc-900 border-zinc-700 text-emerald-400 min-h-[120px]"
              />
              <Button onClick={decodeError} className="w-full gap-2">
                <Eye className="w-4 h-4" />
                DECODIFICAR E REGISTRAR
              </Button>

              {decodedError && (
                <div className="mt-4 space-y-4 p-4 bg-zinc-900 rounded-lg border border-zinc-700">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-zinc-500">Código PostgreSQL</span>
                      <p className="text-lg font-mono text-red-400">{decodedError.error_code}</p>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500">Categoria</span>
                      <p className="text-lg font-mono text-amber-400">{decodedError.category}</p>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-xs text-zinc-500">Impacto no Negócio</span>
                    <p className="text-sm text-zinc-300">{decodedError.business_impact}</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-zinc-500">Sugestão de Patch SQL</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(decodedError.suggested_sql)}
                        className="text-xs"
                      >
                        <Copy className="w-3 h-3 mr-1" /> Copiar
                      </Button>
                    </div>
                    <pre className="bg-zinc-800 p-3 rounded text-xs text-emerald-400 font-mono overflow-x-auto">
                      {decodedError.suggested_sql}
                    </pre>
                  </div>

                  <div>
                    <span className="text-xs text-zinc-500">Satoshi Hash</span>
                    <p className="text-xs font-mono text-zinc-400 break-all">{decodedError.satoshi_hash}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Logs de Engenharia */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Erros de Engenharia</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div 
                      key={log.id} 
                      className={`p-3 rounded border ${
                        log.is_resolved ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {log.is_resolved ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <Badge variant="outline" className="font-mono">{log.error_code}</Badge>
                          <Badge>{log.error_category}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm mt-2 text-muted-foreground">{log.business_impact}</p>
                      {log.suggested_sql && (
                        <pre className="mt-2 text-xs bg-muted p-2 rounded font-mono overflow-x-auto">
                          {log.suggested_sql}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
