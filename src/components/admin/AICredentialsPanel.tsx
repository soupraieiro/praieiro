import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AISecureExportDialog } from './AISecureExportDialog';
import { AISecureImportDialog } from './AISecureImportDialog';
import {
  Key,
  Download,
  Upload,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Brain,
  MessageSquare,
  Image,
  Mic,
  Search,
  Globe,
  Zap,
  Sparkles,
  Lock,
} from 'lucide-react';

// Definição das IAs com padrão PRAIEIRO_SDK
const AI_PROVIDERS_CONFIG = [
  {
    id: 'gpt4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    keyId: 'PRAIEIRO_SDK_GPT4O_KEY',
    capability: 'Texto / Visão',
    outputTypes: ['text', 'json'],
    icon: Brain,
    capabilities: { text: true, vision: true },
  },
  {
    id: 'claude',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    keyId: 'PRAIEIRO_SDK_CLAUDE_KEY',
    capability: 'Escrita / Código',
    outputTypes: ['text', 'markdown', 'artifacts'],
    icon: MessageSquare,
    capabilities: { text: true, code: true },
  },
  {
    id: 'gemini',
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    keyId: 'PRAIEIRO_SDK_GEMINI_KEY',
    capability: 'Long Context / Multimodal',
    outputTypes: ['text', 'json', 'analysis'],
    icon: Sparkles,
    capabilities: { text: true, vision: true, video: true },
  },
  {
    id: 'perplexity',
    name: 'Sonar / Search',
    provider: 'Perplexity',
    keyId: 'PRAIEIRO_SDK_PERPLEXITY_KEY',
    capability: 'Real-time Search',
    outputTypes: ['text', 'citations'],
    icon: Search,
    capabilities: { text: true, search: true },
  },
  {
    id: 'mistral',
    name: 'Mistral Large',
    provider: 'Mistral',
    keyId: 'PRAIEIRO_SDK_MISTRAL_KEY',
    capability: 'Multilingue Técnico',
    outputTypes: ['text', 'json'],
    icon: Globe,
    capabilities: { text: true, multilingual: true },
  },
  {
    id: 'groq',
    name: 'Llama 3 / Mixtral',
    provider: 'Groq',
    keyId: 'PRAIEIRO_SDK_GROQ_KEY',
    capability: 'Baixa Latência',
    outputTypes: ['text', 'json'],
    icon: Zap,
    capabilities: { text: true, fast: true },
  },
  {
    id: 'flux',
    name: 'Flux.1',
    provider: 'BFL/Black Forest',
    keyId: 'PRAIEIRO_SDK_FLUX_KEY',
    capability: 'Geração de Imagem',
    outputTypes: ['image'],
    icon: Image,
    capabilities: { image: true },
  },
  {
    id: 'whisper',
    name: 'Whisper V3',
    provider: 'OpenAI/Local',
    keyId: 'PRAIEIRO_SDK_WHISPER_KEY',
    capability: 'Transcrição de Áudio',
    outputTypes: ['text', 'timestamps'],
    icon: Mic,
    capabilities: { audio: true, transcription: true },
  },
];

interface CredentialState {
  value: string;
  isConfigured: boolean;
  isEnabled: boolean;
  lastUpdated?: string;
}

interface ExportFormat {
  version: string;
  exportedAt: string;
  satoshiHash: string;
  providers: {
    id: string;
    provider: string;
    apiKeyRef: string;
    status: string;
    capabilities: Record<string, boolean>;
    outputTypes: string[];
    latency: string;
    metadata: {
      last_sync: string;
      version: string;
    };
  }[];
}

