import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Shield,
  ShieldOff,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Scale,
  Timer,
  AlertOctagon,
  Activity
} from "lucide-react";

interface ConstitutionalState {
  id: string;
  governance_frozen: boolean;
  frozen_at: string | null;
  frozen_by: string | null;
  frozen_reason: string | null;
  last_updated: string;
  max_price_drift_percent: number;
  time_lock_minutes: number;
  satoshi_hash: string | null;
}

interface GovernanceDecision {
  id: string;
  decision_type: string;
  agent_id: string;
  current_value: number;
  proposed_value: number;
  change_percent: number;
  status: string;
  reasoning_logic: string;
  confirmation_deadline: string;
  created_at: string;
}

interface ValidationLog {
  id: string;
  validation_type: string;
  agent_id: string;
  action_type: string;
  is_allowed: boolean;
  reasoning_logic: string;
  created_at: string;
}

export function ConstitutionalStateCard() {
  const [state, setState] = useState<ConstitutionalState | null>(null);
  const [pendingDecisions, setPendingDecisions] = useState<GovernanceDecision[]>([]);
  const [recentLogs, setRecentLogs] = useState<ValidationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [killSwitchOpen, setKillSwitchOpen] = useState(false);
  const [killSwitchReason, setKillSwitchReason] = useState("");

  useEffect(() => {
    loadState();

    // Realtime subscription para mudanças no estado constitucional
    const channel = supabase
      .channel('constitutional-state-monitor')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'constitutional_state' },
        () => loadState()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'governance_decisions' },
        () => loadState()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadState = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('constitutional-guardian', {
        body: { action: 'get_state', payload: {} }
      });

      if (error) throw error;

      setState(data.state);
      setPendingDecisions(data.pending_decisions || []);
      setRecentLogs(data.recent_logs || []);
    } catch (error) {
      console.error("Erro ao carregar estado:", error);
      // Fallback: tentar carregar diretamente do banco
      const { data: stateData } = await supabase
        .from('constitutional_state')
        .select('*')
        .eq('id', 'global')
        .single();
      
      if (stateData) {
        setState(stateData as ConstitutionalState);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKillSwitch = async () => {
    if (!killSwitchReason.trim()) {
      toast.error("Informe o motivo do congelamento");
      return;
    }

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('constitutional-guardian', {
        body: {
          action: 'freeze_governance',
          payload: {
            reason: killSwitchReason,
            admin_id: 'ADMIN_MANUAL'
          }
        }
      });

      if (error) throw error;

      toast.success("🔴 KILL-SWITCH ATIVADO - Governança Congelada!");
      setKillSwitchOpen(false);
      setKillSwitchReason("");
      await loadState();
    } catch (error) {
      console.error("Erro no Kill-Switch:", error);
      toast.error("Falha ao ativar Kill-Switch");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfreeze = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('constitutional-guardian', {
        body: {
          action: 'unfreeze_governance',
          payload: {
            reason: 'Restauração manual pelo administrador',
            admin_id: 'ADMIN_MANUAL'
          }
        }
      });

      if (error) throw error;

      toast.success("🟢 Governança Restaurada!");
      await loadState();
    } catch (error) {
      console.error("Erro ao restaurar:", error);
      toast.error("Falha ao restaurar governança");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecision = async (decisionId: string, confirm: boolean) => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('constitutional-guardian', {
        body: {
          action: 'confirm_decision',
          payload: {
            decision_id: decisionId,
            confirm,
            admin_id: 'ADMIN_MANUAL',
            reason: confirm ? 'Aprovado manualmente' : 'Cancelado manualmente'
          }
        }
      });

      if (error) throw error;

      toast.success(data.message);
      await loadState();
    } catch (error) {
      console.error("Erro na decisão:", error);
      toast.error("Falha ao processar decisão");
    } finally {
      setActionLoading(false);
    }
  };

  const getTimeLockRemaining = (deadline: string): string => {
    const remaining = new Date(deadline).getTime() - Date.now();
    if (remaining <= 0) return "Pronto";
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const getAgentColor = (agent: string): string => {
    switch (agent) {
      case "CFO": return "text-green-400";
      case "CLO": return "text-blue-400";
      case "CMO": return "text-purple-400";
      default: return "text-gray-400";
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50 bg-background/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Card Principal: Estado da Constituição */}
      <Card className={`border-2 ${state?.governance_frozen ? 'border-red-500/50 bg-red-950/20' : 'border-green-500/50 bg-green-950/20'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {state?.governance_frozen ? (
                <ShieldOff className="h-6 w-6 text-red-500 animate-pulse" />
              ) : (
                <Shield className="h-6 w-6 text-green-500" />
              )}
              <span className="text-lg">ESTADO DA CONSTITUIÇÃO</span>
            </div>
            <Badge 
              variant="outline" 
              className={`text-lg px-4 py-1 ${
                state?.governance_frozen 
                  ? 'bg-red-500/20 text-red-400 border-red-500' 
                  : 'bg-green-500/20 text-green-400 border-green-500'
              }`}
            >
              {state?.governance_frozen ? '🔴 CONGELADO' : '🟢 NORMAL'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Informações do Estado */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Limite de Drift</p>
              <p className="font-mono text-lg">{state?.max_price_drift_percent || 15}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Time-Lock</p>
              <p className="font-mono text-lg">{state?.time_lock_minutes || 15} min</p>
            </div>
          </div>

          {/* Razão do Congelamento */}
          {state?.governance_frozen && state.frozen_reason && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-start gap-2">
                <AlertOctagon className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400">Motivo do Congelamento:</p>
                  <p className="text-sm text-muted-foreground">{state.frozen_reason}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Congelado em: {new Date(state.frozen_at!).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex gap-2">
            {state?.governance_frozen ? (
              <Button
                onClick={handleUnfreeze}
                disabled={actionLoading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Shield className="h-4 w-4 mr-2" />
                )}
                Restaurar Governança
              </Button>
            ) : (
              <Dialog open={killSwitchOpen} onOpenChange={setKillSwitchOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="flex-1">
                    <AlertOctagon className="h-4 w-4 mr-2" />
                    🛑 KILL-SWITCH
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-500">
                      <AlertOctagon className="h-5 w-5" />
                      Ativar Kill-Switch (Lei 6.3)
                    </DialogTitle>
                    <DialogDescription>
                      Esta ação irá CONGELAR todas as automações de IA instantaneamente.
                      Use apenas em caso de emergência ou anomalia sistêmica.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Descreva o motivo do congelamento..."
                      value={killSwitchReason}
                      onChange={(e) => setKillSwitchReason(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-sm">
                      <p className="font-medium text-red-400">⚠️ ATENÇÃO:</p>
                      <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                        <li>Todas as decisões pendentes serão canceladas</li>
                        <li>CFO, CLO e CMO serão desativados</li>
                        <li>Sistema entrará em modo somente-leitura</li>
                      </ul>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setKillSwitchOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleKillSwitch}
                      disabled={actionLoading || !killSwitchReason.trim()}
                    >
                      {actionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ShieldOff className="h-4 w-4 mr-2" />
                      )}
                      CONGELAR GOVERNANÇA
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card: Decisões em Time-Lock */}
      <Card className="border-border/50 bg-background/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Timer className="h-5 w-5 text-amber-400" />
            Decisões em Time-Lock ({pendingDecisions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingDecisions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma decisão pendente
            </p>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {pendingDecisions.map((decision) => (
                  <div 
                    key={decision.id}
                    className="p-3 rounded-lg border bg-background/30 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getAgentColor(decision.agent_id)}>
                          {decision.agent_id}
                        </Badge>
                        <span className="text-sm font-medium">{decision.decision_type}</span>
                      </div>
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {getTimeLockRemaining(decision.confirmation_deadline)}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {decision.current_value} → {decision.proposed_value} ({decision.change_percent?.toFixed(2)}%)
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {decision.reasoning_logic}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDecision(decision.id, false)}
                        disabled={actionLoading}
                        className="flex-1"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDecision(decision.id, true)}
                        disabled={actionLoading || getTimeLockRemaining(decision.confirmation_deadline) !== "Pronto"}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Aprovar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Card: Logs de Raciocínio */}
      <Card className="border-border/50 bg-background/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-5 w-5 text-cyan-400" />
            Logs de Raciocínio (Lei 6.4)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div 
                  key={log.id}
                  className={`p-2 rounded border text-xs ${
                    log.is_allowed 
                      ? 'bg-green-500/5 border-green-500/20' 
                      : 'bg-red-500/5 border-red-500/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {log.is_allowed ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`font-medium ${getAgentColor(log.agent_id)}`}>
                      {log.agent_id}
                    </span>
                    <Badge variant="outline" className="text-[10px] h-4">
                      {log.validation_type}
                    </Badge>
                    <span className="text-muted-foreground ml-auto">
                      {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-muted-foreground line-clamp-2">
                    {log.reasoning_logic}
                  </p>
                </div>
              ))}
              {recentLogs.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum log de validação
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
