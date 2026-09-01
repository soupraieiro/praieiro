import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

interface RoleRouteProps {
  children: React.ReactNode;
  /** Papéis autorizados a ver esta área */
  allow: Array<"user" | "vendor" | "admin">;
  /** Para onde enviar quem não tem o papel */
  fallbackPath?: string;
}

/**
 * RBAC de apresentação: garante que cada perfil veja apenas o seu dashboard.
 * A autoridade continua no backend (user_roles + RLS); aqui apenas refletimos.
 */
export function RoleRoute({ children, allow, fallbackPath }: RoleRouteProps) {
  const { user, loading } = useAuth();
  const { role, loading: roleLoading } = useUserRole(user?.id);

  if (loading || roleLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Verificando permissões...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!role || !allow.includes(role)) {
    // Redireciona para o dashboard correspondente ao papel real
    const target =
      fallbackPath ??
      (role === "vendor" ? "/painel-ambulante" : role === "admin" ? "/admin" : "/painel-cliente");
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}
