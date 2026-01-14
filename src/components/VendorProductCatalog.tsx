import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Package, Plus, Minus, ShoppingCart, Loader2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

interface VendorProductCatalogProps {
  vendorId: string;
  onCartChange: (items: CartItem[]) => void;
}

export function VendorProductCatalog({ vendorId, onCartChange }: VendorProductCatalogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, description, price, image_url")
        .eq("vendor_id", vendorId)
        .eq("is_available", true)
        .order("name");

      if (!error && data) {
        setProducts(data);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [vendorId]);

  const updateCart = (product: Product, quantity: number) => {
    const newCart = new Map(cart);
    
    if (quantity <= 0) {
      newCart.delete(product.id);
    } else {
      newCart.set(product.id, { product, quantity });
    }
    
    setCart(newCart);
    onCartChange(Array.from(newCart.values()));
  };

  const getQuantity = (productId: string) => {
    return cart.get(productId)?.quantity || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>Este vendedor ainda não cadastrou produtos</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {products.map((product) => {
          const quantity = getQuantity(product.id);
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
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="font-medium">{product.name}</p>
                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {product.description}
                  </p>
                )}
                <p className="text-sm font-semibold text-accent">
                  R$ {product.price.toFixed(2).replace(".", ",")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {quantity > 0 ? (
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => updateCart(product, quantity - 1)}
                      className="h-8 w-8"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">{quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => updateCart(product, quantity + 1)}
                      className="h-8 w-8"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateCart(product, 1)}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface CartSummaryProps {
  items: CartItem[];
  onCheckout: () => void;
  isCheckingOut?: boolean;
}

export function CartSummary({ items, onCheckout, isCheckingOut }: CartSummaryProps) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4 shadow-lg z-40">
      <div className="container mx-auto max-w-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <span className="absolute -top-2 -right-2 bg-accent text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {totalItems}
            </span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{totalItems} {totalItems === 1 ? "item" : "itens"}</p>
            <p className="font-bold text-lg">R$ {totalPrice.toFixed(2).replace(".", ",")}</p>
          </div>
        </div>
        <Button
          onClick={onCheckout}
          disabled={isCheckingOut}
          className="bg-accent hover:bg-accent/90 px-6"
        >
          {isCheckingOut ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Fazer Pedido
        </Button>
      </div>
    </div>
  );
}
