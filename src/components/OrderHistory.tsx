import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatWindow } from "@/components/ChatWindow";
import { ReviewDialog } from "@/components/ReviewDialog";
import { FavoriteButton } from "@/components/FavoriteButton";
import { PaymentButton } from "@/components/PaymentButton";
import { useOrderPayment } from "@/hooks/useOrderPayment";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { History, MessageCircle, Clock, CheckCircle2, XCircle, Truck, MapPin, Star, CreditCard } from "lucide-react";

/**
 * Lei 5.2 - Tipagem Estrita
 * Interfaces rigorosas para dados de pedidos (ZERO 'any')
 */
interface ProductInfo {
  name: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product?: ProductInfo;
}

interface VendorInfo {
  id: string;
  full_name: string;
  product_category: string;
  latitude: number | null;
  longitude: number | null;
}

/**
 * OrderData - Interface rigorosa para dados do Supabase
 * Substitui 'any' em conformidade com Lei 5.2 da Constituição Técnica
 */
interface OrderData {
  id: string;
  status: string;
  payment_status: string | null;
  total_amount: number | null;
  message: string | null;
  created_at: string;
  client_latitude: number | null;
  client_longitude: number | null;
  order_items: OrderItem[];
  vendor: VendorInfo;
}

interface Order extends Omit<OrderData, 'order_items'> {
  has_review: boolean;
  order_items?: OrderItem[];
}

interface OrderHistoryProps {
  clientId: string;
}

