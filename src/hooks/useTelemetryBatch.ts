/**
 * TELEMETRY BATCH PROCESSOR HOOK
 * Aggregates logs before sending to Supabase
 * Prevents network overload with billions of small requests
 * 
 * @constitutional Art. 6.2: ISOLAMENTO DE EVENTOS (500ms batching)
 * @constitutional Art. IV: LIMITE DE PAYLOADS (50KB max)
 */

import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BatchProcessor } from '@/lib/hyperscale';

export interface TelemetryEvent {
  event_name: string;
  event_type: 'track' | 'page' | 'identify' | 'error';
  properties: Record<string, unknown>;
  timestamp?: number;
  session_id?: string;
  user_id?: string;
}

interface BatchedTelemetry {
  events: TelemetryEvent[];
  batch_id: string;
  batch_size: number;
  compressed_size?: number;
  sent_at: number;
}

interface UseTelemetryBatchResult {
  track: (eventName: string, properties?: Record<string, unknown>) => void;
  page: (pageName: string, properties?: Record<string, unknown>) => void;
  error: (errorMessage: string, context?: Record<string, unknown>) => void;
  flush: () => Promise<void>;
  getQueueSize: () => number;
}

// Singleton batch processor to ensure single queue across components
let globalBatchProcessor: BatchProcessor<TelemetryEvent> | null = null;
let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
  return sessionId;
}

async function sendBatch(events: TelemetryEvent[]): Promise<void> {
  if (events.length === 0) return;

  const batch: BatchedTelemetry = {
    events,
    batch_id: `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    batch_size: events.length,
    sent_at: Date.now(),
  };

  // Check payload size (Art. IV: max 50KB)
  const payload = JSON.stringify(batch);
  if (payload.length > 50000) {
    console.warn('[TelemetryBatch] Payload exceeds 50KB, splitting batch');
    const halfSize = Math.floor(events.length / 2);
    await Promise.all([
      sendBatch(events.slice(0, halfSize)),
      sendBatch(events.slice(halfSize)),
    ]);
    return;
  }

  batch.compressed_size = payload.length;

  try {
    // Send to multiple endpoints in parallel
    await Promise.allSettled([
      // PostHog batch
      supabase.functions.invoke('posthog-track', {
        body: {
          action: 'batch',
          events: events.map(e => ({
            event: e.event_name,
            properties: e.properties,
            timestamp: new Date(e.timestamp || Date.now()).toISOString(),
          })),
        },
      }),
      // Mixpanel batch
      supabase.functions.invoke('mixpanel-track', {
        body: {
          action: 'track',
          events: events.map(e => ({
            name: e.event_name,
            properties: {
              ...e.properties,
              session_id: e.session_id,
              timestamp: e.timestamp,
            },
          })),
        },
      }),
    ]);

    console.log(`[TelemetryBatch] Sent ${events.length} events (${batch.compressed_size} bytes)`);
  } catch (error) {
    console.error('[TelemetryBatch] Send failed:', error);
    // Events will be re-queued by BatchProcessor if retryOnFailure is true
    throw error;
  }
}

function getBatchProcessor(): BatchProcessor<TelemetryEvent> {
  if (!globalBatchProcessor) {
    globalBatchProcessor = new BatchProcessor<TelemetryEvent>(sendBatch, {
      maxBatchSize: 50,
      flushIntervalMs: 500, // Art. 6.2
      maxQueueSize: 1000,
      retryOnFailure: true,
    });
  }
  return globalBatchProcessor;
}

export function useTelemetryBatch(): UseTelemetryBatchResult {
  const processor = useRef(getBatchProcessor());

  // Flush on unmount
  useEffect(() => {
    return () => {
      processor.current.flush();
    };
  }, []);

  // Flush on page visibility change (user navigating away)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        processor.current.flush();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const track = useCallback((
    eventName: string, 
    properties: Record<string, unknown> = {}
  ) => {
    processor.current.add({
      event_name: eventName,
      event_type: 'track',
      properties: {
        ...properties,
        url: window.location.href,
        referrer: document.referrer,
        screen_width: window.innerWidth,
        screen_height: window.innerHeight,
      },
      timestamp: Date.now(),
      session_id: getSessionId(),
    });
  }, []);

  const page = useCallback((
    pageName: string,
    properties: Record<string, unknown> = {}
  ) => {
    processor.current.add({
      event_name: `page_${pageName}`,
      event_type: 'page',
      properties: {
        ...properties,
        page_name: pageName,
        url: window.location.href,
        path: window.location.pathname,
        title: document.title,
      },
      timestamp: Date.now(),
      session_id: getSessionId(),
    });
  }, []);

  const error = useCallback((
    errorMessage: string,
    context: Record<string, unknown> = {}
  ) => {
    // Errors bypass queue and send immediately
    processor.current.add({
      event_name: 'error_occurred',
      event_type: 'error',
      properties: {
        error_message: errorMessage,
        ...context,
        url: window.location.href,
      },
      timestamp: Date.now(),
      session_id: getSessionId(),
    });
    
    // Force flush errors immediately
    processor.current.flush();
  }, []);

  const flush = useCallback(async () => {
    await processor.current.flush();
  }, []);

  const getQueueSize = useCallback(() => {
    return processor.current.getQueueSize();
  }, []);

  return { track, page, error, flush, getQueueSize };
}
