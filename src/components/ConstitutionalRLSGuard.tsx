/**
 * COMPONENTE DE GUARDA RLS CONSTITUCIONAL
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Garante que:
 * - Usuário esteja autenticado antes de renderizar conteúdo protegido
 * - Feedback visual claro em caso de bloqueio RLS
 * - Tratamento adequado de arrays vazios vs bloqueio
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert, ShieldCheck, LogIn, RefreshCw, AlertTriangle } from "lucide-react";
import { RLSBlockReason, getRLSBlockMessage, getRLSBlockSeverity } from "@/hooks/useConstitutionalQuery";
import { useNavigate } from "react-router-dom";

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════

interface ConstitutionalRLSGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  showLoadingState?: boolean;
  fallback?: ReactNode;
  onAuthRequired?: () => void;
}

interface RLSBlockAlertProps {
  reason: RLSBlockReason;
  onRetry?: () => void;
  onLogin?: () => void;
  showLoginButton?: boolean;
}

interface EmptyStateWithRLSCheckProps {
  isEmpty: boolean;
  isRLSBlocked: boolean;
  rlsReason: RLSBlockReason | null;
  emptyMessage?: string;
  children: ReactNode;
  onRetry?: () => void;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL: GUARDA DE AUTENTICAÇÃO
// ═══════════════════════════════════════════════════════════════════

export function ConstitutionalRLSGuard({
  children,
  requireAuth = true,
  showLoadingState = true,
  fallback,
  onAuthRequired,
}: ConstitutionalRLSGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session?.user);
      } catch (error) {
        console.error("[CONSTITUTIONAL_GUARD] Auth check failed:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listener para mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Loading state
  if (isLoading && showLoadingState) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Not authenticated
  if (requireAuth && !isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <RLSBlockAlert
        reason="NOT_AUTHENTICATED"
        showLoginButton
        onLogin={() => {
          if (onAuthRequired) {
            onAuthRequired();
          } else {
            navigate("/auth");
          }
        }}
      />
    );
  }

  return <>{children}</>;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE DE ALERTA RLS
// ═══════════════════════════════════════════════════════════════════

export function RLSBlockAlert({
  reason,
  onRetry,
  onLogin,
  showLoginButton = false,
}: RLSBlockAlertProps) {
  const severity = getRLSBlockSeverity(reason);
  const message = getRLSBlockMessage(reason);

  const getIcon = () => {
    switch (severity) {
      case "error":
        return <ShieldAlert className="h-5 w-5" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <ShieldCheck className="h-5 w-5" />;
    }
  };

  const getVariant = (): "default" | "destructive" => {
    return severity === "error" ? "destructive" : "default";
  };

  return (
    <Alert variant={getVariant()} className="my-4">
      {getIcon()}
      <AlertTitle className="ml-2">
        {severity === "error" ? "Acesso Negado" : 
         severity === "warning" ? "Autenticação Necessária" : 
         "Informação"}
      </AlertTitle>
      <AlertDescription className="ml-2 mt-2">
        <p className="mb-3">{message}</p>
        <div className="flex gap-2">
          {showLoginButton && onLogin && (
            <Button variant="default" size="sm" onClick={onLogin}>
              <LogIn className="h-4 w-4 mr-2" />
              Fazer Login
            </Button>
          )}
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PARA ESTADO VAZIO COM VERIFICAÇÃO RLS
// ═══════════════════════════════════════════════════════════════════

/**
 * Renderiza conteúdo quando há dados, ou mostra feedback apropriado
 * quando vazio - diferenciando entre "sem dados" e "bloqueio RLS".
 */
export function EmptyStateWithRLSCheck({
  isEmpty,
  isRLSBlocked,
  rlsReason,
  emptyMessage = "Nenhum item encontrado.",
  children,
  onRetry,
}: EmptyStateWithRLSCheckProps) {
  // Tem dados - renderiza normalmente
  if (!isEmpty) {
    return <>{children}</>;
  }

  // Bloqueado por RLS - mostra alerta apropriado
  if (isRLSBlocked && rlsReason) {
    return <RLSBlockAlert reason={rlsReason} onRetry={onRetry} />;
  }

  // Realmente vazio (sem bloqueio RLS)
  return (
    <div className="text-center py-8 text-muted-foreground">
      <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>{emptyMessage}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// HOC PARA PROTEÇÃO RLS
// ═══════════════════════════════════════════════════════════════════

/**
 * Higher-Order Component para adicionar proteção RLS a qualquer componente
 */
export function withRLSProtection<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: { requireAuth?: boolean } = {}
) {
  return function ProtectedComponent(props: P) {
    return (
      <ConstitutionalRLSGuard requireAuth={options.requireAuth}>
        <WrappedComponent {...props} />
      </ConstitutionalRLSGuard>
    );
  };
}

export default ConstitutionalRLSGuard;
