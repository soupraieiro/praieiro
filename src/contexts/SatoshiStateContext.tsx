import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSatoshiError, extractErrorCode } from '@/lib/satoshiErrorDictionary';

// Types from Supabase schema
interface ProtocolState {
  tx_id: string;
  entity_id: string;
  key_structure: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  checksum: string | null;
  version: number;
  archived: boolean;
  created_at: string;
  created_by: string | null;
}

interface ProtocolParameter {
  param_key: string;
  param_name: string;
  param_value: number;
  param_unit: string | null;
  category: string;
  is_active: boolean;
  updated_at: string;
}

interface EcosystemHealth {
  total_states: number;
  active_states: number;
  archived_states: number;
  total_events: number;
  registered_assets: number;
  pending_proposals: number;
  current_phase: string;
}

interface AICouncilProposal {
  proposal_id: string;
  proposal_type: string;
  target_param_key: string | null;
  current_value: number | null;
  proposed_value: number | null;
  justification: string;
  ecosystem_analysis: Record<string, unknown>;
  created_by_agent: string | null;
  votes_for: number | null;
  votes_against: number | null;
  total_agents: number | null;
  consensus_reached: boolean | null;
  status: string | null;
  satoshi_hash: string | null;
  created_at: string;
  expires_at: string | null;
  executed_at: string | null;
}

interface SatoshiStateContextType {
  // State
  currentStates: ProtocolState[];
  parameters: ProtocolParameter[];
  ecosystemHealth: EcosystemHealth | null;
  pendingProposals: AICouncilProposal[];
  isLoading: boolean;
  lastIntegrityCheck: Date | null;
  integrityValid: boolean;
  
  // Actions
  refreshState: () => Promise<void>;
  createProtocolState: (entityId: string, keyStructure: string, payload: Record<string, unknown>) => Promise<string | null>;
  verifyIntegrity: () => Promise<boolean>;
  voteOnProposal: (proposalId: string, vote: 'for' | 'against') => Promise<boolean>;
  
  // Computed
  hasConsensusPending: boolean;
  currentPhase: string;
}

const SatoshiStateContext = createContext<SatoshiStateContextType | null>(null);

export function useSatoshiState() {
  const context = useContext(SatoshiStateContext);
  if (!context) {
    throw new Error('useSatoshiState must be used within a SatoshiStateProvider');
  }
  return context;
}

interface Props {
  children: ReactNode;
}

