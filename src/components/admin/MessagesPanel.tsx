import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  MessageCircle, 
  Search, 
  Eye,
  User,
  Store,
  Clock,
  RefreshCw,
  Mail,
  CheckCheck,
  Send,
  Sun,
  Users
} from "lucide-react";

interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  sender_type: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface OrderWithMessages {
  id: string;
  client_name: string | null;
  vendor_name: string | null;
  message_count: number;
  last_message: string | null;
  last_message_at: string | null;
  status: string;
}

interface PraieiroChatSession {
  session_id: string;
  user_id: string | null;
  message_count: number;
  last_message: string | null;
  last_message_at: string | null;
}

interface ConversationDetails {
  order: OrderWithMessages;
  messages: Message[];
}

interface PraieiroMessage {
  id: string;
  session_id: string;
  message_type: string;
  content: string;
  created_at: string;
}

export function MessagesPanel() {
  const [orders, setOrders] = useState<OrderWithMessages[]>([]);
  const [praieiroSessions, setPraieiroSessions] = useState<PraieiroChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<ConversationDetails | null>(null);
  const [showConversation, setShowConversation] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "praieiro">("orders");
  
  // Praieiro chat
  const [selectedPraieiroSession, setSelectedPraieiroSession] = useState<string | null>(null);
  const [praieiroMessages, setPraieiroMessages] = useState<PraieiroMessage[]>([]);
  const [adminReply, setAdminReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    loadOrdersWithMessages();
    loadPraieiroSessions();
  }, []);

  const loadOrdersWithMessages = async () => {
    try {
      setRefreshing(true);

      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, status, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (ordersData) {
        const ordersWithMessages = await Promise.all(
          ordersData.map(async (order) => {
            const { data: messages, count } = await supabase
              .from("messages")
              .select("*", { count: "exact" })
              .eq("order_id", order.id)
              .order("created_at", { ascending: false })
              .limit(1);

            return {
              id: order.id,
              client_name: "Cliente",
              vendor_name: "Vendedor",
              message_count: count || 0,
              last_message: messages?.[0]?.content || null,
              last_message_at: messages?.[0]?.created_at || null,
              status: order.status
            };
          })
        );

        setOrders(ordersWithMessages.filter(o => o.message_count > 0));
      }
    } catch (error) {
      console.error("Error loading orders:", error);
      toast.error("Erro ao carregar conversas");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPraieiroSessions = async () => {
    try {
      const { data } = await supabase
        .from("praieiro_chats")
        .select("session_id, user_id, content, created_at")
        .order("created_at", { ascending: false });

      if (data) {
        // Group by session
        const sessionsMap = new Map<string, PraieiroChatSession>();
        
        data.forEach(msg => {
          if (!sessionsMap.has(msg.session_id)) {
            sessionsMap.set(msg.session_id, {
              session_id: msg.session_id,
              user_id: msg.user_id,
              message_count: 1,
              last_message: msg.content,
              last_message_at: msg.created_at,
            });
          } else {
            const session = sessionsMap.get(msg.session_id)!;
            session.message_count++;
          }
        });

        setPraieiroSessions(Array.from(sessionsMap.values()).slice(0, 50));
      }
    } catch (error) {
      console.error("Error loading praieiro sessions:", error);
    }
  };

  const loadConversation = async (order: OrderWithMessages) => {
    try {
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true });

      setSelectedOrder({
        order,
        messages: messages || []
      });
      setShowConversation(true);
    } catch (error) {
      console.error("Error loading conversation:", error);
      toast.error("Erro ao carregar conversa");
    }
  };

  const loadPraieiroChat = async (sessionId: string) => {
    try {
      const { data } = await supabase
        .from("praieiro_chats")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      setPraieiroMessages(data || []);
      setSelectedPraieiroSession(sessionId);
    } catch (error) {
      console.error("Error loading praieiro chat:", error);
    }
  };

  const sendAdminMessage = async () => {
    if (!adminReply.trim() || !selectedPraieiroSession) return;

    setSendingReply(true);
    try {
      const { error } = await supabase.from("praieiro_chats").insert({
        session_id: selectedPraieiroSession,
        message_type: "praieiro", // Appears as Praieiro to user
        content: adminReply,
        metadata: { sent_by_admin: true },
      });

      if (error) throw error;

      setAdminReply("");
      await loadPraieiroChat(selectedPraieiroSession);
      toast.success("Mensagem enviada como Praieiro");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSendingReply(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      pending: { label: "Pendente", variant: "outline" },
      accepted: { label: "Aceito", variant: "secondary" },
      on_the_way: { label: "A caminho", variant: "default" },
      completed: { label: "Concluído", variant: "default" },
      cancelled: { label: "Cancelado", variant: "destructive" }
    };

    const config = statusConfig[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredOrders = orders.filter(order => 
    order.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.last_message?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader><div className="h-5 bg-muted rounded w-1/3" /></CardHeader>
        <CardContent><div className="h-64 bg-muted rounded" /></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <MessageCircle className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{orders.reduce((acc, o) => acc + o.message_count, 0)}</p>
            <p className="text-sm text-muted-foreground">Mensagens Pedidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Sun className="h-8 w-8 mx-auto text-orange-500 mb-2" />
            <p className="text-2xl font-bold">{praieiroSessions.length}</p>
            <p className="text-sm text-muted-foreground">Chats Praieiro</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Mail className="h-8 w-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{orders.length}</p>
            <p className="text-sm text-muted-foreground">Conversas Ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCheck className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold">{orders.filter(o => o.status === "completed").length}</p>
            <p className="text-sm text-muted-foreground">Pedidos Concluídos</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "orders" ? "default" : "outline"}
          onClick={() => setActiveTab("orders")}
        >
          <Store className="h-4 w-4 mr-2" />
          Conversas de Pedidos
        </Button>
        <Button
          variant={activeTab === "praieiro" ? "default" : "outline"}
          onClick={() => setActiveTab("praieiro")}
        >
          <Sun className="h-4 w-4 mr-2" />
          Chat Praieiro (Iniciar Conversa)
        </Button>
      </div>

      {activeTab === "orders" ? (
        /* Orders Messages */
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <CardTitle>Conversas dos Usuários</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={loadOrdersWithMessages} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
            <CardDescription>
              Acesso administrativo a todas as conversas entre clientes e vendedores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, mensagem..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">Nenhuma conversa encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Última Mensagem</TableHead>
                      <TableHead>Mensagens</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}...</TableCell>
                        <TableCell className="max-w-xs">
                          <p className="truncate text-sm text-muted-foreground">
                            {order.last_message || "-"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{order.message_count}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {order.last_message_at ? formatDate(order.last_message_at) : "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => loadConversation(order)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Praieiro Chats - Admin can respond as Praieiro */
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="h-5 w-5 text-orange-500" />
                Sessões do Praieiro
              </CardTitle>
              <CardDescription>
                Selecione uma sessão para responder como Praieiro
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {praieiroSessions.map((session) => (
                    <div
                      key={session.session_id}
                      onClick={() => loadPraieiroChat(session.session_id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPraieiroSession === session.session_id 
                          ? "border-orange-500 bg-orange-50" 
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-xs">
                            {session.session_id.slice(0, 16)}...
                          </span>
                        </div>
                        <Badge variant="outline">{session.message_count} msgs</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {session.last_message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {session.last_message_at ? formatDate(session.last_message_at) : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Conversa
              </CardTitle>
              <CardDescription>
                Suas mensagens aparecerão como "Praieiro" para o usuário
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedPraieiroSession ? (
                <div className="space-y-4">
                  <ScrollArea className="h-[280px] border rounded-lg p-3">
                    <div className="space-y-3">
                      {praieiroMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.message_type === "user" ? "justify-start" : "justify-end"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-2 ${
                              msg.message_type === "user"
                                ? "bg-muted"
                                : "bg-gradient-to-r from-amber-400 to-orange-500 text-white"
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            <p className="text-[10px] opacity-70 mt-1">
                              {formatTime(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <div className="flex gap-2">
                    <Textarea
                      value={adminReply}
                      onChange={(e) => setAdminReply(e.target.value)}
                      placeholder="Digite sua resposta como Praieiro..."
                      className="flex-1 min-h-[60px]"
                    />
                    <Button
                      onClick={sendAdminMessage}
                      disabled={sendingReply || !adminReply.trim()}
                      className="bg-gradient-to-r from-amber-400 to-orange-500"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[340px] text-center text-muted-foreground">
                  <Users className="h-12 w-12 mb-4" />
                  <p>Selecione uma sessão para visualizar e responder</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Order Conversation Dialog */}
      <Dialog open={showConversation} onOpenChange={setShowConversation}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Conversa do Pedido #{selectedOrder?.order.id.slice(0, 8)}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder?.order.message_count} mensagens
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {selectedOrder?.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_type === "client" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.sender_type === "client"
                        ? "bg-muted"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {message.sender_type === "client" ? (
                        <User className="h-3 w-3" />
                      ) : (
                        <Store className="h-3 w-3" />
                      )}
                      <span className="text-xs font-medium">
                        {message.sender_type === "client" ? "Cliente" : "Vendedor"}
                      </span>
                      <span className="text-xs opacity-70">
                        {formatTime(message.created_at)}
                      </span>
                    </div>
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Status: {getStatusBadge(selectedOrder?.order.status || "pending")}
            </div>
            <Button variant="outline" onClick={() => setShowConversation(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
