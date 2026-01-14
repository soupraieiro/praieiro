import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Cake, Gift, Calendar, Search, PartyPopper, User } from "lucide-react";
import { format, isToday, isSameMonth, parseISO, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BirthdayClient {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string;
  age: number;
  isBirthdayToday: boolean;
  isBirthdayThisMonth: boolean;
}

export function BirthdayClientsPanel() {
  const [clients, setClients] = useState<BirthdayClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"today" | "month" | "all">("today");

  useEffect(() => {
    loadBirthdayClients();
  }, []);

  const loadBirthdayClients = async () => {
    try {
      const { data: clientsData } = await supabase
        .from("clients")
        .select("profile_id, profiles(full_name, email, phone, data_nascimento)")
        .order("created_at", { ascending: false });

      if (clientsData) {
        const today = new Date();
        const birthdayClients: BirthdayClient[] = clientsData
          .filter((c) => {
            const profile = c.profiles as any;
            return profile?.data_nascimento;
          })
          .map((c) => {
            const profile = c.profiles as any;
            const birthDate = parseISO(profile.data_nascimento);
            const birthDayMonth = format(birthDate, "MM-dd");
            const todayDayMonth = format(today, "MM-dd");
            
            return {
              id: c.profile_id,
              name: profile?.full_name || null,
              email: profile?.email || null,
              phone: profile?.phone || null,
              date_of_birth: profile.data_nascimento,
              age: differenceInYears(today, birthDate),
              isBirthdayToday: birthDayMonth === todayDayMonth,
              isBirthdayThisMonth: birthDate.getMonth() === today.getMonth(),
            };
          })
          // Sort by birthday date in current year
          .sort((a, b) => {
            const aDate = parseISO(a.date_of_birth);
            const bDate = parseISO(b.date_of_birth);
            const aMonthDay = aDate.getMonth() * 100 + aDate.getDate();
            const bMonthDay = bDate.getMonth() * 100 + bDate.getDate();
            return aMonthDay - bMonthDay;
          });

        setClients(birthdayClients);
      }
    } catch (error) {
      console.error("Error loading birthday clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return "-";
    const clean = phone.replace(/\D/g, "");
    return clean.length === 11
      ? `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`
      : phone;
  };

  const filteredClients = clients.filter((client) => {
    // Filter by birthday type
    if (filter === "today" && !client.isBirthdayToday) return false;
    if (filter === "month" && !client.isBirthdayThisMonth) return false;

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        client.name?.toLowerCase().includes(search) ||
        client.email?.toLowerCase().includes(search) ||
        client.phone?.includes(search)
      );
    }
    return true;
  });

  const todayCount = clients.filter((c) => c.isBirthdayToday).length;
  const monthCount = clients.filter((c) => c.isBirthdayThisMonth).length;

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
        <Card 
          className={`cursor-pointer transition-all ${filter === "today" ? "ring-2 ring-primary" : "hover:shadow-md"}`}
          onClick={() => setFilter("today")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aniversariantes Hoje</CardTitle>
            <PartyPopper className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">{todayCount}</div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${filter === "month" ? "ring-2 ring-primary" : "hover:shadow-md"}`}
          onClick={() => setFilter("month")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aniversariantes do Mês</CardTitle>
            <Cake className="h-5 w-5 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-pink-500">{monthCount}</div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${filter === "all" ? "ring-2 ring-primary" : "hover:shadow-md"}`}
          onClick={() => setFilter("all")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total com Data</CardTitle>
            <Calendar className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{clients.length}</div>
            <p className="text-xs text-muted-foreground">Clientes com data de nascimento</p>
          </CardContent>
        </Card>
      </div>

      {/* Birthday List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-accent" />
                {filter === "today"
                  ? "Aniversariantes de Hoje"
                  : filter === "month"
                  ? "Aniversariantes do Mês"
                  : "Todos os Aniversários"}
              </CardTitle>
              <CardDescription>
                {filteredClients.length} cliente(s) encontrado(s)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredClients.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Data de Nascimento</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow 
                      key={client.id}
                      className={client.isBirthdayToday ? "bg-accent/10" : ""}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {client.isBirthdayToday && (
                            <PartyPopper className="h-4 w-4 text-accent animate-bounce" />
                          )}
                          {client.name || "-"}
                        </div>
                      </TableCell>
                      <TableCell>{client.email || "-"}</TableCell>
                      <TableCell>{formatPhone(client.phone)}</TableCell>
                      <TableCell>
                        {format(parseISO(client.date_of_birth), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        {client.isBirthdayToday 
                          ? `Completa ${client.age + 1} anos hoje!`
                          : `${client.age} anos`
                        }
                      </TableCell>
                      <TableCell>
                        {client.isBirthdayToday ? (
                          <Badge className="bg-accent text-white animate-pulse">
                            🎂 Hoje!
                          </Badge>
                        ) : client.isBirthdayThisMonth ? (
                          <Badge variant="secondary">
                            Este mês
                          </Badge>
                        ) : (
                          <Badge variant="outline">-</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <User className="h-12 w-12 mb-4 opacity-50" />
              <p>
                {filter === "today"
                  ? "Nenhum aniversariante hoje"
                  : filter === "month"
                  ? "Nenhum aniversariante este mês"
                  : "Nenhum cliente encontrado"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
