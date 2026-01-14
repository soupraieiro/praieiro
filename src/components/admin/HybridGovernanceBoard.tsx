import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Bot, Users, Scale, DollarSign, TrendingUp, AlertCircle, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GovernanceSwitch {
  id: string;
  module_key: string;
  module_name: string;
  module_icon: string;
  mode: 'ai' | 'hybrid' | 'human';
  ai_cost_monthly: number;
  human_cost_monthly: number;
  team_size: number;
  break_even_revenue: number | null;
  description: string;
  is_active: boolean;
  changed_at: string;
}

const MODE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  ai: { label: '100% IA', icon: <Bot className="h-4 w-4" />, color: 'bg-blue-500' },
  hybrid: { label: 'Híbrido', icon: <Scale className="h-4 w-4" />, color: 'bg-yellow-500' },
  human: { label: '100% Humano', icon: <Users className="h-4 w-4" />, color: 'bg-green-500' },
};

export function HybridGovernanceBoard() {
  const [switches, setSwitches] = useState<GovernanceSwitch[]>([]);
  const [loading, setLoading] = useState(true);
  const [configDialog, setConfigDialog] = useState<GovernanceSwitch | null>(null);
  const [simulation, setSimulation] = useState({
    salaryBase: 3000,
    teamSize: 2,
    revenueBreakeven: 0.1, // 10%
  });

  const loadSwitches = async () => {
    try {
      const { data, error } = await supabase
        .from('governance_switches')
        .select('*')
        .eq('is_active', true)
        .order('module_key');

      if (error) throw error;
      setSwitches((data || []) as unknown as GovernanceSwitch[]);
    } catch (err) {
      console.error('Error loading switches:', err);
      toast.error('Erro ao carregar interruptores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSwitches();

    const channel = supabase
      .channel('governance-switches')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'governance_switches' },
        () => loadSwitches()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleModeChange = async (switchItem: GovernanceSwitch, newMode: 'ai' | 'hybrid' | 'human') => {
    try {
      const satoshiHash = `satoshi_switch_${Date.now().toString(36)}`;

      // Log da mudança
      console.log(`[GOVERNANCE] Mode change: ${switchItem.module_key} from ${switchItem.mode} to ${newMode}`);

      // Atualizar switch
      await supabase
        .from('governance_switches')
        .update({
          mode: newMode,
          changed_at: new Date().toISOString(),
          satoshi_hash: satoshiHash,
        })
        .eq('id', switchItem.id);

      toast.success(`${switchItem.module_name} alterado para ${MODE_LABELS[newMode].label}`);
      loadSwitches();

    } catch (err) {
      console.error('Error changing mode:', err);
      toast.error('Erro ao alterar modo');
    }
  };

  const handleSaveConfig = async () => {
    if (!configDialog) return;

    try {
      const humanCost = simulation.salaryBase * simulation.teamSize * 1.8; // 80% encargos

      await supabase
        .from('governance_switches')
        .update({
          team_size: simulation.teamSize,
          human_cost_monthly: humanCost,
          break_even_revenue: humanCost / simulation.revenueBreakeven,
        })
        .eq('id', configDialog.id);

      toast.success('Simulação salva');
      setConfigDialog(null);
      loadSwitches();

    } catch (err) {
      console.error('Error saving config:', err);
      toast.error('Erro ao salvar');
    }
  };

  const calculateBreakEvenProgress = (switchItem: GovernanceSwitch) => {
    if (!switchItem.break_even_revenue) return 0;
    // Mock: usar um valor de receita simulado
    const mockRevenue = 50000;
    return Math.min(100, (mockRevenue / switchItem.break_even_revenue) * 100);
  };

  if (loading) {
    return (
      <Card className="bg-background/50 backdrop-blur border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            🎛️ Controle de Autonomia Operacional
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-background/50 backdrop-blur border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              🎛️ Controle de Autonomia Operacional
            </CardTitle>
            <div className="flex gap-2">
              {Object.entries(MODE_LABELS).map(([key, { label, color }]) => (
                <Badge key={key} className={`${color} text-xs`}>
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {switches.map((switchItem) => {
            const breakEvenProgress = calculateBreakEvenProgress(switchItem);
            const isNearBreakEven = breakEvenProgress >= 80;

            return (
              <div
                key={switchItem.id}
                className={`p-4 rounded-lg border ${isNearBreakEven ? 'border-green-500/50 bg-green-500/5' : 'border-border bg-muted/30'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{switchItem.module_icon}</span>
                    <div>
                      <div className="font-semibold">{switchItem.module_name}</div>
                      <div className="text-xs text-muted-foreground">{switchItem.description}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {isNearBreakEven && (
                      <Badge variant="outline" className="border-green-500 text-green-500 text-xs">
                        🟢 Pulo Financeiro
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setConfigDialog(switchItem);
                        setSimulation({
                          salaryBase: 3000,
                          teamSize: switchItem.team_size || 2,
                          revenueBreakeven: 0.1,
                        });
                      }}
                    >
                      <DollarSign className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Interruptor de 3 estados */}
                <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
                  {(['ai', 'hybrid', 'human'] as const).map((mode) => {
                    const isActive = switchItem.mode === mode;
                    const { label, icon, color } = MODE_LABELS[mode];

                    return (
                      <Button
                        key={mode}
                        variant={isActive ? 'default' : 'ghost'}
                        size="sm"
                        className={`flex-1 ${isActive ? color : ''}`}
                        onClick={() => handleModeChange(switchItem, mode)}
                      >
                        {icon}
                        <span className="ml-2 text-xs">{label}</span>
                      </Button>
                    );
                  })}
                </div>

                {/* Indicadores de custo */}
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                  <div className="text-center p-2 rounded bg-background/50">
                    <div className="text-muted-foreground">Custo IA</div>
                    <div className="font-semibold text-blue-500">
                      R$ {(switchItem.ai_cost_monthly || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center p-2 rounded bg-background/50">
                    <div className="text-muted-foreground">Custo Humano</div>
                    <div className="font-semibold text-green-500">
                      R$ {(switchItem.human_cost_monthly || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center p-2 rounded bg-background/50">
                    <div className="text-muted-foreground">Break-even</div>
                    <div className="font-semibold">
                      {breakEvenProgress.toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Barra de progresso para break-even */}
                {switchItem.break_even_revenue && (
                  <div className="mt-2">
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${isNearBreakEven ? 'bg-green-500' : 'bg-primary/50'}`}
                        style={{ width: `${breakEvenProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Dialog de Simulação de Custos */}
      <Dialog open={!!configDialog} onOpenChange={() => setConfigDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              📊 Simulação de Custo de Substituição
            </DialogTitle>
            <DialogDescription>
              Simule o custo de transição para equipe humana
            </DialogDescription>
          </DialogHeader>

          {configDialog && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Salário Base (R$)</Label>
                <Input
                  type="number"
                  value={simulation.salaryBase}
                  onChange={(e) => setSimulation({ ...simulation, salaryBase: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Tamanho da Equipe: {simulation.teamSize}</Label>
                <Slider
                  value={[simulation.teamSize]}
                  onValueChange={([v]) => setSimulation({ ...simulation, teamSize: v })}
                  min={1}
                  max={10}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>% Receita para Break-even: {(simulation.revenueBreakeven * 100).toFixed(0)}%</Label>
                <Slider
                  value={[simulation.revenueBreakeven * 100]}
                  onValueChange={([v]) => setSimulation({ ...simulation, revenueBreakeven: v / 100 })}
                  min={1}
                  max={30}
                  step={1}
                />
              </div>

              {/* Resultado da simulação */}
              <div className="p-4 rounded-lg bg-muted space-y-2">
                <div className="flex justify-between">
                  <span>Custo Mensal Total:</span>
                  <span className="font-bold">
                    R$ {(simulation.salaryBase * simulation.teamSize * 1.8).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Receita Necessária:</span>
                  <span className="font-bold text-green-500">
                    R$ {((simulation.salaryBase * simulation.teamSize * 1.8) / simulation.revenueBreakeven).toLocaleString()}
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setConfigDialog(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveConfig}>
                  Salvar Simulação
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
