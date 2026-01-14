import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Calendar,
  Info,
  Gift,
  Crown,
  Lock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { subDays, differenceInDays } from "date-fns";

// Data de lançamento do site - inicio dos 6 meses gratuitos
const LAUNCH_DATE = new Date("2026-01-07");
const FREE_PERIOD_DAYS = 180; // 6 meses

export function VendorBusinessIndicators() {
  const { user } = useAuth();

  // Calcular dias restantes do período gratuito
  const today = new Date();
  const daysSinceLaunch = differenceInDays(today, LAUNCH_DATE);
  const daysRemaining = Math.max(0, FREE_PERIOD_DAYS - daysSinceLaunch);
  const freePeriodProgress = Math.min(100, (daysSinceLaunch / FREE_PERIOD_DAYS) * 100);
  const isFreePeriod = daysRemaining > 0;

  // Buscar dados do vendedor via profile
  const { data: vendor } = useQuery({
    queryKey: ["vendor-for-indicators", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      // CORRECT: profiles.id = auth.users.id (identidade soberana)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError || !profile) return null;
      
      // Get vendor data
      const { data: vendorData, error } = await supabase
        .from("vendors")
        .select("profile_id, created_at")
        .eq("profile_id", profile.id)
        .maybeSingle();
      if (error) throw error;
      return vendorData ? { id: profile.id, created_at: vendorData.created_at } : null;
    },
    enabled: !!user?.id,
  });

  // Buscar estatísticas de vendas/pedidos
  const { data: orderStats } = useQuery({
    queryKey: ["vendor-order-stats", vendor?.id],
    queryFn: async () => {
      if (!vendor?.id) return null;
      
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      
      // Pedidos dos últimos 30 dias
      const { count: countLast30 } = await supabase
        .from("orders")
        .select("*", { count: "exact" })
        .eq("vendor_id", vendor.id)
        .gte("created_at", thirtyDaysAgo);

      // Pedidos dos últimos 7 dias
      const { count: countLast7 } = await supabase
        .from("orders")
        .select("*", { count: "exact" })
        .eq("vendor_id", vendor.id)
        .gte("created_at", sevenDaysAgo);

      // Pedidos concluídos
      const { count: completedCount } = await supabase
        .from("orders")
        .select("*", { count: "exact" })
        .eq("vendor_id", vendor.id)
        .eq("status", "completed")
        .gte("created_at", thirtyDaysAgo);

      return {
        last30Days: countLast30 || 0,
        last7Days: countLast7 || 0,
        completed: completedCount || 0,
      };
    },
    enabled: !!vendor?.id,
  });

  // Buscar cliques no WhatsApp
  const { data: clickStats } = useQuery({
    queryKey: ["vendor-click-stats", vendor?.id],
    queryFn: async () => {
      if (!vendor?.id) return null;
      
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      
      const { count: clicksLast30 } = await supabase
        .from("whatsapp_clicks")
        .select("*", { count: "exact" })
        .eq("vendor_id", vendor.id)
        .gte("clicked_at", thirtyDaysAgo);

      const { count: clicksLast7 } = await supabase
        .from("whatsapp_clicks")
        .select("*", { count: "exact" })
        .eq("vendor_id", vendor.id)
        .gte("clicked_at", sevenDaysAgo);

      const { count: totalClicks } = await supabase
        .from("whatsapp_clicks")
        .select("*", { count: "exact" })
        .eq("vendor_id", vendor.id);

      return {
        last30Days: clicksLast30 || 0,
        last7Days: clicksLast7 || 0,
        total: totalClicks || 0,
      };
    },
    enabled: !!vendor?.id,
  });

  // Buscar saldo da carteira
  const { data: wallet } = useQuery({
    queryKey: ["vendor-wallet-indicators", vendor?.id],
    queryFn: async () => {
      if (!vendor?.id) return null;
      const { data, error } = await supabase
        .from("vendor_wallets")
        .select("*")
        .eq("vendor_id", vendor.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!vendor?.id,
  });

  // Buscar transações para fluxo de caixa
  const { data: transactions } = useQuery({
    queryKey: ["vendor-transactions-flow", vendor?.id],
    queryFn: async () => {
      if (!vendor?.id) return [];
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      
      const { data, error } = await supabase
        .from("vendor_transactions")
        .select("*")
        .eq("vendor_id", vendor.id)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!vendor?.id,
  });

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  // Calcular fluxo de caixa
  const cashFlow = transactions?.reduce(
    (acc, tx) => {
      const amount = Number(tx.amount);
      if (tx.type === "sale" || tx.type === "deposit") {
        acc.entradas += amount;
      } else {
        acc.saidas += Math.abs(amount);
      }
      return acc;
    },
    { entradas: 0, saidas: 0 }
  ) || { entradas: 0, saidas: 0 };

  const saldoAtual = Number(wallet?.balance) || 0;
  const totalRecebido = Number(wallet?.total_received) || 0;

  // Componente para blur overlay
  const BlurredOverlay = ({ children }: { children: React.ReactNode }) => (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none opacity-50">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg">
        <div className="text-center p-3">
          <Lock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-xs text-muted-foreground font-medium">Premium</p>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="border-2 border-accent/30 bg-gradient-to-br from-accent/5 to-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg text-primary">
            <BarChart3 className="h-5 w-5" />
            Gestão do Negócio
          </CardTitle>
          {isFreePeriod ? (
            <Badge variant="secondary" className="bg-green-100 text-green-800 gap-1">
              <Gift className="h-3 w-3" />
              Gratuito
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
              <Crown className="h-3 w-3" />
              Premium
            </Badge>
          )}
        </div>
        <CardDescription className="text-sm">
          Acompanhe o desempenho do seu negócio
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Período Gratuito Info - SEMPRE VISÍVEL */}
        <div className={`rounded-lg p-3 border ${isFreePeriod ? "bg-gradient-to-r from-green-500/10 to-accent/10 border-green-500/20" : "bg-amber-50 border-amber-200"}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isFreePeriod ? (
                <Gift className="h-4 w-4 text-green-600" />
              ) : (
                <Crown className="h-4 w-4 text-amber-600" />
              )}
              <span className="text-sm font-medium">
                {isFreePeriod ? "Período de Lançamento" : "Período Gratuito Encerrado"}
              </span>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    {isFreePeriod 
                      ? "Durante os primeiros 6 meses de lançamento, todos os Praieiros têm acesso gratuito aos indicadores de gestão."
                      : "Assine o plano Praieiro Premium para desbloquear todos os indicadores de gestão avançados."}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Barra de Progresso - SEMPRE VISÍVEL */}
          <Progress value={isFreePeriod ? freePeriodProgress : 100} className="h-2 mb-1" />
          <p className="text-xs text-muted-foreground">
            {isFreePeriod 
              ? `${daysRemaining} dias restantes de acesso gratuito`
              : "Acesso aos indicadores avançados bloqueado"}
          </p>
        </div>

        {/* Saldo Atual - SEMPRE VISÍVEL */}
        <div className="rounded-lg bg-gradient-to-br from-green-500/20 to-green-500/5 p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-muted-foreground">Saldo Disponível</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(saldoAtual)}</p>
        </div>

        {/* Indicadores Complexos - CONDICIONAL */}
        {isFreePeriod ? (
          <>
            {/* Total Recebido */}
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-muted-foreground">Total Recebido</span>
              </div>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(totalRecebido)}</p>
            </div>

            {/* Fluxo de Caixa 30 dias */}
            <div className="rounded-lg border p-3">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fluxo de Caixa (30 dias)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs">Entradas</span>
                  </div>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(cashFlow.entradas)}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                    <TrendingDown className="h-4 w-4" />
                    <span className="text-xs">Saídas</span>
                  </div>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(cashFlow.saidas)}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t text-center">
                <span className="text-xs text-muted-foreground">Saldo do Período</span>
                <p className={`text-lg font-bold ${cashFlow.entradas - cashFlow.saidas >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(cashFlow.entradas - cashFlow.saidas)}
                </p>
              </div>
            </div>

            {/* Indicadores de Atendimento */}
            <div className="grid grid-cols-2 gap-3">
              {/* Cliques WhatsApp */}
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">Visualizações</span>
                </div>
                <p className="text-2xl font-bold text-primary">{clickStats?.last30Days || 0}</p>
                <p className="text-xs text-muted-foreground">últimos 30 dias</p>
                <div className="mt-2 pt-2 border-t">
                  <span className="text-xs text-muted-foreground">7 dias: </span>
                  <span className="text-xs font-medium">{clickStats?.last7Days || 0}</span>
                </div>
              </div>

              {/* Pedidos */}
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingBag className="h-4 w-4 text-accent" />
                  <span className="text-xs font-medium">Pedidos</span>
                </div>
                <p className="text-2xl font-bold text-accent">{orderStats?.last30Days || 0}</p>
                <p className="text-xs text-muted-foreground">últimos 30 dias</p>
                <div className="mt-2 pt-2 border-t">
                  <span className="text-xs text-muted-foreground">Concluídos: </span>
                  <span className="text-xs font-medium">{orderStats?.completed || 0}</span>
                </div>
              </div>
            </div>

            {/* Taxa de Conversão */}
            {(clickStats?.last30Days || 0) > 0 && (
              <div className="rounded-lg bg-muted/30 p-3 text-center">
                <span className="text-xs text-muted-foreground">Taxa de Conversão (30 dias)</span>
                <p className="text-xl font-bold text-primary">
                  {(((orderStats?.last30Days || 0) / (clickStats?.last30Days || 1)) * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  de {clickStats?.last30Days} visualizações, {orderStats?.last30Days} viraram pedidos
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Indicadores EMBAÇADOS após período gratuito */}
            <BlurredOverlay>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-muted-foreground">Total Recebido</span>
                </div>
                <p className="text-xl font-bold text-blue-600">R$ ***,**</p>
              </div>
            </BlurredOverlay>

            <BlurredOverlay>
              <div className="rounded-lg border p-3">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fluxo de Caixa (30 dias)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-xs">Entradas</span>
                    </div>
                    <p className="text-lg font-bold text-green-600">R$ ***,**</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                      <TrendingDown className="h-4 w-4" />
                      <span className="text-xs">Saídas</span>
                    </div>
                    <p className="text-lg font-bold text-red-600">R$ ***,**</p>
                  </div>
                </div>
              </div>
            </BlurredOverlay>

            <BlurredOverlay>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium">Visualizações</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">**</p>
                  <p className="text-xs text-muted-foreground">últimos 30 dias</p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingBag className="h-4 w-4 text-accent" />
                    <span className="text-xs font-medium">Pedidos</span>
                  </div>
                  <p className="text-2xl font-bold text-accent">**</p>
                  <p className="text-xs text-muted-foreground">últimos 30 dias</p>
                </div>
              </div>
            </BlurredOverlay>

            {/* CTA para Assinatura */}
            <div className="rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-300 p-4">
              <div className="flex items-start gap-3">
                <Crown className="h-6 w-6 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-800">Desbloqueie o Praieiro Premium</p>
                  <p className="text-sm text-amber-700 mt-1 mb-3">
                    Tenha acesso completo a todos os indicadores de gestão do seu negócio.
                  </p>
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
                    <Crown className="h-4 w-4" />
                    Assinar Premium
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
