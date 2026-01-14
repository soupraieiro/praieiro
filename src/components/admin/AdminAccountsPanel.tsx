import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  User, 
  Store,
  ExternalLink,
  Eye,
  UserCog,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Settings
} from "lucide-react";

interface AdminProfile {
  hasVendor: boolean;
  hasClient: boolean;
  vendor?: {
    id: string;
    full_name: string;
    product_category: string;
    whatsapp_number: string;
    status: string;
  };
  client?: {
    id: string;
    name: string;
    email: string;
  };
}

export function AdminAccountsPanel() {
  const [profile, setProfile] = useState<AdminProfile>({ hasVendor: false, hasClient: false });
  const [loading, setLoading] = useState(true);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    vendor: {
      full_name: "Admin Praieiro",
      product_category: "bebidas",
      whatsapp_number: "71999999999"
    },
    client: {
      name: "Admin Praieiro",
      email: ""
    }
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Set email from session
      setFormData(prev => ({
        ...prev,
        client: { ...prev.client, email: session.user.email || "" }
      }));

      // IDENTIDADE SOBERANA: profiles.id = auth.users.id
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", session.user.id)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      // Check if admin has vendor profile
      const { data: vendor } = await supabase
        .from("vendors")
        .select("profile_id, product_category, whatsapp_number, status")
        .eq("profile_id", profile.id)
        .single();

      // Check if admin has client profile
      const { data: client } = await supabase
        .from("clients")
        .select("profile_id")
        .eq("profile_id", profile.id)
        .single();

      setProfile({
        hasVendor: !!vendor,
        hasClient: !!client,
        vendor: vendor ? {
          id: vendor.profile_id,
          full_name: profile.full_name,
          product_category: vendor.product_category,
          whatsapp_number: vendor.whatsapp_number,
          status: vendor.status || "pending"
        } : undefined,
        client: client ? {
          id: client.profile_id,
          name: profile.full_name,
          email: profile.email
        } : undefined
      });
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupAdminProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão não encontrada");
        return;
      }

      // IDENTIDADE SOBERANA: profiles.id = auth.users.id
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", session.user.id)
        .single();

      if (!userProfile) {
        toast.error("Perfil não encontrado");
        return;
      }

      // Create vendor profile if not exists
      if (!profile.hasVendor) {
        const { error: vendorError } = await supabase
          .from("vendors")
          .insert({
            profile_id: userProfile.id,
            product_category: formData.vendor.product_category,
            whatsapp_number: formData.vendor.whatsapp_number,
            status: "active"
          });

        if (vendorError) throw vendorError;

        // Add vendor role
        await supabase
          .from("user_roles")
          .upsert({
            user_id: session.user.id,
            role: "vendor"
          }, { onConflict: "user_id,role" });
      }

      // Create client profile if not exists
      if (!profile.hasClient) {
        const { error: clientError } = await supabase
          .from("clients")
          .insert({
            profile_id: userProfile.id,
            accepted_terms: true,
            accepted_terms_at: new Date().toISOString()
          });

        if (clientError) throw clientError;
      }

      toast.success("Perfil admin configurado com sucesso!");
      setSetupDialogOpen(false);
      loadProfile();
    } catch (error: any) {
      console.error("Error setting up profile:", error);
      toast.error(error.message || "Erro ao configurar perfil");
    }
  };

  const updateVendorProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // IDENTIDADE SOBERANA: profiles.id = auth.users.id
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", session.user.id)
        .single();

      if (!userProfile) return;

      const { error } = await supabase
        .from("vendors")
        .update({
          product_category: formData.vendor.product_category,
          whatsapp_number: formData.vendor.whatsapp_number
        })
        .eq("profile_id", userProfile.id);

      if (error) throw error;
      toast.success("Perfil de vendedor atualizado!");
      loadProfile();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar");
    }
  };

  const updateClientProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // IDENTIDADE SOBERANA: profiles.id = auth.users.id
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.client.name,
          email: formData.client.email
        })
        .eq("id", session.user.id);

      if (error) throw error;
      toast.success("Perfil de cliente atualizado!");
      loadProfile();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar");
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader><div className="h-5 bg-muted rounded w-1/3" /></CardHeader>
        <CardContent><div className="h-48 bg-muted rounded" /></CardContent>
      </Card>
    );
  }

  const isFullyConfigured = profile.hasVendor && profile.hasClient;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="h-6 w-6 text-primary" />
            Perfil Admin Unificado
          </h2>
          <p className="text-muted-foreground">
            Com uma única conta, atue como vendedor E cliente
          </p>
        </div>
        {!isFullyConfigured && (
          <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Settings className="h-4 w-4 mr-2" />
                Configurar Perfil
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Configurar Perfil Admin Unificado</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm">
                    Seu perfil permitirá atuar como <strong>vendedor</strong> (receber pedidos e pagamentos) 
                    e como <strong>cliente</strong> (fazer pedidos e pagar). Usuários não saberão que você é administrador.
                  </p>
                </div>

                {!profile.hasVendor && (
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Store className="h-4 w-4 text-primary" />
                      Dados para atuar como Vendedor
                    </h4>
                    <div className="grid gap-3">
                      <div>
                        <Label>Nome de exibição</Label>
                        <Input
                          value={formData.vendor.full_name}
                          onChange={(e) => setFormData({
                            ...formData,
                            vendor: { ...formData.vendor, full_name: e.target.value }
                          })}
                          placeholder="Nome que clientes verão"
                        />
                      </div>
                      <div>
                        <Label>Categoria</Label>
                        <Select 
                          value={formData.vendor.product_category} 
                          onValueChange={(v) => setFormData({
                            ...formData,
                            vendor: { ...formData.vendor, product_category: v }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bebidas">Bebidas</SelectItem>
                            <SelectItem value="comidas">Comidas</SelectItem>
                            <SelectItem value="artesanato">Artesanato</SelectItem>
                            <SelectItem value="servicos">Serviços</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>WhatsApp</Label>
                        <Input
                          value={formData.vendor.whatsapp_number}
                          onChange={(e) => setFormData({
                            ...formData,
                            vendor: { ...formData.vendor, whatsapp_number: e.target.value }
                          })}
                          placeholder="71999999999"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {!profile.hasClient && (
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-500" />
                      Dados para atuar como Cliente
                    </h4>
                    <div className="grid gap-3">
                      <div>
                        <Label>Nome</Label>
                        <Input
                          value={formData.client.name}
                          onChange={(e) => setFormData({
                            ...formData,
                            client: { ...formData.client, name: e.target.value }
                          })}
                          placeholder="Nome que vendedores verão"
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={formData.client.email}
                          onChange={(e) => setFormData({
                            ...formData,
                            client: { ...formData.client, email: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    <span>Os usuários não saberão que você é administrador</span>
                  </div>
                </div>

                <Button className="w-full" onClick={setupAdminProfile}>
                  Configurar Perfil Unificado
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Vendor Profile */}
        <Card className={profile.hasVendor ? "border-green-500/50" : "border-orange-500/50"}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Perfil Vendedor</CardTitle>
              </div>
              <Badge variant={profile.hasVendor ? "default" : "secondary"}>
                {profile.hasVendor ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> Ativo</>
                ) : (
                  <><AlertCircle className="h-3 w-3 mr-1" /> Não configurado</>
                )}
              </Badge>
            </div>
            {profile.vendor && (
              <CardDescription>
                {profile.vendor.full_name} • {profile.vendor.product_category}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {profile.hasVendor ? (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  <p><strong>WhatsApp:</strong> {profile.vendor?.whatsapp_number}</p>
                  <p><strong>Status:</strong> {profile.vendor?.status}</p>
                </div>
                <div className="flex gap-2">
                  <a href="/painel-ambulante">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Acessar Painel
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Configure para receber pedidos e pagamentos de clientes
              </p>
            )}
          </CardContent>
        </Card>

        {/* Client Profile */}
        <Card className={profile.hasClient ? "border-green-500/50" : "border-orange-500/50"}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg">Perfil Cliente</CardTitle>
              </div>
              <Badge variant={profile.hasClient ? "default" : "secondary"}>
                {profile.hasClient ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> Ativo</>
                ) : (
                  <><AlertCircle className="h-3 w-3 mr-1" /> Não configurado</>
                )}
              </Badge>
            </div>
            {profile.client && (
              <CardDescription>
                {profile.client.name} • {profile.client.email}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {profile.hasClient ? (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  <p><strong>Email:</strong> {profile.client?.email}</p>
                </div>
                <div className="flex gap-2">
                  <a href="/clientes">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Acessar como Cliente
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Configure para fazer pedidos e pagar vendedores
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-3">Como funciona o Perfil Unificado?</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-green-500 mt-0.5" />
              <span><strong>Uma única conta:</strong> Você usa o mesmo login para atuar como vendedor ou cliente</span>
            </li>
            <li className="flex items-start gap-2">
              <Store className="h-4 w-4 text-primary mt-0.5" />
              <span><strong>Como Vendedor:</strong> Clientes podem encontrar você, fazer pedidos e efetuar pagamentos normalmente</span>
            </li>
            <li className="flex items-start gap-2">
              <User className="h-4 w-4 text-blue-500 mt-0.5" />
              <span><strong>Como Cliente:</strong> Você pode fazer pedidos para vendedores e pagar normalmente - eles verão seu perfil de cliente</span>
            </li>
            <li className="flex items-start gap-2">
              <Eye className="h-4 w-4 text-orange-500 mt-0.5" />
              <span><strong>Privacidade:</strong> Usuários não conseguem identificar que você é administrador da plataforma</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
