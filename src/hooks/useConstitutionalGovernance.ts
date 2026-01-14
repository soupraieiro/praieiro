import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import CryptoJS from 'crypto-js';

// ===========================================
// CONSTITUTIONAL GOVERNANCE HOOK
// Camada VII-XII: Estado Digital Minimamente Tirânico
// ===========================================

// Types for Constitutional Governance
export interface ImmutableAxiom {
  axiom_id: string;
  axiom_number: number;
  axiom_title: string;
  axiom_text: string;
  rationale: string | null;
  genesis_block_hash: string;
  can_never_be_modified: boolean;
  violation_count: number;
  last_integrity_check: string;
  satoshi_hash: string;
}

export interface VerifiedHuman {
  id: string;
  user_id: string;
  verification_level: 'unverified' | 'basic' | 'standard' | 'verified' | 'sovereign';
  verification_factors: unknown[];
  biometric_hash: string | null;
  verified_at: string | null;
  is_unique_biological: boolean;
  anti_fraud_score: number;
  satoshi_hash: string | null;
}

export interface CriticalState {
  id: string;
  state_key: string;
  state_name: string;
  category: 'financial_loss' | 'rights_violation' | 'systemic_instability' | 'reputation_damage';
  severity_level: number;
  description: string | null;
  requires_human_intervention: boolean;
}

export interface ArbitrationCase {
  id: string;
  case_number: string;
  plaintiff_id: string;
  defendant_id: string;
  case_type: string;
  case_summary: string;
  status: 'submitted' | 'under_review' | 'panel_assigned' | 'deliberating' | 'decision_made' | 'appealed' | 'final' | 'closed';
  submitted_at: string;
  appeal_count: number;
}

export interface EthicalRule {
  id: string;
  rule_key: string;
  rule_name: string;
  prohibited_practice: string;
  description: string;
  violation_threshold: number | null;
  is_active: boolean;
}

export interface ConstitutionalAmendment {
  id: string;
  amendment_number: number;
  title: string;
  summary: string;
  full_text: string;
  status: 'draft' | 'simulation' | 'public_review' | 'voting' | 'approved' | 'rejected' | 'implemented' | 'revoked';
  founder_approved: boolean | null;
  dao_approval_percentage: number | null;
  user_approval_percentage: number | null;
  requires_67_percent: boolean;
  affects_immutable_axioms: boolean;
}

export interface DissolutionState {
  id: string;
  status: 'operational' | 'warning' | 'preparing_dissolution' | 'dissolving' | 'dissolved' | 'archived';
  initiated_at: string | null;
  reason: string | null;
  data_export_progress: number;
  final_message: string;
}

export interface SystemicFailure {
  id: string;
  failure_vector: string;
  failure_description: string;
  severity_level: number;
  detected_at: string;
  affected_users_count: number;
  financial_impact_brl: number;
  resolved_at: string | null;
  satoshi_hash: string;
}

export interface ResponsibilityRecord {
  id: string;
  failure_id: string;
  agent_type: 'ai_agent' | 'human_operator' | 'founder' | 'system';
  agent_identifier: string;
  agent_name: string | null;
  responsibility_percentage: number;
  consequence: 'rollback' | 'scope_limitation' | 'privilege_reduction' | 'public_record' | 'suspension' | 'audit_required';
}

// Generate Satoshi Hash for immutable records
export function generateSatoshiHash(data: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const payload = JSON.stringify({ ...data, timestamp });
  return CryptoJS.SHA256(payload).toString();
}

// Generate immutable hash with chain link
export function generateImmutableHash(data: Record<string, unknown>, previousHash?: string): string {
  const payload = JSON.stringify({
    ...data,
    previous: previousHash || 'GENESIS',
    timestamp: new Date().toISOString()
  });
  return CryptoJS.SHA256(payload).toString();
}

