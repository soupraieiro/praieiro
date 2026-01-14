import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { 
  Wallet, 
  ArrowDownToLine, 
  ArrowUpFromLine,
  History, 
  Loader2,
  CreditCard,
  QrCode,
  Sparkles,
  Banknote,
  CheckCircle2,
  Radio,
  WifiOff,
  Send,
  Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useClickSound } from "@/hooks/useClickSound";
import { TransactionStatusBadge } from "@/components/TransactionStatusBadge";
import { TransactionHashDisplay } from "@/components/TransactionHashDisplay";
import { WalletTransferDialog } from "@/components/WalletTransferDialog";
import { WalletPixKeys } from "@/components/WalletPixKeys";

type PaymentMethod = "pix" | "card";

// Crypto/Forex types
interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  currency: string;
}

interface MarketPricesResponse {
  crypto: CryptoPrice[];
  forex: CryptoPrice[];
  lastUpdate: string;
  isLive: boolean;
  sources?: string[];
}

const FALLBACK_DATA: MarketPricesResponse = {
  crypto: [
    { symbol: "BTC", name: "Bitcoin", price: 90236, change24h: 0.3, currency: "USD" },
    { symbol: "SOL", name: "Solana", price: 138.73, change24h: 0.3, currency: "USD" },
    { symbol: "BNB", name: "BNB", price: 889.42, change24h: -0.9, currency: "USD" },
    { symbol: "ADA", name: "Cardano", price: 0.3932, change24h: -0.5, currency: "USD" },
    { symbol: "XRP", name: "Ripple", price: 0.3932, change24h: -0.6, currency: "USD" },
  ],
  forex: [
    { symbol: "USD/BRL", name: "Dólar", price: 6.05, change24h: 0, currency: "BRL" },
    { symbol: "EUR/BRL", name: "Euro", price: 6.35, change24h: 0, currency: "BRL" },
    { symbol: "GBP/BRL", name: "Libra", price: 7.65, change24h: 0, currency: "BRL" },
    { symbol: "JPY/BRL", name: "Iene", price: 0.039, change24h: 0, currency: "BRL" },
    { symbol: "CNY/BRL", name: "Yuan", price: 0.83, change24h: 0, currency: "BRL" },
  ],
  lastUpdate: new Date().toISOString(),
  isLive: false,
  sources: ["Fallback"],
};

async function fetchMarketPrices(): Promise<MarketPricesResponse> {
  const { data, error } = await supabase.functions.invoke('get-market-prices');
  if (error) throw error;
  return data as MarketPricesResponse;
}

