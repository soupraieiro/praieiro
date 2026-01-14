/**
 * MONACO EDITOR COM DIFF MODE
 * Editor de código com comparação de versões
 */

import React, { useState, useEffect } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  FileCode, GitCompare, GitBranch, Save, RefreshCw, 
  CheckCircle, AlertTriangle, Eye, EyeOff
} from 'lucide-react';

interface AssetVersion {
  id: string;
  asset_type: string;
  asset_name: string;
  version_number: number;
  content: string;
  content_hash: string;
  is_validated: boolean;
  is_production: boolean;
  created_at: string;
}

interface MonacoDiffEditorProps {
  assetType?: string;
  assetName?: string;
}

export default function MonacoDiffEditor({ assetType, assetName }: MonacoDiffEditorProps) {
  const [versions, setVersions] = useState<AssetVersion[]>([]);
  const [assets, setAssets] = useState<{ type: string; name: string }[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [leftVersion, setLeftVersion] = useState<AssetVersion | null>(null);
  const [rightVersion, setRightVersion] = useState<AssetVersion | null>(null);
  const [mode, setMode] = useState<'edit' | 'diff'>('edit');
  const [currentContent, setCurrentContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    if (selectedAsset) {
      loadVersions(selectedAsset);
    }
  }, [selectedAsset]);

  const loadAssets = async () => {
    try {
      const { data } = await supabase
        .from('orch_versions')
        .select('asset_type, asset_name')
        .order('created_at', { ascending: false });

      if (data) {
        const unique = Array.from(
          new Map(data.map(item => [`${item.asset_type}:${item.asset_name}`, item])).values()
        );
        setAssets(unique.map(u => ({ type: u.asset_type, name: u.asset_name })));

        if (assetType && assetName) {
          setSelectedAsset(`${assetType}:${assetName}`);
        } else if (unique.length > 0) {
          setSelectedAsset(`${unique[0].asset_type}:${unique[0].asset_name}`);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async (assetKey: string) => {
    const [type, name] = assetKey.split(':');
    try {
      const { data } = await supabase
        .from('orch_versions')
        .select('*')
        .eq('asset_type', type)
        .eq('asset_name', name)
        .order('version_number', { ascending: false });

      if (data && data.length > 0) {
        const typedData = data as AssetVersion[];
        setVersions(typedData);
        setRightVersion(typedData[0]);
        setCurrentContent(typedData[0].content || '');
        if (typedData.length > 1) {
          setLeftVersion(typedData[1]);
        } else {
          setLeftVersion(null);
        }
      } else {
        setVersions([]);
        setLeftVersion(null);
        setRightVersion(null);
        setCurrentContent('');
      }
    } catch (error) {
      console.error('Erro ao carregar versões:', error);
    }
  };

  const saveNewVersion = async () => {
    if (!rightVersion || !currentContent) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const newVersionNumber = (rightVersion?.version_number || 0) + 1;
      const contentHash = await generateHash(currentContent);

      const { error } = await supabase
        .from('orch_versions')
        .insert({
          asset_type: rightVersion.asset_type,
          asset_name: rightVersion.asset_name,
          version_number: newVersionNumber,
          content: currentContent,
          content_hash: contentHash,
          is_validated: false,
          is_production: false
        });

      if (error) throw error;

      toast.success(`Versão v${newVersionNumber} salva!`, {
        description: `Hash: ${contentHash.slice(0, 16)}...`
      });

      loadVersions(selectedAsset);
    } catch (error: any) {
      toast.error('Erro ao salvar versão', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const generateHash = async (content: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(content + Date.now().toString());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const getLanguage = (assetType: string): string => {
    switch (assetType) {
      case 'sql':
      case 'migration':
        return 'sql';
      case 'function':
      case 'edge_function':
        return 'typescript';
      case 'component':
        return 'typescript';
      default:
        return 'plaintext';
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
    <Card className="h-[calc(100vh-200px)]">
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="w-5 h-5" />
              Editor de Código com Versionamento
            </CardTitle>
            <CardDescription>
              Edite e compare versões de assets do sistema
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLineNumbers(!showLineNumbers)}
            >
              {showLineNumbers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadVersions(selectedAsset)}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            {mode === 'edit' && (
              <Button
                size="sm"
                onClick={saveNewVersion}
                disabled={saving || !currentContent}
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar Nova Versão
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <Select value={selectedAsset} onValueChange={setSelectedAsset}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecione um asset" />
            </SelectTrigger>
            <SelectContent>
              {assets.map((asset) => (
                <SelectItem key={`${asset.type}:${asset.name}`} value={`${asset.type}:${asset.name}`}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{asset.type}</Badge>
                    {asset.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tabs value={mode} onValueChange={(v) => setMode(v as 'edit' | 'diff')}>
            <TabsList>
              <TabsTrigger value="edit" className="gap-2">
                <FileCode className="w-4 h-4" /> Editor
              </TabsTrigger>
              <TabsTrigger value="diff" className="gap-2" disabled={!leftVersion}>
                <GitCompare className="w-4 h-4" /> Diff Mode
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {mode === 'diff' && versions.length > 1 && (
            <div className="flex items-center gap-2">
              <Select
                value={leftVersion?.id || ''}
                onValueChange={(id) => setLeftVersion(versions.find(v => v.id === id) || null)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Versão antiga" />
                </SelectTrigger>
                <SelectContent>
                  {versions.filter(v => v.id !== rightVersion?.id).map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      v{v.version_number} {v.is_production && '(prod)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">vs</span>
              <Select
                value={rightVersion?.id || ''}
                onValueChange={(id) => setRightVersion(versions.find(v => v.id === id) || null)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Versão nova" />
                </SelectTrigger>
                <SelectContent>
                  {versions.filter(v => v.id !== leftVersion?.id).map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      v{v.version_number} {v.is_production && '(prod)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Version Info Bar */}
        {rightVersion && (
          <div className="flex items-center gap-4 mt-4 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">v{rightVersion.version_number}</span>
            </div>
            {rightVersion.is_validated ? (
              <Badge className="bg-emerald-500/20 text-emerald-400">
                <CheckCircle className="w-3 h-3 mr-1" /> Validado
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-400">
                <AlertTriangle className="w-3 h-3 mr-1" /> Pendente
              </Badge>
            )}
            {rightVersion.is_production && (
              <Badge className="bg-blue-500/20 text-blue-400">PRODUÇÃO</Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              Hash: {rightVersion.content_hash?.slice(0, 16)}...
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0 h-[calc(100%-280px)]">
        {mode === 'edit' ? (
          <Editor
            height="100%"
            language={getLanguage(rightVersion?.asset_type || 'plaintext')}
            theme="vs-dark"
            value={currentContent}
            onChange={(value) => setCurrentContent(value || '')}
            options={{
              lineNumbers: showLineNumbers ? 'on' : 'off',
              minimap: { enabled: true },
              fontSize: 14,
              wordWrap: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              renderWhitespace: 'selection',
              tabSize: 2
            }}
          />
        ) : (
          leftVersion && rightVersion && (
            <DiffEditor
              height="100%"
              original={leftVersion.content || ''}
              modified={rightVersion.content || ''}
              language={getLanguage(rightVersion.asset_type)}
              theme="vs-dark"
              options={{
                lineNumbers: showLineNumbers ? 'on' : 'off',
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                automaticLayout: true,
                readOnly: true,
                renderSideBySide: true
              }}
            />
          )
        )}
      </CardContent>
    </Card>
  );
}
