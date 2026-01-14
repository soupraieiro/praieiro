import { VendorShop } from "@/hooks/useVendorShop";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Star, Store, Navigation } from "lucide-react";

interface VendorHeroCardProps {
  shop: VendorShop;
  onClick: (shop: VendorShop) => void;
}

export function VendorHeroCard({ shop, onClick }: VendorHeroCardProps) {
  const formatDistance = (km: number | undefined) => {
    if (!km) return "Distância desconhecida";
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  const getRatingStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-3 w-3 ${i < fullStars ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
        />
      );
    }
    return stars;
  };

  return (
    <Card
      className="overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 border-border/50"
      onClick={() => onClick(shop)}
    >
      {/* Banner/Cover */}
      <div className="relative h-24 bg-gradient-to-r from-primary to-accent">
        {shop.banner_url && (
          <img
            src={shop.banner_url}
            alt={shop.shop_name}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Distance Badge */}
        <Badge className="absolute top-2 right-2 bg-background/90 text-foreground gap-1">
          <Navigation className="h-3 w-3" />
          {formatDistance(shop.distance)}
        </Badge>
        
        {/* Status Badge */}
        {shop.is_open && (
          <Badge className="absolute top-2 left-2 bg-green-500 text-white">
            Aberto
          </Badge>
        )}
      </div>

      <CardContent className="p-4 -mt-8 relative">
        {/* Avatar */}
        <Avatar className="h-16 w-16 border-4 border-background shadow-lg">
          <AvatarImage src={shop.logo_url || shop.profile?.profile_photo_url || undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground text-lg">
            {shop.shop_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="mt-2">
          <h3 className="font-bold text-foreground text-lg truncate">
            {shop.shop_name}
          </h3>
          
          {shop.profile?.full_name && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Store className="h-3 w-3" />
              {shop.profile.full_name}
            </p>
          )}

          {/* Rating */}
          <div className="flex items-center gap-1 mt-2">
            {getRatingStars(shop.rating)}
            <span className="text-xs text-muted-foreground ml-1">
              ({shop.total_sales} vendas)
            </span>
          </div>

          {/* Description */}
          {shop.description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {shop.description}
            </p>
          )}

          {/* Location hint */}
          {shop.latitude && shop.longitude && (
            <div className="flex items-center gap-1 mt-2 text-xs text-accent">
              <MapPin className="h-3 w-3" />
              <span>Clique para ver produtos</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
