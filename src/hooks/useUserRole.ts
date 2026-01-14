/**
 * HOOK CONSTITUCIONAL: ROLES DE USUÁRIO
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * AXIOMA A10: Papéis não alteram identidade
 * AXIOMA A9: Identidade única, global e imutável
 * 
 * REGRA: profiles.id === auth.users.id (identidade soberana)
 * PROIBIDO: user_id (usar profile_id)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

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
 * Hook constitucional para gerenciar roles de usuário
 * IDENTIDADE SOBERANA: profile_id = auth.users.id
 * Role é criado automaticamente pelo trigger handle_new_user
 */
export function useUserRole(profileId: string | undefined): UseUserRoleReturn {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRole = useCallback(async () => {
    if (!profileId) {
      setRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // CONSTITUTIONAL: profile.id === auth.users.id (identidade soberana)
      // Nota: tabela ainda usa user_id por compatibilidade de banco
      const { data, error: fetchError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profileId)
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
  }, [profileId]);

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
 * CONSTITUTIONAL: Usa profile_id (identidade soberana)
 */
export async function ensureUserRole(
  profileId: string,
  defaultRole: "user" | "vendor" | "admin" = "user"
): Promise<{ success: boolean; role: string; error?: string }> {
  try {
    // CONSTITUTIONAL: profile.id === auth.users.id (identidade soberana)
    // Nota: tabela ainda usa user_id por compatibilidade
    const { data: existing, error: fetchError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", profileId)
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
