/**
 * HOOK DE FILA DE CADASTROS - Anti-Exaustão Gmail
 * 
 * Problema: Picos de cadastro causam rate limit no Gmail
 * Solução: Sistema de fila com retry exponencial
 * 
 * Funcionalidades:
 * - Enfileirar cadastros com posição estimada
 * - Monitorar status em tempo real
 * - Estatísticas para dashboard
 * - Fallback para SMS quando email falha 3x
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface QueueStats {
  total_pending: number;
  total_processing: number;
  total_completed: number;
  total_failed: number;
  avg_wait_time_ms: number;
  estimated_clear_time_ms: number;
  rate_limit_remaining: number;
  last_processed_at: string | null;
}

export interface QueuePosition {
  queue_id: string;
  email: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'fallback';
  position: number | null;
  attempts: number;
  created_at: string;
  processed_at: string | null;
  estimated_wait_ms: number;
}

export interface EnqueueResult {
  success: boolean;
  queue_id?: string;
  position?: number;
  estimated_wait_ms?: number;
  error?: string;
  satoshi_hash?: string;
}

export interface UseRegistrationQueueResult {
  // Ações
  enqueueRegistration: (email: string, phone?: string, metadata?: Record<string, unknown>) => Promise<EnqueueResult>;
  checkPosition: (queueIdOrEmail: string) => Promise<QueuePosition | null>;
  getStats: () => Promise<QueueStats | null>;
  
  // Estado
  stats: QueueStats | null;
  isLoading: boolean;
  error: string | null;
  
  // Realtime
  startRealtimeUpdates: () => void;
  stopRealtimeUpdates: () => void;
}

export function useRegistrationQueue(): UseRegistrationQueueResult {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Enfileirar novo cadastro
   */
  const enqueueRegistration = useCallback(async (
    email: string,
    phone?: string,
    metadata?: Record<string, unknown>
  ): Promise<EnqueueResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('registration-queue', {
        body: {
          action: 'enqueue',
          email,
          phone,
          metadata: {
            ...metadata,
            user_agent: navigator.userAgent,
            language: navigator.language
          }
        }
      });

      if (fnError) throw new Error(fnError.message);

      if (data.error) {
        return { success: false, error: data.error };
      }

      console.log('[REG-QUEUE] Enqueued:', {
        queue_id: data.queue_id,
        position: data.position,
        estimated_wait: `${Math.round(data.estimated_wait_ms / 1000)}s`
      });

      return {
        success: true,
        queue_id: data.queue_id,
        position: data.position,
        estimated_wait_ms: data.estimated_wait_ms,
        satoshi_hash: data.satoshi_hash
      };

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enfileirar cadastro';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Verificar posição na fila
   */
  const checkPosition = useCallback(async (
    queueIdOrEmail: string
  ): Promise<QueuePosition | null> => {
    setIsLoading(true);

    try {
      const isEmail = queueIdOrEmail.includes('@');
      
      const { data, error: fnError } = await supabase.functions.invoke('registration-queue', {
        body: {
          action: 'check_position',
          ...(isEmail ? { email: queueIdOrEmail } : { queue_id: queueIdOrEmail })
        }
      });

      if (fnError) throw new Error(fnError.message);
      if (data.error) throw new Error(data.error);

      return data as QueuePosition;

    } catch (err) {
      console.error('[REG-QUEUE] Check position error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Obter estatísticas da fila
   */
  const getStats = useCallback(async (): Promise<QueueStats | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('registration-queue', {
        body: { action: 'get_stats' }
      });

      if (fnError) throw new Error(fnError.message);

      const newStats = data as QueueStats;
      setStats(newStats);
      return newStats;

    } catch (err) {
      console.error('[REG-QUEUE] Get stats error:', err);
      return null;
    }
  }, []);

  /**
   * Iniciar atualizações em tempo real
   */
  const startRealtimeUpdates = useCallback(() => {
    // Polling a cada 5 segundos (mais confiável que realtime para stats)
    if (pollIntervalRef.current) return;

    getStats(); // Busca inicial

    pollIntervalRef.current = setInterval(() => {
      getStats();
    }, 5000);

    console.log('[REG-QUEUE] Realtime updates started');
  }, [getStats]);

  /**
   * Parar atualizações em tempo real
   */
  const stopRealtimeUpdates = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log('[REG-QUEUE] Realtime updates stopped');
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      stopRealtimeUpdates();
    };
  }, [stopRealtimeUpdates]);

  return {
    enqueueRegistration,
    checkPosition,
    getStats,
    stats,
    isLoading,
    error,
    startRealtimeUpdates,
    stopRealtimeUpdates
  };
}
