import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateSatoshiHash, generateImmutableHash } from './useConstitutionalGovernance';

// ===========================================
// CONSTITUTIONAL AMENDMENTS HOOK
// Camada XI: Protocolo de Evolução Constitucional
// Emendas requerem:
// - Simulação pública de impacto (≥ 30 dias)
// - Aprovação do Fundador E Conselho DAO E ≥ 67% usuários ativos
// - Axiomas A1-A12 são IMUTÁVEIS por definição
// ===========================================

export interface ConstitutionalAmendment {
  id: string;
  amendment_number: number;
  title: string;
  summary: string;
  full_text: string;
  proposed_by: string;
  proposed_by_type: string;
  status: string;
  simulation_started_at: string | null;
  simulation_ended_at: string | null;
  simulation_results: unknown;
  public_review_started_at: string | null;
  voting_started_at: string | null;
  voting_ended_at: string | null;
  founder_approved: boolean | null;
  founder_approved_at: string | null;
  dao_approved: boolean | null;
  dao_approval_percentage: number | null;
  user_approved: boolean | null;
  user_approval_percentage: number | null;
  requires_67_percent: boolean;
  affects_immutable_axioms: boolean;
  constitutional_block_id: number | null;
  satoshi_hash: string | null;
  created_at: string;
}

export interface AmendmentVote {
  id: string;
  amendment_id: string;
  voter_id: string;
  voter_type: string;
  vote: string;
  reasoning: string | null;
  voted_at: string;
  vote_weight: number;
}

export interface VotingStats {
  totalVotes: number;
  votesFor: number;
  votesAgainst: number;
  abstentions: number;
  approvalPercentage: number;
  quorumReached: boolean;
  threshold: number;
}