export function useConstitutionalGovernance() {
  const [axioms, setAxioms] = useState<ImmutableAxiom[]>([]);
  const [criticalStates, setCriticalStates] = useState<CriticalState[]>([]);
  const [ethicalRules, setEthicalRules] = useState<EthicalRule[]>([]);
  const [dissolutionState, setDissolutionState] = useState<DissolutionState | null>(null);
  const [myVerification, setMyVerification] = useState<VerifiedHuman | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load constitutional data
  const loadConstitutionalData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [axiomsRes, statesRes, rulesRes, dissolutionRes] = await Promise.all([
        supabase.from('immutable_axioms').select('*').order('axiom_number'),
        supabase.from('critical_states').select('*').order('severity_level', { ascending: false }),
        supabase.from('ethical_economy_rules').select('*').eq('is_active', true),
        supabase.from('dissolution_state').select('*').limit(1).single()
      ]);

      if (axiomsRes.data) setAxioms(axiomsRes.data as ImmutableAxiom[]);
      if (statesRes.data) setCriticalStates(statesRes.data as CriticalState[]);
      if (rulesRes.data) setEthicalRules(rulesRes.data as EthicalRule[]);
      if (dissolutionRes.data) setDissolutionState(dissolutionRes.data as DissolutionState);

      // Load user's verification status
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: verification } = await supabase
          .from('verified_humans')
          .select('*')
          .eq('user_id', user.id)
          .single();
        if (verification) setMyVerification(verification as VerifiedHuman);
      }
    } catch (err) {
      console.error('[Constitutional] Error loading data:', err);
      setError('Falha ao carregar dados constitucionais');
    } finally {
      setLoading(false);
    }
  }, []);

  // Verify axiom integrity
  const verifyAxiomIntegrity = useCallback(async (): Promise<boolean> => {
    try {
      const { data: currentAxioms } = await supabase
        .from('immutable_axioms')
        .select('*')
        .order('axiom_number');

      if (!currentAxioms || currentAxioms.length !== 12) {
        console.error('[Constitutional] Axiom count mismatch!');
        return false;
      }

      // Verify genesis hash linkage
      const allLinkedToGenesis = currentAxioms.every(
        (a: ImmutableAxiom) => a.genesis_block_hash === 'GENESIS_PRAIEIRO_2024'
      );

      if (!allLinkedToGenesis) {
        console.error('[Constitutional] Genesis hash breach detected!');
        return false;
      }

      return true;
    } catch (err) {
      console.error('[Constitutional] Integrity check failed:', err);
      return false;
    }
  }, []);

  // Check ethical compliance
  const checkEthicalCompliance = useCallback(async (action: {
    type: string;
    affectsUsers?: boolean;
    modifiesPrice?: boolean;
    createsAddiction?: boolean;
    penalizesExit?: boolean;
  }): Promise<{ compliant: boolean; violations: string[] }> => {
    const violations: string[] = [];

    for (const rule of ethicalRules) {
      switch (rule.prohibited_practice) {
        case 'cognitive_bias_exploitation':
          // Would need actual UI analysis
          break;
        case 'psychological_dependency':
          if (action.createsAddiction) {
            violations.push(rule.rule_name);
          }
          break;
        case 'exit_penalty':
          if (action.penalizesExit) {
            violations.push(rule.rule_name);
          }
          break;
        case 'asymmetric_power':
          // Would need power distribution analysis
          break;
        case 'growth_at_all_costs':
          // Would need growth metrics analysis
          break;
      }
    }

    return {
      compliant: violations.length === 0,
      violations
    };
  }, [ethicalRules]);

  // Submit arbitration case
  const submitArbitrationCase = useCallback(async (
    defendantId: string,
    caseType: string,
    caseSummary: string,
    evidence: Record<string, unknown>[]
  ): Promise<{ success: boolean; caseId?: string; error?: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      // Check if user is verified
      if (!myVerification || myVerification.verification_level === 'unverified') {
        return { success: false, error: 'Apenas humanos verificados podem submeter casos' };
      }

      const caseNumber = `ARB-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const satoshiHash = generateSatoshiHash({
        plaintiff: user.id,
        defendant: defendantId,
        type: caseType,
        summary: caseSummary
      });

      const insertData = {
        case_number: caseNumber,
        plaintiff_id: user.id,
        defendant_id: defendantId,
        case_type: caseType,
        case_summary: caseSummary,
        evidence_plaintiff: JSON.parse(JSON.stringify(evidence)),
        satoshi_hash: satoshiHash
      };

      const { data, error } = await supabase
        .from('arbitration_cases')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      return { success: true, caseId: data.id };
    } catch (err) {
      console.error('[Arbitration] Submission failed:', err);
      return { success: false, error: 'Falha ao submeter caso' };
    }
  }, [myVerification]);

  // Log systemic failure with responsibility chain
  const logSystemicFailure = useCallback(async (
    failure: {
      vector: string;
      description: string;
      severity: number;
      affectedUsers: number;
      financialImpact: number;
    },
    responsibility: {
      agentType: 'ai_agent' | 'human_operator' | 'founder' | 'system';
      agentId: string;
      agentName?: string;
      percentage: number;
      consequence: 'rollback' | 'scope_limitation' | 'privilege_reduction' | 'public_record' | 'suspension' | 'audit_required';
    }[]
  ): Promise<{ success: boolean; failureId?: string }> => {
    try {
      const satoshiHash = generateSatoshiHash({
        failure,
        responsibility,
        detected_at: new Date().toISOString()
      });

      const { data: failureData, error: failureError } = await supabase
        .from('systemic_failures')
        .insert({
          failure_vector: failure.vector,
          failure_description: failure.description,
          severity_level: failure.severity,
          affected_users_count: failure.affectedUsers,
          financial_impact_brl: failure.financialImpact,
          satoshi_hash: satoshiHash
        })
        .select()
        .single();

      if (failureError) throw failureError;

      // Insert responsibility chain
      const responsibilityRecords = responsibility.map(r => ({
        failure_id: failureData.id,
        agent_type: r.agentType,
        agent_identifier: r.agentId,
        agent_name: r.agentName,
        responsibility_percentage: r.percentage,
        consequence: r.consequence,
        satoshi_hash: generateSatoshiHash({ ...r, failure_id: failureData.id })
      }));

      await supabase.from('responsibility_chain').insert(responsibilityRecords);

      return { success: true, failureId: failureData.id };
    } catch (err) {
      console.error('[Failure] Logging failed:', err);
      return { success: false };
    }
  }, []);

  // Request data export (Dignified Death Protocol)
  const requestDataExport = useCallback(async (): Promise<{ success: boolean; exportId?: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false };
      }

      const satoshiHash = generateSatoshiHash({
        user_id: user.id,
        type: 'full_export',
        requested_at: new Date().toISOString()
      });

      const { data, error } = await supabase
        .from('user_data_exports')
        .insert({
          user_id: user.id,
          export_type: 'full_export',
          export_status: 'pending',
          satoshi_hash: satoshiHash
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, exportId: data.id };
    } catch (err) {
      console.error('[Export] Request failed:', err);
      return { success: false };
    }
  }, []);

  // Setup realtime subscriptions
  useEffect(() => {
    loadConstitutionalData();

    const channel = supabase
      .channel('constitutional-governance')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dissolution_state' },
        (payload) => {
          console.log('[Constitutional] Dissolution state changed:', payload);
          if (payload.new) {
            setDissolutionState(payload.new as DissolutionState);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'constitutional_amendments' },
        (payload) => {
          console.log('[Constitutional] Amendment update:', payload);
          // Trigger refresh for amendments
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadConstitutionalData]);

  return {
    // State
    axioms,
    criticalStates,
    ethicalRules,
    dissolutionState,
    myVerification,
    loading,
    error,

    // Actions
    loadConstitutionalData,
    verifyAxiomIntegrity,
    checkEthicalCompliance,
    submitArbitrationCase,
    logSystemicFailure,
    requestDataExport,

    // Utilities
    generateSatoshiHash,
    generateImmutableHash,

    // Computed
    isSystemOperational: dissolutionState?.status === 'operational',
    isVerifiedHuman: myVerification?.verification_level !== 'unverified',
    canProposeAmendments: myVerification?.verification_level === 'verified' || myVerification?.verification_level === 'sovereign'
  };
}
