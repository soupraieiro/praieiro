/**
 * DASHBOARD FINANCEIRO CONSTITUCIONAL
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Usa o Ledger Financeiro Satoshi como única fonte de verdade.
 * NÃO acessa tabela "transactions" (violação constitucional).
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFinancialLedger } from "@/hooks/useFinancialLedger";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  ShieldCheck,
  Hash,
} from "lucide-react";

export function TransactionsDashboard() {
  const { events, balance, loading, error } = useFinancialLedger();

  const getEventBadge = (eventType: string, status: string) => {
    const isConfirmed = status === "confirmed";
    const variant = isConfirmed ? "default" : "secondary";
    
    const labels: Record<string, string> = {
      DEPOSIT_CONFIRMED: "Depósito",
      PAYMENT_CONFIRMED: "Pagamento",
      WITHDRAW_CONFIRMED: "Saque",
      DEPOSIT_REQUESTED: "Dep. Pendente",
      PAYMENT_REQUESTED: "Pag. Pendente",
      WITHDRAW_REQUESTED: "Saque Pendente",
    };
    
    return <Badge variant={variant}>{labels[eventType] || eventType}</Badge>;
  };

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-destructive">Erro ao carregar dados financeiros</p>
        <p className="text-sm text-muted-foreground mt-2">{error}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de resumo - SALDO CALCULADO DO LEDGER */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Créditos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {balance.credits.toFixed(2)} {balance.currency}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Débitos</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {balance.debits.toFixed(2)} {balance.currency}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance.balance >= 0 ? "text-green-600" : "text-destructive"}`}>
              {balance.balance.toFixed(2)} {balance.currency}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Histórico do Ledger - Append-only, imutável */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Ledger Financeiro Satoshi</CardTitle>
            <ShieldCheck className="h-4 w-4 text-green-600" />
          </div>
          <Badge variant="outline" className="text-xs">
            <Hash className="h-3 w-3 mr-1" />
            Append-only
          </Badge>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum evento financeiro registrado.</p>
              <p className="text-sm mt-1">Os eventos aparecerão aqui após movimentações.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    {event.direction === "debit" ? (
                      <ArrowDownCircle className="h-8 w-8 text-destructive" />
                    ) : (
                      <ArrowUpCircle className="h-8 w-8 text-green-600" />
                    )}
                    <div>
                      <p className="font-medium">{event.event_type}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {event.satoshi_hash?.slice(0, 16)}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.created_at), "dd/MM/yyyy HH:mm:ss", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-bold ${
                        event.direction === "debit" ? "text-destructive" : "text-green-600"
                      }`}
                    >
                      {event.direction === "debit" ? "-" : "+"}{Number(event.amount).toFixed(2)} {event.currency}
                    </p>
                    {getEventBadge(event.event_type, event.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
