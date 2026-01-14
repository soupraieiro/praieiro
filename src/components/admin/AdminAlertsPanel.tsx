import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  AlertTriangle, 
  Bell, 
  CheckCircle,
  TrendingDown,
  DollarSign,
  Users,
  Store,
  Target,
  XCircle,
  Eye
} from "lucide-react";

interface Alert {
  id: string;
  alert_type: string;
  title: string;
  message: string;
  severity: string;
  indicator_name: string | null;
  indicator_value: number | null;
  threshold_value: number | null;
  is_read: boolean;
  created_at: string;
}

export function AdminAlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
    checkForNewAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_alerts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error("Error loading alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkForNewAlerts = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const startOfMonth = `${currentMonth}-01`;
      const endOfMonth = new Date(new Date(startOfMonth).setMonth(new Date(startOfMonth).getMonth() + 1)).toISOString().split("T")[0];

      // Get goals for current month
      const { data: goals } = await supabase
        .from("admin_goals")
        .select("*")
        .gte("month", startOfMonth)
        .lt("month", endOfMonth);

      // Get current metrics
      const [clientsRes, vendorsRes, ordersRes, revenueRes] = await Promise.all([
        supabase.from("clients").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth),
        supabase.from("vendors").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth),
        supabase.from("orders").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth),
        supabase.from("orders").select("total_amount").gte("created_at", startOfMonth).eq("status", "completed")
      ]);

      const revenue = revenueRes.data?.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) || 0;
      const dayOfMonth = new Date().getDate();
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      const progressExpected = (dayOfMonth / daysInMonth) * 100;

      // Check each goal and create alerts for underperforming ones
      for (const goal of goals || []) {
        let currentValue = 0;
        switch (goal.goal_type) {
          case "client_adhesion":
            currentValue = clientsRes.count || 0;
            break;
          case "vendor_adhesion":
            currentValue = vendorsRes.count || 0;
            break;
          case "orders":
            currentValue = ordersRes.count || 0;
            break;
          case "financial":
            currentValue = revenue;
            break;
        }

        const progress = goal.target_value > 0 ? (currentValue / goal.target_value) * 100 : 0;
        
        // Alert if progress is significantly behind expected
        if (progress < progressExpected * 0.5) {
          // Check if alert already exists for this goal
          const { data: existingAlert } = await supabase
            .from("admin_alerts")
            .select("id")
            .eq("indicator_name", goal.goal_name)
            .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .maybeSingle();

          if (!existingAlert) {
            await supabase.from("admin_alerts").insert({
              alert_type: "goal_warning",
              title: `Meta em risco: ${goal.goal_name}`,
              message: `A meta "${goal.goal_name}" está com apenas ${progress.toFixed(0)}% de progresso, quando deveria estar em aproximadamente ${progressExpected.toFixed(0)}%.`,
              severity: progress < progressExpected * 0.25 ? "critical" : "warning",
              indicator_name: goal.goal_name,
              indicator_value: currentValue,
              threshold_value: goal.target_value
            });
          }
        }
      }

      // Check for payment issues
      const { count: pendingPayments } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("payment_status", "pending")
        .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (pendingPayments && pendingPayments > 5) {
        const { data: existingAlert } = await supabase
          .from("admin_alerts")
          .select("id")
          .eq("alert_type", "negative_indicator")
          .eq("indicator_name", "pending_payments")
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle();

        if (!existingAlert) {
          await supabase.from("admin_alerts").insert({
            alert_type: "negative_indicator",
            title: "Pagamentos pendentes acumulados",
            message: `Existem ${pendingPayments} pedidos com pagamento pendente há mais de 24 horas.`,
            severity: pendingPayments > 10 ? "critical" : "warning",
            indicator_name: "pending_payments",
            indicator_value: pendingPayments,
            threshold_value: 5
          });
        }
      }

      loadAlerts();
    } catch (error) {
      console.error("Error checking for alerts:", error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from("admin_alerts")
        .update({ is_read: true })
        .eq("id", id);
      
      loadAlerts();
    } catch (error) {
      console.error("Error marking alert as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = alerts.filter(a => !a.is_read).map(a => a.id);
      if (unreadIds.length === 0) return;

      await supabase
        .from("admin_alerts")
        .update({ is_read: true })
        .in("id", unreadIds);

      toast.success("Todos os alertas marcados como lidos");
      loadAlerts();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      await supabase.from("admin_alerts").delete().eq("id", id);
      loadAlerts();
    } catch (error) {
      console.error("Error deleting alert:", error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-100 border-red-300 text-red-800";
      case "warning": return "bg-yellow-100 border-yellow-300 text-yellow-800";
      default: return "bg-blue-100 border-blue-300 text-blue-800";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <XCircle className="h-5 w-5 text-red-600" />;
      case "warning": return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default: return <Bell className="h-5 w-5 text-blue-600" />;
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case "goal_warning": return <Target className="h-4 w-4" />;
      case "negative_indicator": return <TrendingDown className="h-4 w-4" />;
      case "system_issue": return <AlertTriangle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader><div className="h-5 bg-muted rounded w-1/3" /></CardHeader>
        <CardContent><div className="h-48 bg-muted rounded" /></CardContent>
      </Card>
    );
  }

  const unreadCount = alerts.filter(a => !a.is_read).length;
  const criticalCount = alerts.filter(a => a.severity === "critical" && !a.is_read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Alertas do Sistema
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount} novos</Badge>
            )}
          </h2>
          <p className="text-muted-foreground">Notificações de indicadores negativos e metas em risco</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Marcar todos como lidos
          </Button>
        )}
      </div>

      {/* Critical Alerts Summary */}
      {criticalCount > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">
                  {criticalCount} alerta{criticalCount > 1 ? "s" : ""} crítico{criticalCount > 1 ? "s" : ""} requer{criticalCount > 1 ? "em" : ""} atenção imediata
                </p>
                <p className="text-sm text-red-600">
                  Revise os alertas abaixo e tome as ações necessárias
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts List */}
      {alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card 
              key={alert.id} 
              className={`${getSeverityColor(alert.severity)} ${alert.is_read ? "opacity-60" : ""}`}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(alert.severity)}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{alert.title}</h4>
                        {!alert.is_read && (
                          <Badge variant="secondary" className="text-xs">Novo</Badge>
                        )}
                      </div>
                      <p className="text-sm">{alert.message}</p>
                      {alert.indicator_value !== null && alert.threshold_value !== null && (
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1">
                            {getAlertTypeIcon(alert.alert_type)}
                            <strong>Atual:</strong> {alert.indicator_value}
                          </span>
                          <span>
                            <strong>Meta:</strong> {alert.threshold_value}
                          </span>
                        </div>
                      )}
                      <p className="text-xs mt-2 opacity-70">
                        {new Date(alert.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!alert.is_read && (
                      <Button variant="ghost" size="icon" onClick={() => markAsRead(alert.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => deleteAlert(alert.id)}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-green-300 bg-green-50">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <p className="text-green-700 font-medium">Tudo em ordem!</p>
            <p className="text-sm text-green-600 mt-2">
              Não há alertas ou indicadores negativos no momento
            </p>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">Sobre os Alertas</h3>
          <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span><strong>Crítico:</strong> Requer ação imediata</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span><strong>Aviso:</strong> Atenção recomendada</span>
            </div>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-500" />
              <span><strong>Info:</strong> Informativo</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
