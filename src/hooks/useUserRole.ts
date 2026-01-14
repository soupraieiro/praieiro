import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "user" | "vendor" | "admin" | null;

interface UseUserRoleReturn {
  role: UserRole;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook centralizado para gerenciar roles de usuário
 * FASE 1: Role é criado automaticamente pelo trigger handle_new_user
 * Este hook apenas LÊ o role - NÃO tenta criar
 */
export function useUserRole(userId: string | undefined): UseUserRoleReturn {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRole = useCallback(async () => {
    if (!userId) {
      setRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Apenas buscar role existente - trigger cria automaticamente
      const { data, error: fetchError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (fetchError) {
        console.error("[useUserRole] Error fetching role:", fetchError);
        setError(fetchError.message);
        setRole("user"); // Fallback para UI
        return;
      }

      // Role deve existir (criado por trigger)
      // Se não existe, pode ser usuário legado - fallback para 'user'
      setRole((data?.role as UserRole) || "user");
    } catch (err) {
      console.error("[useUserRole] Unexpected error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setRole("user"); // Fallback para UI
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  return {
    role,
    loading,
    error,
    refetch: fetchRole,
  };
}

/**
 * Função utilitária para buscar role de usuário
 * FASE 1: Role é criado pelo trigger - esta função apenas LÊ
 * Mantida para compatibilidade com código existente
 */
export async function ensureUserRole(
  userId: string,
  defaultRole: "user" | "vendor" | "admin" = "user"
): Promise<{ success: boolean; role: string; error?: string }> {
  try {
    // Apenas verificar se existe (trigger cria automaticamente)
    const { data: existing, error: fetchError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error("[ensureUserRole] Error fetching role:", fetchError);
      return { success: false, role: defaultRole, error: fetchError.message };
    }

    // Retornar role existente ou fallback
    return { 
      success: true, 
      role: existing?.role || defaultRole 
    };
  } catch (err) {
    return {
      success: false,
      role: defaultRole,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