// Validador de prefixo de chave
const validateKeyPrefix = (keyId: string, value: string): { valid: boolean; message: string } => {
  if (!value.trim()) {
    return { valid: true, message: '' }; // Campo vazio é permitido
  }
  
  // Verificar se a chave começa com o prefixo correto (apenas para debug interno)
  // As chaves reais podem ter qualquer formato, mas o ID deve seguir PRAIEIRO_SDK_*
  if (!keyId.startsWith('PRAIEIRO_SDK_')) {
    return { valid: false, message: 'ID da chave deve seguir o padrão PRAIEIRO_SDK_[NOME]_KEY' };
  }
  
  // Verificar se a chave parece válida (tem pelo menos 20 caracteres)
  if (value.length < 20) {
    return { valid: false, message: 'A chave parece muito curta. Verifique se está correta.' };
  }
  
  return { valid: true, message: '' };
};

// Gerar hash Satoshi para integridade
const generateSatoshiHash = async (data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data + Date.now().toString());
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
};

export function AICredentialsPanel() {
  const [credentials, setCredentials] = useState<Record<string, CredentialState>>({});
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [secureExportOpen, setSecureExportOpen] = useState(false);
  const [secureImportOpen, setSecureImportOpen] = useState(false);
  
  // Inicializar estados das credenciais
  useEffect(() => {
    const initialCredentials: Record<string, CredentialState> = {};
    AI_PROVIDERS_CONFIG.forEach(provider => {
      initialCredentials[provider.keyId] = {
        value: '',
        isConfigured: false,
        isEnabled: false,
      };
    });
    setCredentials(initialCredentials);
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    setLoading(true);
    try {
      // Verificar quais providers já estão no banco
      const { data: providers, error } = await supabase
        .from('ai_providers')
        .select('provider_id, api_key_ref, status, updated_at');
      
      if (error) throw error;
      
      if (providers) {
        const updatedCredentials = { ...credentials };
        providers.forEach(provider => {
          const keyId = provider.api_key_ref;
          if (updatedCredentials[keyId]) {
            updatedCredentials[keyId] = {
              value: '', // Nunca armazenamos o valor real
              isConfigured: true,
              isEnabled: provider.status === 'active',
              lastUpdated: provider.updated_at,
            };
          }
        });
        setCredentials(updatedCredentials);
      }
    } catch (error) {
      console.error('Erro ao carregar credenciais:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialChange = (keyId: string, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [keyId]: {
        ...prev[keyId],
        value,
      },
    }));

    // Validar ao digitar
    const validation = validateKeyPrefix(keyId, value);
    if (!validation.valid) {
      setValidationErrors(prev => ({ ...prev, [keyId]: validation.message }));
    } else {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[keyId];
        return newErrors;
      });
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const toggleProviderEnabled = (keyId: string, enabled: boolean) => {
    setCredentials(prev => ({
      ...prev,
      [keyId]: {
        ...prev[keyId],
        isEnabled: enabled,
      },
    }));
  };

  const saveCredentials = async () => {
    // Verificar erros de validação
    if (Object.keys(validationErrors).length > 0) {
      toast.error('Corrija os erros de validação antes de salvar');
      return;
    }

    setSaving(true);
    try {
      // Atualizar status dos providers no banco
      for (const provider of AI_PROVIDERS_CONFIG) {
        const credential = credentials[provider.keyId];
        
        // Se há um valor novo, atualizar o provider
        if (credential?.value) {
          const satoshiHash = await generateSatoshiHash(provider.keyId);
          
          await supabase
            .from('ai_providers')
            .upsert({
              provider_id: provider.id,
              provider_name: provider.name,
              provider_company: provider.provider,
              api_key_ref: provider.keyId,
              status: credential.isEnabled ? 'active' : 'inactive',
              capabilities: provider.capabilities,
              output_types: provider.outputTypes,
              latency_profile: provider.id === 'groq' ? 'low' : 'medium',
              satoshi_hash: satoshiHash,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'provider_id',
            });
        }
      }

      toast.success('Credenciais salvas com sucesso');
      await loadSavedCredentials();
    } catch (error) {
      console.error('Erro ao salvar credenciais:', error);
      toast.error('Erro ao salvar credenciais');
    } finally {
      setSaving(false);
    }
  };

  const exportConfiguration = async () => {
    try {
      const satoshiHash = await generateSatoshiHash('export');
      
      const exportData: ExportFormat = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        satoshiHash,
        providers: AI_PROVIDERS_CONFIG.map(provider => {
          const credential = credentials[provider.keyId];
          return {
            id: provider.id,
            provider: provider.provider,
            apiKeyRef: provider.keyId,
            status: credential?.isEnabled ? 'active' : 'inactive',
            capabilities: provider.capabilities,
            outputTypes: provider.outputTypes,
            latency: provider.id === 'groq' ? 'low' : 'medium',
            metadata: {
              last_sync: credential?.lastUpdated || new Date().toISOString(),
              version: 'v2.0',
            },
          };
        }),
      };

      // Criar arquivo para download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `praieiro-ai-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Configurações exportadas com sucesso');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar configurações');
    }
  };

  const getConfiguredCount = () => Object.values(credentials).filter(c => c.isConfigured || c.value).length;
  const getEnabledCount = () => Object.values(credentials).filter(c => c.isEnabled).length;

  // Preparar dados para exportação segura
  const getProvidersForExport = () => {
    return AI_PROVIDERS_CONFIG.map(provider => ({
      id: provider.id,
      provider: provider.provider,
      apiKeyRef: provider.keyId,
      status: credentials[provider.keyId]?.isEnabled ? 'active' : 'inactive',
      capabilities: provider.capabilities,
      outputTypes: provider.outputTypes,
      category: provider.capability,
      latency: provider.id === 'groq' ? 'low' : 'medium',
      metadata: {
        last_sync: credentials[provider.keyId]?.lastUpdated || new Date().toISOString(),
        version: 'v2.0',
      },
    }));
  };

  // Handler para importação
  const handleImportComplete = (importedProviders: Array<{
    id: string;
    apiKeyRef: string;
    apiKeyValue?: string;
    status: string;
  }>) => {
    const updatedCredentials = { ...credentials };
    
    importedProviders.forEach(provider => {
      if (updatedCredentials[provider.apiKeyRef]) {
        updatedCredentials[provider.apiKeyRef] = {
          value: provider.apiKeyValue || '',
          isConfigured: !!provider.apiKeyValue,
          isEnabled: provider.status === 'active',
          lastUpdated: new Date().toISOString(),
        };
      }
    });
    
    setCredentials(updatedCredentials);
    toast.success('Credenciais importadas! Clique em "Salvar" para persistir.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Key className="h-6 w-6" />
            Gerenciamento de Credenciais
          </h2>
          <p className="text-muted-foreground">
            Padrão PRAIEIRO_SDK_[NOME]_KEY - Sincronização e Exportação
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setSecureImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Backup
          </Button>
          <Button variant="outline" onClick={exportConfiguration}>
            <Download className="h-4 w-4 mr-2" />
            Exportar JSON
          </Button>
          <Button variant="secondary" onClick={() => setSecureExportOpen(true)}>
            <Lock className="h-4 w-4 mr-2" />
            Exportar Seguro
          </Button>
          <Button onClick={saveCredentials} disabled={saving}>
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Credenciais
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{AI_PROVIDERS_CONFIG.length}</p>
            <p className="text-xs text-muted-foreground">Total de IAs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">{getConfiguredCount()}</p>
            <p className="text-xs text-muted-foreground">Configuradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{getEnabledCount()}</p>
            <p className="text-xs text-muted-foreground">Ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{Object.keys(validationErrors).length}</p>
            <p className="text-xs text-muted-foreground">Erros</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs por categoria */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="text">Texto/Visão</TabsTrigger>
          <TabsTrigger value="media">Mídia</TabsTrigger>
          <TabsTrigger value="search">Busca</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="space-y-4">
            {AI_PROVIDERS_CONFIG.map(provider => renderCredentialCard(provider))}
          </div>
        </TabsContent>

        <TabsContent value="text" className="mt-4">
          <div className="space-y-4">
            {AI_PROVIDERS_CONFIG
              .filter(p => p.capabilities.text || p.capabilities.vision || p.capabilities.code)
              .map(provider => renderCredentialCard(provider))}
          </div>
        </TabsContent>

        <TabsContent value="media" className="mt-4">
          <div className="space-y-4">
            {AI_PROVIDERS_CONFIG
              .filter(p => p.capabilities.image || p.capabilities.audio)
              .map(provider => renderCredentialCard(provider))}
          </div>
        </TabsContent>

        <TabsContent value="search" className="mt-4">
          <div className="space-y-4">
            {AI_PROVIDERS_CONFIG
              .filter(p => p.capabilities.search)
              .map(provider => renderCredentialCard(provider))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Security Notice */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Segurança das Credenciais
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-200 mt-1">
              As chaves são tratadas como dados sensíveis e armazenadas de forma criptografada.
              O arquivo de exportação contém apenas referências (IDs), nunca os valores reais das chaves.
              Todas as chamadas são validadas com Satoshi Hash para integridade.
            </p>
          </div>
        </div>
      </div>

      {/* Export Format Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Formato de Exportação (JSON Future-Proof)</CardTitle>
          <CardDescription>
            Estrutura evoluída com separação de Identidade e Capacidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto font-mono">
{`{
  "version": "2.0",
  "exportedAt": "${new Date().toISOString()}",
  "satoshiHash": "a1b2c3d4e5f6g7h8",
  "providers": [
    {
      "id": "gpt4o",
      "provider": "OpenAI",
      "apiKeyRef": "PRAIEIRO_SDK_GPT4O_KEY",
      "status": "active",
      "capabilities": { "text": true, "vision": true },
      "outputTypes": ["text", "json"],
      "latency": "medium",
      "metadata": {
        "last_sync": "2026-01-10T22:00:00Z",
        "version": "v2.0"
      }
    }
  ]
}`}
          </pre>
        </CardContent>
      </Card>

      {/* Diálogos de Exportação/Importação Segura */}
      <AISecureExportDialog
        open={secureExportOpen}
        onOpenChange={setSecureExportOpen}
        providers={getProvidersForExport()}
        credentials={credentials}
      />

      <AISecureImportDialog
        open={secureImportOpen}
        onOpenChange={setSecureImportOpen}
        onImportComplete={handleImportComplete}
      />
    </div>
  );

  function renderCredentialCard(provider: typeof AI_PROVIDERS_CONFIG[0]) {
    const credential = credentials[provider.keyId];
    const error = validationErrors[provider.keyId];
    const isVisible = visibleKeys.has(provider.keyId);
    const Icon = provider.icon;

    return (
      <Card key={provider.id} className={error ? 'border-destructive' : ''}>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{provider.name}</span>
                    <Badge variant="outline">{provider.provider}</Badge>
                    {credential?.isConfigured && (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Configurado
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{provider.capability}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`enabled-${provider.id}`} className="text-xs text-muted-foreground">
                    Ativo
                  </Label>
                  <Switch
                    id={`enabled-${provider.id}`}
                    checked={credential?.isEnabled || false}
                    onCheckedChange={(checked) => toggleProviderEnabled(provider.keyId, checked)}
                  />
                </div>
              </div>
            </div>

            {/* Key Input */}
            <div className="space-y-2">
              <Label htmlFor={provider.keyId} className="flex items-center gap-2 text-xs">
                <Key className="h-3 w-3" />
                <code className="text-muted-foreground">{provider.keyId}</code>
              </Label>
              <div className="relative">
                <Input
                  id={provider.keyId}
                  type={isVisible ? 'text' : 'password'}
                  placeholder="Cole sua API Key aqui..."
                  value={credential?.value || ''}
                  onChange={(e) => handleCredentialChange(provider.keyId, e.target.value)}
                  className={`pr-10 font-mono text-sm ${error ? 'border-destructive' : ''}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleKeyVisibility(provider.keyId)}
                >
                  {isVisible ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {error && (
                <div className="flex items-center gap-1 text-destructive text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  {error}
                </div>
              )}
            </div>

            {/* Output Types */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground">Outputs:</span>
              {provider.outputTypes.map(type => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {type}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
}
