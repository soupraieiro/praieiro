import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  Search,
  ShoppingBag,
  Heart,
  Wallet,
  User,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { UnifiedFeed } from "@/components/UnifiedFeed";
import { FavoriteVendors } from "@/components/FavoriteVendors";
import { OrderHistory } from "@/components/OrderHistory";
import { PraieiroWallet } from "@/components/PraieiroWallet";
import { ProfileForm } from "@/components/ProfileForm";
import { BeachWeatherCard } from "@/components/BeachWeatherCard";
import { DashboardShell, DashboardSection } from "@/components/layout/DashboardShell";

const sections: DashboardSection[] = [
  { id: "feed", label: "Feed", icon: Home },
  { id: "discover", label: "Descobrir", icon: Search },
  { id: "orders", label: "Meus Pedidos", icon: ShoppingBag },
  { id: "favorites", label: "Favoritos", icon: Heart },
  { id: "wallet", label: "Carteira", icon: Wallet },
  { id: "profile", label: "Perfil", icon: User },
];

export default function ClientDashboardPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [section, setSection] = useState("feed");
  const [query, setQuery] = useState("");

  const firstName = profile?.full_name?.split(" ")[0];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/encontrar${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  };

  return (
    <DashboardShell
      title={firstName ? `Olá, ${firstName}` : "Área do Cliente"}
      subtitle="Descubra praieiros perto de você"
      roleLabel="Cliente"
      sections={sections}
      active={section}
      onSectionChange={setSection}
      actions={
        <>
          <Button size="sm" className="gap-2" onClick={() => navigate("/encontrar")}>
            <MapPin className="h-4 w-4" /> Praieiros próximos
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => navigate("/marketplace")}>
            <Sparkles className="h-4 w-4" /> Marketplace
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setSection("orders")}>
            <ShoppingBag className="h-4 w-4" /> Pedidos em andamento
          </Button>
        </>
      }
    >
      {section === "feed" && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar praia, produto ou praieiro..."
                />
                <Button type="submit" className="gap-2">
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Buscar</span>
                </Button>
              </form>
            </CardContent>
          </Card>
          <UnifiedFeed />
        </div>
      )}

      {section === "discover" && (
        <div className="space-y-6">
          <BeachWeatherCard beachName="Praia da Barra" city="Salvador" />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Explorar</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline" className="justify-start gap-2" onClick={() => navigate("/encontrar")}>
                <MapPin className="h-4 w-4" /> Mapa de praieiros
              </Button>
              <Button variant="outline" className="justify-start gap-2" onClick={() => navigate("/ambulantes")}>
                <Search className="h-4 w-4" /> Vitrine de praieiros
              </Button>
              <Button variant="outline" className="justify-start gap-2" onClick={() => navigate("/marketplace")}>
                <Sparkles className="h-4 w-4" /> Marketplace
              </Button>
              <Button variant="outline" className="justify-start gap-2" onClick={() => setSection("favorites")}>
                <Heart className="h-4 w-4" /> Meus favoritos
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {section === "orders" && (
        <Card>
          <CardContent className="pt-6">
            {user ? <OrderHistory clientId={user.id} /> : null}
          </CardContent>
        </Card>
      )}

      {section === "favorites" && (
        <Card>
          <CardContent className="pt-6">
            {user ? <FavoriteVendors clientId={user.id} /> : null}
          </CardContent>
        </Card>
      )}

      {section === "wallet" && <PraieiroWallet />}

      {section === "profile" && (
        <Card>
          <CardContent className="pt-6">
            <ProfileForm />
          </CardContent>
        </Card>
      )}
    </DashboardShell>
  );
}
