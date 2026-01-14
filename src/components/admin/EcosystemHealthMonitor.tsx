import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Activity,
  RefreshCw,
  Loader2,
  Users,
  Store,
  DollarSign,
  TrendingUp,
  Heart,
  AlertTriangle,
  CheckCircle,
  Zap,
  Target
} from "lucide-react";

// Match the ecosystem_health view from Supabase
interface EcosystemHealthView {
  active_vendors: number | null;
  current_displacement_fee: number | null;
  current_phase: number | null;
  current_service_fee: number | null;
  gmv_30d: number | null;
  new_users_30d: number | null;
  orders_30d: number | null;
  total_clients: number | null;
}

interface HealthMetric {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  status: "healthy" | "warning" | "critical";
}

export function EcosystemHealthMonitor() {
  const [health, setHealth] = useState<EcosystemHealthView | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    loadHealthData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadHealthData = async () => {
    try {
      setLoading(true);

      // Get data from the view
      const { data: viewData, error: viewError } = await supabase
        .from("ecosystem_health")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (viewError) {
        console.error("Error fetching ecosystem health:", viewError);
        // Fallback with empty data
        setHealth({
          active_vendors: 0,
          current_displacement_fee: 0.01,
          current_phase: 1,
          current_service_fee: 1.0,
          gmv_30d: 0,
          new_users_30d: 0,
          orders_30d: 0,
          total_clients: 0,
        });
      } else if (viewData) {
        setHealth(viewData);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error loading health data:", error);
      toast.error("Erro ao carregar dados de saúde");
    } finally {
      setLoading(false);
    }
  };

  const calculateHealthScore = (data: EcosystemHealthView): number => {
    let score = 50; // Base score
    
    if ((data.active_vendors ?? 0) > 0) score += 15;
    if ((data.total_clients ?? 0) > 0) score += 10;
    if ((data.orders_30d ?? 0) > 0) score += 10;
    if ((data.gmv_30d ?? 0) > 0) score += 10;
    if ((data.new_users_30d ?? 0) > 0) score += 5;
    
    return Math.min(score, 100);
  };

  const getHealthStatus = (score: number): "healthy" | "warning" | "critical" => {
    if (score >= 70) return "healthy";
    if (score >= 40) return "warning";
    return "critical";
  };

  const getHealthColor = (status: "healthy" | "warning" | "critical") => {
    switch (status) {
      case "healthy":
        return "text-green-500";
      case "warning":
        return "text-yellow-500";
      case "critical":
        return "text-red-500";
    }
  };

  const getHealthBg = (status: "healthy" | "warning" | "critical") => {
    switch (status) {
      case "healthy":
        return "bg-green-500";
      case "warning":
        return "bg-yellow-500";
      case "critical":
        return "bg-red-500";
    }
  };

  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const PHASE_NAMES: Record<number, string> = {
    1: "Gênese",
    2: "Atração",
    3: "Sustento",
    4: "Tokenização",
  };

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const healthScore = health ? calculateHealthScore(health) : 0;
  const healthStatus = getHealthStatus(healthScore);

  const metrics: HealthMetric[] = health
    ? [
        {
          label: "Vendedores Ativos",
          value: health.active_vendors ?? 0,
          icon: <Store className="h-5 w-5" />,
          status: (health.active_vendors ?? 0) > 0 ? "healthy" : "warning",
        },
        {
          label: "Clientes Cadastrados",
          value: health.total_clients ?? 0,
          icon: <Users className="h-5 w-5" />,
          status: (health.total_clients ?? 0) > 10 ? "healthy" : (health.total_clients ?? 0) > 0 ? "warning" : "critical",
        },
        {
          label: "Pedidos (30d)",
          value: health.orders_30d ?? 0,
          icon: <TrendingUp className="h-5 w-5" />,
          status: (health.orders_30d ?? 0) > 0 ? "healthy" : "warning",
        },
        {
          label: "GMV (30d)",
          value: formatCurrency(health.gmv_30d ?? 0),
          icon: <DollarSign className="h-5 w-5" />,
          status: (health.gmv_30d ?? 0) > 1000 ? "healthy" : (health.gmv_30d ?? 0) > 0 ? "warning" : "critical",
        },
        {
          label: "Novos Usuários (30d)",
          value: health.new_users_30d ?? 0,
          icon: <Target className="h-5 w-5" />,
          status: (health.new_users_30d ?? 0) > 5 ? "healthy" : (health.new_users_30d ?? 0) > 0 ? "warning" : "critical",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Monitor de Saúde do Ecossistema
          </h2>
          <p className="text-muted-foreground">
            Visão em tempo real da saúde operacional do Praieiro
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              Atualizado: {lastUpdate.toLocaleTimeString("pt-BR")}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={loadHealthData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Phase and Fees Info */}
      {health && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Fase Atual</p>
              <p className="text-2xl font-bold text-primary">
                {PHASE_NAMES[health.current_phase ?? 1]}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Taxa de Serviço</p>
              <p className="text-2xl font-bold">
                {formatCurrency(health.current_service_fee ?? 1)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Taxa Deslocamento</p>
              <p className="text-2xl font-bold">
                R$ {(health.current_displacement_fee ?? 0.01).toFixed(2)}/m
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Health Score */}
      <Card
        className={`transition-all duration-300 ${
          healthStatus === "healthy"
            ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30"
            : healthStatus === "warning"
              ? "bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30"
              : "bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/30"
        }`}
      >
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`p-4 rounded-full ${
                  healthStatus === "healthy"
                    ? "bg-green-500/20"
                    : healthStatus === "warning"
                      ? "bg-yellow-500/20"
                      : "bg-red-500/20"
                }`}
              >
                <Heart className={`h-10 w-10 ${getHealthColor(healthStatus)}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Índice de Saúde</p>
                <p className={`text-4xl font-bold ${getHealthColor(healthStatus)}`}>
                  {healthScore}%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {healthStatus === "healthy" ? (
                <Badge className="bg-green-500 hover:bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Saudável
                </Badge>
              ) : healthStatus === "warning" ? (
                <Badge className="bg-yellow-500 hover:bg-yellow-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Atenção
                </Badge>
              ) : (
                <Badge className="bg-red-500 hover:bg-red-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Crítico
                </Badge>
              )}
            </div>
          </div>

          <div className="mt-6">
            <Progress value={healthScore} className="h-3" />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>Crítico</span>
              <span>Atenção</span>
              <span>Saudável</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div
                  className={`p-2 rounded-lg ${
                    metric.status === "healthy"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : metric.status === "warning"
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {metric.icon}
                </div>
                <div
                  className={`h-2 w-2 rounded-full ${getHealthBg(metric.status)} ${
                    metric.status !== "healthy" ? "animate-pulse" : ""
                  }`}
                />
              </div>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="text-2xl font-bold">{metric.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions based on health */}
      {healthStatus !== "healthy" && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <Zap className="h-5 w-5" />
              Ações Sugeridas pelo Conselho de IA
            </CardTitle>
            <CardDescription>
              Recomendações para melhorar a saúde do ecossistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {health && (health.active_vendors ?? 0) === 0 && (
                <li className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span>Nenhum vendedor ativo. Cadastre vendedores para iniciar operações.</span>
                </li>
              )}
              {health && (health.total_clients ?? 0) < 10 && (
                <li className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span>Baixo número de clientes. Intensifique ações de marketing.</span>
                </li>
              )}
              {health && (health.orders_30d ?? 0) === 0 && (
                <li className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span>Nenhum pedido nos últimos 30 dias. Verifique fluxo de checkout.</span>
                </li>
              )}
              {health && (health.new_users_30d ?? 0) === 0 && (
                <li className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span>Sem novos usuários recentes. Revise estratégia de aquisição.</span>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
