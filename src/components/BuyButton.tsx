import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// Component for handling purchases with auth check

interface BuyButtonProps {
  amount: number;
  productName?: string;
  productDescription?: string;
  className?: string;
  children?: React.ReactNode;
}

export function BuyButton({
  amount,
  productName = "Compra Praieiro",
  productDescription,
  className,
  children,
}: BuyButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBuy = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para comprar");
      navigate("/auth");
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { 
          amount, 
          productName, 
          productDescription 
        },
      });

      if (error) throw error;

      if (data?.url) {
        toast.success("Redirecionando para pagamento...");
        window.open(data.url, "_blank");
      } else {
        throw new Error("URL de pagamento não recebida");
      }
    } catch (error) {
      console.error("Erro ao processar compra:", error);
      toast.error("Erro ao processar pagamento", {
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      onClick={handleBuy}
      disabled={isProcessing}
      className={className}
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Processando...
        </>
      ) : !user ? (
        <>
          <Lock className="h-4 w-4 mr-2" />
          {children || "Faça login para comprar"}
        </>
      ) : (
        <>
          <CreditCard className="h-4 w-4 mr-2" />
          {children || `Comprar R$ ${amount.toFixed(2).replace(".", ",")}`}
        </>
      )}
    </Button>
  );
}
