// Tipos para o sistema de gerenciamento de IAs do Praieiro

// Estrutura legada (para retrocompatibilidade)
export interface LegacyAIFormat {
  ia_name: string;
  quality: string;
  api_key: string;
}

// Níveis de capacidade
export type CapabilityLevel = 'low' | 'medium' | 'high';

// Perfis de latência
export type LatencyProfile = 'low' | 'medium' | 'high';

// Status do provedor
export type ProviderStatus = 'active' | 'inactive' | 'deprecated' | 'testing';

// Categorias de output
export type OutputCategory = 'text' | 'media' | 'structured';

// Tipos de output suportados
export type OutputType = 'text' | 'json' | 'markdown' | 'image' | 'audio' | 'video' | 'timestamps' | 'artifacts' | 'analysis';

// Capacidades detalhadas
export interface TextCapability {
  reasoning?: CapabilityLevel;
  creative?: CapabilityLevel;
  enabled?: boolean;
}

export interface VisionCapability {
  enabled: boolean;
  ocr?: boolean;
  analysis?: CapabilityLevel;
}

export interface ImageCapability {
  generation?: CapabilityLevel;
  styles?: string[];
  enabled?: boolean;
}

export interface AudioCapability {
  transcription?: CapabilityLevel;
  synthesis?: CapabilityLevel;
  translation?: boolean;
  timestamps?: boolean;
  enabled?: boolean;
}

export interface ToolsCapability {
  function_calling?: boolean;
  artifacts?: boolean;
  enabled?: boolean;
}

export interface VideoCapability {
  enabled: boolean;
  analysis?: CapabilityLevel;
  generation?: CapabilityLevel;
}

export interface CodeCapability {
  enabled: boolean;
  languages?: string[];
  quality?: CapabilityLevel;
}

// Mapa de capacidades
export interface AICapabilities {
  text?: TextCapability;
  vision?: VisionCapability;
  image?: ImageCapability;
  audio?: AudioCapability;
  tools?: ToolsCapability;
  video?: VideoCapability;
  code?: CodeCapability;
}

// Metadados do provedor
export interface ProviderMetadata {
  last_sync?: string;
  version?: string;
  documentation_url?: string;
  pricing_url?: string;
  [key: string]: unknown;
}

// Estrutura evoluída (principal)
export interface AIProvider {
  id: string;
  provider_id: string;
  provider_name: string;
  provider_company: string;
  api_key_ref: string;
  status: ProviderStatus;
  capabilities: AICapabilities;
  output_types: OutputType[];
  latency_profile: LatencyProfile;
  metadata: ProviderMetadata;
  is_default: boolean;
  priority: number;
  max_tokens: number | null;
  cost_per_1k_tokens: number | null;
  legacy_format: LegacyAIFormat | null;
  satoshi_hash: string | null;
  created_at: string;
  updated_at: string;
}

// Tipo de capacidade (tabela de referência)
export interface AICapabilityType {
  id: string;
  capability_key: string;
  capability_name: string;
  description: string | null;
  output_category: OutputCategory;
  icon_name: string | null;
  is_active: boolean;
  created_at: string;
}

// Log de uso
export interface AIProviderUsageLog {
  id: string;
  provider_id: string;
  user_id: string | null;
  request_type: string;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  success: boolean;
  error_message: string | null;
  cost_usd: number | null;
  satoshi_hash: string | null;
  created_at: string;
}

// Form data para criar/editar provedor
export interface AIProviderFormData {
  provider_id: string;
  provider_name: string;
  provider_company: string;
  api_key_ref: string;
  status: ProviderStatus;
  capabilities: {
    text: boolean;
    vision: boolean;
    image: boolean;
    audio: boolean;
    tools: boolean;
    video: boolean;
    code: boolean;
  };
  output_types: OutputType[];
  latency_profile: LatencyProfile;
  priority: number;
  max_tokens: number | null;
}

// Helper para migrar formato legado para evoluído
export function migrateLegacyFormat(legacy: LegacyAIFormat): Partial<AIProvider> {
  const qualityMap: Record<string, AICapabilities> = {
    'Raciocínio Lógico': { text: { reasoning: 'high' } },
    'Human Writing': { text: { creative: 'high' } },
    'Code': { code: { enabled: true, quality: 'high' } },
    'Long Context': { text: { reasoning: 'medium' } },
    'Video': { video: { enabled: true } },
    'Image Generation': { image: { generation: 'high' } },
    'Audio Transcription': { audio: { transcription: 'high' } },
  };

  return {
    provider_name: legacy.ia_name,
    api_key_ref: legacy.api_key,
    capabilities: qualityMap[legacy.quality] || { text: { enabled: true } },
    legacy_format: legacy,
  };
}

// Helper para verificar se suporta determinado output
export function supportsOutputType(provider: AIProvider, outputType: OutputType): boolean {
  return provider.output_types.includes(outputType);
}

// Helper para obter capacidades ativas
export function getActiveCapabilities(provider: AIProvider): string[] {
  const active: string[] = [];
  const caps = provider.capabilities;

  if (caps.text?.enabled !== false && (caps.text?.reasoning || caps.text?.creative)) {
    active.push('text');
  }
  if (caps.vision?.enabled) active.push('vision');
  if (caps.image?.enabled || caps.image?.generation) active.push('image');
  if (caps.audio?.enabled || caps.audio?.transcription || caps.audio?.synthesis) active.push('audio');
  if (caps.tools?.enabled || caps.tools?.function_calling || caps.tools?.artifacts) active.push('tools');
  if (caps.video?.enabled) active.push('video');
  if (caps.code?.enabled) active.push('code');

  return active;
}

// Componente de renderização baseado no output type
export interface OutputRenderer {
  type: OutputType;
  component: 'text' | 'image' | 'audio' | 'video' | 'json' | 'markdown';
  containerClass: string;
}

export const OUTPUT_RENDERERS: Record<OutputType, OutputRenderer> = {
  text: { type: 'text', component: 'text', containerClass: 'prose max-w-none' },
  json: { type: 'json', component: 'json', containerClass: 'font-mono bg-muted p-4 rounded-lg overflow-auto' },
  markdown: { type: 'markdown', component: 'markdown', containerClass: 'prose max-w-none' },
  image: { type: 'image', component: 'image', containerClass: 'aspect-square bg-muted rounded-lg overflow-hidden' },
  audio: { type: 'audio', component: 'audio', containerClass: 'w-full' },
  video: { type: 'video', component: 'video', containerClass: 'aspect-video bg-muted rounded-lg overflow-hidden' },
  timestamps: { type: 'timestamps', component: 'json', containerClass: 'font-mono text-sm' },
  artifacts: { type: 'artifacts', component: 'markdown', containerClass: 'border rounded-lg p-4' },
  analysis: { type: 'analysis', component: 'markdown', containerClass: 'prose max-w-none' },
};
