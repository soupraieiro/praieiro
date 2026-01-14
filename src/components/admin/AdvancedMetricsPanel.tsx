import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  Store, 
  ShoppingBag,
  DollarSign,
  Calendar,
  Activity,
  Target,
  Clock,
  MapPin
} from "lucide-react";

interface DailyMetric {
  date: string;
  orders: number;
  revenue: number;
  newClients: number;
  newVendors: number;
}

interface HourlyActivity {
  hour: string;
  activity: number;
}

interface CategoryRevenue {
  category: string;
  revenue: number;
  orders: number;
}

interface ConversionMetrics {
  totalVisits: number;
  totalOrders: number;
  conversionRate: number;
  avgOrderValue: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function AdvancedMetricsPanel() {
  const [loading, setLoading] = useState(true);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [hourlyActivity, setHourlyActivity] = useState<HourlyActivity[]>([]);
  const [categoryRevenue, setCategoryRevenue] = useState<CategoryRevenue[]>([]);
  const [conversionMetrics, setConversionMetrics] = useState<ConversionMetrics>({
    totalVisits: 0,
    totalOrders: 0,
    conversionRate: 0,
    avgOrderValue: 0
  });
  const [topBeaches, setTopBeaches] = useState<{ name: string; count: number }[]>([]);
  const [peakHours, setPeakHours] = useState<{ hour: number; count: number }[]>([]);

  useEffect(() => {
    loadAllMetrics();
  }, []);

  const loadAllMetrics = async () => {
    try {
      await Promise.all([
        loadDailyMetrics(),
        loadHourlyActivity(),
        loadCategoryRevenue(),
        loadConversionMetrics(),
        loadTopBeaches(),
        loadPeakHours()
      ]);
    } catch (error) {
      console.error("Error loading metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDailyMetrics = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: orders } = await supabase
      .from("orders")
      .select("created_at, total_amount")
      .gte("created_at", thirtyDaysAgo.toISOString());

    const { data: clients } = await supabase
      .from("clients")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo.toISOString());

    const { data: vendors } = await supabase
      .from("vendors")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo.toISOString());

    // Group by date
    const metricsMap: Record<string, DailyMetric> = {};
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      metricsMap[dateStr] = { date: dateStr, orders: 0, revenue: 0, newClients: 0, newVendors: 0 };
    }

    orders?.forEach(order => {
      const dateStr = new Date(order.created_at).toISOString().split("T")[0];
      if (metricsMap[dateStr]) {
        metricsMap[dateStr].orders++;
        metricsMap[dateStr].revenue += Number(order.total_amount) || 0;
      }
    });

    clients?.forEach(client => {
      const dateStr = new Date(client.created_at).toISOString().split("T")[0];
      if (metricsMap[dateStr]) {
        metricsMap[dateStr].newClients++;
      }
    });

    vendors?.forEach(vendor => {
      const dateStr = new Date(vendor.created_at).toISOString().split("T")[0];
      if (metricsMap[dateStr]) {
        metricsMap[dateStr].newVendors++;
      }
    });

    setDailyMetrics(Object.values(metricsMap).sort((a, b) => a.date.localeCompare(b.date)));
  };

