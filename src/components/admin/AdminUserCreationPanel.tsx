import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  UserPlus, 
  Shield, 
  Eye, 
  Edit, 
  Trash2, 
  DollarSign, 
  MessageSquare,
  ShoppingCart,
  Users,
  Settings,
  BarChart3,
  Bell,
  FileText,
  Lock,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface EmployeePermissions {
  can_view_users: boolean;
  can_edit_users: boolean;
  can_view_orders: boolean;
  can_view_transactions: boolean;
  can_edit_transactions: boolean;
  can_view_financial: boolean;
  can_edit_financial: boolean;
  can_view_messages: boolean;
}

interface CreatedUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  permissions: EmployeePermissions;
}

const DEFAULT_PERMISSIONS: EmployeePermissions = {
  can_view_users: false,
  can_edit_users: false,
  can_view_orders: true,
  can_view_transactions: false,
  can_edit_transactions: false,
  can_view_financial: false,
  can_edit_financial: false,
  can_view_messages: true,
};

const PERMISSION_GROUPS = [
  {
    title: "Usuários & Clientes",
    icon: Users,
    permissions: [
      { key: "can_view_users", label: "Visualizar usuários", description: "Acesso à lista de clientes e vendedores" },
      { key: "can_edit_users", label: "Editar usuários", description: "Modificar dados de clientes e vendedores" },
    ]
  },
  {
    title: "Pedidos",
    icon: ShoppingCart,
    permissions: [
      { key: "can_view_orders", label: "Visualizar pedidos", description: "Acesso à lista de pedidos" },
    ]
  },
  {
    title: "Financeiro",
    icon: DollarSign,
    permissions: [
      { key: "can_view_transactions", label: "Visualizar transações", description: "Acesso ao histórico de transações" },
      { key: "can_edit_transactions", label: "Editar transações", description: "Modificar ou estornar transações" },
      { key: "can_view_financial", label: "Visualizar relatórios", description: "Acesso a relatórios financeiros" },
      { key: "can_edit_financial", label: "Editar configurações", description: "Modificar configurações financeiras" },
    ]
  },
  {
    title: "Comunicação",
    icon: MessageSquare,
    permissions: [
      { key: "can_view_messages", label: "Visualizar mensagens", description: "Acesso às mensagens entre usuários" },
    ]
  },
];

