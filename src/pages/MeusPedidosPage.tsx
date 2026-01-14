import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { OrderHistory } from "@/components/OrderHistory";
import { ConchasBalance } from "@/components/ConchasBalance";
import { FavoriteVendors } from "@/components/FavoriteVendors";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag, ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MeusPedidosPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [clientId, setClientId] = useState<string | null>(null);
  const [isLoadingClient, setIsLoadingClient] = useState(true);

  useEffect(() => {
    const fetchClientId = async () => {
      if (!loading && user) {
        // CORRECT: profiles.id = auth.users.id (identidade soberana)
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        if (profile) {
          const { data: client } = await supabase
            .from("clients")
            .select("profile_id")
            .eq("profile_id", profile.id)
            .single();

          if (client) {
            setClientId(client.profile_id);
          }
        }
        setIsLoadingClient(false);
      } else if (!loading && !user) {
        navigate("/cadastro");
      }
    };

    fetchClientId();
  }, [user, loading, navigate]);

  if (loading || isLoadingClient) {
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
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/encontrar")}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3 flex-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <ShoppingBag className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary">Meus Pedidos</h1>
                <p className="text-sm text-muted-foreground">
                  Acompanhe seus pedidos e converse com ambulantes
                </p>
              </div>
            </div>
          </div>

          {clientId ? (
            <div className="space-y-6">
              {/* Saldo de Conchas */}
              <ConchasBalance clientId={clientId} />

              {/* Tabs para Pedidos, Favoritos e Sobre */}
              <Tabs defaultValue="pedidos" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
                  <TabsTrigger value="favoritos">Favoritos</TabsTrigger>
                  <TabsTrigger value="sobre">Sobre</TabsTrigger>
                </TabsList>

                <TabsContent value="pedidos" className="mt-4">
                  <div className="bg-card rounded-xl border shadow-sm p-6">
                    <OrderHistory clientId={clientId} />
                  </div>
                </TabsContent>

                <TabsContent value="favoritos" className="mt-4">
                  <div className="bg-card rounded-xl border shadow-sm p-6">
                    <FavoriteVendors clientId={clientId} />
                  </div>
                </TabsContent>

                <TabsContent value="sobre" className="mt-4">
                  <div className="bg-card rounded-xl border shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Info className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-lg">Sobre o Projeto</h3>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Conheça os planos e benefícios exclusivos do Praieiro
                    </p>
                    <Button 
                      onClick={() => navigate("/sobre")}
                      className="w-full"
                    >
                      Ver Planos e Benefícios
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Nenhum perfil de cliente encontrado.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
