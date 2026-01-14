import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface StripeAccountStatus {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements?: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
  };
}

interface StripeBalance {
  available: Array<{ amount: number; currency: string }>;
  pending: Array<{ amount: number; currency: string }>;
}

interface CreatePaymentResult {
  clientSecret: string;
  paymentIntentId: string;
  platformFee: number;
  vendorAmount: number;
}

interface UseStripeConnectResult {
  // Account management
  createVendorAccount: (email: string, businessName: string) => Promise<{ accountId: string; onboardingUrl: string } | null>;
  checkAccountStatus: (stripeAccountId: string) => Promise<StripeAccountStatus | null>;
  getLoginLink: (stripeAccountId: string) => Promise<string | null>;
  getBalance: (stripeAccountId: string) => Promise<StripeBalance | null>;
  
  // Payment processing
  createPaymentWithSplit: (params: {
    amount: number;
    vendorStripeAccountId: string;
    orderId: string;
    proximityVerified: boolean;
    platformFeePercent?: number;
  }) => Promise<CreatePaymentResult | null>;
  
  // State
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook para integração com Stripe Connect
 * Gerencia contas de vendedores e split de pagamentos
 */
export function useStripeConnect(): UseStripeConnectResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createVendorAccount = useCallback(async (
    email: string, 
    businessName: string
  ): Promise<{ accountId: string; onboardingUrl: string } | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("stripe-connect", {
        body: { action: "create_account", email, businessName },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      return {
        accountId: data.accountId,
        onboardingUrl: data.onboardingUrl,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao criar conta";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkAccountStatus = useCallback(async (
    stripeAccountId: string
  ): Promise<StripeAccountStatus | null> => {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("stripe-connect", {
        body: { action: "check_account_status", stripeAccountId },
      });

      if (invokeError || data?.error) return null;

      return {
        chargesEnabled: data.chargesEnabled,
        payoutsEnabled: data.payoutsEnabled,
        detailsSubmitted: data.detailsSubmitted,
        requirements: data.requirements,
      };
    } catch {
      return null;
    }
  }, []);

  const getLoginLink = useCallback(async (stripeAccountId: string): Promise<string | null> => {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("stripe-connect", {
        body: { action: "create_login_link", stripeAccountId },
      });

      if (invokeError || data?.error) return null;
      return data.url;
    } catch {
      return null;
    }
  }, []);

  const getBalance = useCallback(async (stripeAccountId: string): Promise<StripeBalance | null> => {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("stripe-connect", {
        body: { action: "get_balance", stripeAccountId },
      });

      if (invokeError || data?.error) return null;
      return { available: data.available, pending: data.pending };
    } catch {
      return null;
    }
  }, []);

  const createPaymentWithSplit = useCallback(async (params: {
    amount: number;
    vendorStripeAccountId: string;
    orderId: string;
    proximityVerified: boolean;
    platformFeePercent?: number;
  }): Promise<CreatePaymentResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate proximity before payment
      if (!params.proximityVerified) {
        throw new Error("Verificação de proximidade obrigatória");
      }

      const { data, error: invokeError } = await supabase.functions.invoke("stripe-connect", {
        body: { 
          action: "create_payment_with_split",
          ...params,
        },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      return {
        clientSecret: data.clientSecret,
        paymentIntentId: data.paymentIntentId,
        platformFee: data.platformFee,
        vendorAmount: data.vendorAmount,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro no pagamento";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    createVendorAccount,
    checkAccountStatus,
    getLoginLink,
    getBalance,
    createPaymentWithSplit,
    isLoading,
    error,
  };
}

/**
 * Formata valor em centavos para BRL
 */
export function formatCentsToBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}
