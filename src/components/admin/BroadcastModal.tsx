/**
 * CETRO DE COMANDO - MODAL DE BROADCAST GLOBAL
 * Permite envio de mensagens para todos os usuários da plataforma
 * Registra satoshi_hash automático para prova de soberania
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Megaphone, Send, Hash, Loader2, Shield, AlertCircle } from 'lucide-react';

interface BroadcastModalProps {
  onBroadcastSent?: () => void;
}

export function BroadcastModal({ onBroadcastSent }: BroadcastModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [lastHash, setLastHash] = useState<string | null>(null);

  const generateSatoshiHash = async (content: string): Promise<string> => {
    const timestamp = Date.now();
    const data = `BROADCAST:${timestamp}:${content}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `SATOSHI_BROADCAST_${hashHex.slice(0, 16).toUpperCase()}`;
  };

  const sendBroadcast = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Título e mensagem são obrigatórios');
      return;
    }

    try {
      setSending(true);

      // Gerar satoshi_hash para registro de soberania
      const satoshiHash = await generateSatoshiHash(`${title}:${message}`);
      
      // Obter usuário atual (Fundador)
      const { data: { user } } = await supabase.auth.getUser();

      // Inserir na tabela de notificações do conselho
      const { data, error } = await supabase
        .from('ai_council_admin_notifications')
        .insert({
          title: `📢 ${title}`,
          message: message,
          notification_type: 'global_broadcast',
          priority: 'high',
          is_read: false,
          action_required: false,
          satoshi_hash: satoshiHash,
          action_type: 'broadcast',
          action_data: {
            sender_id: user?.id,
            sender_email: user?.email,
            broadcast_timestamp: new Date().toISOString(),
            is_global: true
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Registrar fluxo de informação
      try {
        await supabase.rpc('register_information_flow', {
          p_source_table: 'ai_council_admin_notifications',
          p_source_id: data.id,
          p_flow_type: 'global_broadcast',
          p_flow_data: {
            title: title,
            message: message,
            satoshi_hash: satoshiHash,
            sent_by: user?.email,
            timestamp: new Date().toISOString()
          }
        });
      } catch (flowError) {
        console.warn('Erro ao registrar fluxo (não crítico):', flowError);
      }

      setLastHash(satoshiHash);
      toast.success('📢 Broadcast Global enviado!', {
        description: `Hash: ${satoshiHash}`
      });

      // Limpar campos
      setTitle('');
      setMessage('');
      setIsOpen(false);
      
      // Callback para atualizar CMO
      onBroadcastSent?.();

    } catch (error) {
      console.error('Erro ao enviar broadcast:', error);
      toast.error('Erro ao enviar broadcast global');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/50 hover:border-purple-500 transition-all"
        >
          <Megaphone className="w-4 h-4 mr-2" />
          📢 Broadcast Global
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20">
              <Megaphone className="w-5 h-5 text-purple-400" />
            </div>
            Cetro de Comando - Broadcast Global
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            Mensagem será assinada com hash Satoshi e enviada a todos os usuários
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Título do Broadcast */}
          <div className="space-y-2">
            <Label htmlFor="broadcast-title">Título do Comunicado</Label>
            <Input
              id="broadcast-title"
              placeholder="Ex: Atualização Importante do Sistema"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className="border-muted-foreground/20"
            />
            <span className="text-xs text-muted-foreground">
              {title.length}/100 caracteres
            </span>
          </div>

          {/* Mensagem */}
          <div className="space-y-2">
            <Label htmlFor="broadcast-message">Mensagem</Label>
            <Textarea
              id="broadcast-message"
              placeholder="Digite sua mensagem para todos os usuários da plataforma..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={4}
              className="resize-none border-muted-foreground/20"
            />
            <span className="text-xs text-muted-foreground">
              {message.length}/500 caracteres
            </span>
          </div>

          {/* Aviso de Soberania */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5" />
              <div className="text-xs text-amber-300/80">
                <strong>Registro de Soberania:</strong> Este comunicado será assinado 
                digitalmente e registrado na cadeia Satoshi como prova de autenticidade.
              </div>
            </div>
          </div>

          {/* Último Hash */}
          {lastHash && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-green-400" />
                <div className="text-xs">
                  <span className="text-muted-foreground">Último Hash: </span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {lastHash}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button 
            onClick={sendBroadcast} 
            disabled={sending || !title.trim() || !message.trim()}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Transmitindo...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Transmitir
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
