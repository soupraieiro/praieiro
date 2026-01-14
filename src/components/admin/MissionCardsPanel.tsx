/**
 * MISSION CARDS PANEL
 * Cartões de Missão - Interface visual para orientações de IA
 * Cada cartão representa uma missão com título, severidade e ação executável
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Zap, Shield, TrendingUp, Wrench, Play, CheckCircle, Clock,
  AlertTriangle, ChevronRight, Loader2, RefreshCw, Code, Eye,
  Rocket, Award, Flame, Sparkles
} from 'lucide-react';

interface MissionCard {
  id: string;
  title: string;
  description: string;
  type: 'optimization' | 'fix' | 'security' | 'feature' | 'improvement';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'executing' | 'executed' | 'failed';
  steps: Array<{ step: number; action: string }>;
  code: string | null;
  targetTable: string | null;
  targetId: string | null;
  satoshiHash: string | null;
  createdAt: string;
  executedAt: string | null;
}

const TYPE_CONFIG = {
  optimization: { 
    icon: TrendingUp, 
    color: 'text-amber-500', 
    bg: 'bg-gradient-to-br from-amber-500/20 to-orange-500/20',
    border: 'border-amber-500/30',
    label: 'Otimização',
    glow: 'shadow-amber-500/20'
  },
  fix: { 
    icon: Wrench, 
    color: 'text-red-500', 
    bg: 'bg-gradient-to-br from-red-500/20 to-rose-500/20',
    border: 'border-red-500/30',
    label: 'Correção',
    glow: 'shadow-red-500/20'
  },
  security: { 
    icon: Shield, 
    color: 'text-purple-500', 
    bg: 'bg-gradient-to-br from-purple-500/20 to-violet-500/20',
    border: 'border-purple-500/30',
    label: 'Segurança',
    glow: 'shadow-purple-500/20'
  },
  feature: { 
    icon: Sparkles, 
    color: 'text-emerald-500', 
    bg: 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20',
    border: 'border-emerald-500/30',
    label: 'Feature',
    glow: 'shadow-emerald-500/20'
  },
  improvement: { 
    icon: Zap, 
    color: 'text-blue-500', 
    bg: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20',
    border: 'border-blue-500/30',
    label: 'Melhoria',
    glow: 'shadow-blue-500/20'
  }
};

const PRIORITY_CONFIG = {
  low: { color: 'bg-slate-500', label: 'Baixa', icon: null },
  medium: { color: 'bg-blue-500', label: 'Média', icon: null },
  high: { color: 'bg-orange-500', label: 'Alta', icon: Flame },
  critical: { color: 'bg-red-500', label: 'Crítica', icon: AlertTriangle }
};

export default function MissionCardsPanel() {
  const [missions, setMissions] = useState<MissionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState<MissionCard | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const loadMissions = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('sys_ai_guidance')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const parsed: MissionCard[] = (data || []).map((g: Record<string, unknown>) => ({
        id: g.id as string,
        title: (g.guidance_title as string) || 'Missão',
        description: (g.guidance_description as string) || '',
        type: (g.guidance_type as MissionCard['type']) || 'improvement',
        priority: (g.priority as MissionCard['priority']) || 'medium',
        status: (g.status as MissionCard['status']) || 'pending',
        steps: parseSteps(g.guidance_steps),
        code: (g.guidance_code as string) || null,
        targetTable: (g.target_table as string) || null,
        targetId: (g.target_id as string) || null,
        satoshiHash: (g.satoshi_hash as string) || null,
        createdAt: g.created_at as string,
        executedAt: (g.executed_at as string) || null
      }));

      setMissions(parsed);
    } catch (error) {
      console.error('Erro ao carregar missões:', error);
      toast.error('Erro ao carregar Cartões de Missão');
    } finally {
      setLoading(false);
    }
  }, []);

  const parseSteps = (steps: unknown): Array<{ step: number; action: string }> => {
    if (!steps) return [];
    if (typeof steps === 'string') {
      try {
        return JSON.parse(steps);
      } catch {
        return [];
      }
    }
    if (Array.isArray(steps)) return steps;
    return [];
  };

  useEffect(() => {
    loadMissions();

    // Realtime subscription
    const channel = supabase
      .channel('mission-cards-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sys_ai_guidance'
      }, () => loadMissions())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadMissions]);

  const executeMission = async (mission: MissionCard) => {
    setExecuting(mission.id);
    try {
      // Chamar a função RPC para executar a orientação
      const { data, error } = await supabase
        .rpc('execute_guidance', { p_guidance_id: mission.id });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      
      if (result?.success) {
        toast.success('Missão executada com sucesso!', {
          description: `${mission.title} foi concluída.`
        });
      } else {
        throw new Error(result?.error || 'Erro desconhecido');
      }

      loadMissions();
    } catch (error) {
      console.error('Erro ao executar missão:', error);
      toast.error('Erro ao executar missão');
      
      // Marcar como falha
      await supabase
        .from('sys_ai_guidance')
        .update({ status: 'failed' })
        .eq('id', mission.id);
    } finally {
      setExecuting(null);
    }
  };

  const getStatusBadge = (status: MissionCard['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> Pendente</Badge>;
      case 'executing':
        return <Badge className="gap-1 bg-blue-500"><Loader2 className="w-3 h-3 animate-spin" /> Executando</Badge>;
      case 'executed':
        return <Badge className="gap-1 bg-emerald-500"><CheckCircle className="w-3 h-3" /> Concluída</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" /> Falha</Badge>;
    }
  };

  const pendingCount = missions.filter(m => m.status === 'pending').length;
  const criticalCount = missions.filter(m => m.priority === 'critical' && m.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="w-6 h-6 text-primary" />
            Cartões de Missão
          </h2>
          <p className="text-muted-foreground">
            Orientações de IA para melhorar o sistema
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
            <Target className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{pendingCount}</span>
            <span className="text-sm text-muted-foreground">pendentes</span>
          </div>
          {criticalCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="font-medium text-red-500">{criticalCount}</span>
              <span className="text-sm text-red-400">críticas</span>
            </div>
          )}
          <Button variant="outline" onClick={loadMissions}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Grid de Cartões */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {missions.map((mission, index) => {
            const typeConfig = TYPE_CONFIG[mission.type] || TYPE_CONFIG.improvement;
            const priorityConfig = PRIORITY_CONFIG[mission.priority];
            const TypeIcon = typeConfig.icon;
            const PriorityIcon = priorityConfig.icon;

            return (
              <motion.div
                key={mission.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-lg ${typeConfig.border} ${typeConfig.glow} ${
                    mission.priority === 'critical' ? 'animate-pulse' : ''
                  }`}
                >
                  {/* Gradient Background */}
                  <div className={`absolute inset-0 ${typeConfig.bg} opacity-50`} />
                  
                  {/* Priority Indicator */}
                  <div className={`absolute top-0 right-0 w-16 h-16 ${priorityConfig.color} opacity-20 rounded-bl-full`} />
                  
                  <CardHeader className="relative pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${typeConfig.bg} border ${typeConfig.border}`}>
                          <TypeIcon className={`w-5 h-5 ${typeConfig.color}`} />
                        </div>
                        <Badge variant="outline" className={`text-xs ${typeConfig.color}`}>
                          {typeConfig.label}
                        </Badge>
                      </div>
                      {PriorityIcon && (
                        <PriorityIcon className={`w-5 h-5 ${mission.priority === 'critical' ? 'text-red-500 animate-pulse' : 'text-orange-500'}`} />
                      )}
                    </div>
                    <CardTitle className="text-lg mt-2 line-clamp-2">
                      {mission.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="relative space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {mission.description}
                    </p>

                    {/* Steps Preview */}
                    {mission.steps.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          {mission.steps.length} passos
                        </div>
                        <Progress 
                          value={mission.status === 'executed' ? 100 : 0} 
                          className="h-1.5" 
                        />
                      </div>
                    )}

                    {/* Status & Actions */}
                    <div className="flex items-center justify-between pt-2">
                      {getStatusBadge(mission.status)}
                      
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedMission(mission);
                            setShowDetails(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        {mission.status === 'pending' && mission.code && (
                          <Button
                            size="sm"
                            onClick={() => executeMission(mission)}
                            disabled={executing === mission.id}
                            className="gap-1"
                          >
                            {executing === mission.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                            Executar
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Satoshi Hash Indicator */}
                    {mission.satoshiHash && (
                      <div className="absolute bottom-2 right-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" 
                             title="Hash Satoshi verificado" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {missions.length === 0 && (
          <div className="col-span-full text-center py-16">
            <Rocket className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-medium mb-2">Nenhuma missão pendente</h3>
            <p className="text-muted-foreground">
              O sistema está funcionando normalmente. Novas missões aparecerão automaticamente.
            </p>
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          {selectedMission && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const config = TYPE_CONFIG[selectedMission.type];
                    const Icon = config.icon;
                    return <Icon className={`w-5 h-5 ${config.color}`} />;
                  })()}
                  {selectedMission.title}
                </DialogTitle>
                <DialogDescription>
                  {selectedMission.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center gap-4">
                  {getStatusBadge(selectedMission.status)}
                  <Badge variant="outline">
                    Prioridade: {PRIORITY_CONFIG[selectedMission.priority].label}
                  </Badge>
                </div>

                {/* Passos */}
                {selectedMission.steps.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      Passos para Conclusão
                    </h4>
                    <div className="space-y-2 pl-4 border-l-2 border-muted">
                      {selectedMission.steps.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {step.step || idx + 1}
                          </div>
                          <span className="text-sm">{step.action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Código */}
                {selectedMission.code && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      Código Sugerido
                    </h4>
                    <pre className="p-4 rounded-lg bg-muted/50 text-sm font-mono overflow-x-auto max-h-48">
                      <code>{selectedMission.code}</code>
                    </pre>
                  </div>
                )}

                {/* Hash Satoshi */}
                {selectedMission.satoshiHash && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <div className="flex items-center gap-2 text-emerald-500 text-sm">
                      <Shield className="w-4 h-4" />
                      <span className="font-medium">Integridade Verificada</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                      Hash: {selectedMission.satoshiHash}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDetails(false)}>
                  Fechar
                </Button>
                {selectedMission.status === 'pending' && selectedMission.code && (
                  <Button 
                    onClick={() => {
                      executeMission(selectedMission);
                      setShowDetails(false);
                    }}
                    disabled={executing === selectedMission.id}
                  >
                    {executing === selectedMission.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Executar Correção Sugerida
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
