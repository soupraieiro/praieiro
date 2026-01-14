/**
 * BANNER DE BROADCAST GLOBAL - VOZ DO FUNDADOR
 * Exibe comunicados globais em tempo real para usuários logados
 * Conectado via Realtime ao ai_council_admin_notifications
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { X, Megaphone, Shield, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlobalBroadcast {
  id: string;
  title: string;
  message: string;
  satoshi_hash: string | null;
  created_at: string;
}

export function GlobalBroadcastBanner() {
  const { user } = useAuth();
  const [broadcast, setBroadcast] = useState<GlobalBroadcast | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Carregar último broadcast não lido
    loadLatestBroadcast();

    // Subscribe para novos broadcasts em tempo real
    const channel = supabase
      .channel('global-broadcast-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_council_admin_notifications',
          filter: 'notification_type=eq.global_broadcast'
        },
        (payload) => {
          console.log('🎺 Novo Broadcast Global recebido:', payload);
          const newBroadcast = payload.new as GlobalBroadcast;
          
          // Verificar se já foi dispensado nesta sessão
          if (!dismissed.includes(newBroadcast.id)) {
            setBroadcast(newBroadcast);
            setIsVisible(true);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Status do canal de broadcast:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, dismissed]);

  const loadLatestBroadcast = async () => {
    try {
      // Obter broadcasts das últimas 24 horas
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('ai_council_admin_notifications')
        .select('id, title, message, satoshi_hash, created_at')
        .eq('notification_type', 'global_broadcast')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      // Verificar se há um broadcast recente não dispensado
      const dismissedIds = JSON.parse(localStorage.getItem('dismissedBroadcasts') || '[]');
      setDismissed(dismissedIds);

      if (data && !dismissedIds.includes(data.id)) {
        setBroadcast(data);
        setIsVisible(true);
      }
    } catch (error) {
      console.error('Erro ao carregar broadcasts:', error);
    }
  };

  const dismissBroadcast = () => {
    if (broadcast) {
      const newDismissed = [...dismissed, broadcast.id];
      setDismissed(newDismissed);
      localStorage.setItem('dismissedBroadcasts', JSON.stringify(newDismissed));
    }
    setIsVisible(false);
  };

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'agora mesmo';
    if (diffMins < 60) return `há ${diffMins} min`;
    if (diffHours < 24) return `há ${diffHours}h`;
    return date.toLocaleDateString('pt-BR');
  };

  if (!user || !isVisible || !broadcast) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] transition-all duration-500",
        "bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600",
        "shadow-lg shadow-purple-500/30"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Ícone do Megafone */}
          <div className="flex-shrink-0 p-2 rounded-full bg-white/20 animate-pulse">
            <Megaphone className="w-5 h-5 text-white" />
          </div>

          {/* Conteúdo */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-white text-sm sm:text-base">
                {broadcast.title}
              </h4>
              <span className="text-xs text-white/70">
                {formatTimeAgo(broadcast.created_at)}
              </span>
            </div>
            <p className="text-sm text-white/90 line-clamp-2 mt-0.5">
              {broadcast.message}
            </p>
          </div>

          {/* Badge do Hash Satoshi */}
          {broadcast.satoshi_hash && (
            <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded bg-white/10 border border-white/20">
              <Shield className="w-3 h-3 text-white/80" />
              <span className="text-xs font-mono text-white/80 truncate max-w-[100px]">
                {broadcast.satoshi_hash.slice(-8)}
              </span>
            </div>
          )}

          {/* Botão Fechar */}
          <button
            onClick={dismissBroadcast}
            className="flex-shrink-0 p-1.5 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Fechar comunicado"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Linha de brilho animada */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse" />
    </div>
  );
}
