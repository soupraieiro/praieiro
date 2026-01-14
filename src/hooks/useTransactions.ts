/**
 * HOOK CONSTITUCIONAL: TRANSAÇÕES VIA LEDGER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * AXIOMAS SEGUIDOS:
 * - A3: Append-only para eventos históricos
 * - A4: Nenhuma mutação financeira sem evento
 * - A20: NÃO EXISTEM colunas de saldo (balance_after PROIBIDO)
 * - A9: profiles.id === auth.users.id (identidade soberana)
 * 
 * REGRAS:
 * - Saldo NUNCA é persistido - apenas calculado via agregação
 * - Usar RPC get_user_balance para saldo
 * - Ledger é somente leitura no frontend
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";

/**
 * Entrada do Ledger - SEM balance_after (A20)
 * Usando event_type (nome constitucional) com fallback para entry_type
 */
export interface LedgerEntry {
  id: string;
  profile_id: string; // profiles.id = auth.users.id (identidade soberana)
  event_type?: string; // Nome constitucional
  entry_type?: string; // Legacy fallback
  amount: number;
  currency: string;
  description: string | null;
  status: string;
  signature_hash: string | null;
  satoshi_hash: string | null;
  previous_hash?: string | null; // Encadeamento Satoshi
  created_at: string;
}

// Legacy interface for backward compatibility
export interface Transaction {
  id: string;
  profile_id: string; // CONSTITUTIONAL: usando profile_id, não user_id
  tipo: "compra" | "venda" | "deposito" | "saque";
  valor: number;
  descricao: string | null;
  data_transacao: string;
  status: "pendente" | "concluido" | "cancelado";
  created_at: string;
}

/**
 * Hook constitucional para transações via Ledger
 * APPEND-ONLY - Saldo calculado via RPC (não armazenado)
 */
export function useTransactions() {
  const { profile } = useProfile();
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar saldo via RPC (A20: saldo calculado, não armazenado)
  const fetchBalance = useCallback(async () => {
    if (!profile?.id) return 0;

    try {
      const { data, error: rpcError } = await supabase.rpc("get_user_balance", {
        p_profile_id: profile.id,
        p_currency: "BRL",
      });

      if (rpcError) {
        console.error("[useTransactions] RPC error:", rpcError);
        return 0;
      }

      return Number(data) || 0;
    } catch (err) {
      console.error("[useTransactions] Balance error:", err);
      return 0;
    }
  }, [profile?.id]);

  // Buscar histórico de transações (somente leitura)
  const fetchLedgerTransactions = useCallback(async () => {
    if (!profile?.id) {
      setTransactions([]);
      setBalance(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // CONSTITUTIONAL: Buscar do ledger usando profile.id (identidade soberana)
      // SEM balance_after (A20: saldo não é armazenado)
      // Usando event_type (nome constitucional) com fallback para entry_type
      const { data, error: fetchError } = await (supabase as any)
        .from("ledger")
        .select("id, profile_id, event_type, entry_type, amount, currency, description, status, signature_hash, satoshi_hash, previous_hash, created_at")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      
      setTransactions((data || []) as LedgerEntry[]);

      // Buscar saldo via RPC (A20)
      const currentBalance = await fetchBalance();
      setBalance(currentBalance);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar transações do ledger");
    } finally {
      setLoading(false);
    }
  }, [profile?.id, fetchBalance]);

  useEffect(() => {
    fetchLedgerTransactions();
  }, [fetchLedgerTransactions]);

  // Identificar direção da transação pelo event_type (constitucional) ou entry_type (legacy)
  const getEventType = (entry: LedgerEntry): string => {
    return entry.event_type || entry.entry_type || "";
  };

  const getDirection = (entryType: string): "credit" | "debit" => {
    const creditTypes = ["deposit", "credit", "refund", "cashback", "bonus", "DEPOSIT_CONFIRMED", "PAYMENT_RECEIVED"];
    return creditTypes.some(t => entryType.toLowerCase().includes(t.toLowerCase())) ? "credit" : "debit";
  };

  // Totais calculados a partir do ledger (fonte única de verdade)
  const totals = {
    // Total de créditos confirmados
    creditos: transactions
      .filter((t) => getDirection(getEventType(t)) === "credit" && t.status === "confirmed")
      .reduce((sum, t) => sum + Number(t.amount), 0),
    // Total de débitos confirmados
    debitos: transactions
      .filter((t) => getDirection(getEventType(t)) === "debit" && t.status === "confirmed")
      .reduce((sum, t) => sum + Number(t.amount), 0),
    // CONSTITUTIONAL (A20): Saldo via RPC, não armazenado
    get saldo() {
      return balance;
    },
    // Legacy aliases para compatibilidade
    get compras() {
      return this.debitos;
    },
    get vendas() {
      return this.creditos;
    },
  };

  return {
    transactions,
    loading,
    error,
    fetchTransactions: fetchLedgerTransactions,
    refetch: fetchLedgerTransactions,
    totals,
    // Saldo via RPC (A20)
    balance,
  };
}

/**
 * Hook para legacy compatibility - converte ledger para formato antigo
 * @deprecated Use useTransactions() diretamente
 */
export function useLegacyTransactions() {
  const { transactions, loading, error, totals, balance } = useTransactions();

  // Identificar tipo pelo event_type (constitucional) ou entry_type (legacy)
  const mapEntryTypeToTipo = (entry: LedgerEntry): Transaction["tipo"] => {
    const eventType = entry.event_type || entry.entry_type || "";
    const lowerType = eventType.toLowerCase();
    if (lowerType.includes("deposit")) return "deposito";
    if (lowerType.includes("withdraw") || lowerType.includes("saque")) return "saque";
    if (lowerType.includes("payment") || lowerType.includes("compra")) return "compra";
    return "venda";
  };

  // Converter ledger entries para formato legacy
  const legacyTransactions: Transaction[] = transactions.map((t) => ({
    id: t.id,
    profile_id: t.profile_id,
    tipo: mapEntryTypeToTipo(t),
    valor: t.amount,
    descricao: t.description,
    data_transacao: t.created_at,
    status: t.status === "confirmed" ? "concluido" : 
            t.status === "pending" ? "pendente" : "cancelado",
    created_at: t.created_at,
  }));

  return {
    transactions: legacyTransactions,
    loading,
    error,
    totals: {
      compras: totals.debitos,
      vendas: totals.creditos,
    },
    balance,
  };
}
