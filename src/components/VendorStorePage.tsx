import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { VendorProductCatalog, CartItem, CartSummary } from "./VendorProductCatalog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MapPin, Loader2, User, CreditCard, AlertCircle } from "lucide-react";
import { StarRating } from "./StarRating";
import { toast } from "sonner";
import { validateOrderMessage } from "@/lib/validation";

interface VendorData {
  id: string;
  full_name: string;
  product_category: string;
  product_description: string | null;
  profile_photo_url: string | null;
}

interface VendorRating {
  average_rating: number;
  total_reviews: number;
}

interface VendorStorePageProps {
  vendorId: string;
  onClose: () => void;
}

export function VendorStorePage({ vendorId, onClose }: VendorStorePageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [rating, setRating] = useState<VendorRating | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [message, setMessage] = useState("");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchVendor = async () => {
      // Query vendor with profile data (respecting RLS)
      const { data } = await supabase
        .from("vendors")
        .select(`
          profile_id,
          product_category,
          product_description,
          profiles!inner(full_name, profile_photo_url)
        `)
        .eq("profile_id", vendorId)
        .eq("status", "active")
        .single();

      if (data) {
        setVendor({
          id: data.profile_id || "",
          full_name: (data.profiles as any)?.full_name || "",
          product_category: data.product_category || "",
          product_description: data.product_description,
          profile_photo_url: (data.profiles as any)?.profile_photo_url
        });
      }

      // Fetch rating
      const { data: ratingData } = await supabase
        .from("vendor_ratings")
        .select("*")
        .eq("vendor_id", vendorId)
        .single();

      if (ratingData) {
        setRating({
          average_rating: Number(ratingData.average_rating),
          total_reviews: Number(ratingData.total_reviews),
        });
      }

      setLoading(false);
    };

    fetchVendor();
  }, [vendorId]);

  const getLocation = async () => {
    setIsGettingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      toast.success("Localização capturada!");
    } catch (error) {
      console.error("Error getting location:", error);
      toast.error("Não foi possível obter sua localização");
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleCheckout = () => {
    if (!user) {
      toast.error("Você precisa estar logado para fazer pedidos");
      navigate("/auth");
      return;
    }
    setShowCheckoutDialog(true);
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  const handleSubmitOrder = async () => {
    if (!user || !vendor) return;

    // Validate message
    const messageValidation = validateOrderMessage(message);
    if (!messageValidation.isValid) {
      toast.error(messageValidation.error);
      return;
    }

    setIsSubmitting(true);
    try {
      // CORRECT: profiles.id = auth.users.id (identidade soberana)
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!profile) {
        toast.error("Perfil não encontrado");
        return;
      }

      // Get client ID via profile_id
      const { data: clientData } = await supabase
        .from("clients")
        .select("profile_id")
        .eq("profile_id", profile.id)
        .maybeSingle();

      if (!clientData) {
        toast.error("Perfil de cliente não encontrado");
        return;
      }

      const totalAmount = calculateTotal();

      // Create order (without location - will be revealed after payment)
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          client_id: clientData.profile_id,
          vendor_id: vendor.id,
          message: messageValidation.sanitized,
          status: "pending_payment",
          payment_status: "pending",
          total_amount: totalAmount,
          // Location stored but not shared yet
          client_latitude: location?.latitude,
          client_longitude: location?.longitude,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: item.product.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast.success("Pedido criado! Aguardando pagamento...");
      setShowCheckoutDialog(false);
      setCartItems([]);
      setMessage("");
      setLocation(null);
      
      // Navigate to orders page for payment
      navigate(`/meus-pedidos?order=${order.id}`);
      onClose();
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Erro ao criar pedido");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Vendedor não encontrado</p>
        <Button onClick={onClose} className="mt-4">Voltar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <div className="container mx-auto max-w-2xl flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-lg">{vendor.full_name}</h1>
            <p className="text-sm opacity-90">{vendor.product_category}</p>
          </div>
        </div>
      </div>

      {/* Vendor Info */}
      <div className="container mx-auto max-w-2xl p-4">
        <div className="flex items-center gap-4 mb-6">
          {vendor.profile_photo_url ? (
            <img
              src={vendor.profile_photo_url}
              alt={vendor.full_name}
              className="w-20 h-20 rounded-full object-cover border-2 border-accent"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1">
            <h2 className="font-bold text-xl">{vendor.full_name}</h2>
            <span className="inline-block mt-1 px-3 py-1 rounded-full bg-accent text-white text-sm font-medium">
              {vendor.product_category}
            </span>
            {rating && (
              <div className="mt-2">
                <StarRating
                  rating={rating.average_rating}
                  totalReviews={rating.total_reviews}
                  size="sm"
                />
              </div>
            )}
          </div>
        </div>

        {vendor.product_description && (
          <p className="text-muted-foreground mb-6">{vendor.product_description}</p>
        )}

        <h3 className="font-semibold text-lg mb-4">Produtos</h3>
        <VendorProductCatalog vendorId={vendorId} onCartChange={setCartItems} />
      </div>

      {/* Cart Summary */}
      <CartSummary
        items={cartItems}
        onCheckout={handleCheckout}
        isCheckingOut={isSubmitting}
      />

      {/* Checkout Dialog */}
      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar Pedido</DialogTitle>
            <DialogDescription>
              Confirme seu pedido para {vendor.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Order Summary */}
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <h4 className="font-medium">Resumo do pedido</h4>
              {cartItems.map((item) => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.product.name}</span>
                  <span>R$ {(item.product.price * item.quantity).toFixed(2).replace(".", ",")}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-accent">R$ {calculateTotal().toFixed(2).replace(".", ",")}</span>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sua localização</label>
              {location ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">Localização salva (será compartilhada após pagamento)</span>
                </div>
              ) : (
                <Button
                  onClick={getLocation}
                  disabled={isGettingLocation}
                  variant="outline"
                  className="w-full"
                >
                  {isGettingLocation ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4 mr-2" />
                  )}
                  {isGettingLocation ? "Obtendo localização..." : "Compartilhar minha localização"}
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Sua localização só será compartilhada com o vendedor após o pagamento.
              </p>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Mensagem (opcional)</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                placeholder="Ex: Estou perto do quiosque azul..."
                rows={2}
                maxLength={500}
              />
            </div>

            {/* Payment Info */}
            <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg">
              <CreditCard className="h-4 w-4" />
              <span className="text-sm">Você será redirecionado para pagamento seguro</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCheckoutDialog(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
              className="flex-1 bg-accent hover:bg-accent/90"
            >
              {isSubmitting ? "Processando..." : "Confirmar Pedido"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
