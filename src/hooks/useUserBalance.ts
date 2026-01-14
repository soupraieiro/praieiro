import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface BalanceResult {
  balance: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook para obter o saldo do usuário usando a função RPC get_user_balance
 * Calcula o saldo diretamente do ledger (entradas - saídas)
 */
export function useUserBalance(currency: string = "BRL"): BalanceResult {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      // CORRECT: profiles.id = auth.users.id (identidade soberana)
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const {
    data: balance,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["user-balance", profile?.id, currency],
    queryFn: async () => {
      if (!profile?.id) return 0;
      
      const { data, error } = await supabase.rpc("get_user_balance", {
        p_profile_id: profile.id,
        p_currency: currency,
      });

      if (error) {
        console.error("Erro ao buscar saldo:", error);
        throw error;
      }

      return Number(data) || 0;
    },
    enabled: !!profile?.id,
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  return {
    balance: balance ?? 0,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Hook para validar saldo antes de checkout
 */
export function useValidateCheckoutBalance() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      // CORRECT: profiles.id = auth.users.id (identidade soberana)
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const validateBalance = async (
    amount: number,
    currency: string = "BRL"
  ): Promise<boolean> => {
    if (!profile?.id) return false;

    const { data, error } = await supabase.rpc("validate_checkout_balance", {
      p_profile_id: profile.id,
      p_amount: amount,
      p_currency: currency,
    });

    if (error) {
      console.error("Erro ao validar saldo:", error);
      return false;
    }

    return Boolean(data);
  };

  return { validateBalance, profileId: profile?.id };
}
