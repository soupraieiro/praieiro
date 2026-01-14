/**
 * HOOK CONSTITUCIONAL: LEDGER FINANCEIRO SATOSHI
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * AXIOMAS SEGUIDOS:
 * - A4: Nenhuma mutação financeira sem evento
 * - A5: Nenhum evento sem hash
 * - A9: profiles.id === auth.users.id (identidade soberana)
 * - A20: NÃO EXISTEM colunas de saldo
 * - A23: Eventos precedem efeitos
 * 
 * REGRAS:
 * - Ledger é append-only
 * - Saldo = soma de eventos confirmados (credit - debit) via RPC
 * - Front-end NUNCA altera saldo diretamente
 * - Front-end apenas dispara ações via RPC
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface FinancialEvent {
  id: string;
  profile_id: string; // CONSTITUTIONAL: profile_id = auth.users.id
  event_type: string;
  amount: number;
  currency: string;
  direction: "credit" | "debit";
  status: string;
  idempotency_key: string;
  payload: Record<string, unknown>;
  previous_hash: string | null;
  satoshi_hash: string;
  created_at: string;
}

export interface FinancialBalance {
  credits: number;
  debits: number;
  balance: number;
  currency: string;
}

export function useFinancialLedger() {
  const { user } = useAuth();
  const [events, setEvents] = useState<FinancialEvent[]>([]);
  const [balance, setBalance] = useState<FinancialBalance>({
    credits: 0,
    debits: 0,
    balance: 0,
    currency: "ZIMBU",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar saldo via RPC (A20: saldo calculado, não armazenado)
  const fetchBalanceViaRPC = useCallback(async (): Promise<number> => {
    if (!user?.id) return 0;

    try {
      const { data, error: rpcError } = await supabase.rpc("get_user_balance", {
        p_profile_id: user.id,
        p_currency: "ZIMBU",
      });

      if (rpcError) {
        console.error("[useFinancialLedger] RPC error:", rpcError);
        return 0;
      }

      return Number(data) || 0;
    } catch (err) {
      console.error("[useFinancialLedger] Balance error:", err);
      return 0;
    }
  }, [user?.id]);

  // Fetch ledger events for the user
  const fetchLedgerEvents = useCallback(async () => {
    if (!user) {
      setEvents([]);
      setBalance({ credits: 0, debits: 0, balance: 0, currency: "ZIMBU" });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // CONSTITUTIONAL: profile_id = auth.users.id (identidade soberana)
      // Usando event_type (nome constitucional), previous_hash para encadeamento Satoshi
      const { data, error: fetchError } = await (supabase as any)
        .from("ledger")
        .select("id, profile_id, event_type, entry_type, amount, currency, description, status, signature_hash, satoshi_hash, previous_hash, created_at")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Map to FinancialEvent format
      const ledgerEvents: FinancialEvent[] = (data || []).map((entry: any) => {
        const creditTypes = ["deposit", "credit", "refund", "cashback", "bonus"];
        const eventType = entry.event_type || entry.entry_type || "";
        const direction = creditTypes.some(t => 
          eventType.toLowerCase().includes(t)
        ) ? "credit" : "debit";

        return {
          id: entry.id,
          profile_id: entry.profile_id,
          event_type: eventType,
          amount: entry.amount,
          currency: entry.currency,
          direction,
          status: entry.status,
          idempotency_key: entry.signature_hash || "",
          payload: {},
          previous_hash: entry.previous_hash || null,
          satoshi_hash: entry.satoshi_hash || "",
          created_at: entry.created_at,
        };
      });

      setEvents(ledgerEvents);

      // Calculate totals from events
      const confirmedEvents = ledgerEvents.filter(e => e.status === "confirmed");
      const credits = confirmedEvents
        .filter(e => e.direction === "credit")
        .reduce((sum, e) => sum + Number(e.amount), 0);
      const debits = confirmedEvents
        .filter(e => e.direction === "debit")
        .reduce((sum, e) => sum + Number(e.amount), 0);

      // CONSTITUTIONAL (A20): Buscar saldo via RPC
      const rpcBalance = await fetchBalanceViaRPC();

      setBalance({
        credits,
        debits,
        balance: rpcBalance || (credits - debits),
        currency: "ZIMBU",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar ledger financeiro");
      console.error("[useFinancialLedger] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, fetchBalanceViaRPC]);

  useEffect(() => {
    fetchLedgerEvents();
  }, [fetchLedgerEvents]);

  // Get events by type
  const getEventsByType = useCallback((eventType: string): FinancialEvent[] => {
    return events.filter(e => e.event_type === eventType);
  }, [events]);

  // Get recent events
  const getRecentEvents = useCallback((limit: number = 10): FinancialEvent[] => {
    return events.slice(0, limit);
  }, [events]);

  // Refresh data
  const refresh = useCallback(() => {
    return fetchLedgerEvents();
  }, [fetchLedgerEvents]);

  return {
    events,
    balance,
    loading,
    error,
    refresh,
    getEventsByType,
    getRecentEvents,
    hasAccount: events.length > 0 || !loading,
  };
}
