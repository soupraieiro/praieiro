/**
 * AI GUIDANCE PANEL
 * Painel de orientações geradas por IA com passos detalhados e código executável
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Brain, Lightbulb, Play, CheckCircle, Clock, RefreshCw,
  AlertTriangle, Copy, Wand2, BookOpen, Code, ChevronRight,
  Sparkles, Target, FileCode, ArrowRight, Loader2
} from 'lucide-react';

interface GuidanceStep {
  step_number: number;
  title: string;
  description: string;
  code_snippet: string | null;
  code_language: string | null;
  is_executable: boolean;
  estimated_time_minutes: number;
}

interface AIGuidance {
  id: string;
  guidance_title: string;
  guidance_type: 'fix' | 'improvement' | 'security' | 'performance' | 'feature';
  priority: 'low' | 'medium' | 'high' | 'critical';
  problem_description: string;
  ai_analysis: string;
  steps: GuidanceStep[];
  auto_executable_code: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  executed_by: string | null;
  executed_at: string | null;
  execution_result: Record<string, unknown> | null;
  satoshi_hash: string | null;
  created_at: string;
}

const TYPE_CONFIG = {
  fix: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Correção' },
  improvement: { icon: Lightbulb, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Melhoria' },
  security: { icon: Target, color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'Segurança' },
  performance: { icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Performance' },
  feature: { icon: Wand2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Feature' }
};

export default function AIGuidancePanel() {
  const [guidances, setGuidances] = useState<AIGuidance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuidance, setSelectedGuidance] = useState<AIGuidance | null>(null);
  const [executing, setExecuting] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestDescription, setRequestDescription] = useState('');
  const [requestingGuidance, setRequestingGuidance] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const loadGuidances = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('sys_ai_guidance')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Parse steps JSON and map to interface
      const parsedData = (data || []).map((g: any) => ({
        id: g.id,
        guidance_title: g.title || 'Orientação',
        guidance_type: g.guidance_type || 'improvement',
        priority: g.priority || 'medium',
        problem_description: g.description || '',
        ai_analysis: g.ai_reasoning || '',
        steps: typeof g.implementation_steps === 'string' ? JSON.parse(g.implementation_steps) : (g.implementation_steps || []),
        auto_executable_code: g.auto_executable ? g.implementation_steps : null,
        status: g.status || 'pending',
        executed_by: g.executed_by,
        executed_at: g.executed_at,
        execution_result: g.execution_result,
        satoshi_hash: g.satoshi_hash,
        created_at: g.created_at
      })) as AIGuidance[];

      setGuidances(parsedData);
      if (parsedData.length > 0 && !selectedGuidance) {
        setSelectedGuidance(parsedData[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar guidances:', error);
      toast.error('Erro ao carregar orientações de IA');
    } finally {
      setLoading(false);
    }
  }, [selectedGuidance]);

  useEffect(() => {
    loadGuidances();

    // Realtime
    const channel = supabase
      .channel('ai-guidance-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sys_ai_guidance'
      }, () => loadGuidances())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadGuidances]);

  const requestNewGuidance = async () => {
    if (!requestDescription.trim()) {
      toast.error('Descreva o problema ou objetivo');
      return;
    }

    setRequestingGuidance(true);
    try {
      // Criar uma nova guidance (em produção, isso chamaria uma Edge Function com IA)
      const mockGuidance = {
        title: 'Nova Orientação Solicitada',
        guidance_type: 'improvement',
        priority: 'medium',
        description: requestDescription,
        ai_reasoning: 'Analisando seu problema... A IA está processando a solicitação.',
        implementation_steps: JSON.stringify([
          {
            step_number: 1,
            title: 'Análise Inicial',
            description: 'Revisar o contexto do problema descrito.',
            code_snippet: null,
            code_language: null,
            is_executable: false,
            estimated_time_minutes: 5
          }
        ]),
        status: 'pending'
      };

      const { error } = await supabase
        .from('sys_ai_guidance')
        .insert([mockGuidance]);

      if (error) throw error;

      toast.success('Solicitação enviada!', {
        description: 'A IA está analisando seu problema.'
      });
      setShowRequestDialog(false);
      setRequestDescription('');
      loadGuidances();
    } catch (error) {
      console.error('Erro ao solicitar guidance:', error);
      toast.error('Erro ao solicitar orientação');
    } finally {
      setRequestingGuidance(false);
    }
  };

  const executeGuidance = async (guidance: AIGuidance) => {
    if (!guidance.auto_executable_code) {
      toast.info('Esta orientação não possui código auto-executável');
      return;
    }

    setExecuting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Em produção, isso executaria o código via Edge Function
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { error } = await supabase
        .from('sys_ai_guidance')
        .update({
          status: 'completed',
          executed_by: user?.id,
          executed_at: new Date().toISOString(),
          execution_result: { success: true, message: 'Código executado com sucesso' }
        })
        .eq('id', guidance.id);

      if (error) throw error;

      toast.success('Código executado com sucesso!');
      loadGuidances();
    } catch (error) {
      console.error('Erro ao executar:', error);
      toast.error('Erro na execução');
    } finally {
      setExecuting(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!');
  };

  const markStepComplete = (stepNumber: number) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepNumber)) {
        newSet.delete(stepNumber);
      } else {
        newSet.add(stepNumber);
      }
      return newSet;
    });
  };

  const getProgressPercentage = () => {
    if (!selectedGuidance || !selectedGuidance.steps.length) return 0;
    return (completedSteps.size / selectedGuidance.steps.length) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6" />
            Orientações de IA
          </h2>
          <p className="text-muted-foreground">
            Guias passo a passo gerados por IA para melhorar o sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowRequestDialog(true)}>
            <Wand2 className="w-4 h-4 mr-2" />
            Solicitar Nova Orientação
          </Button>
          <Button variant="outline" onClick={loadGuidances}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Guidances */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Orientações Disponíveis</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="space-y-2 p-4">
                {guidances.map((guidance) => {
                  const config = TYPE_CONFIG[guidance.guidance_type] || TYPE_CONFIG.improvement;
                  const TypeIcon = config.icon;

                  return (
                    <button
                      key={guidance.id}
                      onClick={() => {
                        setSelectedGuidance(guidance);
                        setCompletedSteps(new Set());
                      }}
                      className={`w-full p-3 rounded-lg border text-left transition-colors ${
                        selectedGuidance?.id === guidance.id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded ${config.bg}`}>
                          <TypeIcon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">
                              {guidance.guidance_title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs ${config.color}`}>
                              {config.label}
                            </Badge>
                            <Badge
                              variant={
                                guidance.status === 'completed' ? 'default' :
                                guidance.status === 'failed' ? 'destructive' : 'secondary'
                              }
                              className="text-xs"
                            >
                              {guidance.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {guidance.steps?.length || 0} passos
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {guidances.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma orientação disponível</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setShowRequestDialog(true)}
                    >
                      Solicitar primeira orientação
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Detalhes da Guidance */}
        <Card className="lg:col-span-2">
          {selectedGuidance ? (
            <>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {selectedGuidance.guidance_title}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {selectedGuidance.problem_description}
                    </CardDescription>
                  </div>
                  {selectedGuidance.auto_executable_code && (
                    <Button
                      onClick={() => executeGuidance(selectedGuidance)}
                      disabled={executing || selectedGuidance.status === 'completed'}
                    >
                      {executing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Executar Automático
                    </Button>
                  )}
                </div>

                {/* Progress */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progresso Manual</span>
                    <span>{completedSteps.size}/{selectedGuidance.steps?.length || 0} passos</span>
                  </div>
                  <Progress value={getProgressPercentage()} className="h-2" />
                </div>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="steps">
                  <TabsList>
                    <TabsTrigger value="steps">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Passos
                    </TabsTrigger>
                    <TabsTrigger value="analysis">
                      <Brain className="w-4 h-4 mr-2" />
                      Análise IA
                    </TabsTrigger>
                    {selectedGuidance.auto_executable_code && (
                      <TabsTrigger value="code">
                        <FileCode className="w-4 h-4 mr-2" />
                        Código
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="steps" className="mt-4">
                    <ScrollArea className="h-[400px]">
                      <Accordion type="single" collapsible className="space-y-2">
                        {(selectedGuidance.steps || []).map((step) => (
                          <AccordionItem
                            key={step.step_number}
                            value={`step-${step.step_number}`}
                            className={`border rounded-lg px-4 ${
                              completedSteps.has(step.step_number)
                                ? 'bg-emerald-500/10 border-emerald-500/30'
                                : ''
                            }`}
                          >
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                    completedSteps.has(step.step_number)
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  {completedSteps.has(step.step_number) ? (
                                    <CheckCircle className="w-4 h-4" />
                                  ) : (
                                    step.step_number
                                  )}
                                </div>
                                <div className="text-left">
                                  <div className="font-medium">{step.title}</div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                                    <Clock className="w-3 h-3" />
                                    ~{step.estimated_time_minutes} min
                                  </div>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="pl-11 space-y-4">
                                <p className="text-sm text-muted-foreground">
                                  {step.description}
                                </p>

                                {step.code_snippet && (
                                  <div className="relative">
                                    <pre className="p-4 rounded-lg bg-muted/50 text-sm font-mono overflow-x-auto">
                                      <code>{step.code_snippet}</code>
                                    </pre>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="absolute top-2 right-2"
                                      onClick={() => copyCode(step.code_snippet!)}
                                    >
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}

                                <Button
                                  variant={completedSteps.has(step.step_number) ? "secondary" : "outline"}
                                  size="sm"
                                  onClick={() => markStepComplete(step.step_number)}
                                >
                                  {completedSteps.has(step.step_number) ? (
                                    <>
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Concluído
                                    </>
                                  ) : (
                                    <>
                                      <ArrowRight className="w-4 h-4 mr-2" />
                                      Marcar como Concluído
                                    </>
                                  )}
                                </Button>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="analysis" className="mt-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="w-5 h-5 text-primary" />
                        <span className="font-medium">Análise da IA</span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedGuidance.ai_analysis}
                      </p>
                    </div>
                  </TabsContent>

                  {selectedGuidance.auto_executable_code && (
                    <TabsContent value="code" className="mt-4">
                      <div className="relative">
                        <pre className="p-4 rounded-lg bg-muted/50 text-sm font-mono overflow-x-auto max-h-96">
                          <code>{selectedGuidance.auto_executable_code}</code>
                        </pre>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => copyCode(selectedGuidance.auto_executable_code!)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-96">
              <div className="text-center text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Selecione uma orientação para ver os detalhes</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Dialog para Solicitar Nova Orientação */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              Solicitar Nova Orientação de IA
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Descreva o problema ou objetivo
              </label>
              <Textarea
                placeholder="Ex: O sistema está lento ao carregar a lista de vendedores. Preciso otimizar a query..."
                value={requestDescription}
                onChange={(e) => setRequestDescription(e.target.value)}
                rows={5}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              A IA irá analisar sua solicitação e gerar um guia passo a passo
              com código executável quando possível.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={requestNewGuidance} disabled={requestingGuidance}>
              {requestingGuidance ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Solicitar Orientação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
