import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  User, 
  ShoppingBag, 
  MessageCircle, 
  Receipt, 
  Edit, 
  Eye,
  Loader2,
  Calendar,
  Phone,
  Mail,
  CreditCard
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClientDetails {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cpf: string;
  data_nascimento: string | null;
  created_at: string;
}

interface Order {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  vendor_name?: string;
}

interface Message {
  id: string;
  content: string;
  sender_type: string;
  created_at: string;
  order_id: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
}

export function ClientSearchPanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Search clients
  const { data: clients, isLoading: searchLoading } = useQuery({
    queryKey: ["client-search", searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim() || searchTerm.length < 2) return [];
      
      const { data, error } = await supabase
        .from("clients")
        .select("profile_id, profiles(id, full_name, email, phone, cpf, data_nascimento, created_at)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const searchLower = searchTerm.toLowerCase();
      return (data || [])
        .map((c) => {
          const profile = c.profiles as any;
          return {
            id: profile?.id || c.profile_id,
            name: profile?.full_name || "",
            email: profile?.email || "",
            phone: profile?.phone || null,
            cpf: profile?.cpf || "",
            data_nascimento: profile?.data_nascimento || null,
            created_at: profile?.created_at || "",
          };
        })
        .filter(
          (c) =>
            c.name.toLowerCase().includes(searchLower) ||
            c.email.toLowerCase().includes(searchLower) ||
            c.cpf.includes(searchTerm.replace(/\D/g, ""))
        )
        .slice(0, 20);
    },
    enabled: searchTerm.length >= 2,
  });

  // Fetch client orders
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["client-orders", selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      
      const { data, error } = await supabase
        .from("orders")
        .select("id, status, total_amount, created_at, vendor_id")
        .eq("client_id", selectedClient.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as Order[];
    },
    enabled: !!selectedClient?.id,
  });

  // Fetch client messages
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["client-messages", selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      
      // Get all orders for this client first
      const { data: clientOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("client_id", selectedClient.id);

      if (!clientOrders || clientOrders.length === 0) return [];

      const orderIds = clientOrders.map((o) => o.id);
      
      const { data, error } = await supabase
        .from("messages")
        .select("id, content, sender_type, created_at, order_id")
        .in("order_id", orderIds)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as Message[];
    },
    enabled: !!selectedClient?.id,
  });

  // Fetch client transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["client-transactions-admin", selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      
      const { data, error } = await supabase
        .from("client_transactions")
        .select("id, type, amount, description, created_at")
        .eq("client_id", selectedClient.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as Transaction[];
    },
    enabled: !!selectedClient?.id,
  });

  const handleViewClient = (client: ClientDetails) => {
    setSelectedClient(client);
    setIsDetailsOpen(true);
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirmed: "default",
      delivered: "default",
      cancelled: "destructive",
    };
    const labels: Record<string, string> = {
      pending: "Pendente",
      confirmed: "Confirmado",
      delivered: "Entregue",
      cancelled: "Cancelado",
    };
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Search Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Clientes
          </CardTitle>
          <CardDescription>
            Pesquise por nome, e-mail ou CPF para ver histórico completo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Digite o nome, e-mail ou CPF do cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-lg py-6"
            />
          </div>

          {/* Search Results */}
          {searchLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {clients && clients.length > 0 && (
            <div className="mt-4 space-y-2">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-muted-foreground">{client.email}</p>
                    </div>
                  </div>
                  <Button onClick={() => handleViewClient(client)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Detalhes
                  </Button>
                </div>
              ))}
            </div>
          )}

          {searchTerm.length >= 2 && clients?.length === 0 && !searchLoading && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mb-4 opacity-50" />
              <p>Nenhum cliente encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Detalhes do Cliente
            </DialogTitle>
          </DialogHeader>

          {selectedClient && (
            <div className="space-y-4">
              {/* Client Info Card */}
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Nome</p>
                        <p className="font-medium">{selectedClient.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">E-mail</p>
                        <p className="font-medium">{selectedClient.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Telefone</p>
                        <p className="font-medium">{selectedClient.phone || "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Cadastro</p>
                        <p className="font-medium">
                          {selectedClient.created_at 
                            ? format(new Date(selectedClient.created_at), "dd/MM/yyyy") 
                            : "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs for different data */}
              <Tabs defaultValue="orders">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="orders" className="gap-2">
                    <ShoppingBag className="h-4 w-4" />
                    Pedidos ({orders?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="messages" className="gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Mensagens ({messages?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="transactions" className="gap-2">
                    <Receipt className="h-4 w-4" />
                    Transações ({transactions?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="orders">
                  <ScrollArea className="h-64">
                    {ordersLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : orders && orders.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Data</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-mono text-xs">
                                {order.id.slice(0, 8)}...
                              </TableCell>
                              <TableCell>{getStatusBadge(order.status)}</TableCell>
                              <TableCell>{formatCurrency(order.total_amount || 0)}</TableCell>
                              <TableCell>{formatDate(order.created_at)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="flex items-center justify-center py-8 text-muted-foreground">
                        Nenhum pedido encontrado
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="messages">
                  <ScrollArea className="h-64">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : messages && messages.length > 0 ? (
                      <div className="space-y-2 p-2">
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`rounded-lg p-3 ${
                              msg.sender_type === "client"
                                ? "bg-primary/10 ml-8"
                                : "bg-muted mr-8"
                            }`}
                          >
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>{msg.sender_type === "client" ? "Cliente" : "Vendedor"}</span>
                              <span>{formatDate(msg.created_at)}</span>
                            </div>
                            <p className="text-sm">{msg.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-8 text-muted-foreground">
                        Nenhuma mensagem encontrada
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="transactions">
                  <ScrollArea className="h-64">
                    {transactionsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : transactions && transactions.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Data</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions.map((tx) => (
                            <TableRow key={tx.id}>
                              <TableCell>
                                <Badge variant={tx.type === "deposit" ? "default" : "secondary"}>
                                  {tx.type === "deposit" ? "Depósito" : tx.type}
                                </Badge>
                              </TableCell>
                              <TableCell>{tx.description || "-"}</TableCell>
                              <TableCell className={tx.amount >= 0 ? "text-green-600" : "text-red-600"}>
                                {formatCurrency(tx.amount)}
                              </TableCell>
                              <TableCell>{formatDate(tx.created_at)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="flex items-center justify-center py-8 text-muted-foreground">
                        Nenhuma transação encontrada
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
