import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Crown, 
  Gauge, 
  DollarSign, 
  AlertTriangle, 
  Shield, 
  Users, 
  Bot, 
  Snowflake,
  TrendingUp,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SovereignMetrics {
  ai_operations_percent: number;
  human_operations_percent: number;
  total_operational_cost: number;
  ai_cost: number;
  human_cost: number;
  pending_conflicts: number;
  laws_compliance: Record<string, 'green' | 'yellow' | 'red'>;
  next_hire_threshold: number | null;
  current_revenue: number;
}

interface ConflictTask {
  id: string;
  task_type: string;
  created_at: string;
}

const LAW_NAMES: Record<string, string> = {
  law_1_1: '1.1 Imutabilidade',
  law_1_2: '1.2 SSOT',
  law_2_1: '2.1 Realtime-First',
  law_2_2: '2.2 Otimização',
  law_6_1: '6.1 Damping',
  law_6_3: '6.3 Kill Switch',
  law_7_3: '7.3 Arbitration',
};

export function SovereignCommandView() {
  const [metrics, setMetrics] = useState<SovereignMetrics | null>(null);
  const [conflicts, setConflicts] = useState<ConflictTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [freezeConfirmOpen, setFreezeConfirmOpen] = useState(false);
  const [isFreezing, setIsFreezing] = useState(false);

  const loadData = async () => {
    try {
      // Carregar métricas
      const { data: metricsData } = await supabase
        .from('sovereign_metrics')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(1)
        .single();

      if (metricsData) {
        setMetrics(metricsData as SovereignMetrics);
      }

      // Carregar conflitos pendentes
      const { data: conflictsData } = await supabase
        .from('ai_external_tasks')
        .select('id, task_type, created_at')
        .eq('consensus_status', 'conflict_detected')
        .order('created_at', { ascending: false })
        .limit(5);

      setConflicts(conflictsData || []);

    } catch (err) {
      console.error('Error loading sovereign data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Realtime para conflitos
    const channel = supabase
      .channel('sovereign-view')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_external_tasks' },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleEmergencyFreeze = async () => {
    setIsFreezing(true);
    try {
      const satoshiHash = `satoshi_emergency_${Date.now().toString(36)}`;
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Congelar estado constitucional
      await supabase
        .from('constitutional_state')
        .update({
          governance_frozen: true,
          frozen_reason: 'EMERGENCY FREEZE - Comando Soberano',
          frozen_at: new Date().toISOString(),
          frozen_by: userId,
          satoshi_hash: satoshiHash,
        })
        .neq('id', '');

      console.log('[EMERGENCY] System frozen by sovereign command');

      toast.success('🔒 SISTEMA CONGELADO - Modo somente leitura ativo');
      setFreezeConfirmOpen(false);

    } catch (err) {
      console.error('Error freezing system:', err);
      toast.error('Erro ao congelar sistema');
    } finally {
      setIsFreezing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 bg-muted rounded-lg" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const aiPercent = metrics?.ai_operations_percent || 100;
  const humanPercent = metrics?.human_operations_percent || 0;
  const hireProgress = metrics?.next_hire_threshold 
    ? Math.min(100, ((metrics.current_revenue || 0) / metrics.next_hire_threshold) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header com Título */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crown className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="text-2xl font-bold">👑 Painel de Comando do Soberano</h1>
            <p className="text-muted-foreground">Visão Unificada de Governança</p>
          </div>
        </div>

        {/* BOTÃO VERMELHO - Kill Switch */}
        <AlertDialog open={freezeConfirmOpen} onOpenChange={setFreezeConfirmOpen}>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              size="lg"
              className="gap-2 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all"
            >
              <Snowflake className="h-5 w-5" />
              CONGELAR TUDO
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-red-500">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="h-6 w-6" />
                ⚠️ CONFIRMAÇÃO DE EMERGÊNCIA
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>Você está prestes a ativar o <strong>Kill Switch Global (Lei 6.3)</strong>.</p>
                <p>Isso irá:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Congelar todas as automações de IA</li>
                  <li>Bloquear novas transações</li>
                  <li>Colocar o sistema em modo somente leitura</li>
                </ul>
                <p className="mt-4 font-semibold">Esta ação requer confirmação dupla.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleEmergencyFreeze}
                disabled={isFreezing}
                className="bg-red-600 hover:bg-red-700"
              >
                {isFreezing ? 'Congelando...' : '🔒 CONFIRMAR CONGELAMENTO'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Velocímetro de Autonomia */}
      <Card className="bg-gradient-to-br from-background to-muted border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Mostrador de Autonomia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-8">
            {/* Gauge Visual */}
            <div className="relative w-48 h-24 overflow-hidden">
              <div className="absolute inset-0 flex items-end justify-center">
                <div 
                  className="w-32 h-32 rounded-full border-8 border-b-blue-500 border-l-blue-500 border-t-green-500 border-r-green-500"
                  style={{
                    transform: `rotate(${(aiPercent / 100) * 180 - 90}deg)`,
                    transition: 'transform 1s ease-out',
                  }}
                />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                <span className="text-3xl font-bold">{aiPercent.toFixed(0)}%</span>
                <span className="text-xs text-muted-foreground">IA</span>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="text-center">
                <div className="flex items-center gap-2 text-blue-500">
                  <Bot className="h-5 w-5" />
                  <span className="text-2xl font-bold">{aiPercent.toFixed(0)}%</span>
                </div>
                <span className="text-sm text-muted-foreground">Operações IA</span>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-2 text-green-500">
                  <Users className="h-5 w-5" />
                  <span className="text-2xl font-bold">{humanPercent.toFixed(0)}%</span>
                </div>
                <span className="text-sm text-muted-foreground">Operações Humanas</span>
              </div>
            </div>

            {/* Custo Total */}
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 justify-center">
                <DollarSign className="h-5 w-5 text-amber-500" />
                <span className="text-2xl font-bold">
                  R$ {(metrics?.total_operational_cost || 0).toLocaleString()}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">Custo Operacional/mês</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monitor de Drasticidade */}
        <Card className={`border ${conflicts.length > 0 ? 'border-red-500 animate-pulse' : 'border-primary/20'}`}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Intervenções de Urgência
              </span>
              {conflicts.length > 0 && (
                <Badge variant="destructive">{conflicts.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {conflicts.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>Nenhum conflito pendente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conflicts.map((conflict) => (
                  <div 
                    key={conflict.id}
                    className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold">{conflict.task_type}</span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(conflict.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <Badge variant="destructive">Aguardando Cetro</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mapa de Calor de Integridade */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Integridade Constitucional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(metrics?.laws_compliance || {}).map(([law, status]) => (
                <div
                  key={law}
                  className={`p-3 rounded-lg text-center transition-colors ${
                    status === 'green' 
                      ? 'bg-green-500/20 border border-green-500/50' 
                      : status === 'yellow'
                      ? 'bg-yellow-500/20 border border-yellow-500/50'
                      : 'bg-red-500/20 border border-red-500/50 animate-pulse'
                  }`}
                  title={LAW_NAMES[law] || law}
                >
                  <div className="text-xs font-mono">{law.replace('law_', '')}</div>
                  <div className="text-lg">
                    {status === 'green' ? '✓' : status === 'yellow' ? '⚠' : '✕'}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500" /> Conforme
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-yellow-500" /> Pressão
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-500" /> Violação
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Widget de Pulo Financeiro */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Próxima Contratação Disponível
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Receita Atual: R$ {(metrics?.current_revenue || 0).toLocaleString()}</span>
              <span>Meta: R$ {(metrics?.next_hire_threshold || 0).toLocaleString()}</span>
            </div>
            <Progress value={hireProgress} className="h-3" />
            <p className="text-center text-sm text-muted-foreground">
              {hireProgress >= 100 
                ? '🎉 Você pode contratar uma nova equipe!'
                : `${(100 - hireProgress).toFixed(0)}% restante para próxima contratação`}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
