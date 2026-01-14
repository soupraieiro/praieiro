/**
 * HOOK CONSTITUCIONAL: GOVERNANÇA
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * AXIOMA A3: Governança ≠ Identidade
 * AXIOMA A9: profiles.id === auth.users.id (identidade soberana)
 * PROIBIDO: user_id (usar profile_id)
 * 
 * Gerencia estado de fases, taxas e métricas do sistema
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GovernanceState {
  id: string;
  current_phase: number;
  governance_frozen: boolean;
  sentinel_chat_active: boolean;
  base_fixed_fee: number;
  linear_meter_fee: number;
  dynamic_min_fee: number;
  dynamic_max_fee: number;
  ads_active: boolean;
  withdrawal_blocked: boolean;
  satoshi_hash: string | null;
  st_safe_mode: boolean;
  safe_mode_activated_at: string | null;
  safe_mode_reason: string | null;
}

interface MassMetrics {
  total_users: number;
  total_clientes: number;
  total_praieiros: number;
  total_admins: number;
  total_shells_distributed: number;
  current_phase: number;
  projected_revenue: number;
  alert_message: string | null;
}

interface UseGovernanceResult {
  governance: GovernanceState | null;
  metrics: MassMetrics | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  calculateFee: (profileId: string, amount: number, linearMeters?: number) => Promise<{
    fee: number;
    phase: number;
    god_mode: boolean;
    satoshi_hash: string;
  } | null>;
  isPhaseActive: (phase: number) => boolean;
  canWithdraw: () => boolean;
  isSentinelActive: () => boolean;
}

export function useGovernance(): UseGovernanceResult {
  const [governance, setGovernance] = useState<GovernanceState | null>(null);
  const [metrics, setMetrics] = useState<MassMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGovernance = useCallback(async () => {
    try {
      const { data, error: govError } = await supabase
        .from('system_governance')
        .select('*')
        .limit(1)
        .single();

      if (govError) throw govError;
      setGovernance(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    }
  }, []);

  const loadMetrics = useCallback(async () => {
    try {
      const { data, error: metricsError } = await supabase.rpc('get_mass_metrics');
      if (metricsError) throw metricsError;
      if (data) setMetrics(data as unknown as MassMetrics);
    } catch (err) {
      console.error('Erro ao carregar métricas:', err);
    }
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadGovernance(), loadMetrics()]);
    setLoading(false);
  }, [loadGovernance, loadMetrics]);

  useEffect(() => {
    refreshData();

    // Realtime subscription para mudanças de governança
    const channel = supabase
      .channel('governance-hook')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'system_governance' },
        () => refreshData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshData]);

  // CONSTITUTIONAL: profile.id === auth.users.id (identidade soberana)
  // Nota: RPC ainda usa p_user_id por compatibilidade de banco
  const calculateFee = useCallback(async (
    profileId: string, 
    amount: number, 
    linearMeters: number = 0
  ): Promise<{ fee: number; phase: number; god_mode: boolean; satoshi_hash: string } | null> => {
    try {
      const { data, error } = await supabase.rpc('calculate_transaction_fee', {
        p_user_id: profileId,
        p_transaction_amount: amount,
        p_linear_meters: linearMeters
      });

      if (error) throw error;
      return data as unknown as { fee: number; phase: number; god_mode: boolean; satoshi_hash: string };
    } catch (err) {
      console.error('Erro ao calcular taxa:', err);
      return null;
    }
  }, []);

  const isPhaseActive = useCallback((phase: number) => {
    return governance?.current_phase === phase;
  }, [governance]);

  const canWithdraw = useCallback(() => {
    return !governance?.withdrawal_blocked;
  }, [governance]);

  const isSentinelActive = useCallback(() => {
    return governance?.sentinel_chat_active || false;
  }, [governance]);

  return {
    governance,
    metrics,
    loading,
    error,
    refreshData,
    calculateFee,
    isPhaseActive,
    canWithdraw,
    isSentinelActive
  };
}
