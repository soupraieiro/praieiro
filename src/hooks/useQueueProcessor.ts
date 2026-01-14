/**
 * QUEUE PROCESSOR HOOK
 * Provides integration with Upstash Redis queue system
 * Manages registration queue to prevent Gmail exhaustion errors
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface QueueItem {
  id: string;
  payload: Record<string, unknown>;
  priority: number;
  created_at: string;
  status: string;
}

export interface QueueStatus {
  length: number;
  oldest?: string;
  backend: string;
  queue: string;
}

export interface UseQueueProcessorResult {
  enqueue: (queueName: string, payload: Record<string, unknown>) => Promise<string>;
  dequeue: (queueName: string, batchSize?: number) => Promise<QueueItem[]>;
  getStatus: (queueName: string) => Promise<QueueStatus>;
  clearQueue: (queueName: string) => Promise<number>;
  isProcessing: boolean;
  error: string | null;
  clearError: () => void;
}

export function useQueueProcessor(): UseQueueProcessorResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enqueue = useCallback(async (
    queueName: string,
    payload: Record<string, unknown>
  ): Promise<string> => {
    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('queue-processor', {
        body: {
          action: 'enqueue',
          queue_name: queueName,
          payload,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to enqueue');
      }

      console.log(`[useQueueProcessor] Enqueued to ${queueName}: ${data.id}`);
      return data.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao adicionar à fila';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const dequeue = useCallback(async (
    queueName: string,
    batchSize: number = 1
  ): Promise<QueueItem[]> => {
    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('queue-processor', {
        body: {
          action: 'dequeue',
          queue_name: queueName,
          batch_size: batchSize,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to dequeue');
      }

      console.log(`[useQueueProcessor] Dequeued ${data.count} from ${queueName}`);
      return data.items || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao remover da fila';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const getStatus = useCallback(async (queueName: string): Promise<QueueStatus> => {
    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('queue-processor', {
        body: {
          action: 'status',
          queue_name: queueName,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to get status');
      }

      return data as QueueStatus;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao obter status';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearQueue = useCallback(async (queueName: string): Promise<number> => {
    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('queue-processor', {
        body: {
          action: 'clear',
          queue_name: queueName,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to clear queue');
      }

      console.log(`[useQueueProcessor] Cleared ${data.cleared} from ${queueName}`);
      return data.cleared || 0;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao limpar fila';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    enqueue,
    dequeue,
    getStatus,
    clearQueue,
    isProcessing,
    error,
    clearError,
  };
}
