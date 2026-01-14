/**
 * STREAM RESILIENCE HOOK
 * Auto-reconnection with exponential backoff for realtime streams
 * Maintains context across disconnections
 * 
 * @constitutional Art. 7.2: DEGRADAÇÃO GRACIOSA
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ExponentialBackoff, ResilientConnection, ConnectionState } from '@/lib/hyperscale';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface StreamConfig {
  channelName: string;
  event: string;
  schema?: string;
  table?: string;
  filter?: string;
  onMessage: (payload: unknown) => void;
  onError?: (error: Error) => void;
  onReconnect?: (attempt: number) => void;
  maxLatencyMs?: number;
}

export interface UseStreamResilienceResult {
  isConnected: boolean;
  reconnectAttempts: number;
  lastError: string | null;
  subscribe: () => void;
  unsubscribe: () => void;
  getConnectionState: () => ConnectionState;
}

export function useStreamResilience(config: StreamConfig): UseStreamResilienceResult {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const backoffRef = useRef(new ExponentialBackoff({
    initialDelayMs: 100,
    maxDelayMs: 30000,
    multiplier: 1.5,
    maxRetries: 20,
    jitterFactor: 0.2,
  }));
  const messageBufferRef = useRef<unknown[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const degradedModeRef = useRef(false);

  // Buffer messages during disconnection
  const bufferMessage = useCallback((payload: unknown) => {
    if (messageBufferRef.current.length < 100) {
      messageBufferRef.current.push(payload);
    }
  }, []);

  // Flush buffered messages after reconnection
  const flushBuffer = useCallback(() => {
    const buffer = messageBufferRef.current;
    messageBufferRef.current = [];
    
    buffer.forEach(payload => {
      config.onMessage(payload);
    });
    
    if (buffer.length > 0) {
      console.log(`[StreamResilience] Flushed ${buffer.length} buffered messages`);
    }
  }, [config.onMessage]);

  // Check latency and switch to degraded mode if needed
  const checkLatency = useCallback((startTime: number) => {
    const latency = Date.now() - startTime;
    const maxLatency = config.maxLatencyMs || 2000;

    if (latency > maxLatency && !degradedModeRef.current) {
      console.warn(`[StreamResilience] High latency (${latency}ms), switching to batch mode`);
      degradedModeRef.current = true;
      // Art. 7.2: Degradação graciosa - switch to polling
    } else if (latency < maxLatency / 2 && degradedModeRef.current) {
      console.log('[StreamResilience] Latency normalized, resuming realtime mode');
      degradedModeRef.current = false;
    }
  }, [config.maxLatencyMs]);

  const subscribe = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    const startTime = Date.now();

    channelRef.current = supabase
      .channel(config.channelName)
      .on(
        'postgres_changes',
        {
          event: config.event as any,
          schema: config.schema || 'public',
          table: config.table,
          filter: config.filter,
        },
        (payload) => {
          checkLatency(startTime);
          
          if (degradedModeRef.current) {
            bufferMessage(payload);
          } else {
            config.onMessage(payload);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setLastError(null);
          backoffRef.current.reset();
          flushBuffer();
          console.log(`[StreamResilience] Connected to ${config.channelName}`);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          scheduleReconnect();
        }
      });
  }, [config, checkLatency, bufferMessage, flushBuffer]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = backoffRef.current.getNextDelay();
    
    if (delay < 0) {
      setLastError('Max reconnection attempts reached');
      config.onError?.(new Error('Max reconnection attempts reached'));
      return;
    }

    const attempt = backoffRef.current.getAttempt();
    setReconnectAttempts(attempt);
    config.onReconnect?.(attempt);
    
    console.log(`[StreamResilience] Reconnecting in ${delay}ms (attempt ${attempt})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      subscribe();
    }, delay);
  }, [subscribe, config]);

  const unsubscribe = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    setIsConnected(false);
    setReconnectAttempts(0);
  }, []);

  const getConnectionState = useCallback((): ConnectionState => ({
    connected: isConnected,
    lastConnected: isConnected ? Date.now() : null,
    reconnectAttempts,
    nextReconnectMs: backoffRef.current.canRetry() 
      ? backoffRef.current.getNextDelay() 
      : null,
  }), [isConnected, reconnectAttempts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  // Auto-reconnect on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected) {
        backoffRef.current.reset();
        subscribe();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isConnected, subscribe]);

  return {
    isConnected,
    reconnectAttempts,
    lastError,
    subscribe,
    unsubscribe,
    getConnectionState,
  };
}

/**
 * Simplified presence channel with resilience
 */
export function useResilientPresence(
  channelName: string,
  userState: Record<string, unknown>
) {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, unknown>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const backoff = useRef(new ExponentialBackoff());

  const connect = useCallback(async () => {
    if (channelRef.current) {
      await channelRef.current.unsubscribe();
    }

    channelRef.current = supabase.channel(channelName)
      .on('presence', { event: 'sync' }, () => {
        const state = channelRef.current?.presenceState();
        if (state) {
          const users = new Map<string, unknown>();
          Object.entries(state).forEach(([key, presences]) => {
            if (Array.isArray(presences) && presences.length > 0) {
              users.set(key, presences[0]);
            }
          });
          setOnlineUsers(users);
        }
        backoff.current.reset();
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setOnlineUsers(prev => {
          const next = new Map(prev);
          if (newPresences.length > 0) {
            next.set(key, newPresences[0]);
          }
          return next;
        });
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channelRef.current?.track(userState);
        }
      });
  }, [channelName, userState]);

  useEffect(() => {
    connect();
    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [connect]);

  return { onlineUsers, reconnect: connect };
}
