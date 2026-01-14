import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Heart, Shield, Clock, AlertTriangle, Lock, Mail, Wallet, BookOpen, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";

interface SovereignVitality {
  id: string;
  founder_id: string | null;
  last_heartbeat: string;
  heartbeat_interval_days: number;
  regency_mode: 'preservation' | 'autopilot' | 'liquidation';
  successor_email_encrypted: string | null;
  successor_wallet_encrypted: string | null;
  is_regency_active: boolean;
  regency_activated_at: string | null;
  testament_principles: string[];
}

const REGENCY_MODES = {
  preservation: {
    icon: '🛡️',
    label: 'Preservação',
    description: 'Congela funcionalidades, mantém segurança e protege saldos',
    color: 'border-blue-500',
  },
  autopilot: {
    icon: '🤖',
    label: 'Piloto Automático',
    description: 'IA Constitucional assume, consenso para decisões de rotina',
    color: 'border-purple-500',
  },
  liquidation: {
    icon: '📤',
    label: 'Liquidação Gradual',
    description: 'Devolução de ativos e encerramento seguro em meses',
    color: 'border-red-500',
  },
};

export function SovereignVitalityPanel() {
  const [vitality, setVitality] = useState<SovereignVitality | null>(null);
  const [loading, setLoading] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [testamentOpen, setTestamentOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    regencyMode: 'preservation' as 'preservation' | 'autopilot' | 'liquidation',
    successorEmail: '',
    successorWallet: '',
    heartbeatDays: 30,
  });

  const [newPrinciple, setNewPrinciple] = useState('');

  const loadVitality = async () => {
    try {
      const { data, error } = await supabase
        .from('sovereign_vitality')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setVitality(data as SovereignVitality);
        setFormData({
          regencyMode: data.regency_mode as 'preservation' | 'autopilot' | 'liquidation',
          successorEmail: data.successor_email_encrypted || '',
          successorWallet: data.successor_wallet_encrypted || '',
          heartbeatDays: data.heartbeat_interval_days,
        });
      }
    } catch (err) {
      console.error('Error loading vitality:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVitality();
  }, []);

  const handleHeartbeat = async () => {
    if (!vitality) return;

    try {
      const satoshiHash = `satoshi_heartbeat_${Date.now().toString(36)}`;

      await supabase
        .from('sovereign_vitality')
        .update({
          last_heartbeat: new Date().toISOString(),
          is_regency_active: false,
          regency_activated_at: null,
          updated_at: new Date().toISOString(),
          satoshi_hash: satoshiHash,
        })
        .eq('id', vitality.id);

      // Log de heartbeat - tabela immutable_ledger será criada futuramente
      console.log('[HEARTBEAT]', { satoshiHash, vitality_id: vitality.id });

      toast.success('Check-in de vitalidade registrado');
      loadVitality();

    } catch (err) {
      console.error('Error updating heartbeat:', err);
      toast.error('Erro ao registrar check-in');
    }
  };

  const handleSaveConfig = async () => {
    if (!vitality) return;
    setSaving(true);

    try {
      const satoshiHash = `satoshi_vitality_${Date.now().toString(36)}`;

      await supabase
        .from('sovereign_vitality')
        .update({
          regency_mode: formData.regencyMode,
          successor_email_encrypted: formData.successorEmail || null,
          successor_wallet_encrypted: formData.successorWallet || null,
          heartbeat_interval_days: formData.heartbeatDays,
          updated_at: new Date().toISOString(),
          satoshi_hash: satoshiHash,
        })
        .eq('id', vitality.id);

      // Log de config change - tabela immutable_ledger será criada futuramente
      console.log('[CONFIG_CHANGE]', { satoshiHash, vitality_id: vitality.id, changes: formData });

      toast.success('Configurações de hereditariedade salvas');
      setConfigOpen(false);
      loadVitality();

    } catch (err) {
      console.error('Error saving config:', err);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPrinciple = async () => {
    if (!vitality || !newPrinciple.trim()) return;

    try {
      const updatedPrinciples = [...(vitality.testament_principles || []), newPrinciple.trim()];
      const satoshiHash = `satoshi_testament_${Date.now().toString(36)}`;

      await supabase
        .from('sovereign_vitality')
        .update({
          testament_principles: updatedPrinciples,
          updated_at: new Date().toISOString(),
          satoshi_hash: satoshiHash,
        })
        .eq('id', vitality.id);

      // Log de testament - tabela immutable_ledger será criada futuramente
      console.log('[TESTAMENT]', { satoshiHash, principle: newPrinciple.trim() });

      toast.success('Princípio adicionado ao Testamento');
      setNewPrinciple('');
      loadVitality();

    } catch (err) {
      console.error('Error adding principle:', err);
      toast.error('Erro ao adicionar princípio');
    }
  };

  if (loading) {
    return (
      <Card className="bg-background/50 backdrop-blur border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            💓 Protocolo de Hereditariedade Digital
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!vitality) {
    return (
      <Card className="bg-background/50 backdrop-blur border-primary/20">
        <CardContent className="py-8 text-center text-muted-foreground">
          Protocolo de Hereditariedade não configurado
        </CardContent>
      </Card>
    );
  }

  const daysSinceHeartbeat = differenceInDays(new Date(), new Date(vitality.last_heartbeat));
  const daysRemaining = vitality.heartbeat_interval_days - daysSinceHeartbeat;
  const isWarning = daysRemaining <= 7;
  const isDanger = daysRemaining <= 3;

  return (
    <>
      <Card className={`bg-background/50 backdrop-blur ${isDanger ? 'border-red-500 animate-pulse' : isWarning ? 'border-yellow-500' : 'border-primary/20'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Heart className={`h-5 w-5 ${isDanger ? 'text-red-500 animate-pulse' : 'text-green-500'}`} />
              💓 Protocolo de Hereditariedade Digital
            </CardTitle>
            {vitality.is_regency_active && (
              <Badge variant="destructive" className="animate-pulse">
                ⚠️ REGÊNCIA ATIVA
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Monitor de Vitalidade */}
          <div className={`p-4 rounded-lg ${isDanger ? 'bg-red-500/10 border border-red-500' : isWarning ? 'bg-yellow-500/10 border border-yellow-500' : 'bg-green-500/10 border border-green-500/30'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span className="font-semibold">Heartbeat do Soberano</span>
              </div>
              <Button onClick={handleHeartbeat} size="sm" variant={isDanger ? 'destructive' : 'default'}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Check-in
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="text-muted-foreground">Último Check-in</div>
                <div className="font-bold">
                  {new Date(vitality.last_heartbeat).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Dias Restantes</div>
                <div className={`font-bold text-2xl ${isDanger ? 'text-red-500' : isWarning ? 'text-yellow-500' : 'text-green-500'}`}>
                  {daysRemaining}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Intervalo</div>
                <div className="font-bold">{vitality.heartbeat_interval_days} dias</div>
              </div>
            </div>

            {(isWarning || isDanger) && (
              <div className={`mt-3 p-2 rounded text-sm flex items-center gap-2 ${isDanger ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                <AlertTriangle className="h-4 w-4" />
                {isDanger ? 'URGENTE: Regência será ativada em breve!' : 'Atenção: Faça check-in em breve'}
              </div>
            )}
          </div>

          {/* Modo de Regência Atual */}
          <div className={`p-4 rounded-lg border ${REGENCY_MODES[vitality.regency_mode].color}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Modo de Regência Configurado</span>
              <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)}>
                <Lock className="h-4 w-4 mr-2" />
                Configurar
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{REGENCY_MODES[vitality.regency_mode].icon}</span>
              <div>
                <div className="font-bold">{REGENCY_MODES[vitality.regency_mode].label}</div>
                <div className="text-sm text-muted-foreground">
                  {REGENCY_MODES[vitality.regency_mode].description}
                </div>
              </div>
            </div>
          </div>

          {/* Sucessor Designado */}
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Sucessor Designado
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {vitality.successor_email_encrypted ? (
                  <span className="font-mono">••••••@••••••</span>
                ) : (
                  <span className="text-muted-foreground">Não configurado</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                {vitality.successor_wallet_encrypted ? (
                  <span className="font-mono">0x••••••••</span>
                ) : (
                  <span className="text-muted-foreground">Não configurado</span>
                )}
              </div>
            </div>
          </div>

          {/* Memorial de Invariantes */}
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Testamento Técnico
              </span>
              <Button variant="outline" size="sm" onClick={() => setTestamentOpen(true)}>
                Editar
              </Button>
            </div>
            {vitality.testament_principles && vitality.testament_principles.length > 0 ? (
              <ul className="text-sm space-y-1">
                {vitality.testament_principles.map((principle, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {principle}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum princípio registrado</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Configuração */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Hereditariedade Digital</DialogTitle>
            <DialogDescription>
              Configure como o sistema deve agir na sua ausência
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Intervalo de Check-in (dias)</Label>
              <Input
                type="number"
                value={formData.heartbeatDays}
                onChange={(e) => setFormData({ ...formData, heartbeatDays: Number(e.target.value) })}
                min={7}
                max={365}
              />
            </div>

            <div className="space-y-3">
              <Label>Modo de Regência</Label>
              <RadioGroup
                value={formData.regencyMode}
                onValueChange={(v) => setFormData({ ...formData, regencyMode: v as typeof formData.regencyMode })}
              >
                {Object.entries(REGENCY_MODES).map(([key, mode]) => (
                  <div key={key} className={`flex items-center space-x-2 p-3 rounded-lg border ${formData.regencyMode === key ? mode.color : 'border-border'}`}>
                    <RadioGroupItem value={key} id={key} />
                    <Label htmlFor={key} className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span>{mode.icon}</span>
                        <span className="font-semibold">{mode.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{mode.description}</p>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Email do Sucessor (encriptado)</Label>
              <Input
                type="email"
                value={formData.successorEmail}
                onChange={(e) => setFormData({ ...formData, successorEmail: e.target.value })}
                placeholder="sucessor@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Wallet do Sucessor (encriptado)</Label>
              <Input
                value={formData.successorWallet}
                onChange={(e) => setFormData({ ...formData, successorWallet: e.target.value })}
                placeholder="0x..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveConfig} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Testamento */}
      <Dialog open={testamentOpen} onOpenChange={setTestamentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Memorial de Invariantes</DialogTitle>
            <DialogDescription>
              Princípios que as IAs devem seguir mesmo na sua ausência
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Adicionar Novo Princípio</Label>
              <Textarea
                value={newPrinciple}
                onChange={(e) => setNewPrinciple(e.target.value)}
                placeholder="Ex: Nunca reduzir o saldo de um usuário sem consentimento explícito..."
              />
              <Button onClick={handleAddPrinciple} disabled={!newPrinciple.trim()}>
                Adicionar ao Testamento
              </Button>
            </div>

            {vitality?.testament_principles && vitality.testament_principles.length > 0 && (
              <div className="p-4 rounded-lg bg-muted">
                <h4 className="font-semibold mb-2">Princípios Registrados</h4>
                <ul className="space-y-2 text-sm">
                  {vitality.testament_principles.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 p-2 bg-background rounded">
                      <span className="font-bold text-primary">{i + 1}.</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
