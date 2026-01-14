import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Shell, 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  CheckCircle2, 
  Hash,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Flame,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ConchasWalletProps {
  clientId?: string;
}

interface LedgerEventData {
  client_id?: string;
  operation?: string;
  previous_balance?: number;
  new_balance?: number;
  balance_delta?: number;
  total_earned?: number;
  total_spent?: number;
  timestamp?: string;
}

export function ConchasWallet({ clientId }: ConchasWalletProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Query para saldo de conchas
  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = useQuery({
    queryKey: ["client-conchas-wallet", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_conchas")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Query para histórico do ledger (eventos CONCHA_BALANCE_UPDATE)
  const { data: ledgerHistory, isLoading: ledgerLoading, refetch: refetchLedger } = useQuery({
    queryKey: ["concha-ledger-events", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ledger_events")
        .select("*")
        .eq("event_type", "CONCHA_BALANCE_UPDATE")
        .eq("actor_id", clientId)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchWallet(), refetchLedger()]);
    setIsRefreshing(false);
  };

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case "earn":
      case "transfer_in":
        return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case "spend":
      case "transfer_out":
        return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      case "mint":
        return <Sparkles className="h-4 w-4 text-amber-500" />;
      case "burn":
        return <Flame className="h-4 w-4 text-orange-500" />;
      default:
        return <Shell className="h-4 w-4 text-amber-500" />;
    }
  };

  const getOperationLabel = (operation: string) => {
    const labels: Record<string, string> = {
      earn: "Ganhou",
      spend: "Gastou",
      transfer_in: "Recebeu",
      transfer_out: "Enviou",
      mint: "Emissão",
      burn: "Queima",
      INSERT: "Criação",
      UPDATE: "Atualização"
    };
    return labels[operation] || operation;
  };

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case "earn":
      case "transfer_in":
      case "mint":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "spend":
      case "transfer_out":
      case "burn":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    }
  };

  const truncateHash = (hash: string | null) => {
    if (!hash) return "---";
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 6)}`;
  };

  if (!clientId) {
    return (
      <Card className="border-amber-500/20 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
        <CardContent className="p-6 text-center text-muted-foreground">
          <Shell className="h-12 w-12 mx-auto mb-3 text-amber-500/50" />
          <p>Faça login para ver sua carteira de Conchas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Card de Saldo */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-5" />
          <CardHeader className="pb-2 relative">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <Shell className="h-5 w-5" />
                Carteira de Conchas
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="relative">
            {walletLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-32" />
                <div className="flex gap-4">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-4xl font-bold text-amber-700 dark:text-amber-300">
                    {wallet?.balance || 0}
                  </span>
                  <span className="text-lg text-amber-600/70 dark:text-amber-400/70">
                    conchas
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-muted-foreground">Ganhou:</span>
                    <span className="font-medium text-green-600">
                      {wallet?.total_earned || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <span className="text-muted-foreground">Gastou:</span>
                    <span className="font-medium text-red-600">
                      {wallet?.total_spent || 0}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-amber-200/50 dark:border-amber-800/50">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">
                    Protegido pelo Protocolo Satoshi
                  </span>
                  <Badge variant="outline" className="ml-auto text-xs bg-green-500/10 text-green-600 border-green-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    SHA-256
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Histórico do Ledger */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Hash className="h-4 w-4 text-muted-foreground" />
              Histórico do Ledger
              <Badge variant="secondary" className="ml-auto text-xs">
                {ledgerHistory?.length || 0} eventos
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ledgerLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !ledgerHistory?.length ? (
              <div className="p-6 text-center text-muted-foreground">
                <Shell className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma transação de conchas ainda</p>
              </div>
            ) : (
              <ScrollArea className="h-[320px]">
                <div className="divide-y">
                  {ledgerHistory.map((event, index) => {
                    const eventData = event.event_data as LedgerEventData;
                    const operation = eventData?.operation || "UPDATE";
                    const balanceDelta = eventData?.balance_delta || 0;
                    const newBalance = eventData?.new_balance || 0;

                    return (
                      <motion.div
                        key={event.event_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              {getOperationIcon(operation)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${getOperationColor(operation)}`}
                                >
                                  {getOperationLabel(operation)}
                                </Badge>
                                <span className={`font-medium ${
                                  balanceDelta > 0 ? "text-green-600" : 
                                  balanceDelta < 0 ? "text-red-600" : "text-muted-foreground"
                                }`}>
                                  {balanceDelta > 0 ? "+" : ""}{balanceDelta}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Saldo: {newBalance} conchas
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(event.created_at), "dd/MM HH:mm", { locale: ptBR })}
                            </p>
                            <div className="flex items-center gap-1 mt-1 justify-end">
                              <Hash className="h-3 w-3 text-muted-foreground/50" />
                              <code className="text-[10px] text-muted-foreground/70 font-mono">
                                {truncateHash(event.event_checksum)}
                              </code>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
