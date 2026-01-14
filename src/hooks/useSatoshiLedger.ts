import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface SatoshiEvent {
  id: string;
  sequence: number;
  idempotency_key: string;
  event_type: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  previous_event_hash: string | null;
  event_hash: string | null;
  created_at: string;
  currency: string;
}

export interface UserLedgerState {
  balance: number;
  signupEvent: SatoshiEvent | null;
  allEvents: SatoshiEvent[];
  isRegistered: boolean;
}

// Padrão de nomenclatura: CATEGORIA:AÇÃO:CONTEXTO
export const buildIdempotencyKey = (category: string, action: string, context: string) => {
  return `${category}:${action}:${context}`;
};

export function useSatoshiLedger() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userState, setUserState] = useState<UserLedgerState | null>(null);

  // Verifica se usuário já está registrado no Ledger
  const checkUserRegistration = useCallback(async (userId: string): Promise<SatoshiEvent | null> => {
    const idempotencyKey = buildIdempotencyKey('USER', 'SIGNUP', userId);
    
    const { data, error: fetchError } = await supabase
      .from('satoshi_events')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (fetchError) {
      console.error('Erro ao verificar registro:', fetchError);
      return null;
    }

    return data as SatoshiEvent | null;
  }, []);

  // Calcula o saldo ZIMBU do usuário a partir dos eventos
  const calculateBalance = useCallback(async (userId: string): Promise<number> => {
    // Buscar todos os eventos relacionados ao usuário
    const { data: events, error: fetchError } = await supabase
      .from('satoshi_events')
      .select('*')
      .or(`idempotency_key.ilike.%${userId}%`)
      .order('sequence', { ascending: true });

    if (fetchError || !events) return 0;

    let balance = 0;
    for (const event of events) {
      const payload = event.payload as Record<string, unknown>;
      
      // Bônus de boas-vindas
      if (event.event_type === 'USER_SIGNUP' && payload.welcome_bonus) {
        balance += Number(payload.welcome_bonus);
      }
      
      // Créditos
      if (event.event_type === 'CREDIT' && payload.amount) {
        balance += Number(payload.amount);
      }
      
      // Débitos
      if (event.event_type === 'DEBIT' && payload.amount) {
        balance -= Number(payload.amount);
      }
      
      // Recompensas
      if (event.event_type === 'REWARD' && payload.amount) {
        balance += Number(payload.amount);
      }
    }

    return balance;
  }, []);

  // Carrega o estado completo do usuário no Ledger
  const loadUserLedgerState = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);

    try {
      const signupEvent = await checkUserRegistration(user.id);
      const balance = await calculateBalance(user.id);

      // Buscar todos os eventos do usuário
      const { data: allEvents } = await supabase
        .from('satoshi_events')
        .select('*')
        .or(`idempotency_key.ilike.%${user.id}%`)
        .order('sequence', { ascending: false });

      setUserState({
        balance,
        signupEvent,
        allEvents: (allEvents || []) as SatoshiEvent[],
        isRegistered: !!signupEvent,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      
      // Tratamento especial para violações constitucionais
      if (errorMessage.includes('A0_VIOLATION')) {
        setError('Operação proibida: O Ledger Satoshi é imutável (Axioma A0)');
      } else if (errorMessage.includes('A0.5_VIOLATION')) {
        setError('Operação proibida: O evento GENESIS não pode ser alterado (Axioma A0.5)');
      } else if (errorMessage.includes('CONSTITUTIONAL_VIOLATION')) {
        setError('Esta ação é proibida pela Constituição Técnica da plataforma PRAIEIRO');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [user, checkUserRegistration, calculateBalance]);

  // Registra novo usuário no Ledger (após login Google)
  const registerUserSignup = useCallback(async (method: 'google' | 'email' = 'google'): Promise<SatoshiEvent | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Verificar se já está registrado
      const existingEvent = await checkUserRegistration(user.id);
      if (existingEvent) {
        // Já registrado, retornar evento existente
        await loadUserLedgerState();
        return existingEvent;
      }

      // Buscar próxima sequência
      const { data: lastEvent } = await supabase
        .from('satoshi_events')
        .select('sequence')
        .order('sequence', { ascending: false })
        .limit(1)
        .single();

      const nextSequence = (lastEvent?.sequence || 0) + 1;
      const idempotencyKey = buildIdempotencyKey('USER', 'SIGNUP', user.id);

      // Criar evento de signup
      const { data: newEvent, error: insertError } = await supabase
        .from('satoshi_events')
        .insert({
          sequence: nextSequence,
          idempotency_key: idempotencyKey,
          event_type: 'USER_SIGNUP',
          currency: 'ZIMBU',
          payload: {
            method,
            welcome_bonus: 1000,
            status: 'active',
            user_email: user.email,
            registered_at: new Date().toISOString(),
          },
          metadata: {
            source: 'praieiro_web',
            version: '1.0.0',
          },
        })
        .select()
        .single();

      if (insertError) {
        // Tratar erros constitucionais
        if (insertError.message.includes('A0_VIOLATION')) {
          throw new Error('Operação proibida: O Ledger é append-only (Axioma A0)');
        }
        if (insertError.message.includes('SEQUENCE BREAK')) {
          // Tentar novamente com sequência correta (race condition)
          return registerUserSignup(method);
        }
        throw insertError;
      }

      await loadUserLedgerState();
      return newEvent as SatoshiEvent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao registrar usuário';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, checkUserRegistration, loadUserLedgerState]);

  return {
    loading,
    error,
    userState,
    loadUserLedgerState,
    registerUserSignup,
    checkUserRegistration,
    calculateBalance,
    buildIdempotencyKey,
  };
}
