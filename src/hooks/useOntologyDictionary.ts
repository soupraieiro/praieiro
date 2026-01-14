import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OperationEntry {
  id: string;
  op_key: string;
  category: string;
  description: string;
  parent_key: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export interface OrphanOperation {
  event_id: string;
  idempotency_key: string;
  event_type: string;
  created_at: string;
  is_orphan: boolean;
}

export interface TelemetryData {
  op_key: string;
  category: string;
  description: string;
  event_count: number;
  total_zimbu: number;
}

export interface HealthLog {
  id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  message: string;
  source_component: string | null;
  metadata: unknown;
  is_resolved: boolean;
  resolved_at: string | null;
  satoshi_hash: string | null;
  created_at: string;
}

export function useOntologyDictionary() {
  const [dictionary, setDictionary] = useState<OperationEntry[]>([]);
  const [orphanOperations, setOrphanOperations] = useState<OrphanOperation[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryData[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDictionary = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('operation_dictionary')
        .select('*')
        .order('category', { ascending: true })
        .order('op_key', { ascending: true });

      if (error) throw error;
      setDictionary(data || []);
    } catch (err) {
      console.error('Error fetching dictionary:', err);
      setError('Erro ao carregar dicionário');
    }
  }, []);

  const fetchOrphanOperations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .rpc('detect_orphan_operations');

      if (error) throw error;
      setOrphanOperations((data || []).filter((op: OrphanOperation) => op.is_orphan));
    } catch (err) {
      console.error('Error detecting orphan operations:', err);
    }
  }, []);

  const fetchTelemetry = useCallback(async (category?: string, hours: number = 24) => {
    try {
      const { data, error } = await supabase
        .rpc('get_operation_telemetry', { 
          p_category: category || null, 
          p_hours: hours 
        });

      if (error) throw error;
      setTelemetry(data || []);
    } catch (err) {
      console.error('Error fetching telemetry:', err);
    }
  }, []);

  const fetchHealthLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('system_health_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHealthLogs((data || []) as HealthLog[]);
    } catch (err) {
      console.error('Error fetching health logs:', err);
    }
  }, []);

  const addOperationEntry = useCallback(async (
    opKey: string,
    category: string,
    description: string,
    parentKey?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('operation_dictionary')
        .insert({
          op_key: opKey,
          category,
          description,
          parent_key: parentKey || null,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Operação adicionada ao dicionário');
      await fetchDictionary();
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao adicionar operação';
      toast.error(message);
      throw err;
    }
  }, [fetchDictionary]);

  const updateOperationEntry = useCallback(async (
    id: string,
    updates: Partial<Pick<OperationEntry, 'description' | 'category' | 'is_active'>>
  ) => {
    try {
      const { error } = await supabase
        .from('operation_dictionary')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast.success('Operação atualizada');
      await fetchDictionary();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar operação';
      toast.error(message);
      throw err;
    }
  }, [fetchDictionary]);

  const deleteOperationEntry = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('operation_dictionary')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Operação removida');
      await fetchDictionary();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao remover operação';
      toast.error(message);
      throw err;
    }
  }, [fetchDictionary]);

  const logHealthAlert = useCallback(async (
    alertType: string,
    severity: 'info' | 'warning' | 'critical' | 'emergency',
    title: string,
    message: string,
    source?: string,
    metadata?: Record<string, unknown>
  ) => {
    try {
      const { data, error } = await supabase
        .rpc('log_health_alert', {
          p_alert_type: alertType,
          p_severity: severity,
          p_title: title,
          p_message: message,
          p_source: source || null,
          p_metadata: (metadata || {}) as Record<string, never>
        });

      if (error) throw error;
      await fetchHealthLogs();
      return data;
    } catch (err) {
      console.error('Error logging health alert:', err);
      throw err;
    }
  }, [fetchHealthLogs]);

  const resolveHealthLog = useCallback(async (logId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('system_health_logs')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id
        })
        .eq('id', logId);

      if (error) throw error;
      
      toast.success('Alerta resolvido');
      await fetchHealthLogs();
    } catch (err) {
      toast.error('Erro ao resolver alerta');
      throw err;
    }
  }, [fetchHealthLogs]);

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDictionary(),
        fetchOrphanOperations(),
        fetchTelemetry(),
        fetchHealthLogs()
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchDictionary, fetchOrphanOperations, fetchTelemetry, fetchHealthLogs]);

  // Realtime para alertas de saúde
  useEffect(() => {
    const channel = supabase
      .channel('health-logs-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_health_logs' },
        (payload) => {
          const newLog = payload.new as HealthLog;
          setHealthLogs(prev => [newLog, ...prev]);
          
          if (newLog.severity === 'critical' || newLog.severity === 'emergency') {
            toast.error(`🚨 ${newLog.title}`, { description: newLog.message });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Agrupar dicionário por categoria para árvore
  const categoryTree = dictionary.reduce((acc, entry) => {
    if (!acc[entry.category]) {
      acc[entry.category] = [];
    }
    acc[entry.category].push(entry);
    return acc;
  }, {} as Record<string, OperationEntry[]>);

  return {
    dictionary,
    categoryTree,
    orphanOperations,
    telemetry,
    healthLogs,
    loading,
    error,
    addOperationEntry,
    updateOperationEntry,
    deleteOperationEntry,
    logHealthAlert,
    resolveHealthLog,
    fetchTelemetry,
    refetch: fetchDictionary
  };
}
