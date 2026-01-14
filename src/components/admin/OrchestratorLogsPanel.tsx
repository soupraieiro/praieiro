/**
 * ORCHESTRATOR LOGS PANEL - CAIXA PRETA DO SISTEMA
 * Visualização de logs com filtros avançados e busca em payload
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Search, RefreshCw, AlertCircle, AlertTriangle, Info, CheckCircle,
  Eye, Filter, Database, Clock, User, Hash, ChevronDown, ChevronUp,
  FileJson, Terminal
} from 'lucide-react';

interface OrchLog {
  log_id: string;
  orch_id: string | null;
  log_severity: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  log_stage: 'INIT' | 'PRE_VALIDATION' | 'EXECUTION' | 'POST_PROCESS' | 'COMPLETE';
  log_message: string;
  log_payload: Record<string, unknown> | null;
  actor_id: string | null;
  satoshi_hash: string | null;
  execution_time_ms: number | null;
  created_at: string;
}

const SEVERITY_CONFIG = {
  debug: { icon: Terminal, color: 'text-slate-400', bg: 'bg-slate-500/10' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  warn: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  critical: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-600/20 border-red-500' }
};

const STAGE_ORDER = ['INIT', 'PRE_VALIDATION', 'EXECUTION', 'POST_PROCESS', 'COMPLETE'];

export default function OrchestratorLogsPanel() {
  const [logs, setLogs] = useState<OrchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<OrchLog | null>(null);
  const [showPayloadDialog, setShowPayloadDialog] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [payloadSearch, setPayloadSearch] = useState('');

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('sys_orch_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (severityFilter !== 'all') {
        query = query.eq('log_severity', severityFilter);
      }
      if (stageFilter !== 'all') {
        query = query.eq('log_stage', stageFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = (data || []) as OrchLog[];

      // Filtro por busca textual
      if (searchQuery) {
        const lowerSearch = searchQuery.toLowerCase();
        filteredData = filteredData.filter(log => 
          log.log_message.toLowerCase().includes(lowerSearch) ||
          log.log_id.toLowerCase().includes(lowerSearch) ||
          log.orch_id?.toLowerCase().includes(lowerSearch)
        );
      }

      // Filtro por payload (busca dentro do JSON)
      if (payloadSearch) {
        const lowerPayloadSearch = payloadSearch.toLowerCase();
        filteredData = filteredData.filter(log => 
          log.log_payload && 
          JSON.stringify(log.log_payload).toLowerCase().includes(lowerPayloadSearch)
        );
      }

      setLogs(filteredData);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      toast.error('Erro ao carregar logs do orquestrador');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, severityFilter, stageFilter, payloadSearch]);

  useEffect(() => {
    loadLogs();

    // Realtime para novos logs
    const channel = supabase
      .channel('orch-logs-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'sys_orch_logs'
      }, (payload) => {
        const newLog = payload.new as OrchLog;
        setLogs(prev => [newLog, ...prev.slice(0, 199)]);
        
        if (newLog.log_severity === 'critical' || newLog.log_severity === 'error') {
          toast.error(`${newLog.log_severity.toUpperCase()}: ${newLog.log_message}`, {
            description: `Stage: ${newLog.log_stage}`
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadLogs]);

  const toggleLogExpanded = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const getSeverityIcon = (severity: string) => {
    const config = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.info;
    const Icon = config.icon;
    return <Icon className={`w-4 h-4 ${config.color}`} />;
  };

  const getStageProgress = (stage: string) => {
    const index = STAGE_ORDER.indexOf(stage);
    return ((index + 1) / STAGE_ORDER.length) * 100;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  };

  return (
    <div className="space-y-6">
      {/* Header com Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Logs do Orquestrador
              </CardTitle>
              <CardDescription>
                Caixa preta do sistema - Rastreabilidade total de eventos
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Busca Geral */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID, mensagem..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Busca em Payload */}
            <div className="relative">
              <FileJson className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar dentro do payload..."
                value={payloadSearch}
                onChange={(e) => setPayloadSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro Severidade */}
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Severidades</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro Stage */}
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Stages</SelectItem>
                {STAGE_ORDER.map(stage => (
                  <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Logs */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Database className="w-8 h-8 mb-2 opacity-50" />
                <p>Nenhum log encontrado</p>
              </div>
            ) : (
              <div className="divide-y">
                {logs.map((log) => {
                  const isExpanded = expandedLogs.has(log.log_id);
                  const severity = SEVERITY_CONFIG[log.log_severity] || SEVERITY_CONFIG.info;
                  const timestamp = formatTimestamp(log.created_at);

                  return (
                    <div
                      key={log.log_id}
                      className={`p-4 hover:bg-muted/50 transition-colors ${severity.bg} border-l-4 ${
                        log.log_severity === 'critical' ? 'border-l-red-500' :
                        log.log_severity === 'error' ? 'border-l-red-400' :
                        log.log_severity === 'warn' ? 'border-l-amber-400' :
                        'border-l-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {getSeverityIcon(log.log_severity)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs font-mono">
                                {log.log_stage}
                              </Badge>
                              <Badge variant="secondary" className={`text-xs ${severity.color}`}>
                                {log.log_severity.toUpperCase()}
                              </Badge>
                              {log.execution_time_ms && (
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {log.execution_time_ms}ms
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 text-sm font-medium truncate">
                              {log.log_message}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Hash className="w-3 h-3" />
                                {log.log_id.slice(0, 8)}
                              </span>
                              {log.orch_id && (
                                <span className="flex items-center gap-1">
                                  <Database className="w-3 h-3" />
                                  {log.orch_id.slice(0, 8)}
                                </span>
                              )}
                              {log.actor_id && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {log.actor_id.slice(0, 8)}
                                </span>
                              )}
                              <span>{timestamp.date} {timestamp.time}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {log.log_payload && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedLog(log);
                                setShowPayloadDialog(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleLogExpanded(log.log_id)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Detalhes Expandidos */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          {/* Progress do Stage */}
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span>Progresso do Pipeline</span>
                              <span>{log.log_stage}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  log.log_severity === 'error' || log.log_severity === 'critical'
                                    ? 'bg-destructive'
                                    : 'bg-primary'
                                }`}
                                style={{ width: `${getStageProgress(log.log_stage)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs mt-1 text-muted-foreground">
                              {STAGE_ORDER.map((stage, i) => (
                                <span
                                  key={stage}
                                  className={
                                    STAGE_ORDER.indexOf(log.log_stage) >= i
                                      ? 'text-primary font-medium'
                                      : ''
                                  }
                                >
                                  {stage.slice(0, 4)}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Hash Satoshi */}
                          {log.satoshi_hash && (
                            <div className="p-2 rounded bg-muted/50">
                              <span className="text-xs text-muted-foreground">Satoshi Hash:</span>
                              <code className="block text-xs font-mono mt-1 break-all">
                                {log.satoshi_hash}
                              </code>
                            </div>
                          )}

                          {/* Preview do Payload */}
                          {log.log_payload && (
                            <div className="p-2 rounded bg-muted/50">
                              <span className="text-xs text-muted-foreground">Payload Preview:</span>
                              <pre className="text-xs font-mono mt-1 overflow-auto max-h-32">
                                {JSON.stringify(log.log_payload, null, 2).slice(0, 500)}
                                {JSON.stringify(log.log_payload).length > 500 && '...'}
                              </pre>
                            </div>
                          )}
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

      {/* Dialog para Payload Completo */}
      <Dialog open={showPayloadDialog} onOpenChange={setShowPayloadDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="w-5 h-5" />
              Payload do Log
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <Tabs defaultValue="formatted">
              <TabsList>
                <TabsTrigger value="formatted">Formatado</TabsTrigger>
                <TabsTrigger value="raw">Raw</TabsTrigger>
              </TabsList>
              <TabsContent value="formatted">
                <ScrollArea className="h-[400px] rounded border p-4">
                  <pre className="text-sm font-mono whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.log_payload, null, 2)}
                  </pre>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="raw">
                <ScrollArea className="h-[400px] rounded border p-4">
                  <code className="text-sm font-mono break-all">
                    {JSON.stringify(selectedLog.log_payload)}
                  </code>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
