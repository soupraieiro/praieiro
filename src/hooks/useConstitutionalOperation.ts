/**
 * HOOK CONSTITUCIONAL PARA OPERAÇÕES DE BANCO
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Wrapper React para operações seguras no banco constitucional.
 * 
 * PRINCÍPIOS (Constituição PRAIEIRO):
 * - O frontend deve se adaptar ao banco, não o contrário
 * - Nenhuma policy será relaxada. Nenhuma coluna será tornada opcional
 * - Validar localmente todos os campos obrigatórios antes de enviar
 * - Garantir que inserts respeitem dependências (FKs)
 * - Não assumir que INSERT/SELECT sempre funcionam
 * - Tratar retornos vazios como possível bloqueio por RLS
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ConstitutionalPayload,
  SafeOperationResult,
  PayloadValidationResult,
} from "@/lib/constitutionalPayload";

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════

interface UseConstitutionalOperationResult<T> {
  // Estado
  isLoading: boolean;
  error: string | null;
  validationErrors: string[];
  lastResult: SafeOperationResult<T> | null;
  isRLSBlocked: boolean;

  // Operações
  insert: (table: string, payload: Record<string, unknown>) => Promise<SafeOperationResult<T>>;
  insertWithFK: (
    table: string,
    payload: Record<string, unknown>,
    fkChecks: Array<{ field: string; parentTable: string }>
  ) => Promise<SafeOperationResult<T>>;
  update: (table: string, id: string, payload: Record<string, unknown>) => Promise<SafeOperationResult<T>>;
  
  // Validação
  validate: (table: string, payload: Record<string, unknown>) => PayloadValidationResult;
  sanitize: (table: string, payload: Record<string, unknown>) => Record<string, unknown>;
  
  // Auth check
  requireAuth: () => Promise<boolean>;

  // Utils
  reset: () => void;
}

interface UseConstitutionalOperationOptions {
  showToasts?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (error: string) => void;
  requireAuthBeforeOperation?: boolean;
}

export function useConstitutionalOperation<T = unknown>(
  options: UseConstitutionalOperationOptions = {}
): UseConstitutionalOperationResult<T> {
  const { 
    showToasts = true, 
    onSuccess, 
    onError,
    requireAuthBeforeOperation = true,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<SafeOperationResult<T> | null>(null);
  const [isRLSBlocked, setIsRLSBlocked] = useState(false);

  /**
   * Verifica se o usuário está autenticado
   * CRÍTICO: Toda operação RLS-protegida requer auth.uid() válido
   */
  const requireAuth = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        console.warn("[CONSTITUTIONAL] Operação requer autenticação");
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }, []);

  /**
   * Detecta se um erro é relacionado a RLS
   */
  const isRLSError = useCallback((errorMessage: string): boolean => {
    const rlsIndicators = [
      "permission denied",
      "RLS",
      "row-level security",
      "policy",
      "violates row-level security",
      "new row violates",
    ];
    return rlsIndicators.some(indicator => 
      errorMessage.toLowerCase().includes(indicator.toLowerCase())
    );
  }, []);

  const handleResult = useCallback(
    (result: SafeOperationResult<T>, operation: string) => {
      setLastResult(result);
      setError(result.error);
      setValidationErrors(result.validationErrors);
      
      // Detectar bloqueio RLS
      const blocked = result.error ? isRLSError(result.error) : false;
      setIsRLSBlocked(blocked);

      if (result.success) {
        if (showToasts) {
          toast.success(`${operation} realizado com sucesso`);
        }
        onSuccess?.(result.data);
      } else {
        let errorMsg = result.validationErrors.length > 0
          ? `Validação falhou: ${result.validationErrors.join(", ")}`
          : result.error || "Erro desconhecido";
        
        // Mensagem mais clara para RLS
        if (blocked) {
          errorMsg = "Você não tem permissão para esta operação";
        }
        
        if (showToasts) {
          toast.error(errorMsg);
        }
        onError?.(errorMsg);
      }

      return result;
    },
    [showToasts, onSuccess, onError, isRLSError]
  );

  const insert = useCallback(
    async (table: string, payload: Record<string, unknown>): Promise<SafeOperationResult<T>> => {
      setIsLoading(true);
      setError(null);
      setValidationErrors([]);
      setIsRLSBlocked(false);

      try {
        // Verificar autenticação se necessário
        if (requireAuthBeforeOperation) {
          const isAuth = await requireAuth();
          if (!isAuth) {
            const authError: SafeOperationResult<T> = {
              success: false,
              data: null,
              error: "Autenticação necessária para esta operação",
              validationErrors: ["Usuário não autenticado"],
            };
            return handleResult(authError, "Registro");
          }
        }

        const result = await ConstitutionalPayload.safeInsert<T>(table, payload);
        return handleResult(result, "Registro");
      } finally {
        setIsLoading(false);
      }
    },
    [handleResult, requireAuth, requireAuthBeforeOperation]
  );

  const insertWithFK = useCallback(
    async (
      table: string,
      payload: Record<string, unknown>,
      fkChecks: Array<{ field: string; parentTable: string }>
    ): Promise<SafeOperationResult<T>> => {
      setIsLoading(true);
      setError(null);
      setValidationErrors([]);

      try {
        const result = await ConstitutionalPayload.safeInsertWithFK<T>(table, payload, fkChecks);
        return handleResult(result, "Registro");
      } finally {
        setIsLoading(false);
      }
    },
    [handleResult]
  );

  const update = useCallback(
    async (
      table: string,
      id: string,
      payload: Record<string, unknown>
    ): Promise<SafeOperationResult<T>> => {
      setIsLoading(true);
      setError(null);
      setValidationErrors([]);

      try {
        const result = await ConstitutionalPayload.safeUpdate<T>(table, id, payload);
        return handleResult(result, "Atualização");
      } finally {
        setIsLoading(false);
      }
    },
    [handleResult]
  );

  const validate = useCallback(
    (table: string, payload: Record<string, unknown>): PayloadValidationResult => {
      return ConstitutionalPayload.validate(table, payload);
    },
    []
  );

  const sanitize = useCallback(
    (table: string, payload: Record<string, unknown>): Record<string, unknown> => {
      return ConstitutionalPayload.sanitize(table, payload);
    },
    []
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setValidationErrors([]);
    setLastResult(null);
    setIsRLSBlocked(false);
  }, []);

  return {
    isLoading,
    error,
    validationErrors,
    lastResult,
    isRLSBlocked,
    insert,
    insertWithFK,
    update,
    validate,
    sanitize,
    requireAuth,
    reset,
  };
}