export function AdminUserCreationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdUsers, setCreatedUsers] = useState<CreatedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "employee",
  });
  
  const [permissions, setPermissions] = useState<EmployeePermissions>(DEFAULT_PERMISSIONS);

  // Load created users on mount
  useState(() => {
    loadCreatedUsers();
  });

  const loadCreatedUsers = async () => {
    try {
      setLoadingUsers(true);
      // Fetch users with employee permissions
      const { data: employeePerms, error } = await supabase
        .from("employee_permissions")
        .select("*");

      if (error) throw error;

      if (employeePerms && employeePerms.length > 0) {
        // IDENTIDADE SOBERANA: profiles.id = auth.users.id (user_id não existe)
        // employee_permissions.user_id referencia profiles.id
        const userIds = employeePerms.map(ep => ep.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, created_at")
          .in("id", userIds);

        const users: CreatedUser[] = employeePerms.map(ep => {
          const profile = profiles?.find(p => p.id === ep.user_id);
          return {
            id: ep.user_id,
            email: profile?.email || "N/A",
            full_name: profile?.full_name || "Sem nome",
            role: "employee",
            created_at: ep.created_at || new Date().toISOString(),
            permissions: {
              can_view_users: ep.can_view_users || false,
              can_edit_users: ep.can_edit_users || false,
              can_view_orders: ep.can_view_orders || false,
              can_view_transactions: ep.can_view_transactions || false,
              can_edit_transactions: ep.can_edit_transactions || false,
              can_view_financial: ep.can_view_financial || false,
              can_edit_financial: ep.can_edit_financial || false,
              can_view_messages: ep.can_view_messages || false,
            }
          };
        });

        setCreatedUsers(users);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async () => {
    if (!formData.email || !formData.password || !formData.full_name) {
      toast.error("Preencha email, senha e nome completo");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Senha deve ter no mínimo 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      // Create auth user via admin API (we'll use signUp with auto-confirm)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            phone: formData.phone,
            created_by_admin: true,
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Usuário não foi criado");
      }

      // Create profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: authData.user.id,
          email: formData.email,
          full_name: formData.full_name,
          phone: formData.phone || null,
          cpf: "000.000.000-00", // Placeholder for admin-created users
        });

      if (profileError) throw profileError;

      // Create employee permissions
      const { error: permError } = await supabase
        .from("employee_permissions")
        .insert({
          user_id: authData.user.id,
          ...permissions
        });

      if (permError) throw permError;

      // Add employee role using governance_roles (constitutional)
      const { error: roleError } = await (supabase as any)
        .from("governance_roles")
        .insert({
          profile_id: authData.user.id,
          role: "employee"
        });

      if (roleError) {
        console.warn("Role creation warning:", roleError);
      }

      toast.success(`Usuário ${formData.full_name} criado com sucesso!`);
      
      // Reset form
      setFormData({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        role: "employee",
      });
      setPermissions(DEFAULT_PERMISSIONS);
      setIsOpen(false);
      
      // Reload users list
      loadCreatedUsers();

    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Erro ao criar usuário");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, deleteCompletely: boolean = false) => {
    const message = deleteCompletely 
      ? "ATENÇÃO: Isso excluirá PERMANENTEMENTE o usuário, incluindo todos os dados. Deseja continuar?"
      : "Tem certeza que deseja remover este usuário da equipe?";
    
    if (!confirm(message)) return;

    try {
      // Remove permissions
      await supabase
        .from("employee_permissions")
        .delete()
        .eq("user_id", userId);

      // Remove role
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (deleteCompletely) {
        // IDENTIDADE SOBERANA: profiles.id = auth.users.id
        await supabase
          .from("profiles")
          .delete()
          .eq("id", userId);

        // Note: Deleting from auth.users requires admin API or edge function
        // For now, we mark the user as deleted and notify admin
        toast.success("Usuário excluído. Para remoção completa do auth, use o painel Cloud.");
      } else {
        toast.success("Usuário removido da equipe");
      }
      
      loadCreatedUsers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover usuário");
    }
  };

  const togglePermission = (key: keyof EmployeePermissions) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const setAllPermissions = (value: boolean) => {
    const newPerms: EmployeePermissions = {
      can_view_users: value,
      can_edit_users: value,
      can_view_orders: value,
      can_view_transactions: value,
      can_edit_transactions: value,
      can_view_financial: value,
      can_edit_financial: value,
      can_view_messages: value,
    };
    setPermissions(newPerms);
  };

  const countActivePermissions = (perms: EmployeePermissions) => {
    return Object.values(perms).filter(Boolean).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            Criar Usuários
          </h2>
          <p className="text-muted-foreground">
            Crie contas para funcionários com permissões personalizadas
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Criar Novo Usuário
              </DialogTitle>
              <DialogDescription>
                Crie uma conta com permissões personalizadas para gerenciar a plataforma
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Informações Básicas
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nome Completo *</Label>
                      <Input
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="Nome do funcionário"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(71) 99999-9999"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Senha *</Label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Permissions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Permissões ({countActivePermissions(permissions)}/8)
                    </h4>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setAllPermissions(false)}
                      >
                        Nenhuma
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setAllPermissions(true)}
                      >
                        Todas
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {PERMISSION_GROUPS.map((group) => (
                      <Card key={group.title} className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <group.icon className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">{group.title}</span>
                        </div>
                        <div className="space-y-3">
                          {group.permissions.map((perm) => (
                            <div 
                              key={perm.key} 
                              className="flex items-center justify-between py-2 border-b last:border-0"
                            >
                              <div className="space-y-0.5">
                                <div className="text-sm font-medium">{perm.label}</div>
                                <div className="text-xs text-muted-foreground">{perm.description}</div>
                              </div>
                              <Switch
                                checked={permissions[perm.key as keyof EmployeePermissions]}
                                onCheckedChange={() => togglePermission(perm.key as keyof EmployeePermissions)}
                              />
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Importante:</p>
                      <p>O usuário receberá um email de confirmação. Após confirmar, poderá acessar com as permissões definidas.</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateUser} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Criar Usuário
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Created Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usuários Criados</CardTitle>
          <CardDescription>
            Funcionários e colaboradores com acesso à plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : createdUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum usuário criado ainda</p>
              <p className="text-sm">Clique em "Novo Usuário" para começar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {createdUsers.map((user) => (
                <div 
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      {countActivePermissions(user.permissions)} permissões
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => handleDeleteUser(user.id, false)}
                      title="Remover da equipe"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteUser(user.id, true)}
                      title="Excluir permanentemente"
                    >
                      <AlertCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permission Legend */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Níveis de Acesso
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-2 text-sm">
              <Eye className="h-4 w-4 text-blue-500 mt-0.5" />
              <div>
                <span className="font-medium">Visualização:</span>
                <span className="text-muted-foreground"> Apenas leitura de dados</span>
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Edit className="h-4 w-4 text-orange-500 mt-0.5" />
              <div>
                <span className="font-medium">Edição:</span>
                <span className="text-muted-foreground"> Pode modificar dados</span>
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <span className="font-medium">Financeiro:</span>
                <span className="text-muted-foreground"> Acesso a valores e relatórios</span>
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Lock className="h-4 w-4 text-red-500 mt-0.5" />
              <div>
                <span className="font-medium">Admin:</span>
                <span className="text-muted-foreground"> Apenas você tem acesso total</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
