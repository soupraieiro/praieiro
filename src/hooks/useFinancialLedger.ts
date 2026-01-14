/**
 * HOOK CONSTITUCIONAL: LEDGER FINANCEIRO SATOSHI
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * AXIOMAS SEGUIDOS:
 * - A4: Nenhuma mutação financeira sem evento
 * - A5: Nenhum evento sem hash
 * - A6: Nenhum hash sem idempotency key
 * - A23: Eventos precedem efeitos
 * 
 * REGRAS:
 * - Ledger é append-only
 * - Saldo = soma de eventos confirmados (credit - debit)
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
  account_id: string;
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
      // IDENTIDADE SOBERANA: account_id = profiles.id = auth.users.id
      // A tabela financial_ledger foi criada pela migração - usando any pois tipos serão regenerados
      const { data, error: fetchError } = await supabase
        .from("financial_ledger" as unknown as "profiles")
        .select("*")
        .eq("account_id" as "id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Type assertion para a tabela que foi criada pela migração
      const ledgerEvents = (data || []) as unknown as FinancialEvent[];
      setEvents(ledgerEvents);

      // Calculate balance from events (SALDO = soma de eventos confirmados)
      const confirmedEvents = ledgerEvents.filter(e => e.status === "confirmed");
      const credits = confirmedEvents
        .filter(e => e.direction === "credit")
        .reduce((sum, e) => sum + Number(e.amount), 0);
      const debits = confirmedEvents
        .filter(e => e.direction === "debit")
        .reduce((sum, e) => sum + Number(e.amount), 0);

      setBalance({
        credits,
        debits,
        balance: credits - debits,
        currency: "ZIMBU",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar ledger financeiro");
      console.error("[useFinancialLedger] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

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