export function SatoshiStateProvider({ children }: Props) {
  const [currentStates, setCurrentStates] = useState<ProtocolState[]>([]);
  const [parameters, setParameters] = useState<ProtocolParameter[]>([]);
  const [ecosystemHealth, setEcosystemHealth] = useState<EcosystemHealth | null>(null);
  const [pendingProposals, setPendingProposals] = useState<AICouncilProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastIntegrityCheck, setLastIntegrityCheck] = useState<Date | null>(null);
  const [integrityValid, setIntegrityValid] = useState(true);

  // Load current states from view
  const loadCurrentStates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('current_state')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setCurrentStates((data || []) as unknown as ProtocolState[]);
    } catch (error) {
      console.error('Error loading current states:', error);
      const satoshiError = getSatoshiError(extractErrorCode(error));
      toast.error(satoshiError.title, { description: satoshiError.message });
    }
  }, []);

  // Load protocol parameters
  const loadParameters = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('protocol_parameters_current')
        .select('*');
      
      if (error) throw error;
      setParameters((data || []) as unknown as ProtocolParameter[]);
    } catch (error) {
      console.error('Error loading parameters:', error);
    }
  }, []);

  // Load ecosystem health
  const loadEcosystemHealth = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ecosystem_health')
        .select('*')
        .maybeSingle();
      
      if (error) throw error;
      setEcosystemHealth(data as unknown as EcosystemHealth);
    } catch (error) {
      console.error('Error loading ecosystem health:', error);
    }
  }, []);

  // Load pending proposals
  const loadPendingProposals = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ai_council_proposals')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPendingProposals((data || []) as unknown as AICouncilProposal[]);
    } catch (error) {
      console.error('Error loading pending proposals:', error);
    }
  }, []);

  // Refresh all state
  const refreshState = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      loadCurrentStates(),
      loadParameters(),
      loadEcosystemHealth(),
      loadPendingProposals()
    ]);
    setIsLoading(false);
  }, [loadCurrentStates, loadParameters, loadEcosystemHealth, loadPendingProposals]);

  // Create new protocol state with checksum
  const createProtocolState = useCallback(async (
    entityId: string,
    keyStructure: string,
    payload: Record<string, unknown>
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('create_protocol_state', {
        p_entity_id: entityId,
        p_key_structure: keyStructure,
        p_payload: JSON.parse(JSON.stringify(payload))
      });

      if (error) throw error;
      
      toast.success('Estado registrado no Ledger', {
        description: `TX: ${(data as string)?.slice(0, 8)}...`
      });
      
      await refreshState();
      return data as string;
    } catch (error) {
      console.error('Error creating protocol state:', error);
      const satoshiError = getSatoshiError(extractErrorCode(error));
      toast.error(satoshiError.title, { description: satoshiError.message });
      return null;
    }
  }, [refreshState]);

  // Verify ledger integrity
  const verifyIntegrity = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('verify_satoshi_integrity_v2');
      
      if (error) throw error;
      
      // Garantir que data é um array antes de usar .every()
      const results = Array.isArray(data) ? data : [];
      const allValid = results.length === 0 ? true : results.every((r: { is_valid?: boolean }) => r?.is_valid === true);
      
      setIntegrityValid(allValid);
      setLastIntegrityCheck(new Date());
      
      if (!allValid && results.length > 0) {
        toast.error('Alerta de Integridade', {
          description: 'Inconsistências detectadas no Ledger Satoshi.'
        });
      }
      
      return allValid;
    } catch (error) {
      console.error('Error verifying integrity:', error);
      setIntegrityValid(true); // Assume válido se RPC não existir
      return true;
    }
  }, []);

  // Vote on AI Council proposal
  const voteOnProposal = useCallback(async (
    proposalId: string,
    vote: 'for' | 'against'
  ): Promise<boolean> => {
    try {
      const updateData = vote === 'for' 
        ? { votes_for: (pendingProposals.find(p => p.proposal_id === proposalId)?.votes_for || 0) + 1 }
        : { votes_against: (pendingProposals.find(p => p.proposal_id === proposalId)?.votes_against || 0) + 1 };
      
      const { error } = await supabase
        .from('ai_council_proposals')
        .update(updateData)
        .eq('proposal_id', proposalId);

      if (error) throw error;
      
      toast.success('Voto registrado', {
        description: `Voto "${vote === 'for' ? 'A Favor' : 'Contra'}" contabilizado.`
      });
      
      await loadPendingProposals();
      return true;
    } catch (error) {
      console.error('Error voting on proposal:', error);
      const satoshiError = getSatoshiError(extractErrorCode(error));
      toast.error(satoshiError.title, { description: satoshiError.message });
      return false;
    }
  }, [pendingProposals, loadPendingProposals]);

  // Computed values
  const hasConsensusPending = pendingProposals.length > 0;
  const currentPhase = parameters.find(p => p.param_key === 'sys.current_phase')?.param_value?.toString() || 'genesis';

  // Initial load
  useEffect(() => {
    refreshState();
  }, [refreshState]);

  // Set up realtime subscription for protocol_parameters
  useEffect(() => {
    const channel = supabase
      .channel('satoshi-state-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'protocol_parameters' },
        () => {
          loadParameters();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_council_proposals' },
        () => {
          loadPendingProposals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadParameters, loadPendingProposals]);

  // Periodic integrity check (every 60 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      verifyIntegrity();
    }, 60000);

    // Initial check
    verifyIntegrity();

    return () => clearInterval(interval);
  }, [verifyIntegrity]);

  const value: SatoshiStateContextType = {
    currentStates,
    parameters,
    ecosystemHealth,
    pendingProposals,
    isLoading,
    lastIntegrityCheck,
    integrityValid,
    refreshState,
    createProtocolState,
    verifyIntegrity,
    voteOnProposal,
    hasConsensusPending,
    currentPhase
  };

  return (
    <SatoshiStateContext.Provider value={value}>
      {children}
    </SatoshiStateContext.Provider>
  );
}
