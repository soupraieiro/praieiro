import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Loader2,
  DollarSign,
  Users,
  ShoppingCart,
  Target,
  Zap,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

interface GrowthMetric {
  id: string;
  metric_key: string;
  metric_name: string;
  category: string;
  current_value: number | null;
  previous_value: number | null;
  target_value: number | null;
  growth_rate: number | null;
  trend: string | null;
  period_start: string | null;
  period_end: string | null;
  satoshi_hash: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  revenue: <DollarSign className="h-5 w-5" />,
  users: <Users className="h-5 w-5" />,
  conversion: <Target className="h-5 w-5" />,
  orders: <ShoppingCart className="h-5 w-5" />,
  performance: <Zap className="h-5 w-5" />
};

const CATEGORY_COLORS: Record<string, string> = {
  revenue: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  users: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  conversion: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  orders: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  performance: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300"
};

export function GrowthMetricsPanel() {
  const [metrics, setMetrics] = useState<GrowthMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("ai_council_growth_metrics")
        .select("*")
        .order("category", { ascending: true })
        .order("metric_key", { ascending: true });
      
      if (error) throw error;
      
      // If no metrics exist, create sample data
      if (!data || data.length === 0) {
        await createSampleMetrics();
        return loadMetrics();
      }
      
      setMetrics(data);
    } catch (error) {
      console.error("Error loading metrics:", error);
      toast.error("Erro ao carregar métricas");
    } finally {
      setLoading(false);
    }
  };

  const createSampleMetrics = async () => {
    const sampleMetrics = [
      { metric_key: "gmv_monthly", metric_name: "GMV Mensal", category: "revenue", current_value: 45680, previous_value: 38500, target_value: 50000, trend: "up" },
      { metric_key: "revenue_daily", metric_name: "Receita Diária", category: "revenue", current_value: 1520, previous_value: 1480, target_value: 1800, trend: "up" },
      { metric_key: "active_users", metric_name: "Usuários Ativos", category: "users", current_value: 1250, previous_value: 1180, target_value: 1500, trend: "up" },
      { metric_key: "new_signups", metric_name: "Novos Cadastros", category: "users", current_value: 85, previous_value: 92, target_value: 100, trend: "down" },
      { metric_key: "conversion_rate", metric_name: "Taxa de Conversão", category: "conversion", current_value: 3.2, previous_value: 2.9, target_value: 4.0, trend: "up" },
      { metric_key: "cart_abandonment", metric_name: "Abandono de Carrinho", category: "conversion", current_value: 28, previous_value: 32, target_value: 20, trend: "down" },
      { metric_key: "orders_today", metric_name: "Pedidos Hoje", category: "orders", current_value: 142, previous_value: 128, target_value: 150, trend: "up" },
      { metric_key: "avg_order_value", metric_name: "Ticket Médio", category: "orders", current_value: 45.80, previous_value: 42.30, target_value: 50, trend: "up" },
      { metric_key: "api_latency", metric_name: "Latência API (ms)", category: "performance", current_value: 145, previous_value: 168, target_value: 100, trend: "down" },
      { metric_key: "uptime", metric_name: "Uptime (%)", category: "performance", current_value: 99.95, previous_value: 99.87, target_value: 99.99, trend: "up" }
    ];

    for (const metric of sampleMetrics) {
      const growth_rate = metric.previous_value 
        ? ((metric.current_value - metric.previous_value) / metric.previous_value) * 100 
        : 0;

      await supabase.from("ai_council_growth_metrics").insert({
        ...metric,
        growth_rate,
        period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        period_end: new Date().toISOString()
      });
    }
  };

  const getTrendIcon = (trend: string | null, value: number | null, isInverse?: boolean) => {
    if (!trend) return <Minus className="h-4 w-4 text-muted-foreground" />;
    
    const isPositive = isInverse ? trend === "down" : trend === "up";
    
    if (isPositive) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (trend === "down" || trend === "up") {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const formatValue = (value: number | null, key: string): string => {
    if (value === null) return "N/A";
    
    if (key.includes("revenue") || key.includes("gmv") || key.includes("value")) {
      return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    }
    if (key.includes("rate") || key.includes("uptime") || key.includes("abandonment")) {
      return `${value.toFixed(2)}%`;
    }
    if (key.includes("latency")) {
      return `${value}ms`;
    }
    return value.toLocaleString("pt-BR");
  };

  const getProgressPercentage = (current: number | null, target: number | null): number => {
    if (current === null || target === null || target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const groupedMetrics = metrics.reduce((acc, metric) => {
    if (!acc[metric.category]) acc[metric.category] = [];
    acc[metric.category].push(metric);
    return acc;
  }, {} as Record<string, GrowthMetric[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Métricas de Crescimento
          </h3>
          <p className="text-sm text-muted-foreground">
            KPIs monitorados pelo AI Council com análise de tendência
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadMetrics}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(groupedMetrics).slice(0, 4).map(([category, categoryMetrics]) => {
          const mainMetric = categoryMetrics[0];
          return (
            <Card key={category}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${CATEGORY_COLORS[category] || "bg-muted"}`}>
                    {CATEGORY_ICONS[category] || <BarChart3 className="h-5 w-5" />}
                  </div>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(mainMetric?.trend, mainMetric?.growth_rate)}
                    <span className={`text-sm font-medium ${
                      mainMetric?.growth_rate && mainMetric.growth_rate > 0 
                        ? "text-green-600" 
                        : mainMetric?.growth_rate && mainMetric.growth_rate < 0 
                          ? "text-red-600" 
                          : "text-muted-foreground"
                    }`}>
                      {mainMetric?.growth_rate 
                        ? `${mainMetric.growth_rate > 0 ? "+" : ""}${mainMetric.growth_rate.toFixed(1)}%` 
                        : "N/A"}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold">
                    {formatValue(mainMetric?.current_value, mainMetric?.metric_key || "")}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">{category}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Metrics by Category */}
      <div className="grid gap-6 md:grid-cols-2">
        {Object.entries(groupedMetrics).map(([category, categoryMetrics]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base capitalize">
                <div className={`p-1.5 rounded ${CATEGORY_COLORS[category] || "bg-muted"}`}>
                  {CATEGORY_ICONS[category] || <BarChart3 className="h-4 w-4" />}
                </div>
                {category}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {categoryMetrics.map((metric) => {
                const isInverseMetric = metric.metric_key.includes("abandonment") || 
                                        metric.metric_key.includes("latency");
                const progress = getProgressPercentage(metric.current_value, metric.target_value);
                
                return (
                  <div key={metric.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{metric.metric_name}</span>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(metric.trend, metric.growth_rate, isInverseMetric)}
                        <span className="text-sm font-bold">
                          {formatValue(metric.current_value, metric.metric_key)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`absolute h-full rounded-full transition-all duration-500 ${
                          progress >= 80 ? "bg-green-500" : 
                          progress >= 50 ? "bg-yellow-500" : "bg-red-500"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Anterior: {formatValue(metric.previous_value, metric.metric_key)}
                      </span>
                      <span>
                        Meta: {formatValue(metric.target_value, metric.metric_key)}
                      </span>
                    </div>

                    {metric.satoshi_hash && (
                      <p className="text-xs font-mono text-muted-foreground">
                        🔗 #{metric.satoshi_hash.slice(0, 12)}...
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
