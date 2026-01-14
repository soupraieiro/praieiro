/**
 * CLUSTER DE CONSCIÊNCIA DE DADOS UNIFICADO
 * Mixpanel (funil) + PostHog (comportamento) + Database (intenção)
 * 
 * Cada interação é processada simultaneamente como:
 * - Evento de funil no Mixpanel
 * - Gravação de comportamento no PostHog
 * - Registro de intenção no Database
 */

import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { UnifiedPin } from './useGeoCluster';

interface DataEvent {
  eventName: string;
  category: 'search' | 'map' | 'whatsapp' | 'order' | 'navigation' | 'error';
  properties: Record<string, unknown>;
  pin?: UnifiedPin;
  flowStep?: string;
  success?: boolean;
}

interface UseDataClusterResult {
  trackEvent: (event: DataEvent) => Promise<void>;
  trackSearch: (query: string, resultCount: number, selectedPin?: UnifiedPin) => Promise<void>;
  trackMapInteraction: (action: 'view' | 'click' | 'zoom' | 'pan', pin?: UnifiedPin) => Promise<void>;
  trackWhatsAppAction: (pin: UnifiedPin, vendorId: string | undefined, action: 'generate' | 'click') => Promise<void>;
  trackError: (error: string, context: Record<string, unknown>) => Promise<void>;
  identifyUser: (userId: string, traits?: Record<string, unknown>) => Promise<void>;
  getSessionId: () => string;
}

export function useDataCluster(): UseDataClusterResult {
  const sessionId = useRef(`session_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const distinctId = useRef<string | null>(null);
  const eventQueue = useRef<DataEvent[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Gerar ou recuperar distinct ID
  useEffect(() => {
    const storedId = localStorage.getItem('praieiro_distinct_id');
    if (storedId) {
      distinctId.current = storedId;
    } else {
      const newId = `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('praieiro_distinct_id', newId);
      distinctId.current = newId;
    }
  }, []);

  /**
   * Processa evento em paralelo em todas as plataformas
   */
  const processEventParallel = useCallback(async (event: DataEvent) => {
    const timestamp = new Date().toISOString();
    const baseProperties: Record<string, unknown> = {
      session_id: sessionId.current,
      timestamp,
      platform: 'web',
      user_agent: navigator.userAgent,
      language: navigator.language,
      url: window.location.href,
      referrer: document.referrer,
      ...event.properties
    };

    // Adicionar dados do pin se disponível
    if (event.pin) {
      baseProperties.pin_id = event.pin.id;
      baseProperties.pin_name = event.pin.name;
      baseProperties.pin_lat = event.pin.latitude;
      baseProperties.pin_lng = event.pin.longitude;
      baseProperties.pin_type = event.pin.placeType;
    }

    // Executar em paralelo para reduzir latência
    await Promise.allSettled([
      // 1. Mixpanel - Evento de funil
      trackMixpanel(event.eventName, baseProperties),
      
      // 2. PostHog - Gravação de comportamento
      trackPostHog(event.eventName, baseProperties),
      
      // 3. Database - Registro de intenção (se relevante)
      event.category === 'search' || event.pin 
        ? recordIntent(event, baseProperties)
        : Promise.resolve()
    ]);
  }, []);

  /**
   * Track genérico com batching inteligente
   */
  const trackEvent = useCallback(async (event: DataEvent) => {
    eventQueue.current.push(event);

    // Flush imediato para eventos críticos
    if (event.category === 'error' || event.category === 'order') {
      await processEventParallel(event);
      return;
    }

    // Batch para eventos não-críticos (debounce 500ms)
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }

    flushTimeoutRef.current = setTimeout(async () => {
      const eventsToProcess = [...eventQueue.current];
      eventQueue.current = [];
      
      for (const evt of eventsToProcess) {
        await processEventParallel(evt);
      }
    }, 500);
  }, [processEventParallel]);

  /**
   * Track de busca com contexto completo
   */
  const trackSearch = useCallback(async (
    query: string, 
    resultCount: number, 
    selectedPin?: UnifiedPin
  ) => {
    await trackEvent({
      eventName: selectedPin ? 'search_result_selected' : 'search_performed',
      category: 'search',
      properties: {
        query,
        result_count: resultCount,
        has_results: resultCount > 0,
        selected: !!selectedPin
      },
      pin: selectedPin,
      flowStep: selectedPin ? 'search_to_selection' : 'search_initiated',
      success: resultCount > 0
    });
  }, [trackEvent]);

  /**
   * Track de interação com mapa
   */
  const trackMapInteraction = useCallback(async (
    action: 'view' | 'click' | 'zoom' | 'pan',
    pin?: UnifiedPin
  ) => {
    await trackEvent({
      eventName: `map_${action}`,
      category: 'map',
      properties: {
        action,
        has_pin: !!pin
      },
      pin,
      flowStep: `map_interaction_${action}`
    });
  }, [trackEvent]);

  /**
   * Track de ação do WhatsApp
   */
  const trackWhatsAppAction = useCallback(async (
    pin: UnifiedPin,
    vendorId: string | undefined,
    action: 'generate' | 'click'
  ) => {
    await trackEvent({
      eventName: `whatsapp_${action}`,
      category: 'whatsapp',
      properties: {
        action,
        vendor_id: vendorId,
        conversion_step: action === 'click' ? 'final' : 'intent'
      },
      pin,
      flowStep: action === 'click' ? 'whatsapp_opened' : 'whatsapp_link_generated',
      success: true
    });
  }, [trackEvent]);

  /**
   * Track de erro com contexto
   */
  const trackError = useCallback(async (
    error: string,
    context: Record<string, unknown>
  ) => {
    await trackEvent({
      eventName: 'error_occurred',
      category: 'error',
      properties: {
        error_message: error,
        ...context
      },
      success: false
    });
  }, [trackEvent]);

  /**
   * Identificar usuário em todas as plataformas
   */
  const identifyUser = useCallback(async (
    userId: string,
    traits?: Record<string, unknown>
  ) => {
    distinctId.current = userId;
    localStorage.setItem('praieiro_distinct_id', userId);

    await Promise.allSettled([
      // Mixpanel identify
      supabase.functions.invoke('mixpanel-track', {
        body: {
          action: 'identify',
          userId,
          profileData: traits
        }
      }),
      
      // PostHog identify
      supabase.functions.invoke('posthog-track', {
        body: {
          action: 'identify',
          distinctId: userId,
          userProperties: traits
        }
      })
    ]);
  }, []);

  const getSessionId = useCallback(() => sessionId.current, []);

  return {
    trackEvent,
    trackSearch,
    trackMapInteraction,
    trackWhatsAppAction,
    trackError,
    identifyUser,
    getSessionId
  };
}

