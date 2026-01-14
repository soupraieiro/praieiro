import { useEffect, useState } from "react";
import { User, Store } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { StarRating } from "./StarRating";

interface VendorRating {
  average_rating: number;
  total_reviews: number;
}

interface VendorCardNewProps {
  vendor: {
    id: string;
    full_name: string;
    product_category: string;
    product_description: string | null;
    profile_photo_url: string | null;
  };
  beachId?: string;
  onOpenStore: (vendorId: string) => void;
}

export function VendorCardNew({ vendor, beachId, onOpenStore }: VendorCardNewProps) {
  const [rating, setRating] = useState<VendorRating | null>(null);
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch rating
      const { data: ratingData } = await supabase
        .from("vendor_ratings")
        .select("*")
        .eq("vendor_id", vendor.id)
        .single();
      
      if (ratingData) {
        setRating({
          average_rating: Number(ratingData.average_rating),
          total_reviews: Number(ratingData.total_reviews)
        });
      }

      // Fetch product count
      const { count } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("vendor_id", vendor.id)
        .eq("is_available", true);

      setProductCount(count || 0);
    };

    fetchData();
  }, [vendor.id]);

  const handleClick = async () => {
    // Track interest
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // CORRECT: profiles.id = auth.users.id (identidade soberana)
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          await supabase.from("client_product_interests").insert({
            client_id: profile.id,
            vendor_id: vendor.id,
            product_category: vendor.product_category,
            beach_id: beachId || null,
          });
        }
      }
    } catch (error) {
      console.error("Error tracking interest:", error);
    }

    onOpenStore(vendor.id);
  };

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-accent/30 bg-white shadow-lg transition-all hover:shadow-xl hover:border-accent/50">
      {/* Foto */}
      <div className="aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-secondary to-muted">
        {vendor.profile_photo_url ? (
          <img
            src={vendor.profile_photo_url}
            alt={vendor.full_name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20">
              <User className="h-10 w-10 text-primary" />
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-primary">{vendor.full_name}</h3>
        
        {rating && (
          <div className="mt-1">
            <StarRating 
              rating={rating.average_rating} 
              totalReviews={rating.total_reviews}
              size="sm"
            />
          </div>
        )}
        
        <span className="mt-2 inline-block rounded-full bg-accent px-3 py-1 text-sm font-semibold text-white">
          {vendor.product_category}
        </span>

        {productCount > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            {productCount} {productCount === 1 ? "produto disponível" : "produtos disponíveis"}
          </p>
        )}

        {vendor.product_description && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {vendor.product_description}
          </p>
        )}

        {/* Botão Ver Loja */}
        <Button
          onClick={handleClick}
          className="mt-4 w-full gap-2 bg-accent hover:bg-accent/90 text-white font-semibold rounded-full"
        >
          <Store className="h-5 w-5" />
          Ver Produtos
        </Button>
      </div>
    </div>
  );
}
