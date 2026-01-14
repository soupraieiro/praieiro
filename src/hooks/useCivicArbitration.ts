import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateSatoshiHash, generateImmutableHash } from './useConstitutionalGovernance';

// ===========================================
// CIVIC ARBITRATION HOOK
// Camada IX: Governança do Conflito (Humano × Humano)
// A IA não julga conflitos morais. Ela apenas:
// - Apresenta fatos
// - Simula impactos
// - Executa decisões humanas
// ===========================================

export interface ArbitrationCase {
  id: string;
  case_number: string;
  plaintiff_id: string;
  defendant_id: string;
  case_type: string;
  case_summary: string;
  evidence_plaintiff: unknown[];
  evidence_defendant: unknown[];
  status: 'submitted' | 'under_review' | 'panel_assigned' | 'deliberating' | 'decision_made' | 'appealed' | 'final' | 'closed';
  submitted_at: string;
  assigned_at: string | null;
  decision_at: string | null;
  appeal_deadline: string | null;
  appeal_count: number;
  satoshi_hash: string | null;
}

export interface CivicArbitrator {
  id: string;
  user_id: string;
  arbitrator_name: string;
  specializations: string[];
  cases_judged: number;
  approval_rating: number;
  is_active: boolean;
  last_case_at: string | null;
  disqualified_until: string | null;
}

export interface ArbitrationPanel {
  id: string;
  case_id: string;
  arbitrator_id: string;
  panel_position: number;
  vote: string | null;
  vote_reasoning: string | null;
  voted_at: string | null;
  recused: boolean;
  arbitrator?: CivicArbitrator;
}

export interface ArbitrationDecision {
  id: string;
  case_id: string;
  decision_summary: string;
  decision_details: Record<string, unknown>;
  votes_for_plaintiff: number;
  votes_for_defendant: number;
  votes_neutral: number;
  remedies_ordered: unknown[];
  ai_fact_presentation: Record<string, unknown>;
  ai_impact_simulation: Record<string, unknown>;
  is_final: boolean;
  finalized_at: string | null;
  satoshi_hash: string;
  immutable_hash: string;
}

export interface AIFactPresentation {
  timeline: { date: string; event: string; source: string }[];
  evidenceSummary: { type: string; description: string; credibility: number }[];
  conflictingClaims: { claim: string; plaintiff: boolean; defendant: boolean }[];
  objectiveFacts: string[];
}

export interface AIImpactSimulation {
  plaintiffWins: {
    financialImpact: number;
    reputationImpact: string;
    systemicRisk: number;
  };
  defendantWins: {
    financialImpact: number;
    reputationImpact: string;
    systemicRisk: number;
  };
  neutralOutcome: {
    financialImpact: number;
    reputationImpact: string;
    systemicRisk: number;
  };
  recommendedRemedies: string[];
}

