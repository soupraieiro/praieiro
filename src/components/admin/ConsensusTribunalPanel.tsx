import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Scale, AlertTriangle, CheckCircle2, XCircle, MessageSquare, Shield, Gavel } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConflictTask {
  id: string;
  provider: string;
  provider_b: string;
  task_type: string;
  input_data: {
    prompt?: string;
    affected_users_percent?: number;
    affected_economy_percent?: number;
  };
  output_data: { provider: string; response: string };
  output_data_b: { provider: string; response: string };
  reasoning_logic: string;
  reasoning_logic_b: string;
  consensus_status: string;
  created_at: string;
}

const PROVIDER_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  perplexity: 'Perplexity',
  lovable: 'Lovable AI',
};

export function ConsensusTribunalPanel() {
  const [conflicts, setConflicts] = useState<ConflictTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConflict, setSelectedConflict] = useState<ConflictTask | null>(null);
  const [founderComment, setFounderComment] = useState("");
  const [processing, setProcessing] = useState(false);

  const loadConflicts = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_external_tasks')
        .select('*')
        .eq('consensus_status', 'conflict_detected')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConflicts((data || []) as unknown as ConflictTask[]);
    } catch (err) {
      console.error('Error loading conflicts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConflicts();

    const channel = supabase
      .channel('consensus-conflicts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_external_tasks' },
        (payload) => {
          if ((payload.new as ConflictTask)?.consensus_status === 'conflict_detected') {
            loadConflicts();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleFounderDecision = async (decision: 'ratify_a' | 'ratify_b' | 'veto') => {
    if (!selectedConflict) return;
    if (!founderComment.trim()) {
      toast.error('Comentário do Fundador é obrigatório para registrar jurisprudência');
      return;
    }

    setProcessing(true);
    try {
      const satoshiHash = `satoshi_founder_${Date.now().toString(36)}`;
      console.log(`[FOUNDER] Decision: ${decision} for task ${selectedConflict.id}`);

      // Atualizar tarefa
      await supabase
        .from('ai_external_tasks')
        .update({
          consensus_status: 'resolved',
          status: decision === 'veto' ? 'failed' : 'completed',
          satoshi_hash: satoshiHash,
        })
        .eq('id', selectedConflict.id);

      // Descongelar governança se foi congelada por este conflito
      await supabase
        .from('constitutional_state')
        .update({
          governance_frozen: false,
          frozen_reason: null,
          frozen_at: null,
          satoshi_hash: satoshiHash,
        })
        .neq('id', '');

      toast.success(`Decisão ${decision === 'veto' ? 'VETO SOBERANO' : decision === 'ratify_a' ? 'RATIFICADO A' : 'RATIFICADO B'} registrada`);
      setSelectedConflict(null);
      setFounderComment("");
      loadConflicts();

    } catch (err) {
      console.error('Error processing decision:', err);
      toast.error('Erro ao processar decisão');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-background/50 backdrop-blur border-yellow-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            ⚖️ Tribunal de Consenso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={`bg-background/50 backdrop-blur ${conflicts.length > 0 ? 'border-red-500 animate-pulse' : 'border-primary/20'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              ⚖️ Tribunal de Consenso
            </CardTitle>
            {conflicts.length > 0 && (
              <Badge variant="destructive" className="animate-bounce">
                {conflicts.length} Conflito{conflicts.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {conflicts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p>Sem conflitos pendentes</p>
              <p className="text-xs mt-1">Todas as IAs estão em consenso</p>
            </div>
          ) : (
            conflicts.map((conflict) => (
              <div
                key={conflict.id}
                className="p-4 rounded-lg border-2 border-red-500/50 bg-red-500/5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <span className="font-semibold">{conflict.task_type}</span>
                  </div>
                  <Badge variant="destructive">CONFLITO DETECTADO</Badge>
                </div>

                {/* Vereditos lado a lado */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Veredito A */}
                  <div className="p-3 rounded bg-blue-500/10 border border-blue-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Veredito A</Badge>
                      <span className="text-sm font-medium">
                        {PROVIDER_NAMES[conflict.provider]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-4">
                      {conflict.reasoning_logic}
                    </p>
                  </div>

                  {/* Veredito B */}
                  <div className="p-3 rounded bg-purple-500/10 border border-purple-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Veredito B</Badge>
                      <span className="text-sm font-medium">
                        {PROVIDER_NAMES[conflict.provider_b]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-4">
                      {conflict.reasoning_logic_b}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => setSelectedConflict(conflict)}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  <Gavel className="h-4 w-4 mr-2" />
                  Abrir Cetro de Comando
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Dialog do Cetro de Comando */}
      <Dialog open={!!selectedConflict} onOpenChange={() => setSelectedConflict(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Shield className="h-6 w-6 text-amber-500" />
              👑 Cetro de Comando: Decisão do Fundador
            </DialogTitle>
            <DialogDescription>
              As IAs divergiram. Sua decisão soberana é necessária.
            </DialogDescription>
          </DialogHeader>

          {selectedConflict && (
            <div className="space-y-6">
              {/* Contexto */}
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2">📋 Contexto da Decisão</h4>
                <p className="text-sm"><strong>Tipo:</strong> {selectedConflict.task_type}</p>
                {selectedConflict.input_data.prompt && (
                  <p className="text-sm mt-2"><strong>Prompt:</strong> {selectedConflict.input_data.prompt}</p>
                )}
              </div>

              {/* Argumentos lado a lado */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border-2 border-blue-500/50 bg-blue-500/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-blue-500">IA A</Badge>
                    <span className="font-semibold">{PROVIDER_NAMES[selectedConflict.provider]}</span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {selectedConflict.reasoning_logic}
                  </div>
                </div>

                <div className="p-4 rounded-lg border-2 border-purple-500/50 bg-purple-500/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-purple-500">IA B</Badge>
                    <span className="font-semibold">{PROVIDER_NAMES[selectedConflict.provider_b]}</span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {selectedConflict.reasoning_logic_b}
                  </div>
                </div>
              </div>

              {/* Comentário do Fundador */}
              <div>
                <label className="flex items-center gap-2 mb-2 font-medium">
                  <MessageSquare className="h-4 w-4" />
                  Comentário de Jurisprudência (obrigatório)
                </label>
                <Textarea
                  value={founderComment}
                  onChange={(e) => setFounderComment(e.target.value)}
                  placeholder="Explique sua decisão para o registro histórico..."
                  className="min-h-24"
                />
              </div>

              {/* Botões de Decisão */}
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => handleFounderDecision('ratify_a')}
                  disabled={processing || !founderComment.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  RATIFICAR A
                </Button>
                <Button
                  onClick={() => handleFounderDecision('ratify_b')}
                  disabled={processing || !founderComment.trim()}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  RATIFICAR B
                </Button>
                <Button
                  onClick={() => handleFounderDecision('veto')}
                  disabled={processing || !founderComment.trim()}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  VETO SOBERANO
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
