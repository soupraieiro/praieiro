import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  AIProvider, 
  AICapabilityType, 
  AIProviderFormData, 
  LegacyAIFormat, 
  migrateLegacyFormat,
  ProviderStatus,
  LatencyProfile,
  OutputType,
  OutputCategory,
  AICapabilities,
  ProviderMetadata,
} from '@/types/aiProvider';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

interface UseAIProvidersResult {
  providers: AIProvider[];
  capabilityTypes: AICapabilityType[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createProvider: (data: AIProviderFormData) => Promise<AIProvider | null>;
  updateProvider: (id: string, data: Partial<AIProviderFormData>) => Promise<boolean>;
  deleteProvider: (id: string) => Promise<boolean>;
  importLegacyFormat: (legacy: LegacyAIFormat) => Promise<AIProvider | null>;
  setDefaultProvider: (id: string) => Promise<boolean>;
  getProviderByCapability: (capability: string) => AIProvider[];
  getActiveProviders: () => AIProvider[];
}

export function useAIProviders(): UseAIProvidersResult {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [capabilityTypes, setCapabilityTypes] = useState<AICapabilityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para gerar Satoshi Hash
  const generateSatoshiHash = (data: unknown): string => {
    const str = JSON.stringify(data) + Date.now();
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `satoshi_${Math.abs(hash).toString(16)}_${Date.now().toString(36)}`;
  };

  // Carregar provedores e tipos de capacidade
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [providersRes, capabilitiesRes] = await Promise.all([
        supabase
          .from('ai_providers')
          .select('*')
          .order('priority', { ascending: true }),
        supabase
          .from('ai_capability_types')
          .select('*')
          .eq('is_active', true)
          .order('capability_key'),
      ]);

      if (providersRes.error) throw providersRes.error;
      if (capabilitiesRes.error) throw capabilitiesRes.error;

      // Mapear para tipos corretos com casting seguro
      const mappedProviders = (providersRes.data || []).map((p) => ({
        ...p,
        status: p.status as ProviderStatus,
        latency_profile: p.latency_profile as LatencyProfile,
        capabilities: (p.capabilities || {}) as AICapabilities,
        output_types: (p.output_types || ['text']) as OutputType[],
        metadata: (p.metadata || {}) as ProviderMetadata,
        legacy_format: p.legacy_format as unknown as LegacyAIFormat | null,
      })) as AIProvider[];

      const mappedCapabilities = (capabilitiesRes.data || []).map((c) => ({
        ...c,
        output_category: c.output_category as OutputCategory,
      })) as AICapabilityType[];

      setProviders(mappedProviders);
      setCapabilityTypes(mappedCapabilities);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar provedores';
      setError(message);
      console.error('[useAIProviders] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Criar novo provedor
  const createProvider = async (data: AIProviderFormData): Promise<AIProvider | null> => {
    try {
      // Converter capacidades do formulário para estrutura JSONB
      const capabilities: Record<string, unknown> = {};
      if (data.capabilities.text) capabilities.text = { enabled: true, reasoning: 'medium' };
      if (data.capabilities.vision) capabilities.vision = { enabled: true };
      if (data.capabilities.image) capabilities.image = { generation: 'high' };
      if (data.capabilities.audio) capabilities.audio = { enabled: true };
      if (data.capabilities.tools) capabilities.tools = { function_calling: true };
      if (data.capabilities.video) capabilities.video = { enabled: true };
      if (data.capabilities.code) capabilities.code = { enabled: true };

      const satoshiHash = generateSatoshiHash({ action: 'create_provider', data });

      const insertData = {
        provider_id: data.provider_id,
        provider_name: data.provider_name,
        provider_company: data.provider_company,
        api_key_ref: data.api_key_ref,
        status: data.status,
        capabilities: capabilities as unknown as Json,
        output_types: data.output_types,
        latency_profile: data.latency_profile,
        priority: data.priority,
        max_tokens: data.max_tokens,
        satoshi_hash: satoshiHash,
      };

      const { data: newProvider, error } = await supabase
        .from('ai_providers')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      toast.success(`Provedor ${data.provider_name} criado com sucesso`);
      await fetchData();
      return newProvider as unknown as AIProvider;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar provedor';
      toast.error(message);
      console.error('[useAIProviders] Erro ao criar:', err);
      return null;
    }
  };

  // Atualizar provedor existente
  const updateProvider = async (id: string, data: Partial<AIProviderFormData>): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = { ...data };

      // Se capacidades foram enviadas no formato do formulário, converter
      if (data.capabilities && typeof data.capabilities === 'object') {
        const capabilities: Record<string, unknown> = {};
        const caps = data.capabilities as AIProviderFormData['capabilities'];
        if (caps.text) capabilities.text = { enabled: true, reasoning: 'medium' };
        if (caps.vision) capabilities.vision = { enabled: true };
        if (caps.image) capabilities.image = { generation: 'high' };
        if (caps.audio) capabilities.audio = { enabled: true };
        if (caps.tools) capabilities.tools = { function_calling: true };
        if (caps.video) capabilities.video = { enabled: true };
        if (caps.code) capabilities.code = { enabled: true };
        updateData.capabilities = capabilities;
      }

      updateData.satoshi_hash = generateSatoshiHash({ action: 'update_provider', id, data });

      const { error } = await supabase
        .from('ai_providers')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast.success('Provedor atualizado com sucesso');
      await fetchData();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar provedor';
      toast.error(message);
      console.error('[useAIProviders] Erro ao atualizar:', err);
      return false;
    }
  };

