/**
 * HOOK CONSTITUCIONAL PARA QUERIES RLS-AWARE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PRINCÍPIOS FUNDAMENTAIS (Constituição PRAIEIRO):
 * - Nenhuma policy será relaxada. Nenhuma coluna será tornada opcional.
 * - O frontend deve se adaptar ao banco, não o contrário.
 * - Arrays vazios podem significar bloqueio por RLS, não "sem dados".
 * - Toda query RLS requer auth.uid() válido.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════

export type RLSBlockReason =
  | "NOT_AUTHENTICATED"
  | "POLICY_DENIED"
  | "EMPTY_RESULT"
  | "SESSION_EXPIRED"
  | "UNKNOWN";

export interface ConstitutionalQueryResult<T> {
  data: T | null;
  error: string | null;
  isRLSBlocked: boolean;
  rlsReason: RLSBlockReason | null;
  isLoading: boolean;
  isEmpty: boolean;
  timestamp: string;
}

export interface ConstitutionalQueryState<T> {
  result: ConstitutionalQueryResult<T>;
  refetch: () => Promise<void>;
  isAuthenticated: boolean;
  userId: string | null;
}

// ═══════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

/**
 * Hook para queries constitucionais com tratamento RLS-aware.
 * 
 * IMPORTANTE:
 * - Arrays vazios são tratados como possível bloqueio RLS
 * - Valida autenticação antes de executar queries em tabelas protegidas
 * - Provê feedback claro sobre o motivo do bloqueio
 */
export function useConstitutionalQuery<T>() {
  const [result, setResult] = useState<ConstitutionalQueryResult<T>>({
    data: null,
    error: null,
    isRLSBlocked: false,
    rlsReason: null,
    isLoading: false,
    isEmpty: false,
    timestamp: new Date().toISOString(),
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Verifica autenticação antes de qualquer operação
   */
  const checkAuth = useCallback(async (): Promise<{ valid: boolean; userId: string | null; reason?: RLSBlockReason }> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn("[CONSTITUTIONAL] Auth check failed:", error.message);
        return { valid: false, userId: null, reason: "SESSION_EXPIRED" };
      }

      if (!session?.user) {
        return { valid: false, userId: null, reason: "NOT_AUTHENTICATED" };
      }

      setIsAuthenticated(true);
      setUserId(session.user.id);
      return { valid: true, userId: session.user.id };
    } catch (err) {
      console.error("[CONSTITUTIONAL] Auth check exception:", err);
      return { valid: false, userId: null, reason: "UNKNOWN" };
    }
  }, []);

  /**
   * Executa uma query SELECT com tratamento RLS-aware
   */
  const query = useCallback(async <R = T>(
    tableName: string,
    queryFn: (builder: ReturnType<typeof supabase.from>) => Promise<{ data: R | null; error: { message: string } | null }>,
    options: {
      requireAuth?: boolean;
      expectMultiple?: boolean;
      treatEmptyAsRLSBlock?: boolean;
    } = {}
  ): Promise<ConstitutionalQueryResult<R>> => {
    const {
      requireAuth = true,
      expectMultiple = false,
      treatEmptyAsRLSBlock = true,
    } = options;

    // Cancelar query anterior se existir
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setResult(prev => ({ ...prev, isLoading: true }));

    // 1. Verificar autenticação se necessário
    if (requireAuth) {
      const authResult = await checkAuth();
      if (!authResult.valid) {
        const blockResult: ConstitutionalQueryResult<R> = {
          data: null,
          error: "Autenticação necessária para acessar estes dados",
          isRLSBlocked: true,
          rlsReason: authResult.reason || "NOT_AUTHENTICATED",
          isLoading: false,
          isEmpty: true,
          timestamp: new Date().toISOString(),
        };
        setResult(blockResult as unknown as ConstitutionalQueryResult<T>);
        return blockResult;
      }
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder = supabase.from(tableName as any);
      const { data, error } = await queryFn(builder as ReturnType<typeof supabase.from>);

      if (error) {
        // Verificar se é erro de RLS
        const isRLSError = 
          error.message.includes("permission denied") ||
          error.message.includes("RLS") ||
          error.message.includes("policy") ||
          error.message.includes("row-level security");

        const errorResult: ConstitutionalQueryResult<R> = {
          data: null,
          error: error.message,
          isRLSBlocked: isRLSError,
          rlsReason: isRLSError ? "POLICY_DENIED" : null,
          isLoading: false,
          isEmpty: true,
          timestamp: new Date().toISOString(),
        };
        setResult(errorResult as unknown as ConstitutionalQueryResult<T>);
        return errorResult;
      }

      // 2. Tratar arrays vazios
      const isEmpty = Array.isArray(data) ? data.length === 0 : data === null;
      
      // IMPORTANTE: Array vazio pode ser bloqueio RLS!
      const possibleRLSBlock = treatEmptyAsRLSBlock && isEmpty && expectMultiple;

      const successResult: ConstitutionalQueryResult<R> = {
        data,
        error: null,
        isRLSBlocked: possibleRLSBlock,
        rlsReason: possibleRLSBlock ? "EMPTY_RESULT" : null,
        isLoading: false,
        isEmpty,
        timestamp: new Date().toISOString(),
      };

      if (possibleRLSBlock) {
        console.warn(
          `[CONSTITUTIONAL] Query em "${tableName}" retornou vazio. ` +
          `Pode ser bloqueio RLS ou realmente não há dados.`
        );
      }

      setResult(successResult as unknown as ConstitutionalQueryResult<T>);
      return successResult;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
      const errorResult: ConstitutionalQueryResult<R> = {
        data: null,
        error: errorMsg,
        isRLSBlocked: false,
        rlsReason: null,
        isLoading: false,
        isEmpty: true,
        timestamp: new Date().toISOString(),
      };
      setResult(errorResult as unknown as ConstitutionalQueryResult<T>);
      return errorResult;
    }
  }, [checkAuth]);

  /**
   * Query simplificada para SELECT *
   */
  const selectAll = useCallback(async <R = T>(
    tableName: string,
    filters?: Record<string, unknown>,
    options?: {
      orderBy?: string;
      ascending?: boolean;
      limit?: number;
    }
  ): Promise<ConstitutionalQueryResult<R[]>> => {
    return query<R[]>(
      tableName,
      async (builder) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q = builder.select("*") as any;
        
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            q = q.eq(key, value);
          }
        }
        
        if (options?.orderBy) {
          q = q.order(options.orderBy, { ascending: options.ascending ?? false });
        }
        
        if (options?.limit) {
          q = q.limit(options.limit);
        }
        
        return q;
      },
      { expectMultiple: true, treatEmptyAsRLSBlock: true }
    );
  }, [query]);

  /**
   * Query simplificada para SELECT por ID
   */
  const selectById = useCallback(async <R = T>(
    tableName: string,
    id: string
  ): Promise<ConstitutionalQueryResult<R>> => {
    return query<R>(
      tableName,
      async (builder) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (builder.select("*") as any).eq("id", id).single();
      },
      { expectMultiple: false, treatEmptyAsRLSBlock: true }
    );
  }, [query]);

  /**
   * Refetch da última query (placeholder - implementar cache)
   */
  const refetch = useCallback(async () => {
    console.warn("[CONSTITUTIONAL] refetch() requer implementação de cache");
  }, []);

  return {
    result,
    query,
    selectAll,
    selectById,
    refetch,
    isAuthenticated,
    userId,
    checkAuth,
  };
}

