import { useCallback, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { Shell } from "lucide-react";
import React from "react";

interface PiuNotificationOptions {
  type: "received" | "sent" | "purchase" | "sale";
  amount: number;
  title?: string;
  description?: string;
}

/**
 * Hook para o Sistema de Alerta "Piu"
 * Som, Toast animado e Notificações Push para transações de Conchas
 */
export function usePiuNotification() {
  const audioContextRef = useRef<AudioContext | null>(null);

  // Gera o som "Piu" usando Web Audio API
  const playPiuSound = useCallback((type: PiuNotificationOptions["type"]) => {
    try {
      // Cria AudioContext se não existir
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      
      // Resume context if suspended (browser policy)
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;
      
      // Cria oscilador para o "Piu"
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Configura som baseado no tipo
      switch (type) {
        case "received":
        case "sale":
          // Som alegre - tom alto subindo (dinheiro chegando!)
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(800, now);
          oscillator.frequency.linearRampToValueAtTime(1200, now + 0.1);
          oscillator.frequency.linearRampToValueAtTime(1600, now + 0.2);
          gainNode.gain.setValueAtTime(0.3, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          oscillator.start(now);
          oscillator.stop(now + 0.3);
          break;
          
        case "sent":
        case "purchase":
          // Som suave - tom que desce (dinheiro saindo)
          oscillator.type = "triangle";
          oscillator.frequency.setValueAtTime(600, now);
          oscillator.frequency.linearRampToValueAtTime(400, now + 0.15);
          gainNode.gain.setValueAtTime(0.2, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          oscillator.start(now);
          oscillator.stop(now + 0.2);
          break;
      }
    } catch (error) {
      console.warn("[Piu] Não foi possível tocar o som:", error);
    }
  }, []);

  // Mostra toast animado com ícone de Concha
  const showPiuToast = useCallback((options: PiuNotificationOptions) => {
    const { type, amount, title, description } = options;
    
    const isPositive = type === "received" || type === "sale";
    const prefix = isPositive ? "+" : "-";
    
    const defaultTitles: Record<typeof type, string> = {
      received: "🐚 Conchas Recebidas!",
      sent: "🐚 Conchas Enviadas",
      purchase: "🛒 Compra Realizada!",
      sale: "💰 Venda na Loja!",
    };
    
    const defaultDescriptions: Record<typeof type, string> = {
      received: `Você recebeu ${amount} conchas`,
      sent: `Você enviou ${amount} conchas`,
      purchase: `Você gastou ${amount} conchas`,
      sale: `Alguém comprou na sua loja!`,
    };

    toast({
      title: title || defaultTitles[type],
      description: React.createElement("div", { 
        className: "flex items-center gap-2" 
      }, [
        React.createElement(Shell, { 
          key: "shell",
          className: `h-5 w-5 ${isPositive ? "text-green-500" : "text-orange-500"} animate-bounce`
        }),
        React.createElement("span", { 
          key: "amount",
          className: `font-bold text-lg ${isPositive ? "text-green-600" : "text-orange-600"}`
        }, `${prefix}${amount} 🐚`),
        React.createElement("span", { 
          key: "desc",
          className: "text-muted-foreground"
        }, description || defaultDescriptions[type])
      ]),
      duration: 4000,
    });
  }, []);

  // Envia notificação push via browser
  const sendPushNotification = useCallback(async (options: PiuNotificationOptions) => {
    const { type, amount, title, description } = options;
    
    // Verifica se o navegador suporta notificações
    if (!("Notification" in window)) {
      console.warn("[Piu] Este navegador não suporta notificações push");
      return;
    }

    // Solicita permissão se necessário
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }

    if (Notification.permission !== "granted") {
      console.warn("[Piu] Permissão de notificação negada");
      return;
    }

    const defaultTitles: Record<typeof type, string> = {
      received: "🐚 Você recebeu conchas!",
      sent: "🐚 Conchas enviadas",
      purchase: "🛒 Compra confirmada!",
      sale: "💰 Venda na sua loja!",
    };

    const defaultBodies: Record<typeof type, string> = {
      received: `+${amount} conchas chegaram na sua carteira`,
      sent: `${amount} conchas foram enviadas`,
      purchase: `Você gastou ${amount} conchas`,
      sale: `Alguém comprou na sua loja! +${amount} conchas`,
    };

    try {
      const notification = new Notification(title || defaultTitles[type], {
        body: description || defaultBodies[type],
        icon: "/logo-praieiro-circle.png",
        badge: "/logo-praieiro-circle.png",
        tag: `piu-${type}-${Date.now()}`,
        requireInteraction: false,
        silent: false,
      });

      // Auto-close after 5s
      setTimeout(() => notification.close(), 5000);
    } catch (error) {
      console.warn("[Piu] Erro ao enviar notificação push:", error);
    }
  }, []);

  // Função principal - dispara som + toast + push
  const notifyPiu = useCallback(async (options: PiuNotificationOptions) => {
    // 1. Toca o som "Piu"
    playPiuSound(options.type);
    
    // 2. Mostra toast animado
    showPiuToast(options);
    
    // 3. Envia push se app não estiver em foco
    if (document.hidden) {
      await sendPushNotification(options);
    }
  }, [playPiuSound, showPiuToast, sendPushNotification]);

  // Solicita permissão de notificação
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      return false;
    }
    
    if (Notification.permission === "granted") {
      return true;
    }
    
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }, []);

  return {
    notifyPiu,
    playPiuSound,
    showPiuToast,
    sendPushNotification,
    requestNotificationPermission,
  };
}

// Singleton para uso fora de componentes React
let piuAudioContext: AudioContext | null = null;

export function playPiuSoundGlobal(type: "received" | "sent" | "purchase" | "sale" = "received") {
  try {
    if (!piuAudioContext) {
      piuAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const ctx = piuAudioContext;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === "received" || type === "sale") {
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(800, now);
      oscillator.frequency.linearRampToValueAtTime(1200, now + 0.1);
      oscillator.frequency.linearRampToValueAtTime(1600, now + 0.2);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    } else {
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(600, now);
      oscillator.frequency.linearRampToValueAtTime(400, now + 0.15);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      oscillator.start(now);
      oscillator.stop(now + 0.2);
    }
  } catch (error) {
    console.warn("[Piu] Som global não disponível:", error);
  }
}
