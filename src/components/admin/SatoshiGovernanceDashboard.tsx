import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Activity, 
  Shield, 
  TrendingUp, 
  Users, 
  DollarSign,
  Package,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Loader2,
  Hash,
  Clock,
  Zap
} from 'lucide-react';
import { ProtocolParametersPanel } from './ProtocolParametersPanel';
import { EcosystemHealthMonitor } from './EcosystemHealthMonitor';
import { GenesisValidationButton } from './GenesisValidationButton';
import { AssetRegistryPanel } from './AssetRegistryPanel';
import { AICouncilVotingPanel } from './AICouncilVotingPanel';

interface EcosystemHealth {
  total_states: number;
  active_states: number;
  archived_states: number;
  total_events: number;
  registered_assets: number;
  pending_proposals: number;
  current_phase: string;
}

interface IntegrityResult {
  source_table: string;
  total_records: number;
  valid_records: number;
  integrity_percentage: number;
}

interface DailyMetric {
  date: string;
  orders: number;
  revenue: number;
  users: number;
}

const PHASE_COLORS = {
  genesis: '#10b981',
  attraction: '#3b82f6',
  sustenance: '#f59e0b',
  tokenization: '#8b5cf6'
};

const PHASE_LABELS: Record<string, string> = {
  '1': 'Gênese',
  '2': 'Atração',
  '3': 'Sustento',
  '4': 'Tokenização',
  'genesis': 'Gênese',
  'attraction': 'Atração',
  'sustenance': 'Sustento',
  'tokenization': 'Tokenização'
};

