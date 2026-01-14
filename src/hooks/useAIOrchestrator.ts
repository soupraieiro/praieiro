/**
 * AI ORCHESTRATOR HOOK
 * Provides seamless integration with the AI orchestration system
 * Automatically selects the best provider based on capability
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OrchestratorResult {
  response: string;
  provider_used: string;
  fallback_used: boolean;
  fallback_chain: string[];
  latency_ms: number;
  tokens_used: number;
  capability_detected: string;
  audit: {
    hash: string;
    satoshi_timestamp: number;
  };
}

export interface OrchestratorError {
  error: string;
  fallback_chain?: string[];
  audit?: {
    hash: string;
    satoshi_timestamp: number;
  };
}

export interface UseAIOrchestratorOptions {
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  capability?: 'text' | 'vision' | 'image' | 'audio' | 'code' | 'search';
}

export interface UseAIOrchestratorResult {
  call: (message: string, options?: UseAIOrchestratorOptions) => Promise<OrchestratorResult>;
  isLoading: boolean;
  error: string | null;
  lastResult: OrchestratorResult | null;
  clearError: () => void;
}

export function useAIOrchestrator(): UseAIOrchestratorResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<OrchestratorResult | null>(null);

  const call = useCallback(async (
    message: string,
    options?: UseAIOrchestratorOptions
  ): Promise<OrchestratorResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error: invokeError } = await supabase.functions.invoke('ai-orchestrator', {
        body: {
          message,
          capability: options?.capability,
          systemPrompt: options?.systemPrompt,
          maxTokens: options?.maxTokens,
          temperature: options?.temperature,
          userId: userData?.user?.id,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message || 'Failed to invoke AI orchestrator');
      }

      // Check if response contains error
      if (data?.error) {
        throw new Error(data.error);
      }

      const result = data as OrchestratorResult;
      setLastResult(result);

      console.log(
        `[useAIOrchestrator] Success | Provider: ${result.provider_used} | ` +
        `Latency: ${result.latency_ms}ms | Fallback: ${result.fallback_used}`
      );

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao chamar orquestrador de IA';
      setError(errorMessage);
      console.error('[useAIOrchestrator] Error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    call,
    isLoading,
    error,
    lastResult,
    clearError,
  };
}

/**
 * Capability detection utility for frontend use
 */
export function detectCapability(message: string): string {
  const lowerMessage = message.toLowerCase();

  const patterns: Record<string, RegExp[]> = {
    vision: [/imagem|foto|picture|image|ver|olhar/i],
    image: [/gerar.*imagem|criar.*imagem|desenhar/i],
    audio: [/transcrever|áudio|audio|voz/i],
    code: [/código|code|programar|função|debug/i],
    search: [/pesquisar|buscar|procurar|search/i],
  };

  for (const [capability, capPatterns] of Object.entries(patterns)) {
    for (const pattern of capPatterns) {
      if (pattern.test(lowerMessage)) {
        return capability;
      }
    }
  }

  return 'text';
}
