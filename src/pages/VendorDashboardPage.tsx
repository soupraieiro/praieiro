import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  MapPin,
  Phone,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  LayoutDashboard,
  ShoppingBag,
  Wallet,
  Settings,
  Navigation,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VendorOrdersList } from "@/components/VendorOrdersList";
import { VendorWallet } from "@/components/VendorWallet";
import { VendorBusinessIndicators } from "@/components/VendorBusinessIndicators";
import { VendorProductManager } from "@/components/VendorProductManager";
import { DayOffToggle } from "@/components/profile/DayOffToggle";
import { ProfileForm } from "@/components/ProfileForm";
import { DashboardShell, DashboardSection } from "@/components/layout/DashboardShell";

interface VendorData {
  id: string;
  full_name: string;
  whatsapp_number: string;
  product_category: string;
  product_description: string | null;
  status: string | null;
  latitude: number | null;
  longitude: number | null;
  location_updated_at: string | null;
}

const sections: DashboardSection[] = [
  { id: "overview", label: "Visão Geral", icon: LayoutDashboard },
  { id: "products", label: "Produtos & Estoque", icon: Package },
  { id: "orders", label: "Vendas & Pedidos", icon: ShoppingBag },
  { id: "finance", label: "Financeiro", icon: Wallet },
  { id: "settings", label: "Ponto de Venda", icon: Settings },
];

export default function VendorDashboardPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [vendorData, setVendorData] = useState<VendorData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [section, setSection] = useState("overview");

  useEffect(() => {
    const loadVendor = async () => {
      if (loading) return;
      if (!user) {
        navigate("/login-ambulante");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) {
        setIsLoadingData(false);
        return;
      }

      const { data: vendor } = await supabase
        .from("vendors")
        .select(
          "profile_id, whatsapp_number, product_category, product_description, status, location_updated_at"
        )
        .eq("profile_id", profile.id)
        .maybeSingle();

      if (vendor) {
        setVendorData({
          id: vendor.profile_id,
          full_name: profile.full_name,
          whatsapp_number: vendor.whatsapp_number,
          product_category: vendor.product_category,
          product_description: vendor.product_description,
          status: vendor.status,
          latitude: null,
          longitude: null,
          location_updated_at: vendor.location_updated_at,
        });
      }
      setIsLoadingData(false);
    };

    loadVendor();
  }, [user, loading, navigate]);

  const updateLocation = async () => {
    if (!vendorData) return;
    setIsUpdatingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { error } = await supabase.rpc("update_vendor_location", {
        p_profile_id: vendorData.id,
        p_latitude: position.coords.latitude,
        p_longitude: position.coords.longitude,
      });

      if (!error) {
        setVendorData({
          ...vendorData,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          location_updated_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error updating location:", error);
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const statusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return (
          <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
            <CheckCircle2 className="h-3.5 w-3.5" /> Barraca ativa
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3.5 w-3.5" /> Aguardando aprovação
          </Badge>
        );
      case "inactive":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3.5 w-3.5" /> Inativa
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading || isLoadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <DashboardShell
      title="Painel do Praieiro"
      subtitle={vendorData?.full_name ?? "Gestão da sua barraca"}
      roleLabel="Ambulante"
      sections={sections}
      active={section}
      onSectionChange={setSection}
      actions={
        <>
          <Button size="sm" onClick={updateLocation} disabled={isUpdatingLocation} className="gap-2">
            <Navigation className="h-4 w-4" />
            {isUpdatingLocation ? "Atualizando..." : "Estou na praia"}
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setSection("products")}>
            <Package className="h-4 w-4" /> Gerenciar produtos
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setSection("orders")}>
            <ShoppingBag className="h-4 w-4" /> Vendas de hoje
          </Button>
        </>
      }
    >
      {!vendorData ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" /> Cadastro de ambulante incompleto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Finalize o cadastro da sua barraca para liberar a gestão do ponto de venda.</p>
            <Button onClick={() => navigate("/login-ambulante")}>Completar cadastro</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {section === "overview" && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Status da barraca</CardTitle>
                  {statusBadge(vendorData.status)}
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  {vendorData.status === "pending" && (
                    <p>Seu cadastro está em análise. Você será notificado na aprovação.</p>
                  )}
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-primary" />
                    {vendorData.location_updated_at ? (
                      <span>
                        Localização atualizada em{" "}
                        {new Date(vendorData.location_updated_at).toLocaleString("pt-BR")}
                      </span>
                    ) : (
                      <span>Localização ainda não compartilhada</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <VendorBusinessIndicators />
            </div>
          )}

          {section === "products" && (
            <Card>
              <CardContent className="pt-6">
                <VendorProductManager vendorId={vendorData.id} />
              </CardContent>
            </Card>
          )}

          {section === "orders" && (
            <Card>
              <CardContent className="pt-6">
                {vendorData.status === "active" ? (
                  <VendorOrdersList vendorId={vendorData.id} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Os pedidos aparecem aqui quando sua barraca estiver ativa.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {section === "finance" && <VendorWallet />}

          {section === "settings" && (
            <div className="space-y-6">
              <DayOffToggle />

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Dados do ponto de venda</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-muted-foreground">Categoria</p>
                      <p className="font-medium">{vendorData.product_category}</p>
                      {vendorData.product_description && (
                        <p className="text-muted-foreground">{vendorData.product_description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-muted-foreground">WhatsApp</p>
                      <p className="font-medium">{vendorData.whatsapp_number}</p>
                    </div>
                  </div>
                  <Button
                    onClick={updateLocation}
                    disabled={isUpdatingLocation || vendorData.status !== "active"}
                    className="w-full"
                  >
                    {isUpdatingLocation ? "Atualizando..." : "Atualizar minha localização"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Meu perfil</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProfileForm />
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
}