  const loadHourlyActivity = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: clicks } = await supabase
      .from("whatsapp_clicks")
      .select("clicked_at")
      .gte("clicked_at", today.toISOString());

    // Group by hour
    const hourlyMap: Record<string, number> = {};
    for (let i = 0; i < 24; i++) {
      hourlyMap[`${i.toString().padStart(2, "0")}:00`] = 0;
    }

    clicks?.forEach(click => {
      const hour = new Date(click.clicked_at).getHours();
      const hourStr = `${hour.toString().padStart(2, "0")}:00`;
      hourlyMap[hourStr]++;
    });

    setHourlyActivity(
      Object.entries(hourlyMap).map(([hour, activity]) => ({ hour, activity }))
    );
  };

  const loadCategoryRevenue = async () => {
    const { data: orders } = await supabase
      .from("orders")
      .select(`
        total_amount,
        vendors (product_category)
      `)
      .eq("status", "completed");

    const categoryMap: Record<string, { revenue: number; orders: number }> = {};

    orders?.forEach((order: any) => {
      const category = order.vendors?.product_category || "Outros";
      if (!categoryMap[category]) {
        categoryMap[category] = { revenue: 0, orders: 0 };
      }
      categoryMap[category].revenue += Number(order.total_amount) || 0;
      categoryMap[category].orders++;
    });

    setCategoryRevenue(
      Object.entries(categoryMap)
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6)
    );
  };

  const loadConversionMetrics = async () => {
    const { count: totalClicks } = await supabase
      .from("whatsapp_clicks")
      .select("*", { count: "exact", head: true });

    const { count: totalOrders } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true });

    const { data: orderValues } = await supabase
      .from("orders")
      .select("total_amount")
      .eq("status", "completed");

    const totalRevenue = orderValues?.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) || 0;
    const completedOrders = orderValues?.length || 1;

    setConversionMetrics({
      totalVisits: totalClicks || 0,
      totalOrders: totalOrders || 0,
      conversionRate: totalClicks ? ((totalOrders || 0) / totalClicks) * 100 : 0,
      avgOrderValue: totalRevenue / completedOrders
    });
  };

  const loadTopBeaches = async () => {
    const { data: clicks } = await supabase
      .from("whatsapp_clicks")
      .select(`
        beach_id,
        beaches (beach_name)
      `)
      .not("beach_id", "is", null);

    const beachMap: Record<string, number> = {};
    clicks?.forEach((click: any) => {
      const beachName = click.beaches?.beach_name || "Desconhecida";
      beachMap[beachName] = (beachMap[beachName] || 0) + 1;
    });

    setTopBeaches(
      Object.entries(beachMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    );
  };

  const loadPeakHours = async () => {
    const { data: orders } = await supabase
      .from("orders")
      .select("created_at");

    const hourMap: Record<number, number> = {};
    orders?.forEach(order => {
      const hour = new Date(order.created_at).getHours();
      hourMap[hour] = (hourMap[hour] || 0) + 1;
    });

    setPeakHours(
      Object.entries(hourMap)
        .map(([hour, count]) => ({ hour: parseInt(hour), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader><div className="h-5 bg-muted rounded w-1/3" /></CardHeader>
            <CardContent><div className="h-48 bg-muted rounded" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                <p className="text-2xl font-bold">{conversionMetrics.conversionRate.toFixed(1)}%</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {conversionMetrics.totalOrders} pedidos de {conversionMetrics.totalVisits} visitas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold">{formatCurrency(conversionMetrics.avgOrderValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Valor médio por pedido
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pedidos Hoje</p>
                <p className="text-2xl font-bold">
                  {dailyMetrics[dailyMetrics.length - 1]?.orders || 0}
                </p>
              </div>
              <ShoppingBag className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Receita: {formatCurrency(dailyMetrics[dailyMetrics.length - 1]?.revenue || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Novos Usuários Hoje</p>
                <p className="text-2xl font-bold">
                  {(dailyMetrics[dailyMetrics.length - 1]?.newClients || 0) + 
                   (dailyMetrics[dailyMetrics.length - 1]?.newVendors || 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {dailyMetrics[dailyMetrics.length - 1]?.newClients || 0} clientes, {" "}
              {dailyMetrics[dailyMetrics.length - 1]?.newVendors || 0} vendedores
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Daily Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Tendência Semanal
            </CardTitle>
            <CardDescription>Pedidos e novos usuários nos últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={dailyMetrics}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDateLabel} />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => formatDateLabel(value as string)}
                  formatter={(value: number, name: string) => [
                    value, 
                    name === "orders" ? "Pedidos" : name === "newClients" ? "Novos Clientes" : "Novos Vendedores"
                  ]}
                />
                <Area type="monotone" dataKey="orders" stroke="hsl(var(--primary))" fill="url(#colorOrders)" />
                <Line type="monotone" dataKey="newClients" stroke="#00C49F" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="newVendors" stroke="#FFBB28" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hourly Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Atividade por Hora (Hoje)
            </CardTitle>
            <CardDescription>Cliques no WhatsApp distribuídos por hora</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hourlyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" interval={2} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="activity" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Category Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Receita por Categoria
            </CardTitle>
            <CardDescription>Distribuição de receita por tipo de produto</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryRevenue}
                    dataKey="revenue"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryRevenue.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                Sem dados disponíveis
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Beaches & Peak Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Insights de Localização
            </CardTitle>
            <CardDescription>Praias mais populares e horários de pico</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Top 5 Praias</h4>
              {topBeaches.length > 0 ? (
                <div className="space-y-2">
                  {topBeaches.map((beach, index) => (
                    <div key={beach.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="text-sm">{beach.name}</span>
                      </div>
                      <Badge variant="secondary">{beach.count} cliques</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem dados</p>
              )}
            </div>

            <div>
              <h4 className="font-medium mb-2">Horários de Pico</h4>
              {peakHours.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {peakHours.map((peak) => (
                    <Badge key={peak.hour} variant="outline">
                      {peak.hour}:00 ({peak.count} pedidos)
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem dados</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
