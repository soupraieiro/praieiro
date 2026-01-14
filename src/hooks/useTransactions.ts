import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";

/**
 * PRAIEIRO CONSTITUTIONAL HOOK
 * 
 * IDENTIDADE SOBERANA: profiles.id = auth.users.id
 * 
 * Este hook usa o LEDGER (fonte única de verdade financeira)
 * NÃO usa a tabela transactions (deprecated)
 * 
 * Ledger é APPEND-ONLY e IMUTÁVEL
 */

export interface LedgerEntry {
  id: string;
  profile_id: string; // profiles.id = auth.users.id (identidade soberana)
  entry_type: string;
  amount: number;
  balance_after: number;
  currency: string;
  description: string | null;
  status: string;
  signature_hash: string | null;
  satoshi_hash: string | null;
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
 * APPEND-ONLY - Nenhuma mutação direta permitida
 */
export function useTransactions() {
  const { profile } = useProfile();
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      fetchLedgerTransactions();
    } else {
      setTransactions([]);
      setLoading(false);
    }
  }, [profile]);

  const fetchLedgerTransactions = async () => {
    if (!profile) return;

    setLoading(true);
    setError(null);

    try {
      // CONSTITUTIONAL: Buscar do ledger usando profile.id (identidade soberana)
      const { data, error: fetchError } = await supabase
        .from("ledger")
        .select("id, profile_id, entry_type, amount, balance_after, currency, description, status, signature_hash, satoshi_hash, created_at")
        .eq("profile_id", profile.id) // profile.id = auth.users.id
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setTransactions((data || []) as LedgerEntry[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar transações do ledger");
    } finally {
      setLoading(false);
    }
  };

  // Identificar direção da transação pelo entry_type
  const getDirection = (entryType: string): "credit" | "debit" => {
    const creditTypes = ["deposit", "credit", "refund", "cashback", "bonus", "DEPOSIT_CONFIRMED", "PAYMENT_RECEIVED"];
    return creditTypes.some(t => entryType.toLowerCase().includes(t.toLowerCase())) ? "credit" : "debit";
  };

  // Totals calculados a partir do ledger (fonte única de verdade)
  const totals = {
    // Total de créditos confirmados
    creditos: transactions
      .filter((t) => getDirection(t.entry_type) === "credit" && t.status === "confirmed")
      .reduce((sum, t) => sum + Number(t.amount), 0),
    // Total de débitos confirmados
    debitos: transactions
      .filter((t) => getDirection(t.entry_type) === "debit" && t.status === "confirmed")
      .reduce((sum, t) => sum + Number(t.amount), 0),
    // Saldo = último balance_after ou créditos - débitos
    get saldo() {
      const lastConfirmed = transactions.find(t => t.status === "confirmed");
      return lastConfirmed?.balance_after ?? (this.creditos - this.debitos);
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
    // Saldo direto do ledger
    balance: totals.saldo,
  };
}

/**
 * Hook para legacy compatibility - converte ledger para formato antigo
 * @deprecated Use useTransactions() diretamente
 */
export function useLegacyTransactions() {
  const { transactions, loading, error, totals, balance } = useTransactions();

  // Identificar tipo pelo entry_type
  const mapEntryTypeToTipo = (entryType: string): Transaction["tipo"] => {
    const lowerType = entryType.toLowerCase();
    if (lowerType.includes("deposit")) return "deposito";
    if (lowerType.includes("withdraw") || lowerType.includes("saque")) return "saque";
    if (lowerType.includes("payment") || lowerType.includes("compra")) return "compra";
    return "venda";
  };

  // Converter ledger entries para formato legacy
  const legacyTransactions: Transaction[] = transactions.map((t) => ({
    id: t.id,
    profile_id: t.profile_id,
    tipo: mapEntryTypeToTipo(t.entry_type),
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