export function SatoshiGovernanceDashboard() {
  const [health, setHealth] = useState<EcosystemHealth | null>(null);
  const [integrityResults, setIntegrityResults] = useState<IntegrityResult[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [integrityValid, setIntegrityValid] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Load ecosystem health
      const { data: healthData } = await supabase
        .from('ecosystem_health')
        .select('*')
        .maybeSingle();

      if (healthData) {
        setHealth(healthData as unknown as EcosystemHealth);
      }

      // Run integrity check
      await runIntegrityCheck();

      // Load daily metrics (mock data for visualization)
      const mockMetrics: DailyMetric[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        mockMetrics.push({
          date: date.toISOString().split('T')[0],
          orders: Math.floor(Math.random() * 50) + 10,
          revenue: Math.floor(Math.random() * 5000) + 1000,
          users: Math.floor(Math.random() * 20) + 5
        });
      }
      setDailyMetrics(mockMetrics);

    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  const runIntegrityCheck = async () => {
    try {
      const { data, error } = await supabase.rpc('verify_satoshi_integrity_v2');
      
      if (error) {
        console.error('Integrity check error:', error);
        setIntegrityValid(false);
        return;
      }

      if (data && Array.isArray(data)) {
        const tableStats: Record<string, { total: number; valid: number }> = {};
        
        data.forEach((item: { source_table: string; is_valid: boolean }) => {
          if (!tableStats[item.source_table]) {
            tableStats[item.source_table] = { total: 0, valid: 0 };
          }
          tableStats[item.source_table].total++;
          if (item.is_valid) {
            tableStats[item.source_table].valid++;
          }
        });

        const results: IntegrityResult[] = Object.entries(tableStats).map(([table, stats]) => ({
          source_table: table,
          total_records: stats.total,
          valid_records: stats.valid,
          integrity_percentage: stats.total > 0 ? (stats.valid / stats.total) * 100 : 100
        }));

        setIntegrityResults(results);
        const allValid = results.every(r => r.integrity_percentage === 100);
        setIntegrityValid(allValid);
      }
      
      setLastCheck(new Date());
    } catch (error) {
      console.error('Error running integrity check:', error);
      setIntegrityValid(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Periodic integrity check every 60 seconds
    const interval = setInterval(runIntegrityCheck, 60000);

    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const overallIntegrity = integrityResults.length > 0
    ? integrityResults.reduce((acc, r) => acc + r.integrity_percentage, 0) / integrityResults.length
    : 100;

  const pieData = [
    { name: 'Válidos', value: overallIntegrity, color: '#10b981' },
    { name: 'Inválidos', value: 100 - overallIntegrity, color: '#ef4444' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Genesis Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Satoshi Governance Dashboard
          </h2>
          <p className="text-muted-foreground">
            Central de comando do Protocolo Satoshi
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-sm text-muted-foreground">
            <div>Última verificação:</div>
            <div className="font-mono">
              {lastCheck?.toLocaleTimeString('pt-BR') || 'N/A'}
            </div>
          </div>
          <Button variant="outline" onClick={loadDashboardData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Integrity Alert */}
      {!integrityValid && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Alerta de Integridade</AlertTitle>
          <AlertDescription>
            Inconsistências detectadas no Ledger Satoshi. Execute uma auditoria completa.
          </AlertDescription>
        </Alert>
      )}

      {/* Genesis Validation */}
      <GenesisValidationButton />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Estados Ativos"
          value={health?.active_states || 0}
          icon={Activity}
          trend="+12%"
          color="text-green-500"
        />
        <MetricCard
          title="Eventos no Ledger"
          value={health?.total_events || 0}
          icon={Hash}
          trend="+24"
          color="text-blue-500"
        />
        <MetricCard
          title="Ativos Registrados"
          value={health?.registered_assets || 0}
          icon={Package}
          trend="0"
          color="text-purple-500"
        />
        <MetricCard
          title="Propostas Pendentes"
          value={health?.pending_proposals || 0}
          icon={Clock}
          trend={health?.pending_proposals ? "Atenção" : "OK"}
          color={health?.pending_proposals ? "text-yellow-500" : "text-green-500"}
        />
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="parameters">Parâmetros</TabsTrigger>
          <TabsTrigger value="assets">Ativos</TabsTrigger>
          <TabsTrigger value="council">Conselho IA</TabsTrigger>
          <TabsTrigger value="health">Saúde</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Integrity Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Integridade do Ledger</CardTitle>
                <CardDescription>
                  Validação de checksums SHA-256
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <ResponsiveContainer width={200} height={200}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-3xl font-bold">
                          {overallIntegrity.toFixed(0)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Integridade
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {integrityResults.map(result => (
                    <div key={result.source_table} className="flex items-center justify-between text-sm">
                      <span className="font-mono">{result.source_table}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={result.integrity_percentage} className="w-24 h-2" />
                        <span className={result.integrity_percentage === 100 ? 'text-green-500' : 'text-yellow-500'}>
                          {result.integrity_percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Daily Metrics Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Diária</CardTitle>
                <CardDescription>
                  Volume de operações nos últimos 7 dias
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={dailyMetrics}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="orders" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary) / 0.2)" 
                      name="Pedidos"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Phase Indicator */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Fase Atual do Protocolo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {Object.entries(PHASE_LABELS).filter(([k]) => !isNaN(Number(k))).map(([key, label]) => {
                  const currentPhase = health?.current_phase || '1';
                  const isActive = currentPhase === key;
                  const isPast = Number(key) < Number(currentPhase);
                  
                  return (
                    <div 
                      key={key}
                      className={`flex-1 text-center p-4 rounded-lg border-2 mx-1 transition-all ${
                        isActive 
                          ? 'border-primary bg-primary/10' 
                          : isPast 
                          ? 'border-green-500/50 bg-green-500/5'
                          : 'border-muted'
                      }`}
                    >
                      <div className={`text-2xl font-bold ${isActive ? 'text-primary' : isPast ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {key}
                      </div>
                      <div className="text-sm">{label}</div>
                      {isActive && (
                        <Badge className="mt-2 bg-primary">Atual</Badge>
                      )}
                      {isPast && (
                        <CheckCircle className="h-4 w-4 mx-auto mt-2 text-green-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Parameters Tab */}
        <TabsContent value="parameters">
          <ProtocolParametersPanel />
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets">
          <AssetRegistryPanel />
        </TabsContent>

        {/* Council Tab */}
        <TabsContent value="council">
          <AICouncilVotingPanel />
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health">
          <EcosystemHealthMonitor />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  trend: string;
  color: string;
}

function MetricCard({ title, value, icon: Icon, trend, color }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
          </div>
          <div className={`p-3 rounded-full bg-muted ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className={`text-xs mt-2 ${color}`}>
          {trend}
        </div>
      </CardContent>
    </Card>
  );
}