export function useConstitutionalAmendments() {
  const [amendments, setAmendments] = useState<ConstitutionalAmendment[]>([]);
  const [activeAmendments, setActiveAmendments] = useState<ConstitutionalAmendment[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, AmendmentVote>>({});
  const [loading, setLoading] = useState(true);

  // Load all amendments
  const loadAmendments = useCallback(async () => {
    try {
      setLoading(true);

      const { data: allAmendments } = await supabase
        .from('constitutional_amendments')
        .select('*')
        .order('amendment_number', { ascending: false });

      if (allAmendments) {
        setAmendments(allAmendments as ConstitutionalAmendment[]);
        setActiveAmendments(
          allAmendments.filter((a: ConstitutionalAmendment) => 
            ['simulation', 'public_review', 'voting'].includes(a.status)
          ) as ConstitutionalAmendment[]
        );
      }

      // Load user's votes
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: votes } = await supabase
          .from('amendment_votes')
          .select('*')
          .eq('voter_id', user.id);

        if (votes) {
          const votesMap: Record<string, AmendmentVote> = {};
          votes.forEach((v: AmendmentVote) => {
            votesMap[v.amendment_id] = v;
          });
          setMyVotes(votesMap);
        }
      }
    } catch (err) {
      console.error('[Amendments] Error loading:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Propose new amendment
  const proposeAmendment = useCallback(async (
    title: string,
    summary: string,
    fullText: string,
    affectsAxioms: boolean = false
  ): Promise<{ success: boolean; amendmentId?: string; error?: string }> => {
    // CRITICAL: Cannot propose amendments affecting immutable axioms
    if (affectsAxioms) {
      return {
        success: false,
        error: 'Axiomas A1-A12 são IMUTÁVEIS por definição constitucional'
      };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Não autenticado' };
      }

      // Get next amendment number
      const { data: lastAmendment } = await supabase
        .from('constitutional_amendments')
        .select('amendment_number')
        .order('amendment_number', { ascending: false })
        .limit(1)
        .single();

      const nextNumber = (lastAmendment?.amendment_number || 0) + 1;

      const satoshiHash = generateSatoshiHash({
        title,
        summary,
        proposed_by: user.id,
        proposed_at: new Date().toISOString()
      });

      const { data, error } = await supabase
        .from('constitutional_amendments')
        .insert({
          amendment_number: nextNumber,
          title,
          summary,
          full_text: fullText,
          proposed_by: user.id,
          proposed_by_type: 'verified_human',
          status: 'draft',
          affects_immutable_axioms: false,
          satoshi_hash: satoshiHash
        })
        .select()
        .single();

      if (error) throw error;

      await loadAmendments();
      return { success: true, amendmentId: data.id };
    } catch (err) {
      console.error('[Amendments] Proposal failed:', err);
      return { success: false, error: 'Falha ao propor emenda' };
    }
  }, [loadAmendments]);

  // Start simulation phase (≥ 30 days)
  const startSimulation = useCallback(async (
    amendmentId: string
  ): Promise<{ success: boolean }> => {
    try {
      const simulationEndDate = new Date();
      simulationEndDate.setDate(simulationEndDate.getDate() + 30);

      await supabase
        .from('constitutional_amendments')
        .update({
          status: 'simulation',
          simulation_started_at: new Date().toISOString(),
          simulation_ended_at: simulationEndDate.toISOString()
        })
        .eq('id', amendmentId);

      await loadAmendments();
      return { success: true };
    } catch (err) {
      console.error('[Amendments] Simulation start failed:', err);
      return { success: false };
    }
  }, [loadAmendments]);

  // Submit simulation results
  const submitSimulationResults = useCallback(async (
    amendmentId: string,
    results: {
      economicImpact: Record<string, unknown>;
      socialImpact: Record<string, unknown>;
      technicalFeasibility: Record<string, unknown>;
      riskAssessment: Record<string, unknown>;
      publicComments: number;
      supportLevel: number;
    }
  ): Promise<{ success: boolean }> => {
    try {
      await supabase
        .from('constitutional_amendments')
        .update({
          simulation_results: JSON.parse(JSON.stringify(results)),
          status: 'public_review',
          public_review_started_at: new Date().toISOString()
        })
        .eq('id', amendmentId);

      await loadAmendments();
      return { success: true };
    } catch (err) {
      console.error('[Amendments] Simulation results failed:', err);
      return { success: false };
    }
  }, [loadAmendments]);

  // Start voting phase
  const startVoting = useCallback(async (
    amendmentId: string,
    votingDurationDays: number = 14
  ): Promise<{ success: boolean }> => {
    try {
      const votingEndDate = new Date();
      votingEndDate.setDate(votingEndDate.getDate() + votingDurationDays);

      await supabase
        .from('constitutional_amendments')
        .update({
          status: 'voting',
          voting_started_at: new Date().toISOString(),
          voting_ended_at: votingEndDate.toISOString()
        })
        .eq('id', amendmentId);

      await loadAmendments();
      return { success: true };
    } catch (err) {
      console.error('[Amendments] Voting start failed:', err);
      return { success: false };
    }
  }, [loadAmendments]);

  // Cast vote
  const castVote = useCallback(async (
    amendmentId: string,
    vote: 'for' | 'against' | 'abstain',
    reasoning?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Não autenticado' };
      }

      // Check if already voted
      if (myVotes[amendmentId]) {
        return { success: false, error: 'Você já votou nesta emenda' };
      }

      const satoshiHash = generateSatoshiHash({
        amendment_id: amendmentId,
        voter_id: user.id,
        vote,
        voted_at: new Date().toISOString()
      });

      const { error } = await supabase
        .from('amendment_votes')
        .insert({
          amendment_id: amendmentId,
          voter_id: user.id,
          voter_type: 'user',
          vote,
          reasoning,
          satoshi_hash: satoshiHash
        });

      if (error) throw error;

      await loadAmendments();
      return { success: true };
    } catch (err) {
      console.error('[Amendments] Vote failed:', err);
      return { success: false, error: 'Falha ao registrar voto' };
    }
  }, [myVotes, loadAmendments]);

  // Get voting statistics for an amendment
  const getVotingStats = useCallback(async (
    amendmentId: string
  ): Promise<VotingStats> => {
    try {
      const { data: votes } = await supabase
        .from('amendment_votes')
        .select('*')
        .eq('amendment_id', amendmentId);

      if (!votes) {
        return {
          totalVotes: 0,
          votesFor: 0,
          votesAgainst: 0,
          abstentions: 0,
          approvalPercentage: 0,
          quorumReached: false,
          threshold: 67
        };
      }

      const votesFor = votes.filter((v: AmendmentVote) => v.vote === 'for').length;
      const votesAgainst = votes.filter((v: AmendmentVote) => v.vote === 'against').length;
      const abstentions = votes.filter((v: AmendmentVote) => v.vote === 'abstain').length;
      const totalVotes = votes.length;
      const effectiveVotes = votesFor + votesAgainst;
      const approvalPercentage = effectiveVotes > 0 ? (votesFor / effectiveVotes) * 100 : 0;

      // Quorum: at least 10% of active users must vote
      // For now, use a placeholder
      const quorumReached = totalVotes >= 10;

      return {
        totalVotes,
        votesFor,
        votesAgainst,
        abstentions,
        approvalPercentage,
        quorumReached,
        threshold: 67
      };
    } catch (err) {
      console.error('[Amendments] Stats failed:', err);
      return {
        totalVotes: 0,
        votesFor: 0,
        votesAgainst: 0,
        abstentions: 0,
        approvalPercentage: 0,
        quorumReached: false,
        threshold: 67
      };
    }
  }, []);

  // Finalize voting and determine outcome
  const finalizeVoting = useCallback(async (
    amendmentId: string
  ): Promise<{ success: boolean; approved: boolean }> => {
    try {
      const stats = await getVotingStats(amendmentId);
      const amendment = amendments.find(a => a.id === amendmentId);

      if (!amendment) {
        return { success: false, approved: false };
      }

      // Requirements:
      // 1. Founder approval
      // 2. DAO approval
      // 3. ≥ 67% user approval
      const founderApproved = amendment.founder_approved === true;
      const daoApproved = amendment.dao_approved === true;
      const userApproved = stats.approvalPercentage >= 67 && stats.quorumReached;

      const finalApproval = founderApproved && daoApproved && userApproved;

      // Create constitutional block if approved
      if (finalApproval) {
        const blockHash = generateImmutableHash({
          amendment_id: amendmentId,
          amendment_number: amendment.amendment_number,
          title: amendment.title,
          approval: stats
        });

        const blockInsert = {
          block_hash: blockHash,
          block_type: 'amendment',
          content: JSON.parse(JSON.stringify({
            amendment_id: amendmentId,
            title: amendment.title,
            summary: amendment.summary,
            approval_stats: stats
          })),
          created_by: 'system',
          is_immutable: true
        };

        const { data: block } = await supabase
          .from('constitutional_blocks')
          .insert(blockInsert)
          .select()
          .single();

        await supabase
          .from('constitutional_amendments')
          .update({
            status: 'approved',
            user_approved: true,
            user_approval_percentage: stats.approvalPercentage,
            constitutional_block_id: block?.block_number
          })
          .eq('id', amendmentId);
      } else {
        await supabase
          .from('constitutional_amendments')
          .update({
            status: 'rejected',
            user_approved: userApproved,
            user_approval_percentage: stats.approvalPercentage
          })
          .eq('id', amendmentId);
      }

      await loadAmendments();
      return { success: true, approved: finalApproval };
    } catch (err) {
      console.error('[Amendments] Finalization failed:', err);
      return { success: false, approved: false };
    }
  }, [amendments, getVotingStats, loadAmendments]);

  // Founder approval
  const founderApprove = useCallback(async (
    amendmentId: string,
    approved: boolean
  ): Promise<{ success: boolean }> => {
    try {
      await supabase
        .from('constitutional_amendments')
        .update({
          founder_approved: approved,
          founder_approved_at: new Date().toISOString()
        })
        .eq('id', amendmentId);

      await loadAmendments();
      return { success: true };
    } catch (err) {
      console.error('[Amendments] Founder approval failed:', err);
      return { success: false };
    }
  }, [loadAmendments]);

  // DAO approval
  const daoApprove = useCallback(async (
    amendmentId: string,
    approved: boolean,
    approvalPercentage: number
  ): Promise<{ success: boolean }> => {
    try {
      await supabase
        .from('constitutional_amendments')
        .update({
          dao_approved: approved,
          dao_approval_percentage: approvalPercentage
        })
        .eq('id', amendmentId);

      await loadAmendments();
      return { success: true };
    } catch (err) {
      console.error('[Amendments] DAO approval failed:', err);
      return { success: false };
    }
  }, [loadAmendments]);

  useEffect(() => {
    loadAmendments();

    const channel = supabase
      .channel('constitutional-amendments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'constitutional_amendments' },
        () => loadAmendments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAmendments]);

  return {
    // State
    amendments,
    activeAmendments,
    myVotes,
    loading,

    // Actions
    loadAmendments,
    proposeAmendment,
    startSimulation,
    submitSimulationResults,
    startVoting,
    castVote,
    getVotingStats,
    finalizeVoting,
    founderApprove,
    daoApprove,

    // Computed
    hasActiveVoting: activeAmendments.some(a => a.status === 'voting'),
    pendingSimulations: activeAmendments.filter(a => a.status === 'simulation')
  };
}
