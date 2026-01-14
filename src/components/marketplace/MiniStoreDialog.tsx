import { useState, useEffect } from "react";
import { VendorShop, ShopProduct } from "@/hooks/useVendorShop";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePiuNotification } from "@/hooks/usePiuNotification";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Store, Star, ShoppingCart, Plus, Minus, 
  MapPin, Navigation, Loader2, CheckCircle 
} from "lucide-react";

interface CartItem {
  product: ShopProduct;
  quantity: number;
}

interface MiniStoreDialogProps {
  shop: VendorShop | null;
  open: boolean;
  onClose: () => void;
  userDistance?: number;
}

export function MiniStoreDialog({ shop, open, onClose, userDistance }: MiniStoreDialogProps) {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [purchasing, setPurchasing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { notifyPiu } = usePiuNotification();

  useEffect(() => {
    if (shop && open) {
      fetchProducts();
      setCart([]);
    }
  }, [shop, open]);

  const fetchProducts = async () => {
    if (!shop) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("shop_id", shop.id)
        .eq("is_available", true)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateCart = (product: ShopProduct, delta: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) {
          return prev.filter(item => item.product.id !== product.id);
        }
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: newQty }
            : item
        );
      } else if (delta > 0) {
        return [...prev, { product, quantity: delta }];
      }
      return prev;
    });
  };

  const getCartQuantity = (productId: string) => {
    return cart.find(item => item.product.id === productId)?.quantity || 0;
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const handlePurchase = async () => {
    if (!user || !shop || cart.length === 0) {
      toast({
        title: "Erro",
        description: "Faça login para comprar.",
        variant: "destructive",
      });
      return;
    }

    setPurchasing(true);
    try {
      // Get user profile
      // IDENTIDADE SOBERANA: profiles.id = auth.users.id
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Perfil não encontrado");

      // Check balance
      const { data: wallet } = await supabase
        .from("client_conchas")
        .select("balance")
        .eq("client_id", profile.id)
        .single();

      const balance = wallet?.balance || 0;
      if (balance < cartTotal) {
        toast({
          title: "Saldo insuficiente",
          description: `Você precisa de ${cartTotal.toFixed(2)} Conchas, mas tem ${balance.toFixed(2)}.`,
          variant: "destructive",
        });
        return;
      }

      // Deduct from buyer's balance
      const { error: deductError } = await supabase
        .from("client_conchas")
        .update({ balance: balance - cartTotal })
        .eq("client_id", profile.id);

      if (deductError) throw deductError;

      // Log transaction
      await supabase.from("concha_transactions").insert({
        client_id: profile.id,
        type: "purchase",
        amount: -cartTotal,
        description: `Compra em ${shop.shop_name}`,
      });

      // Log to ledger
      await supabase.rpc("log_ledger_event", {
        p_event_type: "marketplace_purchase",
        p_event_data: {
          shop_id: shop.id,
          buyer_id: profile.id,
          items: cart.map(item => ({
            product_id: item.product.id,
            name: item.product.name,
            quantity: item.quantity,
            price: item.product.price,
          })),
          total: cartTotal,
        },
        p_actor_id: profile.id,
        p_actor_type: "client"
      });

      // Dispara o "Piu" para o comprador
      notifyPiu({
        type: "purchase",
        amount: cartTotal,
        title: "🛒 Compra Confirmada!",
        description: `Você gastou ${cartTotal.toFixed(2)} 🐚 em ${shop.shop_name}`,
      });

      setCart([]);
      onClose();
    } catch (err: any) {
      console.error("Purchase error:", err);
      
      // Log error to diagnostics
      await supabase.from("ai_council_diagnostics").insert({
        problem_title: "Erro na compra do marketplace",
        problem_description: `Erro ao processar compra: ${err.message}`,
        severity: "high",
        sql_correction: null,
        lovable_prompt: `O usuário tentou comprar na loja ${shop?.shop_name} mas ocorreu o erro: ${err.message}. Verifique a função process_marketplace_purchase.`,
      });

      toast({
        title: "Erro na compra",
        description: err.message || "Não foi possível processar a compra.",
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  if (!shop) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 gap-0">
        {/* Header */}
        <div className="relative h-32 bg-gradient-to-r from-primary to-accent">
          {shop.banner_url && (
            <img
              src={shop.banner_url}
              alt={shop.shop_name}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          
          {userDistance !== undefined && (
            <Badge className="absolute top-3 right-3 bg-background/90 text-foreground">
              <Navigation className="h-3 w-3 mr-1" />
              {userDistance < 1 
                ? `${Math.round(userDistance * 1000)}m` 
                : `${userDistance.toFixed(1)}km`
              }
            </Badge>
          )}
        </div>

        <DialogHeader className="px-4 -mt-10 relative z-10">
          <div className="flex items-end gap-3">
            <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
              <AvatarImage src={shop.logo_url || shop.profile?.profile_photo_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {shop.shop_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="pb-1">
              <DialogTitle className="text-xl">{shop.shop_name}</DialogTitle>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Store className="h-3 w-3" />
                {shop.profile?.full_name}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-sm">{shop.rating.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">
                  ({shop.total_sales} vendas)
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Products */}
        <ScrollArea className="flex-1 px-4 py-4" style={{ maxHeight: "40vh" }}>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Store className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum produto disponível</p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map(product => {
                const qty = getCartQuantity(product.id);
                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                        <Store className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{product.name}</h4>
                      {product.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {product.description}
                        </p>
                      )}
                      <p className="text-sm font-bold text-primary mt-1">
                        🐚 {product.price.toFixed(2)}
                      </p>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-2">
                      {qty > 0 && (
                        <>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => updateCart(product, -1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-6 text-center font-medium">{qty}</span>
                        </>
                      )}
                      <Button
                        size="icon"
                        variant={qty > 0 ? "outline" : "default"}
                        className="h-8 w-8"
                        onClick={() => updateCart(product, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Cart Footer */}
        {cart.length > 0 && (
          <div className="border-t bg-muted/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} itens
                </p>
                <p className="text-lg font-bold">
                  🐚 {cartTotal.toFixed(2)} Conchas
                </p>
              </div>
              <Button
                size="lg"
                onClick={handlePurchase}
                disabled={purchasing}
                className="gap-2"
              >
                {purchasing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                Comprar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
