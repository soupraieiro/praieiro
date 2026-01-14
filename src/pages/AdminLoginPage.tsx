import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Shield, Chrome } from "lucide-react";
import logoPraieiro from "@/assets/logo-praieiro-circle.png";
import { TwoFactorVerify } from "@/components/TwoFactorVerify";
import { TwoFactorSetup } from "@/components/TwoFactorSetup";

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [mode, setMode] = useState<"login" | "2fa-verify">("login");
  const [mfaFactorId, setMfaFactorId] = useState<string>("");
  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const navigate = useNavigate();

  // Check if user is already logged in and is admin
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if user is admin
        const isAdmin = await isEmailAllowed(user.email || "");
        if (isAdmin) {
          // Check MFA status
          const { data: mfaData } = await supabase.auth.mfa.listFactors();
          const verifiedFactors = mfaData?.totp?.filter(f => f.status === "verified") || [];
          
          if (verifiedFactors.length > 0) {
            setMfaFactorId(verifiedFactors[0].id);
            setMode("2fa-verify");
          } else {
            // ⚠️ Admin role is assigned by backend trigger - no action needed
            navigate("/admin");
          }
        } else {
          // Not an admin - sign out
          await supabase.auth.signOut();
          toast.error("Email não autorizado para acesso administrativo");
        }
      }
    } catch (error) {
      console.error("Error checking session:", error);
    } finally {
      setCheckingAuth(false);
    }
  };

  // Check if email is in allowed admin emails list
  const isEmailAllowed = async (emailToCheck: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from("admin_allowed_emails")
      .select("email")
      .eq("email", emailToCheck.toLowerCase())
      .eq("is_active", true)
      .maybeSingle();
    
    if (error) {
      console.error("Error checking admin email:", error);
      return false;
    }
    
    return data !== null;
  };

  // ⚠️ REMOVED: ensureAdminRole - admin role is assigned by backend trigger
  // The trigger assign_admin_role_if_allowed checks admin_allowed_emails
  // Frontend should NEVER insert into user_roles (blocked by RLS)

  // Handle Google OAuth login
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/admin/login`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao fazer login com Google";
      toast.error(message);
      setLoading(false);
    }
  };

  const handle2FASuccess = async () => {
    // ⚠️ Admin role is assigned by backend trigger - no action needed
    toast.success("Login realizado com sucesso!");
    navigate("/admin");
  };

  const handle2FASetupComplete = () => {
    setShowSetup2FA(false);
    toast.success("2FA ativado! Login realizado com sucesso!");
    navigate("/admin");
  };

  const skipSetup2FA = () => {
    setShowSetup2FA(false);
    toast.info("Você pode configurar 2FA mais tarde nas configurações");
    navigate("/admin");
  };

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/30 p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Show 2FA verification screen
  if (mode === "2fa-verify") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/30 p-4">
        <TwoFactorVerify
          factorId={mfaFactorId}
          onSuccess={handle2FASuccess}
          onCancel={() => {
            setMode("login");
            supabase.auth.signOut();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 overflow-hidden border-2 border-primary/20">
            <img src={logoPraieiro} alt="Praieiro" className="h-full w-full object-cover" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-2xl font-bold text-primary">
              Acesso Administrativo
            </CardTitle>
          </div>
          <CardDescription className="text-base">
            Use sua conta Google autorizada para acessar o painel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Apenas emails autorizados</strong> podem acessar esta área.
              O acesso é exclusivo via Google Authenticator.
            </p>
          </div>
          
          <Button 
            onClick={handleGoogleLogin} 
            className="w-full h-12 text-base font-medium gap-3"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <Chrome className="h-5 w-5" />
                Entrar com Google
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>Acesso protegido por autenticação de dois fatores</span>
          </div>
        </CardContent>
      </Card>

      {/* 2FA Setup Dialog - appears after first login */}
      <TwoFactorSetup
        open={showSetup2FA}
        onOpenChange={setShowSetup2FA}
        onComplete={handle2FASetupComplete}
      />
      
      {showSetup2FA && (
        <div className="fixed bottom-4 right-4">
          <Button variant="ghost" onClick={skipSetup2FA}>
            Configurar depois
          </Button>
        </div>
      )}
    </div>
  );
}