export function useCivicArbitration(caseId?: string) {
  const [currentCase, setCurrentCase] = useState<ArbitrationCase | null>(null);
  const [myCases, setMyCases] = useState<ArbitrationCase[]>([]);
  const [panel, setPanel] = useState<ArbitrationPanel[]>([]);
  const [decision, setDecision] = useState<ArbitrationDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [isArbitrator, setIsArbitrator] = useState(false);
  const [myArbitratorId, setMyArbitratorId] = useState<string | null>(null);

  // Load case details
  const loadCase = useCallback(async (id: string) => {
    try {
      setLoading(true);

      const [caseRes, panelRes, decisionRes] = await Promise.all([
        supabase.from('arbitration_cases').select('*').eq('id', id).single(),
        supabase.from('arbitration_panels').select('*').eq('case_id', id),
        supabase.from('arbitration_decisions').select('*').eq('case_id', id).single()
      ]);

      if (caseRes.data) setCurrentCase(caseRes.data as ArbitrationCase);
      if (panelRes.data) setPanel(panelRes.data as ArbitrationPanel[]);
      if (decisionRes.data) setDecision(decisionRes.data as ArbitrationDecision);
    } catch (err) {
      console.error('[Arbitration] Error loading case:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load user's cases (as plaintiff or defendant)
  const loadMyCases = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: cases } = await supabase
        .from('arbitration_cases')
        .select('*')
        .or(`plaintiff_id.eq.${user.id},defendant_id.eq.${user.id}`)
        .order('submitted_at', { ascending: false });

      if (cases) setMyCases(cases as ArbitrationCase[]);

      // Check if user is an arbitrator
      const { data: arbitrator } = await supabase
        .from('civic_arbitrators')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (arbitrator) {
        setIsArbitrator(true);
        setMyArbitratorId(arbitrator.id);
      }
    } catch (err) {
      console.error('[Arbitration] Error loading cases:', err);
    }
  }, []);

  // AI generates fact presentation (NO JUDGMENT)
  const generateAIFactPresentation = useCallback(async (
    caseData: ArbitrationCase
  ): Promise<AIFactPresentation> => {
    // This would call an AI edge function to analyze evidence
    // The AI ONLY presents facts, never judges
    console.log('[Arbitration] AI generating fact presentation for case:', caseData.case_number);

    return {
      timeline: [],
      evidenceSummary: [],
      conflictingClaims: [],
      objectiveFacts: [
        'Análise factual será gerada pela IA',
        'A IA apresenta fatos, não julga'
      ]
    };
  }, []);

  // AI simulates impact of different outcomes (NO JUDGMENT)
  const generateAIImpactSimulation = useCallback(async (
    caseData: ArbitrationCase
  ): Promise<AIImpactSimulation> => {
    // This would call an AI edge function to simulate outcomes
    // The AI ONLY simulates, never recommends
    console.log('[Arbitration] AI generating impact simulation for case:', caseData.case_number);

    return {
      plaintiffWins: {
        financialImpact: 0,
        reputationImpact: 'Análise pendente',
        systemicRisk: 0
      },
      defendantWins: {
        financialImpact: 0,
        reputationImpact: 'Análise pendente',
        systemicRisk: 0
      },
      neutralOutcome: {
        financialImpact: 0,
        reputationImpact: 'Análise pendente',
        systemicRisk: 0
      },
      recommendedRemedies: []
    };
  }, []);

  // Submit vote (arbitrators only)
  const submitVote = useCallback(async (
    vote: 'plaintiff' | 'defendant' | 'neutral',
    reasoning: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!myArbitratorId || !currentCase) {
      return { success: false, error: 'Não autorizado' };
    }

    try {
      const satoshiHash = generateSatoshiHash({
        case_id: currentCase.id,
        arbitrator_id: myArbitratorId,
        vote,
        reasoning,
        voted_at: new Date().toISOString()
      });

      const { error } = await supabase
        .from('arbitration_panels')
        .update({
          vote,
          vote_reasoning: reasoning,
          voted_at: new Date().toISOString(),
          satoshi_hash: satoshiHash
        })
        .eq('case_id', currentCase.id)
        .eq('arbitrator_id', myArbitratorId);

      if (error) throw error;

      // Reload panel
      await loadCase(currentCase.id);

      return { success: true };
    } catch (err) {
      console.error('[Arbitration] Vote failed:', err);
      return { success: false, error: 'Falha ao registrar voto' };
    }
  }, [myArbitratorId, currentCase, loadCase]);

  // Recuse from panel (arbitrators only)
  const recuseFromPanel = useCallback(async (
    reason: string
  ): Promise<{ success: boolean }> => {
    if (!myArbitratorId || !currentCase) {
      return { success: false };
    }

    try {
      await supabase
        .from('arbitration_panels')
        .update({
          recused: true,
          recusal_reason: reason
        })
        .eq('case_id', currentCase.id)
        .eq('arbitrator_id', myArbitratorId);

      return { success: true };
    } catch (err) {
      console.error('[Arbitration] Recusal failed:', err);
      return { success: false };
    }
  }, [myArbitratorId, currentCase]);

  // Submit defendant evidence
  const submitDefendantEvidence = useCallback(async (
    evidence: Record<string, unknown>[]
  ): Promise<{ success: boolean }> => {
    if (!currentCase) return { success: false };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== currentCase.defendant_id) {
        return { success: false };
      }

      await supabase
        .from('arbitration_cases')
        .update({
          evidence_defendant: JSON.parse(JSON.stringify(evidence)),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentCase.id);

      await loadCase(currentCase.id);
      return { success: true };
    } catch (err) {
      console.error('[Arbitration] Evidence submission failed:', err);
      return { success: false };
    }
  }, [currentCase, loadCase]);

  // File appeal (only 1 allowed)
  const fileAppeal = useCallback(async (
    appealReason: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentCase) return { success: false, error: 'Caso não encontrado' };
    if (currentCase.appeal_count >= 1) {
      return { success: false, error: 'Limite de apelações atingido (máximo 1)' };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      // Only parties can appeal
      if (user.id !== currentCase.plaintiff_id && user.id !== currentCase.defendant_id) {
        return { success: false, error: 'Apenas as partes podem apelar' };
      }

      const satoshiHash = generateSatoshiHash({
        case_id: currentCase.id,
        appellant: user.id,
        reason: appealReason,
        filed_at: new Date().toISOString()
      });

      await supabase
        .from('arbitration_cases')
        .update({
          status: 'appealed',
          appeal_count: currentCase.appeal_count + 1,
          satoshi_hash: satoshiHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentCase.id);

      await loadCase(currentCase.id);
      return { success: true };
    } catch (err) {
      console.error('[Arbitration] Appeal failed:', err);
      return { success: false, error: 'Falha ao registrar apelação' };
    }
  }, [currentCase, loadCase]);

  // Finalize decision (admin only, after all votes)
  const finalizeDecision = useCallback(async (): Promise<{ success: boolean }> => {
    if (!currentCase || !panel.length) return { success: false };

    try {
      // Count votes
      const votesForPlaintiff = panel.filter(p => p.vote === 'plaintiff').length;
      const votesForDefendant = panel.filter(p => p.vote === 'defendant').length;
      const votesNeutral = panel.filter(p => p.vote === 'neutral').length;

      // Generate AI presentations
      const factPresentation = await generateAIFactPresentation(currentCase);
      const impactSimulation = await generateAIImpactSimulation(currentCase);

      const decisionSummary = votesForPlaintiff > votesForDefendant
        ? 'Decisão favorável ao demandante'
        : votesForDefendant > votesForPlaintiff
          ? 'Decisão favorável ao demandado'
          : 'Decisão neutra';

      const satoshiHash = generateSatoshiHash({
        case_id: currentCase.id,
        votes: { plaintiff: votesForPlaintiff, defendant: votesForDefendant, neutral: votesNeutral },
        decision: decisionSummary
      });

      const immutableHash = generateImmutableHash({
        case_id: currentCase.id,
        case_number: currentCase.case_number,
        decision: decisionSummary,
        votes: { plaintiff: votesForPlaintiff, defendant: votesForDefendant, neutral: votesNeutral }
      });

      const decisionInsert = {
        case_id: currentCase.id,
        decision_summary: decisionSummary,
        votes_for_plaintiff: votesForPlaintiff,
        votes_for_defendant: votesForDefendant,
        votes_neutral: votesNeutral,
        ai_fact_presentation: JSON.parse(JSON.stringify(factPresentation)),
        ai_impact_simulation: JSON.parse(JSON.stringify(impactSimulation)),
        is_final: true,
        finalized_at: new Date().toISOString(),
        satoshi_hash: satoshiHash,
        immutable_hash: immutableHash
      };

      await supabase.from('arbitration_decisions').insert(decisionInsert);

      await supabase
        .from('arbitration_cases')
        .update({
          status: 'decision_made',
          decision_at: new Date().toISOString()
        })
        .eq('id', currentCase.id);

      await loadCase(currentCase.id);
      return { success: true };
    } catch (err) {
      console.error('[Arbitration] Finalization failed:', err);
      return { success: false };
    }
  }, [currentCase, panel, generateAIFactPresentation, generateAIImpactSimulation, loadCase]);

  useEffect(() => {
    loadMyCases();
    if (caseId) {
      loadCase(caseId);
    }
  }, [caseId, loadCase, loadMyCases]);

  // Realtime subscription for case updates
  useEffect(() => {
    if (!caseId) return;

    const channel = supabase
      .channel(`arbitration-case-${caseId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'arbitration_cases', filter: `id=eq.${caseId}` },
        () => loadCase(caseId)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'arbitration_panels', filter: `case_id=eq.${caseId}` },
        () => loadCase(caseId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId, loadCase]);

  return {
    // State
    currentCase,
    myCases,
    panel,
    decision,
    loading,
    isArbitrator,
    myArbitratorId,

    // Actions
    loadCase,
    loadMyCases,
    submitVote,
    recuseFromPanel,
    submitDefendantEvidence,
    fileAppeal,
    finalizeDecision,

    // AI Tools (presentation only, no judgment)
    generateAIFactPresentation,
    generateAIImpactSimulation,

    // Computed
    allVotesIn: panel.every(p => p.vote !== null || p.recused),
    canAppeal: currentCase?.appeal_count === 0 && currentCase?.status === 'decision_made',
    isParty: (userId: string) => currentCase?.plaintiff_id === userId || currentCase?.defendant_id === userId
  };
}
