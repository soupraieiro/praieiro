/**
 * CRITICAL ALERTS PANEL
 * Painel de alertas críticos do sistema com ações imediatas
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertTriangle, Bell, CheckCircle, XCircle, Clock, RefreshCw,
  Shield, Zap, Server, Database, ExternalLink, MessageSquare,
  Volume2, VolumeX
} from 'lucide-react';

interface CriticalAlert {
  id: string;
  alert_type: string;
  alert_severity: 'low' | 'medium' | 'high' | 'critical';
  alert_title: string;
  alert_message: string;
  source_orch_id: string | null;
  source_log_id: string | null;
  is_acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolution_notes: string | null;
  satoshi_hash: string | null;
  created_at: string;
}

const SEVERITY_CONFIG = {
  low: { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500' },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500' },
  high: { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500' },
  critical: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500 animate-pulse' }
};

const ALERT_TYPE_ICONS: Record<string, React.ElementType> = {
  security: Shield,
  performance: Zap,
  database: Database,
  server: Server,
  default: AlertTriangle
};

export default function CriticalAlertsPanel() {
  const [alerts, setAlerts] = useState<CriticalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<CriticalAlert | null>(null);
  const [showAcknowledgeDialog, setShowAcknowledgeDialog] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [acknowledging, setAcknowledging] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showOnlyActive, setShowOnlyActive] = useState(true);

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('sys_critical_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const filtered = showOnlyActive 
        ? (data || []).filter((a: any) => !a.is_acknowledged)
        : (data || []);

      setAlerts(filtered as unknown as CriticalAlert[]);
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
      toast.error('Erro ao carregar alertas críticos');
    } finally {
      setLoading(false);
    }
  }, [showOnlyActive]);

  useEffect(() => {
    loadAlerts();

    // Realtime para novos alertas
    const channel = supabase
      .channel('critical-alerts-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'sys_critical_alerts'
      }, (payload) => {
        const newAlert = payload.new as CriticalAlert;
        setAlerts(prev => [newAlert, ...prev]);

        // Notificação sonora para alertas críticos
        if (soundEnabled && (newAlert.alert_severity === 'critical' || newAlert.alert_severity === 'high')) {
          playAlertSound();
        }

        toast.error(`ALERTA ${newAlert.alert_severity.toUpperCase()}`, {
          description: newAlert.alert_title,
          duration: 10000
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sys_critical_alerts'
      }, () => {
        loadAlerts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAlerts, soundEnabled]);

  const playAlertSound = () => {
    // Criar um beep simples usando Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.error('Erro ao reproduzir som:', error);
    }
  };

  const acknowledgeAlert = async () => {
    if (!selectedAlert) return;

    setAcknowledging(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('sys_critical_alerts')
        .update({
          is_acknowledged: true,
          acknowledged_by: user?.id || null,
          acknowledged_at: new Date().toISOString(),
          resolution_notes: resolutionNotes || null
        })
        .eq('id', selectedAlert.id);

      if (error) throw error;

      toast.success('Alerta reconhecido com sucesso');
      setShowAcknowledgeDialog(false);
      setResolutionNotes('');
      setSelectedAlert(null);
      loadAlerts();
    } catch (error) {
      console.error('Erro ao reconhecer alerta:', error);
      toast.error('Erro ao reconhecer alerta');
    } finally {
      setAcknowledging(false);
    }
  };

  const getAlertIcon = (type: string) => {
    const Icon = ALERT_TYPE_ICONS[type] || ALERT_TYPE_ICONS.default;
    return Icon;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const activeAlerts = alerts.filter(a => !a.is_acknowledged);
  const criticalCount = activeAlerts.filter(a => a.alert_severity === 'critical').length;
  const highCount = activeAlerts.filter(a => a.alert_severity === 'high').length;

  return (
    <div className="space-y-6">
      {/* Header com Resumo */}
      <Card className={criticalCount > 0 ? 'border-red-500 border-2' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className={`w-5 h-5 ${criticalCount > 0 ? 'text-red-500 animate-pulse' : ''}`} />
                Alertas Críticos
                {activeAlerts.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {activeAlerts.length} ativos
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Monitoramento de eventos críticos que requerem atenção imediata
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? 'Desativar som' : 'Ativar som'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
              <Button
                variant={showOnlyActive ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlyActive(!showOnlyActive)}
              >
                {showOnlyActive ? 'Apenas Ativos' : 'Todos'}
              </Button>
              <Button variant="outline" size="sm" onClick={loadAlerts} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Resumo de Alertas */}
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="text-2xl font-bold text-red-500">{criticalCount}</div>
              <div className="text-xs text-muted-foreground">Críticos</div>
            </div>
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
              <div className="text-2xl font-bold text-orange-500">{highCount}</div>
              <div className="text-xs text-muted-foreground">Alta Prioridade</div>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="text-2xl font-bold text-amber-500">
                {activeAlerts.filter(a => a.alert_severity === 'medium').length}
              </div>
              <div className="text-xs text-muted-foreground">Média</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-500/10 border border-slate-500/30">
              <div className="text-2xl font-bold text-slate-400">
                {activeAlerts.filter(a => a.alert_severity === 'low').length}
              </div>
              <div className="text-xs text-muted-foreground">Baixa</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Alertas */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mb-2 text-emerald-500 opacity-50" />
                <p>Nenhum alerta {showOnlyActive ? 'ativo' : ''}</p>
              </div>
            ) : (
              <div className="divide-y">
                {alerts.map((alert) => {
                  const severity = SEVERITY_CONFIG[alert.alert_severity] || SEVERITY_CONFIG.medium;
                  const AlertIcon = getAlertIcon(alert.alert_type);

                  return (
                    <div
                      key={alert.id}
                      className={`p-4 ${severity.bg} border-l-4 ${severity.border} ${
                        alert.is_acknowledged ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full ${severity.bg}`}>
                            <AlertIcon className={`w-5 h-5 ${severity.color}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{alert.alert_title}</span>
                              <Badge
                                variant="outline"
                                className={`text-xs ${severity.color}`}
                              >
                                {alert.alert_severity.toUpperCase()}
                              </Badge>
                              {alert.is_acknowledged && (
                                <Badge variant="secondary" className="text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Reconhecido
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {alert.alert_message}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTimestamp(alert.created_at)}
                              </span>
                              {alert.source_orch_id && (
                                <span className="font-mono">
                                  Orch: {alert.source_orch_id.slice(0, 8)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {!alert.is_acknowledged && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedAlert(alert);
                              setShowAcknowledgeDialog(true);
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Reconhecer
                          </Button>
                        )}
                      </div>

                      {alert.resolution_notes && (
                        <div className="mt-3 p-2 rounded bg-muted/50 text-sm">
                          <span className="text-muted-foreground">Resolução: </span>
                          {alert.resolution_notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dialog de Reconhecimento */}
      <Dialog open={showAcknowledgeDialog} onOpenChange={setShowAcknowledgeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Reconhecer Alerta
            </DialogTitle>
          </DialogHeader>
          
          {selectedAlert && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted">
                <h4 className="font-medium mb-1">{selectedAlert.alert_title}</h4>
                <p className="text-sm text-muted-foreground">{selectedAlert.alert_message}</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Notas de Resolução (opcional)
                </label>
                <Textarea
                  placeholder="Descreva as ações tomadas ou observações..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAcknowledgeDialog(false);
                setResolutionNotes('');
              }}
            >
              Cancelar
            </Button>
            <Button onClick={acknowledgeAlert} disabled={acknowledging}>
              {acknowledging ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Confirmar Reconhecimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
