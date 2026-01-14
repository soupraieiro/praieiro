import { useEffect, useState } from "react";
import { MessageCircle, User } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { StarRating } from "./StarRating";

interface VendorRating {
  average_rating: number;
  total_reviews: number;
}

interface VendorCardProps {
  vendor: {
    id: string;
    full_name: string;
    product_category: string;
    product_description: string | null;
    profile_photo_url: string | null;
    whatsapp_number: string;
  };
  beachId?: string;
}

export function VendorCard({ vendor, beachId }: VendorCardProps) {
  const [rating, setRating] = useState<VendorRating | null>(null);

  useEffect(() => {
    const fetchRating = async () => {
      const { data } = await supabase
        .from("vendor_ratings")
        .select("*")
        .eq("vendor_id", vendor.id)
        .single();
      
      if (data) {
        setRating({
          average_rating: Number(data.average_rating),
          total_reviews: Number(data.total_reviews)
        });
      }
    };
    fetchRating();
  }, [vendor.id]);

  const whatsappMessage = encodeURIComponent(
    "Olá, te encontrei pelo Praieiro e estou na praia agora 🙂"
  );
  const whatsappUrl = `https://wa.me/${vendor.whatsapp_number.replace(/\D/g, "")}?text=${whatsappMessage}`;

  const handleWhatsAppClick = async () => {
    // Track the click
    try {
      await supabase.from("whatsapp_clicks").insert({
        vendor_id: vendor.id,
        beach_id: beachId || null,
      });

      // Track client interest in product category
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Get client profile_id
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
      console.error("Error tracking click:", error);
    }
    
    // Open WhatsApp
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
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

      {/* Conteúdo - apenas informações públicas */}
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

        {vendor.product_description && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-3">
            {vendor.product_description}
          </p>
        )}

        {/* Botão WhatsApp com tracking */}
        <Button
          onClick={handleWhatsAppClick}
          className="mt-4 w-full gap-2 whatsapp-gradient text-white hover:opacity-90 font-semibold rounded-full"
        >
          <MessageCircle className="h-5 w-5" fill="currentColor" />
          Chamar no WhatsApp
        </Button>
      </div>
    </div>
  );
}
