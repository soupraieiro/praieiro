import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shell, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ConchasBalanceProps {
  clientId: string;
}

export function ConchasBalance({ clientId }: ConchasBalanceProps) {
  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalance();
  }, [clientId]);

  const fetchBalance = async () => {
    const { data } = await supabase
      .from("client_conchas")
      .select("balance, total_earned")
      .eq("client_id", clientId)
      .single();

    if (data) {
      setBalance(data.balance);
      setTotalEarned(data.total_earned);
    }
    setLoading(false);
  };

  const formatCurrency = (conchas: number) => {
    return (conchas * 0.1).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  if (loading) {
    return (
      <div className="rounded-xl border bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-4">
        <div className="animate-pulse h-16 bg-muted/30 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
            <Shell className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">Saldo em Conchas</h3>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    A cada R$ 10 em compras, você ganha 1 Concha que equivale a R$ 0,10.
                    Durante a fase piloto, as conchas são acumuladas mas não podem ser utilizadas.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-sm text-muted-foreground">
              Ganhe conchas a cada compra!
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {balance}
            </span>
            <span className="text-lg text-muted-foreground">conchas</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Equivalente a {formatCurrency(balance)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total acumulado</p>
          <p className="font-medium text-amber-600 dark:text-amber-400">
            {totalEarned} conchas
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-amber-100/50 dark:bg-amber-900/20 p-3">
        <p className="text-xs text-amber-700 dark:text-amber-300 text-center">
          🐚 Fase Piloto: Conchas estão sendo acumuladas e poderão ser utilizadas após a estruturação completa da plataforma.
        </p>
      </div>
    </div>
  );
}