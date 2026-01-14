import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Vote, 
  ThumbsUp, 
  ThumbsDown, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Bot,
  Lock,
  Hash
} from 'lucide-react';
import { formatSatoshiToast } from '@/lib/satoshiErrorDictionary';

interface Proposal {
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

export function AICouncilVotingPanel() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);
  const [hasBlockingProposal, setHasBlockingProposal] = useState(false);

  useEffect(() => {
    loadProposals();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('ai-council-proposals')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_council_proposals' },
        () => {
          loadProposals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadProposals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_council_proposals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      const proposalData = (data || []) as Proposal[];
      setProposals(proposalData);
      
      // Check for blocking proposals (pending without hash validation)
      const blocking = proposalData.some(
        p => p.status === 'pending' && !p.consensus_reached
      );
      setHasBlockingProposal(blocking);
    } catch (error) {
      console.error('Error loading proposals:', error);
      const { title, description } = formatSatoshiToast(error);
      toast.error(title, { description });
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (proposalId: string, vote: 'for' | 'against') => {
    try {
      setVoting(proposalId);
      
      const proposal = proposals.find(p => p.proposal_id === proposalId);
      if (!proposal) return;

      const newVotesFor = (proposal.votes_for || 0) + (vote === 'for' ? 1 : 0);
      const newVotesAgainst = (proposal.votes_against || 0) + (vote === 'against' ? 1 : 0);
      const totalVotes = newVotesFor + newVotesAgainst;
      const totalAgents = proposal.total_agents || 3;
      
      // Check if consensus reached (simple majority)
      const consensusReached = totalVotes >= totalAgents && newVotesFor > newVotesAgainst;
      const rejected = totalVotes >= totalAgents && newVotesAgainst >= newVotesFor;
      
      const { error } = await supabase
        .from('ai_council_proposals')
        .update({
          votes_for: newVotesFor,
          votes_against: newVotesAgainst,
          consensus_reached: consensusReached,
          status: consensusReached ? 'approved' : rejected ? 'rejected' : 'pending',
          executed_at: consensusReached ? new Date().toISOString() : null
        })
        .eq('proposal_id', proposalId);

      if (error) throw error;

      // Log vote event
      console.log('[SATOSHI] Council vote logged:', { proposalId, vote, votes_for: newVotesFor, votes_against: newVotesAgainst });

      toast.success('Voto Registrado', {
        description: consensusReached 
          ? 'Consenso atingido! Proposta aprovada.'
          : rejected
          ? 'Proposta rejeitada pelo Conselho.'
          : `Voto contabilizado (${newVotesFor}/${totalAgents} a favor)`
      });

      await loadProposals();
    } catch (error) {
      console.error('Error voting:', error);
      const { title, description } = formatSatoshiToast(error);
      toast.error(title, { description });
    } finally {
      setVoting(null);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-500/20 text-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejeitado</Badge>;
      case 'executed':
        return <Badge variant="outline" className="border-primary text-primary"><CheckCircle className="h-3 w-3 mr-1" /> Executado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProposalTypeLabel = (type: string) => {
    switch (type) {
      case 'TAX_ADJUSTMENT':
        return 'Ajuste de Taxa';
      case 'RADIUS_CHANGE':
        return 'Alteração de Raio';
      case 'PHASE_TRANSITION':
        return 'Transição de Fase';
      case 'EMERGENCY':
        return 'Emergência';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Vote className="h-5 w-5 text-primary" />
              Conselho de IA - Votação
            </CardTitle>
            <CardDescription>
              Propostas de governança do Protocolo Satoshi
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadProposals}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Blocking Alert */}
        {hasBlockingProposal && (
          <Alert variant="destructive">
            <Lock className="h-4 w-4" />
            <AlertTitle>Alerta de Consenso Pendente</AlertTitle>
            <AlertDescription>
              Há propostas aguardando validação. Alterações manuais estão bloqueadas até que o satoshi_hash seja validado.
            </AlertDescription>
          </Alert>
        )}

        {/* Proposals List */}
        {proposals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma proposta do Conselho de IA</p>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map(proposal => (
              <ProposalCard 
                key={proposal.proposal_id}
                proposal={proposal}
                onVote={handleVote}
                voting={voting}
                getStatusBadge={getStatusBadge}
                getProposalTypeLabel={getProposalTypeLabel}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ProposalCardProps {
  proposal: Proposal;
  onVote: (id: string, vote: 'for' | 'against') => void;
  voting: string | null;
  getStatusBadge: (status: string | null) => JSX.Element;
  getProposalTypeLabel: (type: string) => string;
}

function ProposalCard({ proposal, onVote, voting, getStatusBadge, getProposalTypeLabel }: ProposalCardProps) {
  const votesFor = proposal.votes_for || 0;
  const votesAgainst = proposal.votes_against || 0;
  const totalAgents = proposal.total_agents || 3;
  const totalVotes = votesFor + votesAgainst;
  const progress = (totalVotes / totalAgents) * 100;
  const isPending = proposal.status === 'pending';
  const isVoting = voting === proposal.proposal_id;

  return (
    <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline">{getProposalTypeLabel(proposal.proposal_type)}</Badge>
            {getStatusBadge(proposal.status)}
          </div>
          <p className="text-sm font-medium">
            {proposal.target_param_key && (
              <span className="text-primary">{proposal.target_param_key}: </span>
            )}
            {proposal.current_value} → {proposal.proposed_value}
          </p>
        </div>
        {proposal.satoshi_hash && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Hash className="h-3 w-3" />
            {proposal.satoshi_hash.slice(0, 8)}...
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-3">
        {proposal.justification}
      </p>

      {/* Voting Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Progresso de Votação</span>
          <span>{totalVotes}/{totalAgents} votos</span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex items-center justify-between text-xs mt-1">
          <span className="text-green-500">{votesFor} a favor</span>
          <span className="text-red-500">{votesAgainst} contra</span>
        </div>
      </div>

      <Separator className="my-3" />

      {/* Actions */}
      {isPending ? (
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 border-green-500/50 text-green-500 hover:bg-green-500/10"
            onClick={() => onVote(proposal.proposal_id, 'for')}
            disabled={isVoting}
          >
            {isVoting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4 mr-1" />}
            A Favor
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 border-red-500/50 text-red-500 hover:bg-red-500/10"
            onClick={() => onVote(proposal.proposal_id, 'against')}
            disabled={isVoting}
          >
            {isVoting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsDown className="h-4 w-4 mr-1" />}
            Contra
          </Button>
        </div>
      ) : (
        <div className="text-center text-xs text-muted-foreground">
          {proposal.consensus_reached ? (
            <span className="text-green-500">✓ Consenso alcançado</span>
          ) : (
            <span className="text-red-500">✗ Proposta encerrada</span>
          )}
          {proposal.executed_at && (
            <span className="ml-2">
              em {new Date(proposal.executed_at).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          <Bot className="h-3 w-3 inline mr-1" />
          {proposal.created_by_agent || 'Sistema'}
        </span>
        <span>
          {new Date(proposal.created_at).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>
    </div>
  );
}
