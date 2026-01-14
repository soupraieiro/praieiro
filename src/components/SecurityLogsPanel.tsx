import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TwoFactorSetup } from "@/components/TwoFactorSetup";
import { ActiveSessionsPanel } from "@/components/ActiveSessionsPanel";
import { toast } from "sonner";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Search,
  Filter,
  Key,
  Lock,
  Settings
} from "lucide-react";

interface SecurityLog {
  id: string;
  event_type: string;
  identifier: string;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: unknown;
  created_at: string;
}

interface MFAFactor {
  id: string;
  friendly_name?: string;
  status: string;
  created_at: string;
}

const eventTypeLabels: Record<string, { label: string; variant: "default" | "destructive" | "outline" | "secondary" }> = {
  login_attempt: { label: "Tentativa de Login", variant: "outline" },
  login_success: { label: "Login Sucesso", variant: "default" },
  login_failed: { label: "Login Falhou", variant: "destructive" },
  signup_attempt: { label: "Tentativa Cadastro", variant: "outline" },
  signup_success: { label: "Cadastro Sucesso", variant: "default" },
  signup_failed: { label: "Cadastro Falhou", variant: "destructive" },
  rate_limit_exceeded: { label: "Limite Excedido", variant: "destructive" },
  password_reset_requested: { label: "Reset Senha", variant: "secondary" },
  password_reset_failed: { label: "Reset Falhou", variant: "destructive" },
};

export function SecurityLogsPanel() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [mfaFactors, setMfaFactors] = useState<MFAFactor[]>([]);
  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const [removingMFA, setRemovingMFA] = useState(false);

  useEffect(() => {
    loadLogs();
    loadMFAStatus();
  }, []);

  const loadLogs = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase
        .from("security_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error loading security logs:", error);
        return;
      }

      setLogs(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMFAStatus = async () => {
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      if (data?.totp) {
        setMfaFactors(data.totp.filter(f => f.status === "verified"));
      }
    } catch (error) {
      console.error("Error loading MFA status:", error);
    }
  };

  const handleRemoveMFA = async (factorId: string) => {
    if (!confirm("Tem certeza que deseja remover a autenticação de dois fatores?")) {
      return;
    }

    setRemovingMFA(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      
      toast.success("2FA removido com sucesso");
      loadMFAStatus();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao remover 2FA";
      toast.error(message);
    } finally {
      setRemovingMFA(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes("success")) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (eventType.includes("failed") || eventType.includes("exceeded")) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.ip_address && log.ip_address.includes(searchTerm));
    
    const matchesFilter = filterType === "all" || log.event_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const suspiciousCount = logs.filter(
    (log) => log.event_type === "rate_limit_exceeded" || log.event_type === "login_failed"
  ).length;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Security Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle>Configurações de Segurança</CardTitle>
          </div>
          <CardDescription>
            Gerencie a autenticação de dois fatores e outras configurações de segurança
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 2FA Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${mfaFactors.length > 0 ? "bg-green-100" : "bg-yellow-100"}`}>
                <Key className={`h-5 w-5 ${mfaFactors.length > 0 ? "text-green-600" : "text-yellow-600"}`} />
              </div>
              <div>
                <h4 className="font-medium">Autenticação de Dois Fatores (2FA)</h4>
                <p className="text-sm text-muted-foreground">
                  {mfaFactors.length > 0 
                    ? `Ativo - ${mfaFactors.length} dispositivo(s) configurado(s)`
                    : "Não configurado - Adicione uma camada extra de proteção"
                  }
                </p>
              </div>
            </div>
            {mfaFactors.length > 0 ? (
              <div className="flex items-center gap-2">
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Ativo
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleRemoveMFA(mfaFactors[0].id)}
                  disabled={removingMFA}
                >
                  Remover
                </Button>
              </div>
            ) : (
              <Button onClick={() => setShowSetup2FA(true)}>
                <Lock className="h-4 w-4 mr-2" />
                Configurar 2FA
              </Button>
            )}
          </div>

          {/* Password Protection Alert */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Proteção contra Senhas Vazadas</AlertTitle>
            <AlertDescription>
              A proteção contra senhas vazadas verifica se senhas usadas foram comprometidas em vazamentos de dados conhecidos. 
              Esta configuração deve ser habilitada nas configurações do backend para máxima segurança.
            </AlertDescription>
          </Alert>

          {/* Security Tips */}
          <div className="grid gap-2 md:grid-cols-2">
            <div className="flex items-start gap-2 p-3 border rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Rate Limiting</p>
                <p className="text-xs text-muted-foreground">Ativo - 5 tentativas a cada 15 min</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 border rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Alertas por Email</p>
                <p className="text-xs text-muted-foreground">Ativo para atividades suspeitas</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions Panel */}
      <ActiveSessionsPanel />

      {/* Logs Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Logs de Segurança</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {suspiciousCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {suspiciousCount} suspeitos
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={loadLogs} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
          </div>
          <CardDescription>
            Monitoramento de atividades de autenticação e tentativas suspeitas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email ou IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os eventos</SelectItem>
                <SelectItem value="login_failed">Logins falhos</SelectItem>
                <SelectItem value="rate_limit_exceeded">Limites excedidos</SelectItem>
                <SelectItem value="login_success">Logins sucesso</SelectItem>
                <SelectItem value="signup_attempt">Cadastros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Logs Table */}
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">Nenhum log encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Identificador</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Data/Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow 
                      key={log.id}
                      className={
                        log.event_type === "rate_limit_exceeded" || log.event_type === "login_failed"
                          ? "bg-red-50 dark:bg-red-950/20"
                          : ""
                      }
                    >
                      <TableCell>{getEventIcon(log.event_type)}</TableCell>
                      <TableCell>
                        <Badge variant={eventTypeLabels[log.event_type]?.variant || "outline"}>
                          {eventTypeLabels[log.event_type]?.label || log.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{log.identifier}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {log.ip_address || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(log.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2FA Setup Dialog */}
      <TwoFactorSetup
        open={showSetup2FA}
        onOpenChange={setShowSetup2FA}
        onComplete={() => {
          setShowSetup2FA(false);
          loadMFAStatus();
        }}
      />
    </div>
  );
}
