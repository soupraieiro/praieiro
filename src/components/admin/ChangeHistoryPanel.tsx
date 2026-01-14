/**
 * CHANGE HISTORY PANEL
 * Histórico de alterações com rastreamento de quem alterou o quê
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  History, Search, RefreshCw, User, Clock, FileCode, Database,
  Webhook, GitCommit, Eye, ArrowRight, Diff, Undo2
} from 'lucide-react';

interface ChangeRecord {
  id: string;
  orch_id: string;
  change_type: 'create' | 'update' | 'delete' | 'promote' | 'rollback';
  changed_by: string;
  changed_by_email: string | null;
  previous_version: number | null;
  new_version: number | null;
  change_summary: string;
  change_details: Record<string, unknown> | null;
  satoshi_hash: string | null;
  created_at: string;
}

const CHANGE_TYPE_CONFIG = {
  create: { icon: FileCode, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Criação' },
  update: { icon: GitCommit, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Atualização' },
  delete: { icon: FileCode, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Exclusão' },
  promote: { icon: ArrowRight, color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'Promoção' },
  rollback: { icon: Undo2, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Rollback' }
};

export default function ChangeHistoryPanel() {
  const [changes, setChanges] = useState<ChangeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedChange, setSelectedChange] = useState<ChangeRecord | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const loadChanges = useCallback(async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('sys_change_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (typeFilter !== 'all') {
        query = query.eq('change_type', typeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = (data || []) as unknown as ChangeRecord[];

      if (searchQuery) {
        const lowerSearch = searchQuery.toLowerCase();
        filteredData = filteredData.filter(change =>
          change.change_summary.toLowerCase().includes(lowerSearch) ||
          change.changed_by_email?.toLowerCase().includes(lowerSearch) ||
          change.orch_id.toLowerCase().includes(lowerSearch)
        );
      }

      setChanges(filteredData);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast.error('Erro ao carregar histórico de alterações');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, typeFilter]);

  useEffect(() => {
    loadChanges();

    // Realtime para novas mudanças
    const channel = supabase
      .channel('change-history-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'sys_change_history'
      }, (payload) => {
        const newChange = payload.new as ChangeRecord;
        setChanges(prev => [newChange, ...prev.slice(0, 99)]);
        toast.info('Nova alteração registrada', {
          description: newChange.change_summary
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadChanges]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays} dias atrás`;
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (email: string | null) => {
    if (!email) return 'AD';
    const parts = email.split('@')[0].split('.');
    return parts.map(p => p[0]?.toUpperCase() || '').join('').slice(0, 2);
  };

  const getChangeIcon = (type: string) => {
    const config = CHANGE_TYPE_CONFIG[type as keyof typeof CHANGE_TYPE_CONFIG] || CHANGE_TYPE_CONFIG.update;
    const Icon = config.icon;
    return <Icon className={`w-4 h-4 ${config.color}`} />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Histórico de Alterações
              </CardTitle>
              <CardDescription>
                Rastreamento completo de quem alterou qual código e quando
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadChanges} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {/* Busca */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição, email ou ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro de Tipo */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tipo de alteração" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="create">Criação</SelectItem>
                <SelectItem value="update">Atualização</SelectItem>
                <SelectItem value="delete">Exclusão</SelectItem>
                <SelectItem value="promote">Promoção</SelectItem>
                <SelectItem value="rollback">Rollback</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Timeline de Alterações */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : changes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <History className="w-8 h-8 mb-2 opacity-50" />
                <p>Nenhuma alteração encontrada</p>
              </div>
            ) : (
              <div className="relative">
                {/* Linha do tempo */}
                <div className="absolute left-[39px] top-0 bottom-0 w-0.5 bg-border" />

                <div className="space-y-0">
                  {changes.map((change, index) => {
                    const config = CHANGE_TYPE_CONFIG[change.change_type] || CHANGE_TYPE_CONFIG.update;

                    return (
                      <div
                        key={change.id}
                        className="relative flex gap-4 p-4 hover:bg-muted/50 transition-colors"
                      >
                        {/* Avatar/Ícone */}
                        <div className="relative z-10">
                          <Avatar className={`w-10 h-10 border-2 border-background ${config.bg}`}>
                            <AvatarFallback className={config.color}>
                              {getInitials(change.changed_by_email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${config.bg} border-2 border-background flex items-center justify-center`}>
                            {getChangeIcon(change.change_type)}
                          </div>
                        </div>

                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {change.changed_by_email || 'Admin'}
                              </span>
                              <Badge variant="outline" className={`text-xs ${config.color}`}>
                                {config.label}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimestamp(change.created_at)}
                            </span>
                          </div>

                          <p className="text-sm text-muted-foreground mb-2">
                            {change.change_summary}
                          </p>

                          {/* Versões */}
                          {(change.previous_version !== null || change.new_version !== null) && (
                            <div className="flex items-center gap-2 text-xs">
                              {change.previous_version !== null && (
                                <Badge variant="secondary">v{change.previous_version}</Badge>
                              )}
                              {change.previous_version !== null && change.new_version !== null && (
                                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                              )}
                              {change.new_version !== null && (
                                <Badge variant="default">v{change.new_version}</Badge>
                              )}
                            </div>
                          )}

                          {/* Hash e Ações */}
                          <div className="flex items-center justify-between mt-2">
                            {change.satoshi_hash && (
                              <code className="text-xs text-muted-foreground font-mono">
                                {change.satoshi_hash.slice(0, 16)}...
                              </code>
                            )}
                            {change.change_details && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedChange(change);
                                  setShowDetailsDialog(true);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Detalhes
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dialog de Detalhes */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Diff className="w-5 h-5" />
              Detalhes da Alteração
            </DialogTitle>
          </DialogHeader>
          {selectedChange && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Alterado por</p>
                  <p className="font-medium">{selectedChange.changed_by_email || 'Admin'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-medium">
                    {new Date(selectedChange.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <Badge>{selectedChange.change_type}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Orch ID</p>
                  <code className="text-sm">{selectedChange.orch_id}</code>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Descrição</p>
                <p>{selectedChange.change_summary}</p>
              </div>

              {selectedChange.change_details && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Detalhes (JSON)</p>
                  <ScrollArea className="h-48 rounded border p-4 bg-muted/50">
                    <pre className="text-sm font-mono whitespace-pre-wrap">
                      {JSON.stringify(selectedChange.change_details, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {selectedChange.satoshi_hash && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Satoshi Hash</p>
                  <code className="text-xs font-mono break-all block p-2 rounded bg-muted">
                    {selectedChange.satoshi_hash}
                  </code>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
