import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  Fingerprint,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TransactionSecurity {
  id: string;
  profile_id: string;
  entry_type: string;
  amount: number;
  balance_after: number;
  currency: string;
  description: string | null;
  status: string;
  signature_hash: string | null;
  created_at: string;
  hash_display: string | null;
}

export function AssetSecurityPanel() {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  // Buscar profile_id do usuário
  const { data: profile } = useQuery({
    queryKey: ["profile-id", user?.id],
    queryFn: async () => {
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

  // Buscar últimas transações com hash de segurança
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transaction-security", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("ledger")
        .select("id, profile_id, entry_type, amount, balance_after, currency, description, status, signature_hash, created_at")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      
      // Formatar hash_display
      return (data || []).map(tx => ({
        ...tx,
        hash_display: tx.signature_hash 
          ? `${tx.signature_hash.slice(0, 8)}...${tx.signature_hash.slice(-8)}`
          : null
      })) as TransactionSecurity[];
    },
    enabled: !!profile?.id,
  });

  const lastTransaction = transactions?.[0];

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "confirmed":
        return {
          icon: CheckCircle2,
          label: "Confirmado",
          color: "text-green-600",
          bgColor: "bg-green-100",
          description: "Transação verificada e registrada no ledger",
        };
      case "audited":
        return {
          icon: Shield,
          label: "Auditado",
          color: "text-blue-600",
          bgColor: "bg-blue-100",
          description: "Transação auditada e certificada",
        };
      case "pending":
        return {
          icon: Clock,
          label: "Pendente",
          color: "text-yellow-600",
          bgColor: "bg-yellow-100",
          description: "Aguardando confirmação",
        };
      case "failed":
        return {
          icon: AlertTriangle,
          label: "Falhou",
          color: "text-red-600",
          bgColor: "bg-red-100",
          description: "Transação não processada",
        };
      default:
        return {
          icon: Clock,
          label: status,
          color: "text-gray-600",
          bgColor: "bg-gray-100",
          description: "Status desconhecido",
        };
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast.success("Hash copiado para a área de transferência");
  };

  const formatCurrency = (value: number, currency: string) => {
    if (currency === "CONCHA") {
      return `${value} 🐚`;
    }
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  if (!user) return null;

  return (
    <Card className="border-2 border-emerald-500/20 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-emerald-700 dark:text-emerald-400">
          <Shield className="h-5 w-5" />
          Segurança de Ativos
          <Badge variant="outline" className="ml-auto text-xs border-emerald-500/50 text-emerald-600">
            <Lock className="h-3 w-3 mr-1" />
            Fintech Grade
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted rounded-lg" />
            <div className="h-8 bg-muted rounded-lg w-2/3" />
          </div>
        ) : lastTransaction ? (
          <>
            {/* Status da Última Transação */}
            <div className="rounded-xl bg-white/80 dark:bg-gray-900/50 border border-emerald-200 dark:border-emerald-800 p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Última Transação
                  </p>
                  <p className="font-semibold">
                    {lastTransaction.description || lastTransaction.entry_type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(lastTransaction.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    lastTransaction.amount >= 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {lastTransaction.amount >= 0 ? "+" : ""}
                    {formatCurrency(lastTransaction.amount, lastTransaction.currency)}
                  </p>
                  {(() => {
                    const statusInfo = getStatusInfo(lastTransaction.status);
                    const StatusIcon = statusInfo.icon;
                    return (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border-0 cursor-help`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{statusInfo.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Hash de Verificação */}
            {lastTransaction.signature_hash && (
              <div className="rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Fingerprint className="h-4 w-4 text-emerald-400" />
                  <p className="text-sm font-medium text-emerald-400">
                    Hash de Verificação SHA-256
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <code className="font-mono text-sm text-gray-300 truncate flex-1">
                    {lastTransaction.hash_display}
                  </code>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
                          onClick={() => copyHash(lastTransaction.signature_hash!)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copiar hash completo</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Este hash prova a integridade da sua transação no ledger
                </p>
              </div>
            )}

            {/* Histórico Expandível */}
            {transactions && transactions.length > 1 && (
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between text-muted-foreground hover:text-foreground"
                  >
                    <span className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Ver histórico de segurança
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                  {transactions.slice(1).map((tx) => {
                    const statusInfo = getStatusInfo(tx.status);
                    const StatusIcon = statusInfo.icon;
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800"
                      >
                        <div className="flex items-center gap-3">
                          <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                          <div>
                            <p className="text-sm font-medium truncate max-w-[150px]">
                              {tx.description || tx.entry_type}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.created_at), "dd/MM HH:mm")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${
                            tx.amount >= 0 ? "text-green-600" : "text-red-600"
                          }`}>
                            {tx.amount >= 0 ? "+" : ""}
                            {formatCurrency(tx.amount, tx.currency)}
                          </p>
                          {tx.hash_display && (
                            <code className="text-[10px] text-gray-400 font-mono">
                              {tx.hash_display}
                            </code>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Mensagem Educativa */}
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3">
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                <Shield className="h-3 w-3 inline mr-1" />
                <strong>Proteção Fintech:</strong> Cada transação é selada com um hash criptográfico 
                único (SHA-256) que garante a imutabilidade do seu histórico financeiro. 
                Seu dinheiro digital é protegido por padrões bancários de segurança.
              </p>
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma transação registrada</p>
            <p className="text-xs mt-1">
              Suas transações aparecerão aqui com verificação de segurança
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
