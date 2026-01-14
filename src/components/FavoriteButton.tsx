import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FavoriteButtonProps {
  clientId: string;
  vendorId: string;
  vendorName: string;
  size?: "sm" | "default" | "lg";
}

export function FavoriteButton({
  clientId,
  vendorId,
  vendorName,
  size = "default",
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkIfFavorite();
  }, [clientId, vendorId]);

  const checkIfFavorite = async () => {
    const { data } = await supabase
      .from("client_favorites")
      .select("id")
      .eq("client_id", clientId)
      .eq("vendor_id", vendorId)
      .single();

    setIsFavorite(!!data);
    setLoading(false);
  };

  const toggleFavorite = async () => {
    setLoading(true);

    if (isFavorite) {
      const { error } = await supabase
        .from("client_favorites")
        .delete()
        .eq("client_id", clientId)
        .eq("vendor_id", vendorId);

      if (error) {
        toast.error("Erro ao remover favorito");
      } else {
        setIsFavorite(false);
        toast.success(`${vendorName} removido dos favoritos`);
      }
    } else {
      const { error } = await supabase.from("client_favorites").insert({
        client_id: clientId,
        vendor_id: vendorId,
      });

      if (error) {
        toast.error("Erro ao adicionar favorito");
      } else {
        setIsFavorite(true);
        toast.success(`${vendorName} adicionado aos favoritos!`);
      }
    }

    setLoading(false);
  };

  return (
    <Button
      size={size}
      variant={isFavorite ? "default" : "outline"}
      className={`gap-1 ${isFavorite ? "bg-red-500 hover:bg-red-600 text-white" : ""}`}
      onClick={toggleFavorite}
      disabled={loading}
    >
      <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
      {isFavorite ? "Favoritado" : "Favoritar"}
    </Button>
  );
}