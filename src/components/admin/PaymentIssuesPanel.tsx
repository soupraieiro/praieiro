import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  CreditCard,
  MapPin,
  User,
  Store
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface OrderWithPaymentIssue {
  id: string;
  status: string;
  payment_status: string | null;
  total_amount: number | null;
  created_at: string;
  client_latitude: number | null;
  client_longitude: number | null;
  client: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  vendor: {
    id: string;
    full_name: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
}

export function PaymentIssuesPanel() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderWithPaymentIssue[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithPaymentIssue | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resolution, setResolution] = useState("");
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPaymentIssues();
  }, []);

  const loadPaymentIssues = async () => {
    try {
      setLoading(true);
      
      // Get orders with payment issues (pending or failed payment status)
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          status,
          payment_status,
          total_amount,
          created_at,
          client_latitude,
          client_longitude,
          client:clients!orders_client_id_fkey (
            id,
            name,
            email
          ),
          vendor:vendors!orders_vendor_id_fkey (
            id,
            full_name,
            latitude,
            longitude
          )
        `)
        .in("payment_status", ["pending", "failed", "pending_payment"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOrders((data as any) || []);
    } catch (error) {
      console.error("Error loading payment issues:", error);
      toast.error("Erro ao carregar problemas de pagamento");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = (order: OrderWithPaymentIssue) => {
    setSelectedOrder(order);
    setResolution("");
    setNotes("");
    setDialogOpen(true);
  };

  const confirmResolution = async () => {
    if (!selectedOrder || !resolution) return;

    setProcessing(true);
    try {
      const updates: { payment_status?: string; status?: string } = {};

      switch (resolution) {
        case "mark_paid":
          updates.payment_status = "paid";
          break;
        case "cancel_order":
          updates.payment_status = "cancelled";
          updates.status = "cancelled";
          break;
        case "retry_payment":
          updates.payment_status = "pending_payment";
          break;
        case "refund":
          updates.payment_status = "refunded";
          updates.status = "cancelled";
          break;
      }

      const { error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", selectedOrder.id);

      if (error) throw error;

      // Log the action
      await supabase.rpc("log_security_event", {
        p_event_type: "admin_payment_resolution",
        p_identifier: selectedOrder.id,
        p_details: {
          resolution,
          notes,
          previous_status: selectedOrder.payment_status,
          new_status: updates.payment_status,
        },
      });

      toast.success("Problema resolvido com sucesso");
      setDialogOpen(false);
      loadPaymentIssues();
    } catch (error) {
      console.error("Error resolving payment issue:", error);
      toast.error("Erro ao resolver problema");
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR");
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  };

  const getPaymentStatusBadge = (status: string | null) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500">Pago</Badge>;
      case "pending":
      case "pending_payment":
        return <Badge variant="secondary">Pendente</Badge>;
      case "failed":
        return <Badge variant="destructive">Falhou</Badge>;
      case "refunded":
        return <Badge variant="outline">Reembolsado</Badge>;
      default:
        return <Badge variant="outline">{status || "Desconhecido"}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Problemas de Pagamento
              </CardTitle>
              <CardDescription>
                Gerencie pedidos com problemas de pagamento
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadPaymentIssues}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="mt-4 text-muted-foreground">
                Nenhum problema de pagamento no momento
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {order.client?.name || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Store className="h-3 w-3" />
                          {order.vendor?.full_name || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(order.total_amount)}</TableCell>
                      <TableCell>{getPaymentStatusBadge(order.payment_status)}</TableCell>
                      <TableCell>
                        {order.client_latitude && order.client_longitude ? (
                          <Badge variant="outline" className="gap-1">
                            <MapPin className="h-3 w-3" />
                            Definida
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Indefinida
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(order.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolve(order)}
                        >
                          Resolver
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver Problema de Pagamento</DialogTitle>
            <DialogDescription>
              Pedido: {selectedOrder?.id.slice(0, 8)}... | 
              Cliente: {selectedOrder?.client?.name || "N/A"} | 
              Valor: {formatCurrency(selectedOrder?.total_amount || 0)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Ação</label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mark_paid">
                    Marcar como Pago (pagamento confirmado manualmente)
                  </SelectItem>
                  <SelectItem value="retry_payment">
                    Solicitar Nova Tentativa de Pagamento
                  </SelectItem>
                  <SelectItem value="refund">
                    Reembolsar e Cancelar Pedido
                  </SelectItem>
                  <SelectItem value="cancel_order">
                    Cancelar Pedido (sem pagamento)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Observações (opcional)</label>
              <Textarea
                placeholder="Adicione observações sobre a resolução..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmResolution} disabled={!resolution || processing}>
              {processing ? "Processando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
