import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Calendar, Users, Cake } from "lucide-react";

interface ClientWithAge {
  id: string;
  name: string | null;
  email: string | null;
  date_of_birth: string | null;
  age: number | null;
  age_group: string;
  created_at: string | null;
}

interface AgeGroupData {
  name: string;
  count: number;
  percentage: number;
}

const AGE_GROUPS = {
  "18-24": { min: 18, max: 24, color: "#FF6B6B" },
  "25-34": { min: 25, max: 34, color: "#4ECDC4" },
  "35-44": { min: 35, max: 44, color: "#45B7D1" },
  "45-54": { min: 45, max: 54, color: "#96CEB4" },
  "55-64": { min: 55, max: 64, color: "#FFEAA7" },
  "65+": { min: 65, max: 999, color: "#DDA0DD" },
  "Não informado": { min: -1, max: -1, color: "#C0C0C0" },
};

function calculateAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

function getAgeGroup(age: number | null): string {
  if (age === null) return "Não informado";
  if (age >= 18 && age <= 24) return "18-24";
  if (age >= 25 && age <= 34) return "25-34";
  if (age >= 35 && age <= 44) return "35-44";
  if (age >= 45 && age <= 54) return "45-54";
  if (age >= 55 && age <= 64) return "55-64";
  if (age >= 65) return "65+";
  return "Não informado";
}

export function ClientAgeCategories() {
  const [clients, setClients] = useState<ClientWithAge[]>([]);
  const [ageGroups, setAgeGroups] = useState<AgeGroupData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClientData();
  }, []);

  const loadClientData = async () => {
    try {
      const { data: clientsData } = await supabase
        .from("clients")
        .select("profile_id, created_at, profiles(full_name, email, data_nascimento)")
        .order("created_at", { ascending: false });

      if (clientsData) {
        const clientsWithAge: ClientWithAge[] = clientsData.map(client => {
          const profile = client.profiles as any;
          const age = calculateAge(profile?.data_nascimento || null);
          return {
            id: client.profile_id,
            name: profile?.full_name || null,
            email: profile?.email || null,
            date_of_birth: profile?.data_nascimento || null,
            created_at: client.created_at,
            age,
            age_group: getAgeGroup(age),
          };
        });

        setClients(clientsWithAge);

        // Calculate age group distribution
        const groupCounts: Record<string, number> = {};
        Object.keys(AGE_GROUPS).forEach(group => {
          groupCounts[group] = 0;
        });

        clientsWithAge.forEach(client => {
          groupCounts[client.age_group]++;
        });

        const total = clientsWithAge.length;
        const ageGroupData: AgeGroupData[] = Object.entries(groupCounts)
          .filter(([_, count]) => count > 0)
          .map(([name, count]) => ({
            name,
            count,
            percentage: total > 0 ? Math.round((count / total) * 100) : 0,
          }))
          .sort((a, b) => {
            const order = Object.keys(AGE_GROUPS);
            return order.indexOf(a.name) - order.indexOf(b.name);
          });

        setAgeGroups(ageGroupData);
      }
    } catch (error) {
      console.error("Error loading client data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-5 bg-muted rounded w-1/3" />
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
            <p className="text-xs text-muted-foreground">Cadastrados na plataforma</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Com Data de Nascimento</CardTitle>
            <Cake className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.filter(c => c.date_of_birth).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {clients.length > 0 
                ? `${Math.round((clients.filter(c => c.date_of_birth).length / clients.length) * 100)}% do total`
                : "0% do total"
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Faixa Etária Principal</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ageGroups.length > 0 ? ageGroups.reduce((a, b) => a.count > b.count ? a : b).name : "-"}
            </div>
            <p className="text-xs text-muted-foreground">Maior concentração</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Age Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Faixa Etária</CardTitle>
            <CardDescription>Percentual de clientes por idade</CardDescription>
          </CardHeader>
          <CardContent>
            {ageGroups.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={ageGroups}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                  >
                    {ageGroups.map((entry) => (
                      <Cell 
                        key={entry.name} 
                        fill={AGE_GROUPS[entry.name as keyof typeof AGE_GROUPS]?.color || "#ccc"} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Sem dados de idade disponíveis
              </div>
            )}
          </CardContent>
        </Card>

        {/* Age Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Quantidade por Faixa</CardTitle>
            <CardDescription>Número absoluto de clientes</CardDescription>
          </CardHeader>
          <CardContent>
            {ageGroups.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ageGroups}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                    {ageGroups.map((entry) => (
                      <Cell 
                        key={entry.name} 
                        fill={AGE_GROUPS[entry.name as keyof typeof AGE_GROUPS]?.color || "#ccc"} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Sem dados de idade disponíveis
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes por Idade</CardTitle>
          <CardDescription>Lista de clientes com informações de idade</CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Data de Nascimento</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead>Faixa Etária</TableHead>
                    <TableHead>Cadastro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.slice(0, 20).map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name || "-"}</TableCell>
                      <TableCell>{client.email || "-"}</TableCell>
                      <TableCell>{formatDate(client.date_of_birth)}</TableCell>
                      <TableCell>
                        {client.age !== null ? `${client.age} anos` : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary"
                          style={{ 
                            backgroundColor: AGE_GROUPS[client.age_group as keyof typeof AGE_GROUPS]?.color || "#ccc",
                            color: "#000"
                          }}
                        >
                          {client.age_group}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(client.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {clients.length > 20 && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Exibindo 20 de {clients.length} clientes
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Nenhum cliente cadastrado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
