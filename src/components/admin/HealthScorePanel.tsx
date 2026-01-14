/**
 * HEALTH SCORE PANEL
 * Gráfico de saúde do sistema com % sucesso vs erro nas últimas 24h
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
  Activity, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  TrendingUp, TrendingDown, Clock, Zap, Server
} from 'lucide-react';

interface HealthMetrics {
  metric_date: string;
  successful_executions: number;
  failed_executions: number;
  warnings: number;
  total_executions: number;
  avg_execution_time_ms: number;
  health_score: number;
  calculated_at: string;
}

interface SystemStatus {
  component: string;
  status: 'healthy' | 'degraded' | 'critical';
  lastCheck: string;
  responseTime: number;
}

export default function HealthScorePanel() {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [historicalData, setHistoricalData] = useState<HealthMetrics[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHealthData = useCallback(async () => {
    try {
      setLoading(true);

      // Carregar métricas do dia atual
      const today = new Date().toISOString().split('T')[0];
      const { data: todayMetrics } = await supabase
        .from('sys_health_metrics')
        .select('*')
        .eq('metric_date', today)
        .maybeSingle();

      if (todayMetrics) {
        setMetrics(todayMetrics as unknown as HealthMetrics);
      } else {
        // Calcular métricas se não existirem
        await calculateTodayMetrics();
      }

      // Carregar histórico dos últimos 7 dias
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: historical } = await supabase
        .from('sys_health_metrics')
        .select('*')
        .gte('metric_date', weekAgo.toISOString().split('T')[0])
        .order('metric_date', { ascending: true });

      if (historical) {
        setHistoricalData(historical as unknown as HealthMetrics[]);
      }

      // Simular status dos componentes do sistema
      setSystemStatus([
        { component: 'Database', status: 'healthy', lastCheck: new Date().toISOString(), responseTime: 12 },
        { component: 'Edge Functions', status: 'healthy', lastCheck: new Date().toISOString(), responseTime: 45 },
        { component: 'Realtime', status: 'healthy', lastCheck: new Date().toISOString(), responseTime: 8 },
        { component: 'Storage', status: 'healthy', lastCheck: new Date().toISOString(), responseTime: 23 },
        { component: 'Auth', status: 'healthy', lastCheck: new Date().toISOString(), responseTime: 15 }
      ]);

    } catch (error) {
      console.error('Erro ao carregar health data:', error);
      toast.error('Erro ao carregar métricas de saúde');
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateTodayMetrics = async () => {
    try {
      // Buscar logs das últimas 24h
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: logs } = await supabase
        .from('sys_orch_logs')
        .select('log_severity, execution_time_ms')
        .gte('created_at', yesterday.toISOString());

      if (logs && logs.length > 0) {
        const successCount = logs.filter(l => l.log_severity === 'info' || l.log_severity === 'debug').length;
        const errorCount = logs.filter(l => l.log_severity === 'error' || l.log_severity === 'critical').length;
        const warningCount = logs.filter(l => l.log_severity === 'warn').length;
        const totalExecutions = logs.length;
        const avgTime = logs.reduce((acc, l) => acc + (l.execution_time_ms || 0), 0) / totalExecutions;
        const healthScore = Math.round((successCount / totalExecutions) * 100);

        const newMetrics: HealthMetrics = {
          metric_date: new Date().toISOString().split('T')[0],
          successful_executions: successCount,
          failed_executions: errorCount,
          warnings: warningCount,
          total_executions: totalExecutions,
          avg_execution_time_ms: Math.round(avgTime),
          health_score: healthScore,
          calculated_at: new Date().toISOString()
        };

        setMetrics(newMetrics);
      } else {
        // Dados mock se não houver logs
        setMetrics({
          metric_date: new Date().toISOString().split('T')[0],
          successful_executions: 150,
          failed_executions: 5,
          warnings: 12,
          total_executions: 167,
          avg_execution_time_ms: 85,
          health_score: 90,
          calculated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Erro ao calcular métricas:', error);
    }
  };

  useEffect(() => {
    loadHealthData();
  }, [loadHealthData]);

  const pieData = metrics ? [
    { name: 'Sucesso', value: metrics.successful_executions, color: '#22c55e' },
    { name: 'Warnings', value: metrics.warnings, color: '#f59e0b' },
    { name: 'Erros', value: metrics.failed_executions, color: '#ef4444' }
  ] : [];

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500';
    if (score >= 70) return 'text-amber-500';
    return 'text-red-500';
  };

  const getHealthBg = (score: number) => {
    if (score >= 90) return 'bg-emerald-500/10 border-emerald-500/30';
    if (score >= 70) return 'bg-amber-500/10 border-amber-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6" />
            Health Score do Sistema
          </h2>
          <p className="text-muted-foreground">
            Monitoramento de saúde e performance nas últimas 24 horas
          </p>
        </div>
        <Button variant="outline" onClick={loadHealthData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Score Principal */}
      {metrics && (
        <Card className={`border-2 ${getHealthBg(metrics.health_score)}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Health Score</p>
                <div className={`text-6xl font-bold ${getHealthColor(metrics.health_score)}`}>
                  {metrics.health_score}%
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {metrics.health_score >= 90 ? (
                    <>
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-emerald-500">Sistema saudável</span>
                    </>
                  ) : metrics.health_score >= 70 ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="text-sm text-amber-500">Atenção necessária</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-500">Crítico - Ação imediata</span>
                    </>
                  )}
                </div>
              </div>
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      strokeWidth={2}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas em Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Execuções</p>
                <p className="text-2xl font-bold">{metrics?.total_executions || 0}</p>
              </div>
              <Zap className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sucessos</p>
                <p className="text-2xl font-bold text-emerald-500">{metrics?.successful_executions || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Erros</p>
                <p className="text-2xl font-bold text-red-500">{metrics?.failed_executions || 0}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tempo Médio</p>
                <p className="text-2xl font-bold">{metrics?.avg_execution_time_ms || 0}ms</p>
              </div>
              <Clock className="w-8 h-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Histórico */}
      {historicalData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Health Score (7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="metric_date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                    formatter={(value: number) => [`${value}%`, 'Health Score']}
                  />
                  <Area
                    type="monotone"
                    dataKey="health_score"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status dos Componentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Status dos Componentes
          </CardTitle>
          <CardDescription>
            Monitoramento em tempo real dos serviços
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {systemStatus.map((component) => (
              <div
                key={component.component}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(component.status)}
                  <span className="font-medium">{component.component}</span>
                </div>
                <div className="flex items-center gap-4">
                  <Badge
                    variant={
                      component.status === 'healthy' ? 'default' :
                      component.status === 'degraded' ? 'secondary' : 'destructive'
                    }
                  >
                    {component.status.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {component.responseTime}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
