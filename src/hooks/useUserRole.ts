/**
 * HOOK CONSTITUCIONAL: ROLES DE USUÁRIO
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * AXIOMA A10: Papéis não alteram identidade
 * AXIOMA A9: Identidade única, global e imutável
 * AXIOMA A21: NÃO EXISTE user_id
 * 
 * REGRA: profiles.id === auth.users.id (identidade soberana)
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
 * IDENTIDADE SOBERANA: profile_id === auth.users.id
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
      // CONSTITUTIONAL A9/A21: profile_id === auth.users.id (identidade soberana)
      // Usando governance_roles (tabela constitucional)
      const { data, error: fetchError } = await (supabase as any)
        .from("governance_roles")
        .select("role")
        .eq("profile_id", profileId)
        .maybeSingle();

      if (fetchError) {
        console.error("[useUserRole] Error fetching role:", fetchError);
        setError(fetchError.message);
        setRole("user");
        return;
      }

      const roleValue = (data as any)?.role as string | undefined;
      setRole((roleValue as UserRole) || "user");
    } catch (err) {
      console.error("[useUserRole] Unexpected error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setRole("user");
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
 * CONSTITUTIONAL A9/A21: Usa profile_id (identidade soberana)
 */
export async function ensureUserRole(
  profileId: string,
  defaultRole: "user" | "vendor" | "admin" = "user"
): Promise<{ success: boolean; role: string; error?: string }> {
  try {
    // CONSTITUTIONAL A9/A21: profile_id === auth.users.id (identidade soberana)
    // Usando governance_roles (tabela constitucional)
    const { data: existing, error: fetchError } = await (supabase as any)
      .from("governance_roles")
      .select("role")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (fetchError) {
      console.error("[ensureUserRole] Error fetching role:", fetchError);
      return { success: false, role: defaultRole, error: fetchError.message };
    }

    const roleValue = (existing as any)?.role as string | undefined;
    return { 
      success: true, 
      role: roleValue || defaultRole 
    };
  } catch (err) {
    return {
      success: false,
      role: defaultRole,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
