/**
 * PAINEL DE SAFE MODE E VERSIONAMENTO
 * Controle de promoção para produção e dependências
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Shield, Lock, Unlock, AlertTriangle, CheckCircle, XCircle,
  GitBranch, ArrowUpCircle, FileCode, Link2, Trash2, RefreshCw, Eye
} from 'lucide-react';

interface OrchVersion {
  id: string;
  asset_type: string;
  asset_name: string;
  version_number: number;
  content_hash: string;
  content: string;
  is_validated: boolean;
  validated_at: string | null;
  is_production: boolean;
  promoted_at: string | null;
  created_at: string;
  satoshi_hash: string | null;
}

interface OrchDependency {
  id: string;
  source_type: string;
  source_name: string;
  target_type: string;
  target_name: string;
  dependency_type: string;
  is_critical: boolean;
}

interface SafeModeState {
  is_active: boolean;
  activated_at: string | null;
  reason: string | null;
  satoshi_hash: string | null;
}

export default function SafeModePanel() {
  const [safeModeState, setSafeModeState] = useState<SafeModeState | null>(null);
  const [versions, setVersions] = useState<OrchVersion[]>([]);
  const [dependencies, setDependencies] = useState<OrchDependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [safeModeReason, setSafeModeReason] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<OrchVersion | null>(null);
  const [assetDependencies, setAssetDependencies] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    try {
      // Carregar estado do Safe Mode
      const { data: safeModeData } = await supabase
        .from('safe_mode_state')
        .select('*')
        .limit(1)
        .single();
      
      if (safeModeData) {
        setSafeModeState(safeModeData as unknown as SafeModeState);
      }

      // Carregar versões
      const { data: versionsData } = await supabase
        .from('orch_versions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (versionsData) setVersions(versionsData as OrchVersion[]);

      // Carregar dependências
      const { data: depsData } = await supabase
        .from('orch_dependencies')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (depsData) setDependencies(depsData as OrchDependency[]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleSafeMode = async (activate: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      const { data, error } = await supabase.rpc('toggle_safe_mode', {
        p_admin_id: user.id,
        p_activate: activate,
        p_reason: activate ? safeModeReason : null
      });

      if (error) throw error;

      const result = data as unknown as { success: boolean; safe_mode: boolean; satoshi_hash: string };
      if (result?.success) {
        toast.success(result.safe_mode ? 'Safe Mode ATIVADO' : 'Safe Mode DESATIVADO', {
          description: `Hash: ${result.satoshi_hash?.slice(0, 16)}...`
        });
        loadData();
        setSafeModeReason('');
      }
    } catch (error: any) {
      toast.error('Erro ao alternar Safe Mode', { description: error.message });
    }
  };

  const validateVersion = async (versionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('validate_version', {
        p_admin_id: user.id,
        p_version_id: versionId
      });

      if (error) throw error;

      const result = data as unknown as { success: boolean; satoshi_hash: string };
      if (result?.success) {
        toast.success('Versão validada!', {
          description: `Hash: ${result.satoshi_hash?.slice(0, 16)}...`
        });
        loadData();
      }
    } catch (error: any) {
      toast.error('Erro ao validar versão');
    }
  };

  const promoteVersion = async (versionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('promote_to_production', {
        p_admin_id: user.id,
        p_version_id: versionId
      });

      if (error) throw error;

      const result = data as unknown as { success: boolean; error?: string; asset?: string; version?: number; satoshi_hash?: string };
      if (result?.success) {
        toast.success(`${result.asset} v${result.version} promovido!`, {
          description: `Hash: ${result.satoshi_hash?.slice(0, 16)}...`
        });
        loadData();
      } else {
        toast.error(result?.error || 'Erro ao promover');
      }
    } catch (error: any) {
      toast.error('Erro ao promover versão');
    }
  };

  const checkDependenciesBeforeDelete = async (asset: OrchVersion) => {
    try {
      const { data, error } = await supabase.rpc('check_asset_dependencies', {
        p_asset_type: asset.asset_type,
        p_asset_name: asset.asset_name
      });

      if (error) throw error;

      const result = data as unknown as { has_dependencies: boolean; dependency_count: number; dependencies: any[] }[];
      const deps = result?.[0];

      setSelectedAsset(asset);
      setAssetDependencies(deps?.dependencies || []);
      setDeleteDialogOpen(true);
    } catch (error) {
      toast.error('Erro ao verificar dependências');
    }
  };

  const deleteAsset = async () => {
    if (!selectedAsset) return;

    try {
      const { error } = await supabase
        .from('orch_versions')
        .delete()
        .eq('id', selectedAsset.id);

      if (error) throw error;

      toast.success('Asset deletado');
      setDeleteDialogOpen(false);
      setSelectedAsset(null);
      loadData();
    } catch (error) {
      toast.error('Erro ao deletar asset');
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
    <div className="space-y-6">
      {/* Safe Mode Banner */}
      {safeModeState?.is_active && (
        <Alert className="bg-amber-900/50 border-amber-500 animate-pulse">
          <Shield className="h-5 w-5 text-amber-400" />
          <AlertTitle className="text-amber-200">🛡️ SAFE MODE ATIVO</AlertTitle>
          <AlertDescription className="text-amber-300">
            Promoções para produção bloqueadas. Motivo: {safeModeState.reason || 'Não especificado'}
          </AlertDescription>
        </Alert>
      )}

      {/* Controle de Safe Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Controle de Safe Mode
          </CardTitle>
          <CardDescription>
            Ative para bloquear promoções para produção e proteger o sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {safeModeState?.is_active ? (
                <Lock className="w-6 h-6 text-amber-500" />
              ) : (
                <Unlock className="w-6 h-6 text-emerald-500" />
              )}
              <div>
                <p className="font-medium">
                  Status: {safeModeState?.is_active ? 'ATIVO' : 'INATIVO'}
                </p>
                {safeModeState?.activated_at && (
                  <p className="text-sm text-muted-foreground">
                    Ativado em: {new Date(safeModeState.activated_at).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant={safeModeState?.is_active ? "default" : "destructive"}
              onClick={() => toggleSafeMode(!safeModeState?.is_active)}
              className="gap-2"
            >
              {safeModeState?.is_active ? (
                <>
                  <Unlock className="w-4 h-4" />
                  Desativar Safe Mode
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Ativar Safe Mode
                </>
              )}
            </Button>
          </div>

          {!safeModeState?.is_active && (
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (obrigatório para ativar)</Label>
              <Textarea
                id="reason"
                placeholder="Ex: Manutenção preventiva, investigação de bug..."
                value={safeModeReason}
                onChange={(e) => setSafeModeReason(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="versions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="versions" className="gap-2">
            <GitBranch className="w-4 h-4" /> Versões
          </TabsTrigger>
          <TabsTrigger value="dependencies" className="gap-2">
            <Link2 className="w-4 h-4" /> Dependências
          </TabsTrigger>
        </TabsList>

        {/* Tab: Versões */}
        <TabsContent value="versions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileCode className="w-5 h-5" />
                  Versionamento de Assets
                </span>
                <Button variant="outline" size="sm" onClick={loadData}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {versions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileCode className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum asset versionado ainda</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {versions.map((version) => (
                      <div
                        key={version.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{version.asset_type}</Badge>
                              <span className="font-medium">{version.asset_name}</span>
                              <Badge variant="secondary">v{version.version_number}</Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {version.is_validated ? (
                                <span className="flex items-center gap-1 text-emerald-500">
                                  <CheckCircle className="w-3 h-3" /> Validado
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-amber-500">
                                  <AlertTriangle className="w-3 h-3" /> Pendente
                                </span>
                              )}
                              {version.is_production && (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500">
                                  PRODUÇÃO
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!version.is_validated && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => validateVersion(version.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Validar
                            </Button>
                          )}
                          {version.is_validated && !version.is_production && (
                            <Button
                              size="sm"
                              onClick={() => promoteVersion(version.id)}
                              disabled={safeModeState?.is_active}
                            >
                              <ArrowUpCircle className="w-4 h-4 mr-1" />
                              Promover
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => checkDependenciesBeforeDelete(version)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Dependências */}
        <TabsContent value="dependencies">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                Mapa de Dependências Cross-Type
              </CardTitle>
              <CardDescription>
                Visualize as conexões entre SQL, Functions e Components
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dependencies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Link2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma dependência registrada</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {dependencies.map((dep) => (
                      <div
                        key={dep.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">{dep.source_type}</Badge>
                          <span className="font-medium">{dep.source_name}</span>
                          <span className="text-muted-foreground">→</span>
                          <Badge variant="outline">{dep.target_type}</Badge>
                          <span className="font-medium">{dep.target_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={dep.is_critical ? "destructive" : "secondary"}>
                            {dep.dependency_type}
                          </Badge>
                          {dep.is_critical && (
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Confirmação de Delete */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Você está prestes a deletar: <strong>{selectedAsset?.asset_name}</strong>
            </DialogDescription>
          </DialogHeader>

          {assetDependencies.length > 0 ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>⚠️ ATENÇÃO: Este asset possui dependências!</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 list-disc list-inside">
                  {assetDependencies.map((dep: any, i: number) => (
                    <li key={i}>
                      {dep.target_type}: <strong>{dep.target_name}</strong>
                      {dep.is_critical && <Badge variant="destructive" className="ml-2">CRÍTICO</Badge>}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Sem dependências detectadas</AlertTitle>
              <AlertDescription>
                Este asset pode ser deletado com segurança.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={deleteAsset}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Deletar Mesmo Assim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
