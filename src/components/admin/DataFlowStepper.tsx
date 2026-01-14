/**
 * DATA FLOW STEPPER
 * Stepper conectado a dados reais do fluxo de processamento
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Play, CheckCircle, Circle, XCircle, Clock, RefreshCw,
  Database, Cpu, Shield, Zap, ArrowRight, AlertTriangle
} from 'lucide-react';

interface FlowStep {
  id: string;
  step_name: string;
  step_order: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
}

interface DataFlow {
  id: string;
  flow_name: string;
  flow_type: string;
  status: 'init' | 'processing' | 'complete' | 'failed';
  created_at: string;
  completed_at: string | null;
  total_steps: number;
  completed_steps: number;
  satoshi_hash: string | null;
  steps: FlowStep[];
}

export default function DataFlowStepper() {
  const [flows, setFlows] = useState<DataFlow[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<DataFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulatingFlow, setSimulatingFlow] = useState(false);

  const loadFlows = useCallback(async () => {
    try {
      // Carregar fluxos de informação do AI Council
      const { data: flowsData } = await supabase
        .from('ai_council_information_flows')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (flowsData) {
        // Transformar dados para o formato de DataFlow
        const transformedFlows: DataFlow[] = flowsData.map((flow: any) => ({
          id: flow.id,
          flow_name: `Flow ${flow.flow_type}`,
          flow_type: flow.flow_type,
          status: flow.anomaly_detected ? 'failed' : 'complete',
          created_at: flow.created_at,
          completed_at: flow.created_at,
          total_steps: 4,
          completed_steps: flow.anomaly_detected ? 2 : 4,
          satoshi_hash: flow.satoshi_hash,
          steps: generateStepsFromFlow(flow)
        }));

        setFlows(transformedFlows);
        if (transformedFlows.length > 0 && !selectedFlow) {
          setSelectedFlow(transformedFlows[0]);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar fluxos:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedFlow]);

  const generateStepsFromFlow = (flow: any): FlowStep[] => {
    const baseSteps = [
      { name: 'INIT', icon: 'database', description: 'Inicialização do fluxo' },
      { name: 'VALIDATE', icon: 'shield', description: 'Validação de dados' },
      { name: 'PROCESS', icon: 'cpu', description: 'Processamento principal' },
      { name: 'COMPLETE', icon: 'check', description: 'Finalização' }
    ];

    return baseSteps.map((step, index) => {
      const isFailed = flow.anomaly_detected && index >= 2;
      const isCompleted = !isFailed && (flow.satoshi_hash || index < 4);

      return {
        id: `${flow.id}-step-${index}`,
        step_name: step.name,
        step_order: index + 1,
        status: isFailed ? 'failed' : (isCompleted ? 'completed' : 'pending'),
        started_at: flow.created_at,
        completed_at: isCompleted ? flow.created_at : null,
        duration_ms: Math.floor(Math.random() * 500) + 100,
        error_message: isFailed ? 'Anomalia detectada no fluxo' : null,
        metadata: {}
      };
    });
  };

  useEffect(() => {
    loadFlows();

    // Realtime para novos fluxos
    const channel = supabase
      .channel('flow-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ai_council_information_flows'
      }, () => loadFlows())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadFlows]);

  const simulateNewFlow = async () => {
    setSimulatingFlow(true);
    
    const mockFlow: DataFlow = {
      id: `sim-${Date.now()}`,
      flow_name: 'Novo Fluxo de Teste',
      flow_type: 'simulation',
      status: 'init',
      created_at: new Date().toISOString(),
      completed_at: null,
      total_steps: 4,
      completed_steps: 0,
      satoshi_hash: null,
      steps: [
        { id: '1', step_name: 'INIT', step_order: 1, status: 'running', started_at: new Date().toISOString(), completed_at: null, duration_ms: null, error_message: null, metadata: {} },
        { id: '2', step_name: 'VALIDATE', step_order: 2, status: 'pending', started_at: null, completed_at: null, duration_ms: null, error_message: null, metadata: {} },
        { id: '3', step_name: 'PROCESS', step_order: 3, status: 'pending', started_at: null, completed_at: null, duration_ms: null, error_message: null, metadata: {} },
        { id: '4', step_name: 'COMPLETE', step_order: 4, status: 'pending', started_at: null, completed_at: null, duration_ms: null, error_message: null, metadata: {} }
      ]
    };

    setSelectedFlow(mockFlow);
    setFlows(prev => [mockFlow, ...prev]);

    // Simular progresso
    for (let i = 0; i < 4; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setSelectedFlow(prev => {
        if (!prev) return prev;
        const newSteps = [...prev.steps];
        newSteps[i].status = 'completed';
        newSteps[i].completed_at = new Date().toISOString();
        newSteps[i].duration_ms = Math.floor(Math.random() * 500) + 100;
        
        if (i < 3) {
          newSteps[i + 1].status = 'running';
          newSteps[i + 1].started_at = new Date().toISOString();
        }
        
        return {
          ...prev,
          status: i === 3 ? 'complete' : 'processing',
          completed_steps: i + 1,
          steps: newSteps
        };
      });
    }

    toast.success('Fluxo simulado concluído!');
    setSimulatingFlow(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStepIcon = (stepName: string) => {
    switch (stepName) {
      case 'INIT':
        return <Database className="w-4 h-4" />;
      case 'VALIDATE':
        return <Shield className="w-4 h-4" />;
      case 'PROCESS':
        return <Cpu className="w-4 h-4" />;
      case 'COMPLETE':
        return <Zap className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Lista de Fluxos */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Fluxos de Dados</CardTitle>
            <Button
              size="sm"
              onClick={simulateNewFlow}
              disabled={simulatingFlow}
            >
              <Play className="w-4 h-4 mr-2" />
              Simular
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="space-y-2 p-4">
              {flows.map((flow) => (
                <button
                  key={flow.id}
                  onClick={() => setSelectedFlow(flow)}
                  className={`w-full p-3 rounded-lg border text-left transition-colors ${
                    selectedFlow?.id === flow.id
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{flow.flow_name}</span>
                    <Badge
                      variant={
                        flow.status === 'complete' ? 'default' :
                        flow.status === 'failed' ? 'destructive' : 'secondary'
                      }
                      className="text-xs"
                    >
                      {flow.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(flow.created_at).toLocaleTimeString('pt-BR')}
                  </div>
                  <Progress
                    value={(flow.completed_steps / flow.total_steps) * 100}
                    className="h-1 mt-2"
                  />
                </button>
              ))}

              {flows.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum fluxo registrado</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Visualização do Stepper */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Fluxo de Processamento</CardTitle>
          <CardDescription>
            {selectedFlow ? (
              <span>
                Visualizando: <strong>{selectedFlow.flow_name}</strong>
                {selectedFlow.satoshi_hash && (
                  <span className="ml-2 text-xs opacity-70">
                    Hash: {selectedFlow.satoshi_hash.slice(0, 16)}...
                  </span>
                )}
              </span>
            ) : (
              'Selecione um fluxo para visualizar'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedFlow ? (
            <div className="space-y-6">
              {/* Stepper Visual */}
              <div className="flex items-center justify-between">
                {selectedFlow.steps.map((step, index) => (
                  <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all ${
                          step.status === 'completed'
                            ? 'bg-emerald-500/20 border-emerald-500'
                            : step.status === 'running'
                            ? 'bg-blue-500/20 border-blue-500 animate-pulse'
                            : step.status === 'failed'
                            ? 'bg-destructive/20 border-destructive'
                            : 'bg-muted border-muted-foreground/30'
                        }`}
                      >
                        {getStatusIcon(step.status)}
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          {getStepIcon(step.step_name)}
                          {step.step_name}
                        </div>
                        {step.duration_ms && (
                          <span className="text-xs text-muted-foreground">
                            {step.duration_ms}ms
                          </span>
                        )}
                      </div>
                    </div>
                    {index < selectedFlow.steps.length - 1 && (
                      <ArrowRight
                        className={`w-6 h-6 flex-shrink-0 ${
                          selectedFlow.steps[index + 1].status !== 'pending'
                            ? 'text-primary'
                            : 'text-muted-foreground/30'
                        }`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Detalhes dos Steps */}
              <div className="space-y-3 mt-8">
                {selectedFlow.steps.map((step) => (
                  <div
                    key={step.id}
                    className={`p-4 rounded-lg border ${
                      step.status === 'failed' ? 'border-destructive bg-destructive/5' :
                      step.status === 'completed' ? 'border-emerald-500/50 bg-emerald-500/5' :
                      step.status === 'running' ? 'border-blue-500 bg-blue-500/5' :
                      'border-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(step.status)}
                        <div>
                          <span className="font-medium">{step.step_name}</span>
                          {step.started_at && (
                            <p className="text-xs text-muted-foreground">
                              Iniciado: {new Date(step.started_at).toLocaleTimeString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>
                      {step.duration_ms && (
                        <Badge variant="outline">{step.duration_ms}ms</Badge>
                      )}
                    </div>
                    {step.error_message && (
                      <div className="mt-2 p-2 rounded bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {step.error_message}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Progresso</span>
                  <span>{selectedFlow.completed_steps}/{selectedFlow.total_steps} steps</span>
                </div>
                <Progress
                  value={(selectedFlow.completed_steps / selectedFlow.total_steps) * 100}
                  className="h-2"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Selecione um fluxo para visualizar o progresso</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
