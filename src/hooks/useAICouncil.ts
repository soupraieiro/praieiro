/**
 * AI COUNCIL HOOK
 * Provides integration with the multi-provider AI Council system
 * Supports Groq, OpenRouter, HuggingFace with consensus arbitration
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProviderResponse {
  provider: string;
  response: string;
  latency_ms: number;
  tokens_used: number;
  confidence?: number;
}

export interface CouncilDecision {
  consensus: boolean;
  final_answer: string;
  reasoning: string;
  providers_consulted: ProviderResponse[];
  arbitration_needed: boolean;
  satoshi_hash: string;
  timestamp: number;
}

export interface UseAICouncilOptions {
  context?: Record<string, unknown>;
  mode?: 'consensus' | 'fastest' | 'arbitration';
  providers?: ('groq' | 'openrouter' | 'huggingface')[];
}

export interface UseAICouncilResult {
  consult: (question: string, options?: UseAICouncilOptions) => Promise<CouncilDecision>;
  isConsulting: boolean;
  error: string | null;
  lastDecision: CouncilDecision | null;
  clearError: () => void;
}

export function useAICouncil(): UseAICouncilResult {
  const [isConsulting, setIsConsulting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDecision, setLastDecision] = useState<CouncilDecision | null>(null);

  const consult = useCallback(async (
    question: string,
    options?: UseAICouncilOptions
  ): Promise<CouncilDecision> => {
    setIsConsulting(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error: invokeError } = await supabase.functions.invoke('ai-council', {
        body: {
          question,
          context: options?.context,
          mode: options?.mode || 'consensus',
          providers: options?.providers || ['groq', 'openrouter'],
          userId: userData?.user?.id,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message || 'Failed to consult AI Council');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const decision = data as CouncilDecision;
      setLastDecision(decision);

      console.log(
        `[useAICouncil] Decision received | Consensus: ${decision.consensus} | ` +
        `Providers: ${decision.providers_consulted.length} | ` +
        `Arbitration: ${decision.arbitration_needed}`
      );

      return decision;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao consultar Conselho de IAs';
      setError(errorMessage);
      console.error('[useAICouncil] Error:', err);
      throw err;
    } finally {
      setIsConsulting(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    consult,
    isConsulting,
    error,
    lastDecision,
    clearError,
  };
}
