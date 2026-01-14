/**
 * HOOK DE GAMIFICAÇÃO - DAILY STREAK
 * Registra acessos diários e concede Conchas a cada 10 acessos
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DailyStreakResult {
  new_access: boolean;
  daily_count: number;
  shell_bonus: number;
  total_shells: number;
}

interface UseDailyStreakResult {
  dailyCount: number;
  totalShells: number;
  progressToNextShell: number;
  loading: boolean;
  registerAccess: () => Promise<void>;
}

export function useDailyStreak(): UseDailyStreakResult {
  const [dailyCount, setDailyCount] = useState(0);
  const [totalShells, setTotalShells] = useState(0);
  const [loading, setLoading] = useState(true);

  const registerAccess = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('register_daily_access', {
        p_user_id: user.id
      });

      if (error) throw error;

      const result = data as unknown as DailyStreakResult;
      
      setDailyCount(result?.daily_count || 0);
      setTotalShells(result?.total_shells || 0);

      if (result.new_access && result.shell_bonus > 0) {
        toast.success('🐚 Você ganhou uma Concha!', {
          description: `Total: ${result.total_shells} Conchas`,
          duration: 5000
        });
      }
    } catch (err) {
      console.error('Erro ao registrar acesso:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    registerAccess();
  }, [registerAccess]);

  const progressToNextShell = (dailyCount % 10) * 10;

  return {
    dailyCount,
    totalShells,
    progressToNextShell,
    loading,
    registerAccess
  };
}
