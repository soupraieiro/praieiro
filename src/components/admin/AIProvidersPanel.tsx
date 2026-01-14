import { useState } from 'react';
import { useAIProviders } from '@/hooks/useAIProviders';
import { AIProvider, AIProviderFormData, LegacyAIFormat } from '@/types/aiProvider';
import { AIProviderCard } from './AIProviderCard';
import { AIProviderForm } from './AIProviderForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  RefreshCw, 
  Search, 
  Brain, 
  FileJson,
  MessageSquare,
  Eye,
  Image,
  Mic,
  Wrench,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export function AIProvidersPanel() {
  const {
    providers,
    capabilityTypes,
    loading,
    error,
    refetch,
    createProvider,
    updateProvider,
    deleteProvider,
    importLegacyFormat,
    setDefaultProvider,
  } = useAIProviders();

  const [formOpen, setFormOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [legacyJson, setLegacyJson] = useState('');

  // Filtrar provedores
  const filteredProviders = providers.filter((p) =>
    p.provider_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.provider_company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.provider_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Estatísticas
  const stats = {
    total: providers.length,
    active: providers.filter((p) => p.status === 'active').length,
    withText: providers.filter((p) => p.capabilities.text).length,
    withVision: providers.filter((p) => p.capabilities.vision?.enabled).length,
    withImage: providers.filter((p) => p.capabilities.image?.generation).length,
    withAudio: providers.filter((p) => p.capabilities.audio?.transcription).length,
  };

  // Handlers
  const handleEdit = (provider: AIProvider) => {
    setEditingProvider(provider);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await deleteProvider(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  const handleToggleStatus = async (id: string, newStatus: 'active' | 'inactive') => {
    await updateProvider(id, { status: newStatus });
  };

  const handleFormSubmit = async (data: AIProviderFormData) => {
    if (editingProvider) {
      await updateProvider(editingProvider.id, data);
    } else {
      await createProvider(data);
    }
    setEditingProvider(null);
  };

  const handleImportLegacy = async () => {
    try {
      const parsed = JSON.parse(legacyJson) as LegacyAIFormat;
      if (!parsed.ia_name || !parsed.api_key) {
        throw new Error('JSON deve conter ia_name e api_key');
      }
      await importLegacyFormat(parsed);
      setImportDialogOpen(false);
      setLegacyJson('');
    } catch (err) {
      toast.error('JSON inválido. Verifique o formato legado.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
          <p className="text-destructive">{error}</p>
          <Button onClick={refetch} variant="outline" className="mt-4">
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Gerenciamento de IAs
          </h2>
          <p className="text-muted-foreground">
            Sistema de Capacidades Declaradas - Padrão PRAIEIRO_SDK
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <FileJson className="h-4 w-4 mr-2" />
            Importar Legado
          </Button>
          <Button onClick={() => { setEditingProvider(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova IA
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            <p className="text-xs text-muted-foreground">Ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.withText}</p>
            </div>
            <p className="text-xs text-muted-foreground">Texto</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.withVision}</p>
            </div>
            <p className="text-xs text-muted-foreground">Visão</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <Image className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.withImage}</p>
            </div>
            <p className="text-xs text-muted-foreground">Imagem</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <Mic className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.withAudio}</p>
            </div>
            <p className="text-xs text-muted-foreground">Áudio</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="active">Ativos</TabsTrigger>
            <TabsTrigger value="text">Texto</TabsTrigger>
            <TabsTrigger value="image">Imagem</TabsTrigger>
            <TabsTrigger value="audio">Áudio</TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar provedor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <TabsContent value="all" className="mt-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProviders.map((provider) => (
              <AIProviderCard
                key={provider.id}
                provider={provider}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteConfirmId(id)}
                onToggleStatus={handleToggleStatus}
                onSetDefault={setDefaultProvider}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="active" className="mt-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProviders
              .filter((p) => p.status === 'active')
              .map((provider) => (
                <AIProviderCard
                  key={provider.id}
                  provider={provider}
                  onEdit={handleEdit}
                  onDelete={(id) => setDeleteConfirmId(id)}
                  onToggleStatus={handleToggleStatus}
                  onSetDefault={setDefaultProvider}
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="text" className="mt-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProviders
              .filter((p) => p.capabilities.text)
              .map((provider) => (
                <AIProviderCard
                  key={provider.id}
                  provider={provider}
                  onEdit={handleEdit}
                  onDelete={(id) => setDeleteConfirmId(id)}
                  onToggleStatus={handleToggleStatus}
                  onSetDefault={setDefaultProvider}
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="image" className="mt-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProviders
              .filter((p) => p.capabilities.image?.generation)
              .map((provider) => (
                <AIProviderCard
                  key={provider.id}
                  provider={provider}
                  onEdit={handleEdit}
                  onDelete={(id) => setDeleteConfirmId(id)}
                  onToggleStatus={handleToggleStatus}
                  onSetDefault={setDefaultProvider}
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="audio" className="mt-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProviders
              .filter((p) => p.capabilities.audio?.transcription)
              .map((provider) => (
                <AIProviderCard
                  key={provider.id}
                  provider={provider}
                  onEdit={handleEdit}
                  onDelete={(id) => setDeleteConfirmId(id)}
                  onToggleStatus={handleToggleStatus}
                  onSetDefault={setDefaultProvider}
                />
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Empty State */}
      {filteredProviders.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Nenhum provedor encontrado</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Tente uma busca diferente' : 'Cadastre sua primeira IA para começar'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Form Dialog */}
      <AIProviderForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingProvider(null);
        }}
        provider={editingProvider}
        capabilityTypes={capabilityTypes}
        onSubmit={handleFormSubmit}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este provedor de IA? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Legacy Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Formato Legado</DialogTitle>
            <DialogDescription>
              Cole o JSON no formato legado para migrar automaticamente para a estrutura evoluída.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs font-mono text-muted-foreground">
                {`{
  "ia_name": "GPT-4o",
  "quality": "Raciocínio Lógico",
  "api_key": "PRAIEIRO_SDK_GPT4O_KEY"
}`}
              </p>
            </div>

            <Textarea
              value={legacyJson}
              onChange={(e) => setLegacyJson(e.target.value)}
              placeholder="Cole o JSON legado aqui..."
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImportLegacy} disabled={!legacyJson.trim()}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Importar e Migrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
