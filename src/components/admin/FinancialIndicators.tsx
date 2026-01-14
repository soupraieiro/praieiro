import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowUpCircle,
  ArrowDownCircle,
  PiggyBank,
  Activity
} from "lucide-react";

interface FinancialMetrics {
  totalAssets: number;
  totalCashflow: number;
  totalDeposits: number;
  totalWithdrawals: number;
  clientWalletBalance: number;
  vendorWalletBalance: number;
  totalTransactions: number;
  todayTransactions: number;
}

export function FinancialIndicators() {
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    totalAssets: 0,
    totalCashflow: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    clientWalletBalance: 0,
    vendorWalletBalance: 0,
    totalTransactions: 0,
    todayTransactions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    try {
      // Get client wallet totals
      const { data: clientWallets } = await supabase
        .from("client_conchas")
        .select("reais_balance, total_deposited, total_spent");

      let clientBalance = 0;
      let totalDeposits = 0;
      let totalSpent = 0;

      if (clientWallets) {
        clientWallets.forEach(w => {
          clientBalance += Number(w.reais_balance) || 0;
          totalDeposits += Number(w.total_deposited) || 0;
          totalSpent += Number(w.total_spent) || 0;
        });
      }

      // Get vendor wallet totals
      const { data: vendorWallets } = await supabase
        .from("vendor_wallets")
        .select("balance, total_received, total_withdrawn");

      let vendorBalance = 0;
      let vendorReceived = 0;
      let vendorWithdrawn = 0;

      if (vendorWallets) {
        vendorWallets.forEach(w => {
          vendorBalance += Number(w.balance) || 0;
          vendorReceived += Number(w.total_received) || 0;
          vendorWithdrawn += Number(w.total_withdrawn) || 0;
        });
      }

      // Get transaction counts
      const { count: clientTxCount } = await supabase
        .from("client_transactions")
        .select("*", { count: "exact", head: true });

      const { count: vendorTxCount } = await supabase
        .from("vendor_transactions")
        .select("*", { count: "exact", head: true });

      // Get today's transactions
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: todayClientTx } = await supabase
        .from("client_transactions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      const { count: todayVendorTx } = await supabase
        .from("vendor_transactions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      const totalAssets = clientBalance + vendorBalance;
      const totalCashflow = totalDeposits + vendorReceived - vendorWithdrawn - totalSpent;

      setMetrics({
        totalAssets,
        totalCashflow,
        totalDeposits,
        totalWithdrawals: vendorWithdrawn + totalSpent,
        clientWalletBalance: clientBalance,
        vendorWalletBalance: vendorBalance,
        totalTransactions: (clientTxCount || 0) + (vendorTxCount || 0),
        todayTransactions: (todayClientTx || 0) + (todayVendorTx || 0),
      });
    } catch (error) {
      console.error("Error loading financial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Financial Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total em Ativos</CardTitle>
            <PiggyBank className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(metrics.totalAssets)}</div>
            <p className="text-xs text-muted-foreground">Carteiras de clientes + vendedores</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fluxo de Caixa</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.totalCashflow >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(metrics.totalCashflow)}
            </div>
            <p className="text-xs text-muted-foreground">Entradas - Saídas</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Entradas</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(metrics.totalDeposits)}</div>
            <p className="text-xs text-muted-foreground">Depósitos realizados</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Saídas</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(metrics.totalWithdrawals)}</div>
            <p className="text-xs text-muted-foreground">Saques + Gastos</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Carteiras Clientes</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.clientWalletBalance)}</div>
            <p className="text-xs text-muted-foreground">Saldo em reais</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Carteiras Vendedores</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.vendorWalletBalance)}</div>
            <p className="text-xs text-muted-foreground">Saldo disponível</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Transações</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">Na plataforma</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Transações Hoje</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.todayTransactions}</div>
            <p className="text-xs text-muted-foreground">Movimentações do dia</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