export function OrderHistory({ clientId }: OrderHistoryProps) {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedVendorName, setSelectedVendorName] = useState<string>("");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const { verifyPayment } = useOrderPayment();

  // Check for payment completion on URL params
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const orderId = searchParams.get("order");
    
    if (paymentStatus === "success" && orderId) {
      // Verify payment with backend
      verifyPayment(orderId).then((paid) => {
        if (paid) {
          toast.success("Pagamento confirmado! Seu pedido foi enviado ao vendedor.");
          fetchOrders();
        }
      });
    } else if (paymentStatus === "cancelled") {
      toast.info("Pagamento cancelado");
    }
  }, [searchParams]);

  useEffect(() => {
    fetchOrders();

    // Subscribe to order updates
    const channel = supabase
      .channel('client-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  const fetchOrders = async () => {
    // Fetch orders
    const { data: ordersData } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        payment_status,
        total_amount,
        message,
        created_at,
        client_latitude,
        client_longitude,
        vendor:vendors (
          id,
          full_name,
          product_category,
          latitude,
          longitude
        ),
        order_items(id, quantity, unit_price, total_price, product:products(name))
      `)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (ordersData) {
      // Fetch reviews for these orders
      const orderIds = ordersData.map(o => o.id);
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("order_id")
        .in("order_id", orderIds);

      const reviewedOrderIds = new Set(reviewsData?.map(r => r.order_id) || []);

      // Lei 5.2 - Tipagem Estrita: Mapeamento seguro com tipos explícitos
      const formatted: Order[] = ordersData.map((order) => {
        // Type guard para vendor - cast para unknown primeiro depois para VendorInfo
        const vendorRaw = order.vendor as unknown;
        const vendor = vendorRaw as VendorInfo | null;
        
        return {
          id: order.id,
          status: order.status,
          payment_status: order.payment_status,
          total_amount: order.total_amount,
          message: order.message,
          created_at: order.created_at,
          client_latitude: order.client_latitude,
          client_longitude: order.client_longitude,
          order_items: order.order_items as OrderItem[],
          vendor: vendor || {
            id: '',
            full_name: 'Vendedor',
            product_category: 'Geral',
            latitude: null,
            longitude: null
          },
          has_review: reviewedOrderIds.has(order.id)
        };
      });
      setOrders(formatted);
    }
    setLoading(false);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending_payment":
        return { label: "Aguardando Pgto", icon: CreditCard, variant: "outline" as const, color: "text-orange-600" };
      case "pending":
        return { label: "Aguardando", icon: Clock, variant: "outline" as const, color: "text-yellow-600" };
      case "accepted":
        return { label: "Aceito", icon: CheckCircle2, variant: "default" as const, color: "text-green-600" };
      case "on_the_way":
        return { label: "A caminho", icon: Truck, variant: "default" as const, color: "text-blue-600" };
      case "completed":
        return { label: "Concluído", icon: CheckCircle2, variant: "secondary" as const, color: "text-muted-foreground" };
      case "cancelled":
        return { label: "Cancelado", icon: XCircle, variant: "destructive" as const, color: "text-red-600" };
      default:
        return { label: status, icon: Clock, variant: "outline" as const, color: "text-muted-foreground" };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const openChat = (orderId: string, vendorName: string) => {
    setSelectedOrderId(orderId);
    setSelectedVendorName(vendorName);
    setIsChatOpen(true);
  };

  const openReview = (orderId: string, vendorId: string, vendorName: string) => {
    setSelectedOrderId(orderId);
    setSelectedVendorId(vendorId);
    setSelectedVendorName(vendorName);
    setIsReviewOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Histórico de Pedidos</h3>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center rounded-lg bg-muted/30">
            <MapPin className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">Você ainda não fez nenhum pedido</p>
            <p className="text-sm text-muted-foreground/70">
              Encontre um ambulante no mapa e faça seu primeiro pedido!
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {orders.map((order) => {
                const statusConfig = getStatusConfig(order.status);
                const StatusIcon = statusConfig.icon;
                const isActive = order.status === "pending" || order.status === "accepted" || order.status === "on_the_way";
                const isPendingPayment = order.status === "pending_payment";

                return (
                  <div
                    key={order.id}
                    className={`rounded-lg border bg-card p-4 shadow-sm ${isPendingPayment ? 'border-orange-300 bg-orange-50/50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{order.vendor.full_name}</p>
                          <Badge variant="secondary" className="text-xs">
                            {order.vendor.product_category}
                          </Badge>
                        </div>
                        {order.total_amount && (
                          <p className="mt-1 text-sm font-semibold text-accent">
                            R$ {order.total_amount.toFixed(2).replace(".", ",")}
                          </p>
                        )}
                        {order.message && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                            "{order.message}"
                          </p>
                        )}
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={statusConfig.variant} className="gap-1">
                          <StatusIcon className={`h-3 w-3 ${statusConfig.color}`} />
                          {statusConfig.label}
                        </Badge>
                        
                        {/* Payment Button for pending_payment orders */}
                        {isPendingPayment && (
                          <PaymentButton
                            orderId={order.id}
                            orderTotal={order.total_amount || 0}
                            vendorLatitude={order.vendor.latitude}
                            vendorLongitude={order.vendor.longitude}
                            clientLatitude={order.client_latitude}
                            clientLongitude={order.client_longitude}
                            onPaymentComplete={fetchOrders}
                          />
                        )}
                        
                        {isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => openChat(order.id, order.vendor.full_name)}
                          >
                            <MessageCircle className="h-3 w-3" />
                            Chat
                          </Button>
                        )}
                        {order.status === "completed" && !order.has_review && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="gap-1"
                            onClick={() => openReview(order.id, order.vendor.id, order.vendor.full_name)}
                          >
                            <Star className="h-3 w-3" />
                            Avaliar
                          </Button>
                        )}
                        {order.has_review && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            Avaliado
                          </span>
                        )}
                        {order.status === "completed" && (
                          <FavoriteButton
                            clientId={clientId}
                            vendorId={order.vendor.id}
                            vendorName={order.vendor.full_name}
                            size="sm"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Chat Sheet */}
      <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>Chat com {selectedVendorName}</SheetTitle>
          </SheetHeader>
          {selectedOrderId && (
            <div className="mt-4 h-[calc(100%-60px)]">
              <ChatWindow
                orderId={selectedOrderId}
                userType="client"
                otherPartyName={selectedVendorName}
                onClose={() => setIsChatOpen(false)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Review Dialog */}
      {selectedOrderId && selectedVendorId && (
        <ReviewDialog
          open={isReviewOpen}
          onOpenChange={setIsReviewOpen}
          orderId={selectedOrderId}
          clientId={clientId}
          vendorId={selectedVendorId}
          vendorName={selectedVendorName}
          onReviewSubmitted={fetchOrders}
        />
      )}
    </>
  );
}
