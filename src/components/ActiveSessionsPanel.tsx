import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Monitor, Smartphone, Globe, LogOut, RefreshCw, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SessionInfo {
  id: string;
  created_at: string;
  updated_at: string;
  user_agent: string;
  ip: string;
  is_current: boolean;
}

export function ActiveSessionsPanel() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState<string | null>(null);
  const [signingOutAll, setSigningOutAll] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      // Get current session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        setSessions([]);
        return;
      }

      // Supabase doesn't provide a direct API to list all sessions
      // We'll show the current session and provide option to sign out everywhere
      const currentSessionInfo: SessionInfo = {
        id: currentSession.access_token.slice(-8),
        created_at: new Date(currentSession.user?.last_sign_in_at || Date.now()).toISOString(),
        updated_at: new Date().toISOString(),
        user_agent: navigator.userAgent,
        ip: "Sessão atual",
        is_current: true,
      };

      setSessions([currentSessionInfo]);
    } catch (error) {
      console.error("Erro ao buscar sessões:", error);
      toast.error("Erro ao carregar sessões ativas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const signOutOtherSessions = async () => {
    setSigningOutAll(true);
    try {
      // Sign out from all other sessions (keeping current one)
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      
      if (error) throw error;
      
      toast.success("Todas as outras sessões foram encerradas");
      await fetchSessions();
    } catch (error: any) {
      console.error("Erro ao encerrar sessões:", error);
      toast.error(error.message || "Erro ao encerrar outras sessões");
    } finally {
      setSigningOutAll(false);
    }
  };

  const signOutEverywhere = async () => {
    setSigningOutAll(true);
    try {
      // Sign out from all sessions including current
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) throw error;
      
      toast.success("Todas as sessões foram encerradas");
      // User will be redirected to login
    } catch (error: any) {
      console.error("Erro ao encerrar sessões:", error);
      toast.error(error.message || "Erro ao encerrar sessões");
    } finally {
      setSigningOutAll(false);
    }
  };

  const getDeviceIcon = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
      return <Smartphone className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };

  const getDeviceName = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    
    // Browser detection
    let browser = "Navegador desconhecido";
    if (ua.includes("chrome") && !ua.includes("edg")) browser = "Chrome";
    else if (ua.includes("firefox")) browser = "Firefox";
    else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
    else if (ua.includes("edg")) browser = "Edge";
    else if (ua.includes("opera") || ua.includes("opr")) browser = "Opera";

    // OS detection
    let os = "";
    if (ua.includes("windows")) os = "Windows";
    else if (ua.includes("mac")) os = "macOS";
    else if (ua.includes("linux") && !ua.includes("android")) os = "Linux";
    else if (ua.includes("android")) os = "Android";
    else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";

    return `${browser}${os ? ` em ${os}` : ""}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Sessões Ativas
            </CardTitle>
            <CardDescription>
              Gerencie os dispositivos conectados à sua conta
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchSessions}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current session info */}
        <div className="bg-muted/50 rounded-lg p-4 border">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                {getDeviceIcon(navigator.userAgent)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{getDeviceName(navigator.userAgent)}</span>
                  <Badge variant="default" className="text-xs">
                    Sessão atual
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Último acesso: {formatDate(new Date().toISOString())}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Security notice */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Sessões em outros dispositivos
            </p>
            <p className="text-amber-700 dark:text-amber-300 mt-1">
              Se você suspeita que sua conta foi acessada por outra pessoa, encerre todas as outras sessões imediatamente.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                className="flex-1"
                disabled={signingOutAll}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Encerrar outras sessões
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Encerrar outras sessões?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso irá desconectar você de todos os outros dispositivos. 
                  Você permanecerá conectado apenas neste dispositivo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={signOutOtherSessions}>
                  Encerrar outras sessões
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                className="flex-1"
                disabled={signingOutAll}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Encerrar todas as sessões
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Encerrar todas as sessões?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso irá desconectar você de TODOS os dispositivos, incluindo este. 
                  Você precisará fazer login novamente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={signOutEverywhere}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Encerrar todas
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
