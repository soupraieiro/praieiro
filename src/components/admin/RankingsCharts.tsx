import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { 
  Trophy, 
  Store, 
  Users, 
  MapPin,
  ShoppingBag
} from "lucide-react";

interface VendorRanking {
  id: string;
  full_name: string;
  establishment_type: string | null;
  order_count: number;
}

interface ClientRanking {
  id: string;
  name: string | null;
  order_count: number;
  total_spent: number;
}

interface ProductRanking {
  category: string;
  count: number;
}

interface EstablishmentRanking {
  type: string;
  count: number;
  revenue: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const ESTABLISHMENT_LABELS: Record<string, string> = {
  ambulante: "Ambulante",
  barraca: "Barraca",
  restaurante: "Restaurante",
  bar: "Bar",
  deposito: "Depósito",
};

export function RankingsCharts() {
  const [vendorRankings, setVendorRankings] = useState<VendorRanking[]>([]);
  const [clientRankings, setClientRankings] = useState<ClientRanking[]>([]);
  const [productRankings, setProductRankings] = useState<ProductRanking[]>([]);
  const [establishmentRankings, setEstablishmentRankings] = useState<EstablishmentRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRankingsData();
  }, []);

  const loadRankingsData = async () => {
    try {
      // Get vendor rankings by completed orders
      const { data: vendors } = await supabase
        .from("vendors")
        .select("profile_id, establishment_type, profiles(full_name)");

      if (vendors) {
        const vendorsWithOrders = await Promise.all(
          vendors.map(async (vendor) => {
            const { count } = await supabase
              .from("orders")
              .select("*", { count: "exact", head: true })
              .eq("vendor_id", vendor.profile_id)
              .eq("status", "completed");

            return {
              id: vendor.profile_id,
              full_name: (vendor.profiles as any)?.full_name || "Vendedor",
              establishment_type: vendor.establishment_type,
              order_count: count || 0,
            };
          })
        );

        setVendorRankings(
          vendorsWithOrders
            .sort((a, b) => b.order_count - a.order_count)
            .slice(0, 10)
        );

        // Calculate establishment rankings
        const estCounts: Record<string, { count: number; revenue: number }> = {};
        vendorsWithOrders.forEach(v => {
          const type = v.establishment_type || 'ambulante';
          if (!estCounts[type]) {
            estCounts[type] = { count: 0, revenue: 0 };
          }
          estCounts[type].count++;
        });

        setEstablishmentRankings(
          Object.entries(estCounts)
            .map(([type, data]) => ({
              type: ESTABLISHMENT_LABELS[type] || type,
              count: data.count,
              revenue: data.revenue,
            }))
            .sort((a, b) => b.count - a.count)
        );
      }

      // Get client rankings
      const { data: clients } = await supabase
        .from("clients")
        .select("profile_id, profiles(full_name)");

      if (clients) {
        const clientsWithOrders = await Promise.all(
          clients.map(async (client) => {
            const { count } = await supabase
              .from("orders")
              .select("*", { count: "exact", head: true })
              .eq("client_id", client.profile_id)
              .eq("status", "completed");

            const { data: walletData } = await supabase
              .from("client_conchas")
              .select("total_spent")
              .eq("client_id", client.profile_id)
              .maybeSingle();

            return {
              id: client.profile_id,
              name: (client.profiles as any)?.full_name || null,
              order_count: count || 0,
              total_spent: Number(walletData?.total_spent) || 0,
            };
          })
        );

        setClientRankings(
          clientsWithOrders
            .sort((a, b) => b.order_count - a.order_count)
            .slice(0, 10)
        );
      }

      // Get product category rankings from interests
      const { data: interests } = await supabase
        .from("client_product_interests")
        .select("product_category");

      if (interests) {
        const categoryCount: Record<string, number> = {};
        interests.forEach(i => {
          categoryCount[i.product_category] = (categoryCount[i.product_category] || 0) + 1;
        });

        setProductRankings(
          Object.entries(categoryCount)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
        );
      }
    } catch (error) {
      console.error("Error loading rankings:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-muted rounded w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="h-48 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Products Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Produtos Mais Procurados
            </CardTitle>
            <CardDescription>
              Categorias com mais interesse dos clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {productRankings.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={productRankings}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="category" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                Sem dados disponíveis
              </div>
            )}
          </CardContent>
        </Card>

        {/* Establishments Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              Tipos de Estabelecimento
            </CardTitle>
            <CardDescription>
              Distribuição por categoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            {establishmentRankings.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={establishmentRankings}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {establishmentRankings.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                Sem dados disponíveis
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rankings Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Vendors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Vendedores Mais Ativos
            </CardTitle>
            <CardDescription>
              Ranking por pedidos concluídos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {vendorRankings.length > 0 ? (
              <div className="space-y-3">
                {vendorRankings.map((vendor, index) => (
                  <div key={vendor.id} className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-100 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{vendor.full_name}</p>
                      <Badge variant="outline" className="text-xs">
                        {ESTABLISHMENT_LABELS[vendor.establishment_type || 'ambulante']}
                      </Badge>
                    </div>
                    <Badge variant="secondary">{vendor.order_count} pedidos</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                Sem dados disponíveis
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Clientes Mais Ativos
            </CardTitle>
            <CardDescription>
              Ranking por quantidade de pedidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {clientRankings.length > 0 ? (
              <div className="space-y-3">
                {clientRankings.map((client, index) => (
                  <div key={client.id} className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-100 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{client.name || "Cliente"}</p>
                      {client.total_spent > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Gastou: {formatCurrency(client.total_spent)}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary">{client.order_count} pedidos</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                Sem dados disponíveis
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
