import { useState, useEffect } from 'react';
import { AIProvider, AIProviderFormData, OutputType, LatencyProfile, ProviderStatus, AICapabilityType } from '@/types/aiProvider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Eye, Image, Mic, Wrench, Video, Code, X } from 'lucide-react';

const CAPABILITY_ICONS: Record<string, React.ReactNode> = {
  text: <MessageSquare className="h-4 w-4" />,
  vision: <Eye className="h-4 w-4" />,
  image: <Image className="h-4 w-4" />,
  audio: <Mic className="h-4 w-4" />,
  tools: <Wrench className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  code: <Code className="h-4 w-4" />,
};

const OUTPUT_TYPE_OPTIONS: OutputType[] = [
  'text', 'json', 'markdown', 'image', 'audio', 'video', 'timestamps', 'artifacts', 'analysis'
];

interface AIProviderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: AIProvider | null;
  capabilityTypes: AICapabilityType[];
  onSubmit: (data: AIProviderFormData) => Promise<void>;
}

export function AIProviderForm({
  open,
  onOpenChange,
  provider,
  capabilityTypes,
  onSubmit,
}: AIProviderFormProps) {
  const isEditing = !!provider;

  const [formData, setFormData] = useState<AIProviderFormData>({
    provider_id: '',
    provider_name: '',
    provider_company: '',
    api_key_ref: 'PRAIEIRO_SDK_',
    status: 'inactive',
    capabilities: {
      text: false,
      vision: false,
      image: false,
      audio: false,
      tools: false,
      video: false,
      code: false,
    },
    output_types: ['text'],
    latency_profile: 'medium',
    priority: 100,
    max_tokens: null,
  });

  const [loading, setLoading] = useState(false);

  // Preencher form quando editar
  useEffect(() => {
    if (provider) {
      const caps = provider.capabilities;
      setFormData({
        provider_id: provider.provider_id,
        provider_name: provider.provider_name,
        provider_company: provider.provider_company,
        api_key_ref: provider.api_key_ref,
        status: provider.status,
        capabilities: {
          text: !!(caps.text?.enabled !== false && (caps.text?.reasoning || caps.text?.creative || caps.text?.enabled)),
          vision: !!caps.vision?.enabled,
          image: !!(caps.image?.enabled || caps.image?.generation),
          audio: !!(caps.audio?.enabled || caps.audio?.transcription),
          tools: !!(caps.tools?.enabled || caps.tools?.function_calling),
          video: !!caps.video?.enabled,
          code: !!caps.code?.enabled,
        },
        output_types: provider.output_types,
        latency_profile: provider.latency_profile,
        priority: provider.priority,
        max_tokens: provider.max_tokens,
      });
    } else {
      // Reset form
      setFormData({
        provider_id: '',
        provider_name: '',
        provider_company: '',
        api_key_ref: 'PRAIEIRO_SDK_',
        status: 'inactive',
        capabilities: {
          text: false,
          vision: false,
          image: false,
          audio: false,
          tools: false,
          video: false,
          code: false,
        },
        output_types: ['text'],
        latency_profile: 'medium',
        priority: 100,
        max_tokens: null,
      });
    }
  }, [provider, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const toggleOutputType = (type: OutputType) => {
    setFormData((prev) => ({
      ...prev,
      output_types: prev.output_types.includes(type)
        ? prev.output_types.filter((t) => t !== type)
        : [...prev.output_types, type],
    }));
  };

  const toggleCapability = (cap: keyof typeof formData.capabilities) => {
    setFormData((prev) => ({
      ...prev,
      capabilities: {
        ...prev.capabilities,
        [cap]: !prev.capabilities[cap],
      },
    }));
  };

  // Auto-gerar provider_id a partir do nome
  const handleNameChange = (name: string) => {
    const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setFormData((prev) => ({
      ...prev,
      provider_name: name,
      provider_id: isEditing ? prev.provider_id : id,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Editar ${provider?.provider_name}` : 'Cadastrar Nova IA'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="capabilities">Capacidades</TabsTrigger>
              <TabsTrigger value="output">Output</TabsTrigger>
            </TabsList>

            {/* Tab Básico */}
            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="provider_name">Nome da IA *</Label>
                  <Input
                    id="provider_name"
                    value={formData.provider_name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ex: GPT-4o"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="provider_id">ID do Provedor *</Label>
                  <Input
                    id="provider_id"
                    value={formData.provider_id}
                    onChange={(e) => setFormData((prev) => ({ ...prev, provider_id: e.target.value }))}
                    placeholder="Ex: gpt-4o"
                    required
                    disabled={isEditing}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="provider_company">Empresa *</Label>
                  <Input
                    id="provider_company"
                    value={formData.provider_company}
                    onChange={(e) => setFormData((prev) => ({ ...prev, provider_company: e.target.value }))}
                    placeholder="Ex: OpenAI"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api_key_ref">Key de Ambiente (Padrão Praieiro) *</Label>
                  <Input
                    id="api_key_ref"
                    value={formData.api_key_ref}
                    onChange={(e) => setFormData((prev) => ({ ...prev, api_key_ref: e.target.value }))}
                    placeholder="PRAIEIRO_SDK_GPT4O_KEY"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: ProviderStatus) => 
                      setFormData((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="testing">Em Teste</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="deprecated">Descontinuado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Perfil de Latência</Label>
                  <Select
                    value={formData.latency_profile}
                    onValueChange={(value: LatencyProfile) => 
                      setFormData((prev) => ({ ...prev, latency_profile: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa (Rápido)</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta (Lento)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Prioridade</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData((prev) => ({ 
                      ...prev, 
                      priority: parseInt(e.target.value) || 100 
                    }))}
                    min={1}
                    max={1000}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_tokens">Máximo de Tokens (opcional)</Label>
                <Input
                  id="max_tokens"
                  type="number"
                  value={formData.max_tokens || ''}
                  onChange={(e) => setFormData((prev) => ({ 
                    ...prev, 
                    max_tokens: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                  placeholder="Ex: 128000"
                />
              </div>
            </TabsContent>

            {/* Tab Capacidades */}
            <TabsContent value="capabilities" className="pt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Selecione as capacidades que esta IA declara suportar:
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  {capabilityTypes.map((capType) => {
                    const key = capType.capability_key as keyof typeof formData.capabilities;
                    return (
                      <label
                        key={capType.id}
                        className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                          formData.capabilities[key] 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-muted-foreground'
                        }`}
                      >
                        <Checkbox
                          checked={formData.capabilities[key]}
                          onCheckedChange={() => toggleCapability(key)}
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            {CAPABILITY_ICONS[capType.capability_key]}
                            <span className="font-medium">{capType.capability_name}</span>
                          </div>
                          {capType.description && (
                            <p className="text-xs text-muted-foreground">
                              {capType.description}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* Tab Output */}
            <TabsContent value="output" className="pt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Defina os tipos de output que esta IA pode gerar. O sistema usará essa informação 
                  para renderizar a interface correta.
                </p>

                <div className="flex flex-wrap gap-2">
                  {OUTPUT_TYPE_OPTIONS.map((type) => {
                    const isSelected = formData.output_types.includes(type);
                    return (
                      <Badge
                        key={type}
                        variant={isSelected ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleOutputType(type)}
                      >
                        {type}
                        {isSelected && <X className="h-3 w-3 ml-1" />}
                      </Badge>
                    );
                  })}
                </div>

                {formData.output_types.includes('image') && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">🖼️ Container de Imagem</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Quando esta IA responder, o sistema renderizará um container de imagem 
                      (aspect-square) para exibir o resultado.
                    </p>
                  </div>
                )}

                {formData.output_types.includes('audio') && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">🎵 Player de Áudio</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      O sistema renderizará um player de áudio para reproduzir o resultado.
                    </p>
                  </div>
                )}

                {formData.output_types.includes('video') && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">🎬 Player de Vídeo</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      O sistema renderizará um player de vídeo (aspect-video) para o resultado.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar IA'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