  // Excluir provedor
  const deleteProvider = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('ai_providers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Provedor removido com sucesso');
      await fetchData();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover provedor';
      toast.error(message);
      console.error('[useAIProviders] Erro ao remover:', err);
      return false;
    }
  };

  // Importar formato legado
  const importLegacyFormat = async (legacy: LegacyAIFormat): Promise<AIProvider | null> => {
    try {
      const migrated = migrateLegacyFormat(legacy);
      
      // Gerar provider_id a partir do nome
      const providerId = legacy.ia_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      const satoshiHash = generateSatoshiHash({ action: 'import_legacy', legacy });

      const insertData = {
        provider_id: providerId,
        provider_name: migrated.provider_name || legacy.ia_name,
        provider_company: 'Unknown',
        api_key_ref: migrated.api_key_ref || legacy.api_key,
        status: 'active',
        capabilities: (migrated.capabilities || {}) as unknown as Json,
        output_types: ['text'],
        latency_profile: 'medium',
        legacy_format: legacy as unknown as Json,
        satoshi_hash: satoshiHash,
      };

      const { data: newProvider, error } = await supabase
        .from('ai_providers')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      toast.success(`Provedor ${legacy.ia_name} importado com sucesso (formato legado)`);
      await fetchData();
      return newProvider as unknown as AIProvider;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao importar formato legado';
      toast.error(message);
      console.error('[useAIProviders] Erro ao importar legado:', err);
      return null;
    }
  };

  // Definir provedor padrão
  const setDefaultProvider = async (id: string): Promise<boolean> => {
    try {
      // Primeiro, remover default de todos
      await supabase
        .from('ai_providers')
        .update({ is_default: false })
        .neq('id', id);

      // Depois, definir o novo default
      const { error } = await supabase
        .from('ai_providers')
        .update({ 
          is_default: true,
          satoshi_hash: generateSatoshiHash({ action: 'set_default', id }),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Provedor padrão atualizado');
      await fetchData();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao definir provedor padrão';
      toast.error(message);
      return false;
    }
  };

  // Obter provedores por capacidade
  const getProviderByCapability = (capability: string): AIProvider[] => {
    return providers.filter((p) => {
      const caps = p.capabilities;
      switch (capability) {
        case 'text':
          return caps.text?.enabled !== false && (caps.text?.reasoning || caps.text?.creative);
        case 'vision':
          return caps.vision?.enabled;
        case 'image':
          return caps.image?.enabled || caps.image?.generation;
        case 'audio':
          return caps.audio?.enabled || caps.audio?.transcription || caps.audio?.synthesis;
        case 'tools':
          return caps.tools?.enabled || caps.tools?.function_calling;
        case 'video':
          return caps.video?.enabled;
        case 'code':
          return caps.code?.enabled;
        default:
          return false;
      }
    });
  };

  // Obter provedores ativos
  const getActiveProviders = (): AIProvider[] => {
    return providers.filter((p) => p.status === 'active');
  };

  return {
    providers,
    capabilityTypes,
    loading,
    error,
    refetch: fetchData,
    createProvider,
    updateProvider,
    deleteProvider,
    importLegacyFormat,
    setDefaultProvider,
    getProviderByCapability,
    getActiveProviders,
  };
}
