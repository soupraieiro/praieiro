import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Star, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface FavoriteVendor {
  id: string;
  vendor_id: string;
  vendor: {
    id: string;
    full_name: string;
    product_category: string;
    product_description: string | null;
    profile_photo_url: string | null;
    whatsapp_number: string;
  };
  rating?: {
    average_rating: number | null;
    total_reviews: number | null;
  };
}

interface FavoriteVendorsProps {
  clientId: string;
}

export function FavoriteVendors({ clientId }: FavoriteVendorsProps) {
  const [favorites, setFavorites] = useState<FavoriteVendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, [clientId]);

  const fetchFavorites = async () => {
    const { data } = await supabase
      .from("client_favorites")
      .select(`
        id,
        vendor_id,
        vendor:vendors (
          id,
          full_name,
          product_category,
          product_description,
          profile_photo_url,
          whatsapp_number
        )
      `)
      .eq("client_id", clientId);

    if (data) {
      // Fetch ratings for each vendor
      const vendorIds = data.map((f: any) => f.vendor_id);
      const { data: ratingsData } = await supabase
        .from("vendor_ratings")
        .select("vendor_id, average_rating, total_reviews")
        .in("vendor_id", vendorIds);

      const ratingsMap = new Map(
        ratingsData?.map((r) => [r.vendor_id, r]) || []
      );

      const formatted = data.map((f: any) => ({
        ...f,
        rating: ratingsMap.get(f.vendor_id),
      }));

      setFavorites(formatted);
    }
    setLoading(false);
  };

  const removeFavorite = async (favoriteId: string) => {
    const { error } = await supabase
      .from("client_favorites")
      .delete()
      .eq("id", favoriteId);

    if (error) {
      toast.error("Erro ao remover favorito");
    } else {
      toast.success("Ambulante removido dos favoritos");
      fetchFavorites();
    }
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Olá ${name}! Vi seu perfil no Praieiro e gostaria de fazer um pedido.`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Heart className="h-5 w-5 text-red-500 fill-red-500" />
        <h3 className="font-semibold text-lg">Ambulantes Favoritos</h3>
      </div>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center rounded-lg bg-muted/30">
          <Heart className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">
            Você ainda não tem favoritos
          </p>
          <p className="text-sm text-muted-foreground/70">
            Favorite ambulantes após um atendimento para encontrá-los mais facilmente
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {favorites.map((favorite) => (
              <div
                key={favorite.id}
                className="rounded-lg border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  {favorite.vendor.profile_photo_url ? (
                    <img
                      src={favorite.vendor.profile_photo_url}
                      alt={favorite.vendor.full_name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">
                        {favorite.vendor.full_name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">
                        {favorite.vendor.full_name}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {favorite.vendor.product_category}
                      </Badge>
                    </div>
                    {favorite.rating && favorite.rating.average_rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">
                          {Number(favorite.rating.average_rating).toFixed(1)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({favorite.rating.total_reviews} avaliações)
                        </span>
                      </div>
                    )}
                    {favorite.vendor.product_description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {favorite.vendor.product_description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="gap-1"
                      onClick={() =>
                        openWhatsApp(
                          favorite.vendor.whatsapp_number,
                          favorite.vendor.full_name
                        )
                      }
                    >
                      <Phone className="h-3 w-3" />
                      Chamar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-red-500 hover:text-red-600"
                      onClick={() => removeFavorite(favorite.id)}
                    >
                      <Heart className="h-3 w-3 fill-current" />
                      Remover
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}