// ═══════════════════════════════════════════════════════════════════
// HOOK PARA VERIFICAÇÃO DE AUTENTICAÇÃO
// ═══════════════════════════════════════════════════════════════════

/**
 * Hook simples para verificar se o usuário está autenticado
 * antes de executar operações RLS-protegidas
 */
export function useRequireAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        setError(sessionError.message);
        setIsAuthenticated(false);
        return false;
      }

      if (!session?.user) {
        setError("Usuário não autenticado");
        setIsAuthenticated(false);
        return false;
      }

      setIsAuthenticated(true);
      setUserId(session.user.id);
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isAuthenticated,
    isLoading,
    userId,
    error,
    verify,
  };
}

// ═══════════════════════════════════════════════════════════════════
// UTILITÁRIOS
// ═══════════════════════════════════════════════════════════════════

/**
 * Mensagens amigáveis para razões de bloqueio RLS
 */
export function getRLSBlockMessage(reason: RLSBlockReason): string {
  const messages: Record<RLSBlockReason, string> = {
    NOT_AUTHENTICATED: "Você precisa estar logado para acessar estes dados.",
    POLICY_DENIED: "Você não tem permissão para acessar estes dados.",
    EMPTY_RESULT: "Nenhum dado encontrado ou acesso restrito.",
    SESSION_EXPIRED: "Sua sessão expirou. Por favor, faça login novamente.",
    UNKNOWN: "Não foi possível acessar os dados.",
  };
  return messages[reason];
}

/**
 * Componente de feedback para bloqueio RLS
 */
export function getRLSBlockSeverity(reason: RLSBlockReason): "info" | "warning" | "error" {
  const severities: Record<RLSBlockReason, "info" | "warning" | "error"> = {
    NOT_AUTHENTICATED: "warning",
    POLICY_DENIED: "error",
    EMPTY_RESULT: "info",
    SESSION_EXPIRED: "warning",
    UNKNOWN: "error",
  };
  return severities[reason];
}

export default useConstitutionalQuery;