// ═══════════════════════════════════════════════════════════════════
// HOOK ESPECIALIZADO PARA SATOSHI EVENTS
// ═══════════════════════════════════════════════════════════════════

export function useSatoshiEvent() {
  const { insert, isLoading, error } = useConstitutionalOperation({
    showToasts: false, // Eventos Satoshi são silenciosos
  });

  const emit = useCallback(
    async (
      eventType: string,
      eventPayload: Record<string, unknown>,
      category: string = "SYSTEM"
    ) => {
      const idempotencyKey = ConstitutionalPayload.generateIdempotencyKey(
        category,
        eventType,
        JSON.stringify(eventPayload).slice(0, 50)
      );

      const satoshiPayload: Record<string, unknown> = {
        event_type: eventType,
        payload: eventPayload,
        idempotency_key: idempotencyKey,
        currency: "ZIMBU",
      };

      return insert("satoshi_events", satoshiPayload);
    },
    [insert]
  );

  return { emit, isLoading, error };
}

// ═══════════════════════════════════════════════════════════════════
// HOOK ESPECIALIZADO PARA LEDGER
// ═══════════════════════════════════════════════════════════════════

interface LedgerEntryPayload {
  user_id: string;
  amount: number;
  type: string;
  description?: string;
  reference_id?: string;
}

export function useLedgerEntry() {
  const { insert, isLoading, error } = useConstitutionalOperation({
    showToasts: false,
  });

  const record = useCallback(
    async (entry: LedgerEntryPayload) => {
      const payload = {
        ...entry,
        currency: "ZIMBU",
        created_at: new Date().toISOString(),
      };

      return insert("ledger", payload);
    },
    [insert]
  );

  return { record, isLoading, error };
}

export default useConstitutionalOperation;
