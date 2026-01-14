import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CheckoutParams {
  orderId: string;
  vendorLatitude?: number | null;
  vendorLongitude?: number | null;
  clientLatitude?: number | null;
  clientLongitude?: number | null;
}

interface CheckoutResponse {
  url: string;
  sessionId: string;
  distanceMeters: number;
  distanceFee: number;
  serviceFee: number;
  productTotal: number;
  grandTotal: number;
}

export function useOrderPayment() {
  const [isProcessing, setIsProcessing] = useState(false);

  const initiateCheckout = async (params: CheckoutParams): Promise<CheckoutResponse | null> => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-order-checkout", {
        body: params,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data as CheckoutResponse;
    } catch (error) {
      console.error("Error initiating checkout:", error);
      toast.error("Erro ao iniciar pagamento");
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const verifyPayment = async (orderId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-order-payment", {
        body: { orderId },
      });

      if (error) {
        console.error("Error verifying payment:", error);
        return false;
      }

      return data?.paid === true;
    } catch (error) {
      console.error("Error verifying payment:", error);
      return false;
    }
  };

  const redirectToCheckout = async (params: CheckoutParams): Promise<void> => {
    const result = await initiateCheckout(params);
    if (result?.url) {
      window.open(result.url, "_blank");
    }
  };

  return {
    isProcessing,
    initiateCheckout,
    verifyPayment,
    redirectToCheckout,
  };
}