// ========== Funções auxiliares internas ==========

async function trackMixpanel(eventName: string, properties: Record<string, unknown>): Promise<void> {
  try {
    await supabase.functions.invoke('mixpanel-track', {
      body: {
        action: 'track',
        events: [{
          name: eventName,
          properties
        }]
      }
    });
  } catch (err) {
    console.warn('Mixpanel tracking failed:', err);
  }
}

async function trackPostHog(eventName: string, properties: Record<string, unknown>): Promise<void> {
  try {
    const distinctId = localStorage.getItem('praieiro_distinct_id') || 'anonymous';
    await supabase.functions.invoke('posthog-track', {
      body: {
        action: 'capture',
        event: eventName,
        distinctId,
        properties
      }
    });
  } catch (err) {
    console.warn('PostHog tracking failed:', err);
  }
}

async function recordIntent(event: DataEvent, properties: Record<string, unknown>): Promise<void> {
  try {
    if (event.pin) {
      const deviceInfo = JSON.stringify({
        userAgent: String(properties.user_agent || ''),
        language: String(properties.language || '')
      });
      
      await supabase.from('search_intents').insert([{
        session_id: String(properties.session_id || ''),
        query: String(properties.query || event.eventName),
        place_id: event.pin.googlePlaceId || null,
        place_name: event.pin.name,
        place_type: event.pin.placeType || null,
        latitude: event.pin.latitude,
        longitude: event.pin.longitude,
        selected: event.flowStep?.includes('select') || false,
        flow_success: event.success ?? null,
        device_info: JSON.parse(deviceInfo)
      }]);
    }
  } catch (err) {
    console.warn('Intent recording failed:', err);
  }
}
