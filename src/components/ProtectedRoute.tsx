import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireCompleteProfile?: boolean;
}

/**
 * 🏛️ FLUXO CANÔNICO (Constituição Gênesis):
 * 
 * REGRA DE OURO:
 * - SE não tem sessão → /auth
 * - SE tem sessão MAS não tem profile → /auth/callback (NUNCA /auth!)
 * - SE tem profile MAS incompleto → /complete-profile
 * - SE tem profile completo → permitir acesso
 * 
 * ⚠️ ISSO PREVINE O LOOP INFINITO!
 */
export function ProtectedRoute({ children, requireCompleteProfile = true }: ProtectedRouteProps) {
  const { user, loading: authLoading, hasProfile, profileLoading } = useAuth();
  const { profile, loading: profileDataLoading } = useProfile();

  // Loading state - aguardar auth e profile
  if (authLoading || profileLoading || profileDataLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Verificando acesso...</p>
      </div>
    );
  }

  // DECISÃO 1: SE não autenticado → /auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // DECISÃO 2: SE autenticado MAS profile NÃO existe → /auth/callback
  // ⚠️ NUNCA redirecionar para /auth aqui! Isso causa loop infinito!
  if (!hasProfile || !profile) {
    return <Navigate to="/auth/callback" replace />;
  }

  // DECISÃO 3: SE profile existe MAS campos obrigatórios ausentes → /complete-profile
  if (requireCompleteProfile) {
    const isProfileComplete = !!(
      profile.full_name &&
      profile.cpf &&
      profile.data_nascimento
    );

    if (!isProfileComplete) {
      return <Navigate to="/complete-profile" replace />;
    }
  }

  // DECISÃO 4: SE profile existe E completo → permitir acesso
  return <>{children}</>;
}