export function PraieiroWallet() {
  const { user } = useAuth();
  const { playClick, playSuccess, playError } = useClickSound();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Fetch market prices
  const { data: marketData } = useQuery({
    queryKey: ['market-prices'],
    queryFn: fetchMarketPrices,
    refetchInterval: 30000,
    staleTime: 25000,
    retry: 2,
    placeholderData: FALLBACK_DATA,
  });

  const prices = marketData || FALLBACK_DATA;
  const isLive = marketData?.isLive ?? false;
  const sources = marketData?.sources || ['CoinGecko'];

  useEffect(() => {
    const payment = searchParams.get("payment");
    const amount = searchParams.get("amount");
    
    if (payment === "success" && amount) {
      playSuccess();
      toast.success(`Pagamento de R$ ${parseFloat(amount).toFixed(2)} confirmado!`, {
        description: "Seu saldo será atualizado em instantes.",
        icon: <Sparkles className="h-4 w-4 text-yellow-500" />,
      });
      searchParams.delete("payment");
      searchParams.delete("amount");
      setSearchParams(searchParams);
    } else if (payment === "cancelled") {
      toast.info("Pagamento cancelado", {
        description: "Você pode tentar novamente quando quiser.",
      });
      searchParams.delete("payment");
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams, playSuccess]);

  const { data: client } = useQuery({
    queryKey: ["client", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      // CORRECT: profiles.id = auth.users.id (identidade soberana)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError || !profile) return null;
      
      const { data: clientData, error } = await supabase
        .from("clients")
        .select("profile_id")
        .eq("profile_id", profile.id)
        .maybeSingle();
      if (error) throw error;
      return clientData ? { id: profile.id } : null;
    },
    enabled: !!user?.id,
  });

  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = useQuery({
    queryKey: ["client-wallet", client?.id],
    queryFn: async () => {
      if (!client?.id) return null;
      const { data, error } = await supabase
        .from("client_conchas")
        .select("*")
        .eq("client_id", client.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!client?.id,
  });

  const { data: conchaTransactions } = useQuery({
    queryKey: ["concha-transactions", client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data, error } = await supabase
        .from("concha_transactions")
        .select("*")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!client?.id,
  });

  const { data: reaisTransactions } = useQuery({
    queryKey: ["client-transactions", client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data, error } = await supabase
        .from("client_transactions")
        .select("*")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!client?.id,
  });

  const { data: ledgerTransactions } = useQuery({
    queryKey: ["ledger-transactions", client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data, error } = await supabase
        .from("ledger")
        .select("id, entry_type, amount, balance_after, currency, description, status, signature_hash, created_at")
        .eq("profile_id", client.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!client?.id,
  });

  const handleDepositAmountChange = (value: string) => {
    const numericValue = value.replace(/[^\d.]/g, "");
    const parts = numericValue.split(".");
    if (parts[0] && parts[0].length > 7) return;
    if (parts[1] && parts[1].length > 2) return;
    if (numericValue.length <= 10) {
      setDepositAmount(numericValue);
    }
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      playError();
      toast.error("Digite um valor válido");
      return;
    }

    if (amount < 1) {
      playError();
      toast.error("Valor mínimo: R$ 1,00");
      return;
    }

    if (amount > 9999999.99) {
      playError();
      toast.error("Valor máximo: R$ 9.999.999,99");
      return;
    }

    setIsProcessing(true);
    playClick();

    try {
      const { data, error } = await supabase.functions.invoke("create-wallet-checkout", {
        body: { amount, paymentMethod },
      });

      if (error) throw error;
      
      if (data?.url) {
        playSuccess();
        toast.success("Redirecionando para pagamento...");
        setIsDepositOpen(false);
        window.open(data.url, "_blank");
      } else {
        throw new Error("URL de pagamento não recebida");
      }
    } catch (error) {
      console.error("Erro ao processar depósito:", error);
      playError();
      toast.error("Erro ao processar pagamento", {
        description: error instanceof Error ? error.message : "Tente novamente",
      });
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

  const getPaymentMethodInfo = (method: PaymentMethod) => {
    switch (method) {
      case "pix":
        return { icon: QrCode, label: "PIX", description: "Pagamento instantâneo" };
      case "card":
        return { icon: CreditCard, label: "Cartão", description: "Crédito ou débito" };
    }
  };

  const handleWithdrawAmountChange = (value: string) => {
    const numericValue = value.replace(/[^\d.]/g, "");
    const parts = numericValue.split(".");
    if (parts[0] && parts[0].length > 7) return;
    if (parts[1] && parts[1].length > 2) return;
    if (numericValue.length <= 10) {
      setWithdrawAmount(numericValue);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      playError();
      toast.error("Digite um valor válido");
      return;
    }

    if (amount < 10) {
      playError();
      toast.error("Valor mínimo para saque: R$ 10,00");
      return;
    }

    if (amount > reaisBalance) {
      playError();
      toast.error("Saldo insuficiente");
      return;
    }

    if (!pixKey.trim()) {
      playError();
      toast.error("Informe sua chave PIX");
      return;
    }

    setIsWithdrawing(true);
    playClick();

    try {
      const { data, error } = await supabase.functions.invoke("request-pix-withdrawal", {
        body: { amount, pixKey: pixKey.trim() },
      });

      if (error) throw error;
      
      if (data?.success) {
        playSuccess();
        toast.success("Saque solicitado com sucesso!", {
          description: "O valor será creditado em até 24 horas.",
          icon: <Banknote className="h-4 w-4 text-green-500" />,
        });
        setIsWithdrawOpen(false);
        setWithdrawAmount("");
        setPixKey("");
        refetchWallet();
      } else {
        throw new Error(data?.error || "Erro ao processar saque");
      }
    } catch (error) {
      console.error("Erro ao processar saque:", error);
      playError();
      toast.error("Erro ao processar saque", {
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const formatCryptoPrice = (price: number, currency: string) => {
    if (currency === "BRL") {
      return price < 1 ? `R$ ${price.toFixed(4)}` : `R$ ${price.toFixed(2)}`;
    }
    if (price > 1000) {
      return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    }
    return price < 1 ? `$${price.toFixed(4)}` : `$${price.toFixed(2)}`;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-red-500";
    if (change < 0) return "text-red-500";
    return "text-muted-foreground";
  };

  const getChangePrefix = (change: number) => {
    if (change > 0) return "↗";
    if (change < 0) return "↘";
    return "–";
  };

  if (!user) {
    return null;
  }

  const zimbuBalance = wallet?.balance || 0;
  const reaisBalance = Number(wallet?.reais_balance) || 0;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Main Wallet Card */}
      <div className="bg-[hsl(40,40%,96%)] dark:bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="p-4 space-y-4">
          
          {walletLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Header Row - P-Wallet + Balances */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {/* P-Wallet Logo */}
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(210,70%,25%)] text-white">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-foreground">P-Wallet</span>
                    <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800 gap-1 px-2 py-0.5">
                      <CheckCircle2 className="h-3 w-3" />
                      Segura
                    </Badge>
                  </div>
                </div>

                {/* Balances */}
                <div className="flex items-center gap-3">
                  {/* Zimbu Balance */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-muted/30 border border-border/40">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
                      <span className="text-lg">🐚</span>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground font-medium">Zimbu</p>
                      <p className="text-base font-bold text-amber-600 dark:text-amber-400">{zimbuBalance.toLocaleString('pt-BR')}</p>
                    </div>
                  </div>

                  {/* Reais Balance */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-muted/30 border border-border/40">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white font-bold text-xs">
                      R$
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground font-medium">Reais</p>
                      <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(reaisBalance)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Status */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {isLive ? (
                  <>
                    <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Ao vivo</span>
                    <span>via {sources.join(', ')}</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    <span>Offline</span>
                  </>
                )}
              </div>

              {/* Crypto Grid */}
              <div className="grid grid-cols-5 gap-1.5">
                {prices.crypto.slice(0, 5).map((p) => (
                  <div
                    key={p.symbol}
                    className="flex flex-col rounded-lg bg-white dark:bg-muted/30 px-2.5 py-2 border border-border/30"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-foreground">{p.symbol}</span>
                      <span className={`text-[10px] font-medium ${getChangeColor(p.change24h)}`}>
                        {getChangePrefix(p.change24h)} {Math.abs(p.change24h).toFixed(1)}%
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground mt-0.5">{formatCryptoPrice(p.price, p.currency)}</span>
                  </div>
                ))}
              </div>

              {/* Forex Grid */}
              <div className="grid grid-cols-5 gap-1.5">
                {prices.forex.map((p) => (
                  <div
                    key={p.symbol}
                    className="flex flex-col rounded-lg bg-white dark:bg-muted/30 px-2.5 py-2 border border-border/30"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-foreground">{p.name}</span>
                      <span className={`text-[10px] font-medium ${getChangeColor(p.change24h)}`}>
                        {getChangePrefix(p.change24h)} {Math.abs(p.change24h).toFixed(1)}%
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground mt-0.5">{formatCryptoPrice(p.price, p.currency)}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {/* Chaves Button */}
                  <WalletPixKeys />

                  {/* Adicionar Button */}
                  <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        className="gap-1.5 bg-[hsl(210,70%,25%)] hover:bg-[hsl(210,70%,20%)] text-white text-xs px-4 h-8 rounded-full"
                      >
                        <ArrowDownToLine className="h-3.5 w-3.5" />
                        Adicionar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Wallet className="h-5 w-5 text-primary" />
                          Adicionar Saldo
                        </DialogTitle>
                        <DialogDescription>
                          Informe o valor e escolha a forma de pagamento.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-5 py-4">
                        <div className="space-y-2">
                          <Label>Valor do depósito</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                              R$
                            </span>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0,00"
                              value={depositAmount}
                              onChange={(e) => handleDepositAmountChange(e.target.value)}
                              className="pl-10 text-lg"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Mínimo: R$ 1,00</p>
                        </div>

                        <div className="space-y-3">
                          <Label>Forma de pagamento</Label>
                          <RadioGroup
                            value={paymentMethod}
                            onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                            className="grid grid-cols-2 gap-3"
                          >
                            {(["pix", "card"] as const).map((method) => {
                              const info = getPaymentMethodInfo(method);
                              const Icon = info.icon;
                              return (
                                <Label
                                  key={method}
                                  htmlFor={method}
                                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                    paymentMethod === method
                                      ? "border-primary bg-primary/5"
                                      : "border-muted hover:border-primary/50"
                                  }`}
                                >
                                  <RadioGroupItem value={method} id={method} className="sr-only" />
                                  <Icon className={`h-5 w-5 ${paymentMethod === method ? "text-primary" : "text-muted-foreground"}`} />
                                  <div>
                                    <p className="font-medium text-sm">{info.label}</p>
                                    <p className="text-xs text-muted-foreground">{info.description}</p>
                                  </div>
                                </Label>
                              );
                            })}
                          </RadioGroup>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={handleDeposit}
                          disabled={isProcessing || !depositAmount}
                          className="w-full gap-2"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Processando...
                            </>
                          ) : (
                            <>
                              <ArrowDownToLine className="h-4 w-4" />
                              Depositar {depositAmount ? formatCurrency(parseFloat(depositAmount) || 0) : ""}
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Sacar Button */}
                  <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-1.5 text-xs px-4 h-8 rounded-full border-[hsl(210,70%,25%)]/30 text-[hsl(210,70%,25%)] dark:text-primary dark:border-primary/30"
                      >
                        <ArrowUpFromLine className="h-3.5 w-3.5" />
                        Sacar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Banknote className="h-5 w-5 text-emerald-500" />
                          Sacar via PIX
                        </DialogTitle>
                        <DialogDescription>
                          Informe o valor e sua chave PIX.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Saldo disponível</p>
                          <p className="text-lg font-bold text-emerald-600">{formatCurrency(reaisBalance)}</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Valor do saque</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                              R$
                            </span>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0,00"
                              value={withdrawAmount}
                              onChange={(e) => handleWithdrawAmountChange(e.target.value)}
                              className="pl-10 text-lg"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Mínimo: R$ 10,00</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Chave PIX</Label>
                          <Input
                            type="text"
                            placeholder="CPF, e-mail, telefone ou chave aleatória"
                            value={pixKey}
                            onChange={(e) => setPixKey(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={handleWithdraw}
                          disabled={isWithdrawing || !withdrawAmount || !pixKey}
                          className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                        >
                          {isWithdrawing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Processando...
                            </>
                          ) : (
                            <>
                              <ArrowUpFromLine className="h-4 w-4" />
                              Sacar {withdrawAmount ? formatCurrency(parseFloat(withdrawAmount) || 0) : ""}
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="flex items-center gap-2">
                  {/* Transferir Button */}
                  <WalletTransferDialog 
                    currentBalance={reaisBalance}
                    onTransferComplete={() => refetchWallet()}
                  />

                  {/* Histórico Button */}
                  <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-1.5 text-xs px-3 h-8 rounded-full"
                      >
                        <History className="h-3.5 w-3.5" />
                        Histórico
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <History className="h-5 w-5 text-primary" />
                          Histórico de Transações
                        </DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-4">
                          {/* Ledger Transactions */}
                          {ledgerTransactions && ledgerTransactions.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-muted-foreground">Ledger</h4>
                              {ledgerTransactions.map((tx: any) => (
                                <div
                                  key={tx.id}
                                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30"
                                >
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium">{tx.description || tx.entry_type}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(tx.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                    </p>
                                    {tx.signature_hash && (
                                      <TransactionHashDisplay hash={tx.signature_hash} />
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <p className={`font-bold ${tx.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                      {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                                    </p>
                                    {tx.status && <TransactionStatusBadge status={tx.status} />}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Zimbu/Concha Transactions */}
                          {conchaTransactions && conchaTransactions.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-muted-foreground">Zimbu</h4>
                              {conchaTransactions.map((tx: any) => (
                                <div
                                  key={tx.id}
                                  className="flex items-center justify-between p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/30"
                                >
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium">{tx.description || tx.type}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(tx.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                    </p>
                                  </div>
                                  <p className={`font-bold ${tx.amount >= 0 ? 'text-amber-600' : 'text-red-500'}`}>
                                    {tx.amount >= 0 ? '+' : ''}{tx.amount} 🐚
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Reais Transactions */}
                          {reaisTransactions && reaisTransactions.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-muted-foreground">Reais</h4>
                              {reaisTransactions.map((tx: any) => (
                                <div
                                  key={tx.id}
                                  className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/30"
                                >
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium">{tx.description || tx.type}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(tx.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                    </p>
                                  </div>
                                  <p className={`font-bold ${tx.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Empty State */}
                          {(!ledgerTransactions || ledgerTransactions.length === 0) &&
                           (!conchaTransactions || conchaTransactions.length === 0) &&
                           (!reaisTransactions || reaisTransactions.length === 0) && (
                            <div className="text-center py-8 text-muted-foreground">
                              <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                              <p className="text-sm">Nenhuma transação encontrada</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
