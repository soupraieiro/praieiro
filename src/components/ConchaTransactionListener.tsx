import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePiuNotification } from "@/hooks/usePiuNotification";
import { useAuth } from "@/hooks/useAuth";

/**
 * Componente invisível que escuta transações de Conchas em tempo real
 * e dispara o Sistema Piu quando algo muda
 */
export function ConchaTransactionListener() {
  const { notifyPiu } = usePiuNotification();
  const { user } = useAuth();
  const lastNotifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;

    // Canal para escutar mudanças em client_conchas
    const balanceChannel = supabase
      .channel("concha-balance-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "client_conchas",
          filter: `client_id=eq.${user.id}`,
        },
        (payload) => {
          const oldBalance = (payload.old as any)?.balance || 0;
          const newBalance = (payload.new as any)?.balance || 0;
          const diff = newBalance - oldBalance;

          if (diff !== 0) {
            const notificationId = `balance-${Date.now()}`;
            if (!lastNotifiedRef.current.has(notificationId)) {
              lastNotifiedRef.current.add(notificationId);
              
              notifyPiu({
                type: diff > 0 ? "received" : "sent",
                amount: Math.abs(diff),
              });
              
              // Limpa notificações antigas
              setTimeout(() => {
                lastNotifiedRef.current.delete(notificationId);
              }, 5000);
            }
          }
        }
      )
      .subscribe();

    // Canal para escutar transações de concha
    const transactionChannel = supabase
      .channel("concha-transactions")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "concha_transactions",
          filter: `client_id=eq.${user.id}`,
        },
        (payload) => {
          const transaction = payload.new as any;
          const notificationId = transaction.id;
          
          if (!lastNotifiedRef.current.has(notificationId)) {
            lastNotifiedRef.current.add(notificationId);
            
            const type = transaction.type === "earn" || transaction.type === "deposit" 
              ? "received" 
              : "sent";
            
            notifyPiu({
              type,
              amount: Math.abs(transaction.amount),
              description: transaction.description,
            });
            
            setTimeout(() => {
              lastNotifiedRef.current.delete(notificationId);
            }, 5000);
          }
        }
      )
      .subscribe();

    // Canal para escutar vendas (vendedor)
    const salesChannel = supabase
      .channel("vendor-sales")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `vendor_id=eq.${user.id}`,
        },
        (payload) => {
          const order = payload.new as any;
          const notificationId = `sale-${order.id}`;
          
          if (!lastNotifiedRef.current.has(notificationId) && order.status === "completed") {
            lastNotifiedRef.current.add(notificationId);
            
            notifyPiu({
              type: "sale",
              amount: order.total_amount || 0,
              title: "💰 Nova Venda!",
              description: `Alguém comprou na sua loja!`,
            });
            
            setTimeout(() => {
              lastNotifiedRef.current.delete(notificationId);
            }, 5000);
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(balanceChannel);
      supabase.removeChannel(transactionChannel);
      supabase.removeChannel(salesChannel);
    };
  }, [user?.id, notifyPiu]);

  // Componente invisível - não renderiza nada
  return null;
}
