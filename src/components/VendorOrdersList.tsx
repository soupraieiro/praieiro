import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { MapPin, MessageCircle, Clock, CheckCircle2, XCircle, Navigation, CreditCard, Package } from "lucide-react";
import { ChatWindow } from "./ChatWindow";
import { toast } from "sonner";

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product?: {
    name: string;
  };
}

interface Order {
  id: string;
  client_id: string;
  client_latitude: number | null;
  client_longitude: number | null;
  status: string;
  payment_status: string | null;
  total_amount: number | null;
  message: string | null;
  created_at: string;
  client: {
    name: string | null;
    phone: string | null;
  } | null;
  order_items?: OrderItem[];
}

interface VendorOrdersListProps {
  vendorId: string;
}

export function VendorOrdersList({ vendorId }: VendorOrdersListProps) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState<string>("");

  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          client_id,
          client_latitude,
          client_longitude,
          status,
          payment_status,
          total_amount,
          message,
          created_at,
          order_items(id, product_id, quantity, unit_price, total_price, product:products(name))
        `)
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        // Fetch client info from profiles via clients table
        const ordersWithClients = await Promise.all(
          data.map(async (order) => {
            const { data: clientData } = await supabase
              .from("clients")
              .select("profile_id, profiles(full_name, phone)")
              .eq("profile_id", order.client_id)
              .single();
            
            return {
              ...order,
              client: clientData?.profiles ? {
                name: (clientData.profiles as any).full_name,
                phone: (clientData.profiles as any).phone
              } : null
            };
          })
        );

        // Only show orders that are paid (for security - location should only be visible after payment)
        const paidOrders = ordersWithClients.filter((order) => 
          order.payment_status === 'paid' || 
          order.status === 'completed' || 
          order.status === 'cancelled'
        );
        setOrders(paidOrders as Order[]);
      }
      setLoading(false);
    };

    fetchOrders();

    // Subscribe to order updates
    const channel = supabase
      .channel(`vendor-orders-${vendorId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `vendor_id=eq.${vendorId}`,
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vendorId]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    // For completing orders, use the confirm-delivery endpoint
    if (status === "completed") {
      try {
        const { data, error } = await supabase.functions.invoke('confirm-delivery', {
          body: { orderId }
        });

        if (error) throw error;

        toast.success(data.message || "Entrega confirmada!", {
          description: `R$ ${data.vendorAmount?.toFixed(2)} foi adicionado à sua carteira`,
        });

        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status } : o))
        );
      } catch (error) {
        console.error("Error confirming delivery:", error);
        toast.error("Erro ao confirmar entrega");
      }
    } else {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId);

      if (!error) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status } : o))
        );
      }
    }
  };

  const openChat = (order: Order) => {
    setSelectedOrderId(order.id);
    setSelectedClientName(order.client?.name || "Cliente");
  };

  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
      case "pending_payment":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
            <Clock className="h-3 w-3" />
            Aguardando
          </span>
        );
      case "accepted":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
            <CheckCircle2 className="h-3 w-3" />
            Aceito
          </span>
        );
      case "on_the_way":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
            <Navigation className="h-3 w-3" />
            A caminho
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
            <CheckCircle2 className="h-3 w-3" />
            Concluído
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">
            <XCircle className="h-3 w-3" />
            Cancelado
          </span>
        );
      default:
        return null;
    }
  };

  const getPaymentBadge = (paymentStatus: string | null) => {
    switch (paymentStatus) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
            <CreditCard className="h-3 w-3" />
            Pago
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
            <CreditCard className="h-3 w-3" />
            Aguardando pgto
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (selectedOrderId) {
    return (
      <div className="h-[400px]">
        <ChatWindow
          orderId={selectedOrderId}
          userType="vendor"
          otherPartyName={selectedClientName}
          onClose={() => setSelectedOrderId(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Pedidos recebidos</h3>

      {orders.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Nenhum pedido pago ainda</p>
          <p className="text-sm">Os pedidos aparecerão aqui após o pagamento do cliente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-card rounded-lg border p-4 space-y-3"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-medium">{order.client?.name || "Cliente"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex gap-1">
                  {getPaymentBadge(order.payment_status)}
                  {getStatusBadge(order.status)}
                </div>
              </div>

              {/* Order items */}
              {order.order_items && order.order_items.length > 0 && (
                <div className="bg-muted rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-1 text-sm font-medium mb-2">
                    <Package className="h-4 w-4" />
                    Itens do pedido
                  </div>
                  {order.order_items.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.product?.name || "Produto"}</span>
                      <span>R$ {item.total_price.toFixed(2).replace(".", ",")}</span>
                    </div>
                  ))}
                  {order.total_amount && (
                    <div className="border-t pt-1 mt-2 flex justify-between font-bold text-sm">
                      <span>Total</span>
                      <span className="text-accent">R$ {order.total_amount.toFixed(2).replace(".", ",")}</span>
                    </div>
                  )}
                </div>
              )}

              {order.message && (
                <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                  "{order.message}"
                </p>
              )}

              {/* Location button - only show for paid orders */}
              {order.payment_status === "paid" && order.client_latitude && order.client_longitude && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openInMaps(order.client_latitude!, order.client_longitude!)}
                  className="w-full gap-2"
                >
                  <Navigation className="h-4 w-4" />
                  Ver localização do cliente no mapa
                </Button>
              )}

              <div className="flex gap-2">
                {order.status === "pending" && order.payment_status === "paid" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => updateOrderStatus(order.id, "accepted")}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateOrderStatus(order.id, "cancelled")}
                      className="flex-1"
                    >
                      Recusar
                    </Button>
                  </>
                )}

                {order.status === "accepted" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => openChat(order)}
                      className="flex-1"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Chat
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateOrderStatus(order.id, "on_the_way")}
                      className="flex-1"
                    >
                      <Navigation className="h-4 w-4 mr-1" />
                      A caminho
                    </Button>
                  </>
                )}

                {order.status === "on_the_way" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => openChat(order)}
                      className="flex-1"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Chat
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => updateOrderStatus(order.id, "completed")}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      Concluir
                    </Button>
                  </>
                )}

                {(order.status === "completed" || order.status === "cancelled") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openChat(order)}
                    className="flex-1"
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Ver chat
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
