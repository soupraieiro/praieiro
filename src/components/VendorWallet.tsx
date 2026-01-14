import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet, ArrowUpFromLine, RefreshCw, History, Loader2, TrendingUp, TrendingDown, QrCode } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function VendorWallet() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Buscar dados do vendedor via profile
  const { data: vendor } = useQuery({
    queryKey: ["vendor", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      // CORRECT: profiles.id = auth.users.id (identidade soberana)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError || !profile) return null;
      
      // Check if vendor exists
      const { data: vendorData, error } = await supabase
        .from("vendors")
        .select("profile_id")
        .eq("profile_id", profile.id)
        .maybeSingle();
      if (error) throw error;
      return vendorData ? { id: profile.id } : null;
    },
    enabled: !!user?.id,
  });

  // Buscar saldo da carteira
  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = useQuery({
    queryKey: ["vendor-wallet", vendor?.id],
    queryFn: async () => {
      if (!vendor?.id) return null;
      const { data, error } = await supabase
        .from("vendor_wallets")
        .select("*")
        .eq("vendor_id", vendor.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!vendor?.id,
  });

  // Buscar histórico de transações
  const { data: transactions } = useQuery({
    queryKey: ["vendor-transactions", vendor?.id],
    queryFn: async () => {
      if (!vendor?.id) return [];
      const { data, error } = await supabase
        .from("vendor_transactions")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!vendor?.id,
  });

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Digite um valor válido");
      return;
    }

    const currentBalance = Number(wallet?.balance) || 0;
    if (amount > currentBalance) {
      toast.error("Saldo insuficiente");
      return;
    }

    if (!pixKey.trim()) {
      toast.error("Informe sua chave PIX");
      return;
    }

    if (!pixKeyType) {
      toast.error("Selecione o tipo de chave PIX");
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-pix-withdrawal', {
        body: { amount, pixKey, pixKeyType }
      });

      if (error) throw error;

      toast.success(data.message || `Saque PIX de R$ ${amount.toFixed(2)} solicitado!`, {
        description: "O valor será transferido em até 2 dias úteis.",
      });
      
      setWithdrawAmount("");
      setPixKey("");
      setPixKeyType("");
      setIsWithdrawOpen(false);
      refetchWallet();
      queryClient.invalidateQueries({ queryKey: ["vendor-transactions"] });
    } catch (error) {
      console.error("Erro ao solicitar saque:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao processar saque");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "sale":
      case "deposit":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "withdrawal":
      case "refund":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Wallet className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case "sale": return "Venda";
      case "deposit": return "Depósito";
      case "withdrawal": return "Saque PIX";
      case "refund": return "Reembolso";
      case "adjustment": return "Ajuste";
      default: return type;
    }
  };

  if (!user) {
    return null;
  }

  const balance = Number(wallet?.balance) || 0;
  const totalReceived = Number(wallet?.total_received) || 0;
  const totalWithdrawn = Number(wallet?.total_withdrawn) || 0;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg text-primary">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Minha Carteira
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetchWallet()}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${walletLoading ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {walletLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Saldo Disponível */}
            <div className="rounded-xl bg-gradient-to-r from-green-500/20 to-green-500/10 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-md">
                  <span className="text-2xl font-bold">R$</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Saldo Disponível</p>
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(balance)}</p>
                </div>
              </div>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Recebido</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(totalReceived)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Sacado</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(totalWithdrawn)}</p>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="grid grid-cols-2 gap-2">
              <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-green-600 hover:bg-green-700">
                    <QrCode className="h-4 w-4" />
                    Sacar PIX
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <QrCode className="h-5 w-5 text-green-600" />
                      Saque via PIX
                    </DialogTitle>
                    <DialogDescription>
                      Saldo disponível: {formatCurrency(balance)}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="pixKeyType">Tipo de chave PIX</Label>
                      <Select value={pixKeyType} onValueChange={setPixKeyType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cpf">CPF</SelectItem>
                          <SelectItem value="phone">Telefone</SelectItem>
                          <SelectItem value="email">E-mail</SelectItem>
                          <SelectItem value="random">Chave aleatória</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="pixKey">Chave PIX</Label>
                      <Input
                        id="pixKey"
                        placeholder="Digite sua chave PIX"
                        value={pixKey}
                        onChange={(e) => setPixKey(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="amount">Valor do saque</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                          R$
                        </span>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="0,00"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          className="pl-10 text-lg"
                          min="0"
                          max={balance}
                          step="0.01"
                        />
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setWithdrawAmount(String(balance))}
                    >
                      Sacar tudo ({formatCurrency(balance)})
                    </Button>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsWithdrawOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleWithdraw} 
                      disabled={isProcessing}
                      className="gap-2 bg-green-600 hover:bg-green-700"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <QrCode className="h-4 w-4" />
                      )}
                      {isProcessing ? "Processando..." : "Confirmar PIX"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <History className="h-4 w-4" />
                    Histórico
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <History className="h-5 w-5 text-primary" />
                      Histórico de Transações
                    </DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-[400px] pr-4">
                    {transactions && transactions.length > 0 ? (
                      <div className="space-y-2">
                        {transactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div className="flex items-center gap-3">
                              {getTransactionIcon(tx.type)}
                              <div>
                                <p className="text-sm font-medium">
                                  {tx.description || getTransactionLabel(tx.type)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(tx.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </p>
                              </div>
                            </div>
                            <span className={`font-bold ${
                              tx.type === "sale" || tx.type === "deposit" 
                                ? "text-green-600" 
                                : "text-red-600"
                            }`}>
                              {tx.type === "sale" || tx.type === "deposit" ? "+" : "-"}
                              {formatCurrency(Math.abs(Number(tx.amount)))}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Nenhuma transação registrada
                      </p>
                    )}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>

            {/* Info */}
            <p className="text-center text-xs text-muted-foreground">
              💰 Saques são processados em até 2 dias úteis
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
