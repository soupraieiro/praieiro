/**
 * OPTIMISTIC UPDATE HOOK
 * Provides zero-latency UI updates with automatic rollback
 * 
 * UI responds in <100ms while processing happens in background
 * 
 * @constitutional Art. 2.2: OTIMIZAÇÃO DE CARGA (SERVERLESS)
 */

import { useState, useCallback, useRef } from 'react';

export interface OptimisticResult<T> {
  data: T | null;
  isPending: boolean;
  isConfirmed: boolean;
  error: string | null;
}

export interface UseOptimisticUpdateResult<T> {
  value: T | null;
  isPending: boolean;
  error: string | null;
  execute: (
    optimisticValue: T,
    asyncOperation: () => Promise<T>
  ) => Promise<T | null>;
  reset: () => void;
}

export function useOptimisticUpdate<T>(
  initialValue: T | null = null
): UseOptimisticUpdateResult<T> {
  const [value, setValue] = useState<T | null>(initialValue);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousValue = useRef<T | null>(initialValue);

  const execute = useCallback(async (
    optimisticValue: T,
    asyncOperation: () => Promise<T>
  ): Promise<T | null> => {
    // Store previous value for potential rollback
    previousValue.current = value;
    
    // Apply optimistic update IMMEDIATELY
    setValue(optimisticValue);
    setIsPending(true);
    setError(null);

    try {
      // Execute async operation in background
      const confirmedValue = await asyncOperation();
      
      // Confirm with server response
      setValue(confirmedValue);
      setIsPending(false);
      
      return confirmedValue;
    } catch (err) {
      // Rollback on error
      setValue(previousValue.current);
      setError(err instanceof Error ? err.message : 'Operation failed');
      setIsPending(false);
      
      console.error('[useOptimisticUpdate] Rollback triggered:', err);
      return null;
    }
  }, [value]);

  const reset = useCallback(() => {
    setValue(initialValue);
    setIsPending(false);
    setError(null);
    previousValue.current = initialValue;
  }, [initialValue]);

  return {
    value,
    isPending,
    error,
    execute,
    reset,
  };
}

/**
 * Batch optimistic updates for lists
 */
export interface UseOptimisticListResult<T> {
  items: T[];
  isPending: boolean;
  add: (item: T, asyncAdd: () => Promise<T>) => Promise<void>;
  remove: (id: string, asyncRemove: () => Promise<void>) => Promise<void>;
  update: (id: string, updated: T, asyncUpdate: () => Promise<T>) => Promise<void>;
}

export function useOptimisticList<T extends { id: string }>(
  initialItems: T[] = []
): UseOptimisticListResult<T> {
  const [items, setItems] = useState<T[]>(initialItems);
  const [isPending, setIsPending] = useState(false);
  const previousItems = useRef<T[]>(initialItems);

  const add = useCallback(async (item: T, asyncAdd: () => Promise<T>) => {
    previousItems.current = [...items];
    
    // Optimistic add
    setItems(prev => [...prev, item]);
    setIsPending(true);

    try {
      const confirmed = await asyncAdd();
      setItems(prev => prev.map(i => i.id === item.id ? confirmed : i));
    } catch (err) {
      // Rollback
      setItems(previousItems.current);
      console.error('[useOptimisticList] Add rollback:', err);
    } finally {
      setIsPending(false);
    }
  }, [items]);

  const remove = useCallback(async (id: string, asyncRemove: () => Promise<void>) => {
    previousItems.current = [...items];
    
    // Optimistic remove
    setItems(prev => prev.filter(i => i.id !== id));
    setIsPending(true);

    try {
      await asyncRemove();
    } catch (err) {
      // Rollback
      setItems(previousItems.current);
      console.error('[useOptimisticList] Remove rollback:', err);
    } finally {
      setIsPending(false);
    }
  }, [items]);

  const update = useCallback(async (
    id: string, 
    updated: T, 
    asyncUpdate: () => Promise<T>
  ) => {
    previousItems.current = [...items];
    
    // Optimistic update
    setItems(prev => prev.map(i => i.id === id ? updated : i));
    setIsPending(true);

    try {
      const confirmed = await asyncUpdate();
      setItems(prev => prev.map(i => i.id === id ? confirmed : i));
    } catch (err) {
      // Rollback
      setItems(previousItems.current);
      console.error('[useOptimisticList] Update rollback:', err);
    } finally {
      setIsPending(false);
    }
  }, [items]);

  return { items, isPending, add, remove, update };
}
