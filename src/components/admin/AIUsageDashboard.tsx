import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  Zap, 
  Clock, 
  Coins, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  TrendingUp,
  Server,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { AIProviderHealthCard } from './AIProviderHealthCard';

interface UsageLog {
  id: string;
  provider_id: string;
  request_type: string;
  success: boolean;
  latency_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  error_message: string | null;
  created_at: string;
}

interface ProviderHealth {
  id: string;
  provider: string;
  status: 'healthy' | 'degraded' | 'down';
  avg_latency_ms: number | null;
  total_requests: number | null;
  total_failures: number | null;
  consecutive_failures: number | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  updated_at: string;
}

interface DashboardMetrics {
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  totalTokens: number;
  requestsByProvider: Record<string, number>;
  errorsByProvider: Record<string, number>;
}

const CHART_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function AIUsageDashboard() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [healthData, setHealthData] = useState<ProviderHealth[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const now = new Date();
      const rangeMap = {
        '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
        '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      };
      const startDate = rangeMap[timeRange].toISOString();

      // Fetch logs
      const { data: logsData, error: logsError } = await supabase
        .from('ai_provider_usage_logs')
        .select('*')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false })
        .limit(500);

      if (logsError) throw logsError;

      // Fetch health data
      const { data: healthResult, error: healthError } = await supabase
        .from('ai_provider_health')
        .select('*');

      if (healthError) throw healthError;

      const typedLogs = (logsData || []) as UsageLog[];
      const typedHealth = (healthResult || []) as ProviderHealth[];

      setLogs(typedLogs);
      setHealthData(typedHealth);

      // Calculate metrics
      const totalRequests = typedLogs.length;
      const successfulRequests = typedLogs.filter(l => l.success).length;
      const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
      
      const latencies = typedLogs.filter(l => l.latency_ms).map(l => l.latency_ms!);
      const avgLatency = latencies.length > 0 
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
        : 0;

      const totalTokens = typedLogs.reduce((sum, l) => 
        sum + (l.input_tokens || 0) + (l.output_tokens || 0), 0
      );

      const requestsByProvider: Record<string, number> = {};
      const errorsByProvider: Record<string, number> = {};

      typedLogs.forEach(log => {
        requestsByProvider[log.provider_id] = (requestsByProvider[log.provider_id] || 0) + 1;
        if (!log.success) {
          errorsByProvider[log.provider_id] = (errorsByProvider[log.provider_id] || 0) + 1;
        }
      });

      setMetrics({
        totalRequests,
        successRate,
        avgLatency,
        totalTokens,
        requestsByProvider,
        errorsByProvider,
      });
    } catch (error) {
      console.error('Error fetching AI usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  // Prepare chart data
  const prepareHourlyData = () => {
    const hourlyMap: Record<string, { hour: string; requests: number; errors: number }> = {};
    const now = new Date();
    
    // Initialize last 24 hours
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const key = hour.toISOString().slice(0, 13);
      hourlyMap[key] = { 
        hour: `${hour.getHours()}h`, 
        requests: 0, 
        errors: 0 
      };
    }

    logs.forEach(log => {
      const key = log.created_at.slice(0, 13);
      if (hourlyMap[key]) {
        hourlyMap[key].requests++;
        if (!log.success) hourlyMap[key].errors++;
      }
    });

    return Object.values(hourlyMap);
  };

  const preparePieData = () => {
    if (!metrics) return [];
    return Object.entries(metrics.requestsByProvider).map(([provider, count], index) => ({
      name: provider,
      value: count,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const hourlyData = prepareHourlyData();
  const pieData = preparePieData();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Dashboard de Monitoramento IA
          </h2>
          <p className="text-muted-foreground">
            Métricas em tempo real do sistema de orquestração
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
            <TabsList>
              <TabsTrigger value="24h">24h</TabsTrigger>
              <TabsTrigger value="7d">7 dias</TabsTrigger>
              <TabsTrigger value="30d">30 dias</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Requisições</CardTitle>
              <Zap className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalRequests.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Período: {timeRange}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.successRate.toFixed(1)}%</div>
              <div className="mt-1 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${metrics?.successRate || 0}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Latência Média</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(metrics?.avgLatency || 0)}ms</div>
              <p className="text-xs text-muted-foreground">
                Tempo de resposta médio
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tokens Consumidos</CardTitle>
              <Coins className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(metrics?.totalTokens || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Input + Output
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Hourly Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Uso por Hora
            </CardTitle>
            <CardDescription>Requisições e erros nas últimas 24 horas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="hour" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="requests" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                    name="Requisições"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="errors" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={2}
                    dot={false}
                    name="Erros"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Provider Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Distribuição por Provider
            </CardTitle>
            <CardDescription>Uso de cada provedor de IA</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Health Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Status dos Provedores
          </CardTitle>
          <CardDescription>
            Saúde e disponibilidade em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <AnimatePresence>
              {healthData.map((health, index) => (
                <motion.div
                  key={health.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <AIProviderHealthCard health={health} />
                </motion.div>
              ))}
            </AnimatePresence>
            {healthData.length === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-8">
                Nenhum dado de saúde disponível
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Logs Recentes
          </CardTitle>
          <CardDescription>
            Últimas 50 requisições processadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {logs.slice(0, 50).map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {log.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium text-sm">{log.provider_id}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {log.latency_ms && (
                      <Badge variant="outline" className="font-mono">
                        {log.latency_ms}ms
                      </Badge>
                    )}
                    {(log.input_tokens || log.output_tokens) && (
                      <span className="text-muted-foreground">
                        {(log.input_tokens || 0) + (log.output_tokens || 0)} tokens
                      </span>
                    )}
                    {log.error_message && (
                      <Badge variant="destructive" className="max-w-[200px] truncate">
                        {log.error_message}
                      </Badge>
                    )}
                  </div>
                </motion.div>
              ))}
              {logs.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum log disponível para este período
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
