import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Phone, Package, LogOut, Clock, CheckCircle2, XCircle } from "lucide-react";
import { VendorOrdersList } from "@/components/VendorOrdersList";
import { VendorWallet } from "@/components/VendorWallet";
import { VendorBusinessIndicators } from "@/components/VendorBusinessIndicators";
import { VendorProductManager } from "@/components/VendorProductManager";
import { NotificationBell } from "@/components/NotificationBell";
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

export default function VendorDashboardPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [vendorData, setVendorData] = useState<VendorData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

  useEffect(() => {
    const checkVendorAccess = async () => {
      if (!loading) {
        if (!user) {
          navigate("/login-ambulante");
          return;
        }

        // Check if user is a vendor using governance_roles (constitutional)
        const { data: roles } = await (supabase as any)
          .from("governance_roles")
          .select("role")
          .eq("profile_id", user.id)
          .eq("role", "vendor");

        if (!roles || roles.length === 0) {
          navigate("/login-ambulante");
          return;
        }

        // CORRECT: profiles.id = auth.users.id (identidade soberana)
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("id", user.id)
          .single();

        if (!profile) {
          setIsLoadingData(false);
          return;
        }

        // Fetch vendor data
        const { data: vendor } = await supabase
          .from("vendors")
          .select("profile_id, whatsapp_number, product_category, product_description, status, location, location_updated_at")
          .eq("profile_id", profile.id)
          .single();

        if (vendor) {
          // Parse location to get lat/lng
          let latitude: number | null = null;
          let longitude: number | null = null;
          
          setVendorData({
            id: vendor.profile_id,
            full_name: profile.full_name,
            whatsapp_number: vendor.whatsapp_number,
            product_category: vendor.product_category,
            product_description: vendor.product_description,
            status: vendor.status,
            latitude,
            longitude,
            location_updated_at: vendor.location_updated_at
          });
        }
        setIsLoadingData(false);
      }
    };

    checkVendorAccess();
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/ambulantes");
  };

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

      // Use RPC function to update location
      const { error } = await supabase.rpc('update_vendor_location', {
        p_profile_id: vendorData.id,
        p_latitude: position.coords.latitude,
        p_longitude: position.coords.longitude
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

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Ativo
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm font-medium">
            <Clock className="h-4 w-4" />
            Aguardando aprovação
          </span>
        );
      case "inactive":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm font-medium">
            <XCircle className="h-4 w-4" />
            Inativo
          </span>
        );
      default:
        return null;
    }
  };

  if (loading || isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-primary">Painel do Herói da Areia</h1>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button variant="ghost" onClick={handleSignOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>

          {vendorData && (
            <div className="space-y-6">
              {/* Indicadores de Gestão */}
              <VendorBusinessIndicators />

              {/* Carteira Digital */}
              <VendorWallet />

              {/* Catálogo de Produtos */}
              <div className="bg-card rounded-xl p-6 border shadow-sm">
                <VendorProductManager vendorId={vendorData.id} />
              </div>

              {/* Status Card */}
              <div className="bg-card rounded-xl p-6 border shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Status da conta</h2>
                  {getStatusBadge(vendorData.status)}
                </div>
                {vendorData.status === "pending" && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Seu cadastro está em análise. Você receberá uma notificação quando for aprovado.
                  </p>
                )}
              </div>

              {/* Profile Card */}
              <div className="bg-card rounded-xl p-6 border shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Seus dados</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Produtos</p>
                      <p className="font-medium">{vendorData.product_category}</p>
                      {vendorData.product_description && (
                        <p className="text-sm text-muted-foreground">{vendorData.product_description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">WhatsApp</p>
                      <p className="font-medium">{vendorData.whatsapp_number}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Card */}
              <div className="bg-card rounded-xl p-6 border shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Localização</h2>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    {vendorData.latitude && vendorData.longitude ? (
                      <>
                        <p className="font-medium">Localização compartilhada</p>
                        <p className="text-sm text-muted-foreground">
                          Última atualização: {vendorData.location_updated_at 
                            ? new Date(vendorData.location_updated_at).toLocaleString("pt-BR")
                            : "N/A"}
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">Localização não compartilhada</p>
                    )}
                  </div>
                </div>

                <Button
                  onClick={updateLocation}
                  disabled={isUpdatingLocation || vendorData.status !== "active"}
                  className="w-full bg-accent hover:bg-accent/90"
                >
                  {isUpdatingLocation ? "Atualizando..." : "Atualizar minha localização"}
                </Button>

                {vendorData.status !== "active" && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Você poderá compartilhar sua localização após a aprovação do cadastro.
                  </p>
                )}
              </div>

              {/* Orders Card */}
              {vendorData.status === "active" && (
                <div className="bg-card rounded-xl p-6 border shadow-sm">
                  <VendorOrdersList vendorId={vendorData.id} />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
