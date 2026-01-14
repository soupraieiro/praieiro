import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { VendorHeroCard } from "@/components/marketplace/VendorHeroCard";
import { MiniStoreDialog } from "@/components/marketplace/MiniStoreDialog";
import { useVendorShop, VendorShop } from "@/hooks/useVendorShop";
import { useUserGeolocation } from "@/hooks/useUserGeolocation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  MapPin, Navigation, Search, Loader2, Store, Filter,
  AlertCircle, LocateFixed, RefreshCw
} from "lucide-react";
import heroBeach from "@/assets/hero-beach.jpg";

export default function MarketplacePage() {
  const { shops, fetchNearbyShops, loading: shopsLoading } = useVendorShop();
  const { location, loading: locationLoading, error: locationError, requestLocation } = useUserGeolocation();
  
  const [selectedShop, setSelectedShop] = useState<VendorShop | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [radiusKm, setRadiusKm] = useState(5);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch shops when location changes
  useEffect(() => {
    if (location) {
      fetchNearbyShops(location.latitude, location.longitude, radiusKm);
    }
  }, [location, radiusKm, fetchNearbyShops]);

  const handleShopClick = (shop: VendorShop) => {
    setSelectedShop(shop);
    setDialogOpen(true);
  };

  const filteredShops = shops.filter(shop =>
    shop.shop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shop.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shop.profile?.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative pt-20 pb-8 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBeach})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/60 to-background" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8 text-center">
          <Badge className="mb-4 bg-accent/90">
            <Store className="h-3 w-3 mr-1" />
            Marketplace Praieiro
          </Badge>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white drop-shadow-lg">
            Heróis da Praia
          </h1>
          <p className="mt-2 text-white/90 max-w-lg mx-auto">
            Encontre vendedores perto de você ordenados por distância
          </p>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" className="w-full h-auto">
            <path
              fill="hsl(var(--background))"
              d="M0,32L80,37.3C160,43,320,53,480,53.3C640,53,800,43,960,37.3C1120,32,1280,32,1360,32L1440,32L1440,60L1360,60C1280,60,1120,60,960,60C800,60,640,60,480,60C320,60,160,60,80,60L0,60Z"
            />
          </svg>
        </div>
      </section>

      <main className="container mx-auto px-4 py-6">
        {/* Location Status */}
        <div className="mb-6 p-4 rounded-xl border bg-card">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${location ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"}`}>
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                {location ? (
                  <>
                    <p className="font-medium text-foreground">Localização ativa</p>
                    <p className="text-xs text-muted-foreground">
                      Precisão: {location.accuracy.toFixed(0)}m
                    </p>
                  </>
                ) : locationLoading ? (
                  <p className="text-muted-foreground">Obtendo localização...</p>
                ) : (
                  <p className="text-muted-foreground">Localização não disponível</p>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={requestLocation}
              disabled={locationLoading}
              className="gap-2"
            >
              {locationLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LocateFixed className="h-4 w-4" />
              )}
              {location ? "Atualizar" : "Permitir Localização"}
            </Button>
          </div>

          {locationError && (
            <div className="mt-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {locationError}
            </div>
          )}
        </div>

        {/* Search & Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar vendedor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
            {location && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchNearbyShops(location.latitude, location.longitude, radiusKm)}
                disabled={shopsLoading}
              >
                {shopsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Raio de busca</span>
                  <Badge variant="secondary">{radiusKm} km</Badge>
                </div>
                <Slider
                  value={[radiusKm]}
                  onValueChange={([value]) => setRadiusKm(value)}
                  min={1}
                  max={20}
                  step={1}
                />
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {!location ? (
          <div className="text-center py-12">
            <Navigation className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Ative sua localização</h3>
            <p className="text-muted-foreground mb-4">
              Para ver os vendedores mais próximos, precisamos da sua localização
            </p>
            <Button onClick={requestLocation} className="gap-2">
              <MapPin className="h-4 w-4" />
              Permitir Localização
            </Button>
          </div>
        ) : shopsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="text-center py-12">
            <Store className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Nenhum vendedor encontrado</h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? "Tente outro termo de busca"
                : `Não há vendedores abertos em um raio de ${radiusKm}km`
              }
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredShops.length} vendedor{filteredShops.length !== 1 && "es"} encontrado{filteredShops.length !== 1 && "s"}
              </p>
              <Badge variant="outline" className="gap-1">
                <Navigation className="h-3 w-3" />
                Ordenado por distância
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredShops.map((shop) => (
                <VendorHeroCard
                  key={shop.id}
                  shop={shop}
                  onClick={handleShopClick}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Mini Store Dialog */}
      <MiniStoreDialog
        shop={selectedShop}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedShop(null);
        }}
        userDistance={selectedShop?.distance}
      />
    </div>
  );
}
