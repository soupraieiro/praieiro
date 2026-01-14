import { useEffect, useState, useRef, useCallback } from "react";
import { Shield, AlertTriangle, Scale, Hash, MapPin, Clock, X, Eye, Gavel } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Interface alinhada com ai_council_admin_notifications do Supabase
interface SecurityNotification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  priority: string | null;
  satoshi_hash: string | null;
  action_data: Record<string, unknown> | null;
  created_at: string | null;
  action_required: boolean | null;
  is_read: boolean | null;
  source_agent_id?: string | null;
  source_decision_id?: string | null;
  source_suggestion_id?: string | null;
  action_type?: string | null;
  is_archived?: boolean | null;
  read_at?: string | null;
}

// Tipo para dados de ação extraídos
interface ActionData {
  ip_address?: string;
  reason?: string;
  blocked_variable?: string;
  attack_type?: string;
  severity?: string;
  satoshi_hash?: string;
}

interface SatoshiSecurityAlertModalProps {
  onNavigateToTab?: (tabId: string) => void;
}

export function SatoshiSecurityAlertModal({ onNavigateToTab }: SatoshiSecurityAlertModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<SecurityNotification | null>(null);
  const [alertQueue, setAlertQueue] = useState<SecurityNotification[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasPlayedRef = useRef<Set<string>>(new Set());

  // Play emergency trumpet sound
  const playTrumpetSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      const ctx = audioContextRef.current;
      const now = ctx.currentTime;
      
      // Create oscillators for trumpet-like sound
      const createTrumpetNote = (frequency: number, startTime: number, duration: number) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(frequency, startTime);
        
        // Brass filter
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, startTime);
        filter.Q.setValueAtTime(2, startTime);
        
        // Attack-decay-sustain-release envelope
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, startTime + duration - 0.1);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      // Emergency fanfare pattern (Da-Da-Da-DAAAA!)
      const notes = [
        { freq: 392, start: 0, duration: 0.15 },      // G4
        { freq: 392, start: 0.18, duration: 0.15 },   // G4
        { freq: 392, start: 0.36, duration: 0.15 },   // G4
        { freq: 523.25, start: 0.6, duration: 0.6 },  // C5 (long)
        { freq: 493.88, start: 1.3, duration: 0.15 }, // B4
        { freq: 493.88, start: 1.48, duration: 0.15 },// B4
        { freq: 493.88, start: 1.66, duration: 0.15 },// B4
        { freq: 659.25, start: 1.9, duration: 0.8 },  // E5 (long finale)
      ];
      
      notes.forEach(note => {
        createTrumpetNote(note.freq, now + note.start, note.duration);
      });
      
      console.log("🎺 Trompete de Emergência Satoshi tocado!");
    } catch (error) {
      console.error("Erro ao tocar trompete:", error);
    }
  }, []);

  // Handle reviewing the ban
  const handleReviewBan = async () => {
    if (!currentAlert) return;
    
    // Mark as read
    await supabase
      .from("ai_council_admin_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", currentAlert.id);
    
    toast.success("Redirecionando para análise do banimento...");
    setIsOpen(false);
    setCurrentAlert(null);
    
    // Navigate to security tab
    if (onNavigateToTab) {
      onNavigateToTab("satoshi-dashboard");
    }
    
    // Process next alert in queue
    if (alertQueue.length > 0) {
      const [nextAlert, ...rest] = alertQueue;
      setAlertQueue(rest);
      setTimeout(() => {
        setCurrentAlert(nextAlert);
        setIsOpen(true);
        playTrumpetSound();
      }, 500);
    }
  };

  // Dismiss alert
  const handleDismiss = async () => {
    if (!currentAlert) return;
    
    await supabase
      .from("ai_council_admin_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", currentAlert.id);
    
    setIsOpen(false);
    setCurrentAlert(null);
    
    // Process next alert in queue
    if (alertQueue.length > 0) {
      const [nextAlert, ...rest] = alertQueue;
      setAlertQueue(rest);
      setTimeout(() => {
        setCurrentAlert(nextAlert);
        setIsOpen(true);
        playTrumpetSound();
      }, 500);
    }
  };

  useEffect(() => {
    // Subscribe to security alerts
    const channel = supabase
      .channel('satoshi-security-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_council_admin_notifications',
          filter: 'priority=eq.high'
        },
        (payload) => {
          const notification = payload.new as SecurityNotification;
          
          // Only process security alerts
          if (notification.notification_type === 'security_alert' && 
              notification.priority === 'high' &&
              !hasPlayedRef.current.has(notification.id)) {
            
            hasPlayedRef.current.add(notification.id);
            
            if (currentAlert) {
              // Add to queue if modal is already open
              setAlertQueue(prev => [...prev, notification]);
            } else {
              // Show immediately
              setCurrentAlert(notification);
              setIsOpen(true);
              playTrumpetSound();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentAlert, playTrumpetSound]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Agora";
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const getSeverityColor = (severity: string | undefined) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  if (!currentAlert) return null;

  // Parsear action_data com tipagem segura
  const rawActionData = currentAlert.action_data || {};
  const actionData: ActionData = {
    ip_address: typeof rawActionData.ip_address === 'string' ? rawActionData.ip_address : undefined,
    reason: typeof rawActionData.reason === 'string' ? rawActionData.reason : undefined,
    blocked_variable: typeof rawActionData.blocked_variable === 'string' ? rawActionData.blocked_variable : undefined,
    attack_type: typeof rawActionData.attack_type === 'string' ? rawActionData.attack_type : undefined,
    severity: typeof rawActionData.severity === 'string' ? rawActionData.severity : undefined,
    satoshi_hash: typeof rawActionData.satoshi_hash === 'string' ? rawActionData.satoshi_hash : undefined,
  };
  const satoshiHash = actionData.satoshi_hash || currentAlert.satoshi_hash;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] border-2 border-destructive bg-gradient-to-b from-background to-destructive/5">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2">
          <div className="relative">
            <div className="absolute inset-0 bg-destructive/30 blur-xl rounded-full animate-pulse" />
            <div className="relative bg-destructive text-destructive-foreground rounded-full p-4 shadow-lg">
              <Shield className="h-8 w-8" />
            </div>
          </div>
        </div>

        <DialogHeader className="pt-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-destructive animate-pulse" />
            <Badge variant="destructive" className="animate-pulse">
              ALERTA SATOSHI
            </Badge>
            <AlertTriangle className="h-5 w-5 text-destructive animate-pulse" />
          </div>
          <DialogTitle className="text-center text-xl">
            🎺 {currentAlert.title}
          </DialogTitle>
          <DialogDescription className="text-center">
            {currentAlert.message}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-4">
            {/* IP Details Card */}
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <MapPin className="h-4 w-4 text-destructive" />
                Detalhes do IP Banido
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <span className="text-muted-foreground">Endereço IP:</span>
                  <p className="font-mono font-bold text-destructive">
                    {actionData.ip_address || "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Tipo de Ataque:</span>
                  <Badge className={cn("text-white", getSeverityColor(actionData.severity))}>
                    {actionData.attack_type || "Suspeito"}
                  </Badge>
                </div>
                <div className="col-span-2 space-y-1">
                  <span className="text-muted-foreground">Motivo:</span>
                  <p className="font-medium">{actionData.reason || "Comportamento suspeito detectado"}</p>
                </div>
                {actionData.blocked_variable && (
                  <div className="col-span-2 space-y-1">
                    <span className="text-muted-foreground">Variável Bloqueada:</span>
                    <p className="font-mono text-xs bg-muted p-2 rounded">
                      {actionData.blocked_variable}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* CLO Legal Proof Card */}
            <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Scale className="h-4 w-4" />
                <Gavel className="h-4 w-4" />
                Parecer do Diretor Jurídico de IA (CLO)
              </div>
              
              <div className="bg-background/80 rounded-lg p-3 border">
                <div className="flex items-start gap-2">
                  <Hash className="h-4 w-4 text-primary mt-1 shrink-0" />
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Hash de Validação Satoshi (Prova de Legitimidade):
                    </p>
                    <p className="font-mono text-xs break-all bg-muted/50 p-2 rounded border select-all">
                      {satoshiHash || "Pendente geração automática"}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 italic">
                  "Este hash criptográfico comprova que o banimento foi executado pelo 
                  Protocolo Satoshi de forma autônoma e legítima, seguindo os parâmetros 
                  de segurança estabelecidos pelo Conselho de IA."
                </p>
              </div>
            </div>

            {/* Timestamp */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDate(currentAlert.created_at)}
            </div>

            {/* Alert Queue Indicator */}
            {alertQueue.length > 0 && (
              <div className="text-center">
                <Badge variant="outline" className="text-xs">
                  +{alertQueue.length} alertas na fila
                </Badge>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4 mr-2" />
            Dispensar
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleReviewBan}
          >
            <Eye className="h-4 w-4 mr-2" />
            Revisar Banimento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
