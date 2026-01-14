import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, Loader2, Search, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface WalletTransferDialogProps {
  currentBalance: number;
  onTransferComplete?: () => void;
}

export function WalletTransferDialog({ currentBalance, onTransferComplete }: WalletTransferDialogProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [recipientKey, setRecipientKey] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [recipientInfo, setRecipientInfo] = useState<{ name: string; key: string } | null>(null);

  // Get current user's profile
  const { data: currentProfile } = useQuery({
    queryKey: ["current-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      // IDENTIDADE SOBERANA: profiles.id = auth.users.id
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const searchRecipient = async () => {
    if (!recipientKey.trim()) {
      toast.error("Digite a chave do destinatário");
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("account_identifiers")
        .select("profile_id, public_key, profiles(full_name)")
        .eq("public_key", recipientKey.trim().toUpperCase())
        .single();

      if (error || !data) {
        toast.error("Destinatário não encontrado");
        setRecipientInfo(null);
        return;
      }

      const profile = data.profiles as any;
      
      // Check if trying to send to self
      if (data.profile_id === currentProfile?.id) {
        toast.error("Você não pode transferir para si mesmo");
        setRecipientInfo(null);
        return;
      }

      setRecipientInfo({
        name: profile?.full_name || "Usuário",
        key: data.public_key,
      });
      toast.success("Destinatário encontrado!");
    } catch {
      toast.error("Erro ao buscar destinatário");
      setRecipientInfo(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleTransfer = async () => {
    const transferAmount = parseFloat(amount);

    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast.error("Digite um valor válido");
      return;
    }

    if (transferAmount > currentBalance) {
      toast.error("Saldo insuficiente");
      return;
    }

    if (transferAmount < 1) {
      toast.error("Valor mínimo: R$ 1,00");
      return;
    }

    if (!recipientInfo) {
      toast.error("Selecione um destinatário válido");
      return;
    }

    setIsTransferring(true);
    try {
      // Get recipient profile ID
      const { data: recipientData } = await supabase
        .from("account_identifiers")
        .select("profile_id")
        .eq("public_key", recipientInfo.key)
        .single();

      if (!recipientData || !currentProfile) {
        throw new Error("Erro ao processar transferência");
      }

      // Create transfer record
      const { error: transferError } = await supabase
        .from("wallet_transfers")
        .insert({
          sender_profile_id: currentProfile.id,
          recipient_profile_id: recipientData.profile_id,
          amount: transferAmount,
          description: description.trim() || `Transferência para ${recipientInfo.name}`,
          status: "pending",
        });

      if (transferError) throw transferError;

      toast.success(`Transferência de R$ ${transferAmount.toFixed(2)} enviada!`, {
        description: `Para: ${recipientInfo.name}`,
      });

      setIsOpen(false);
      setRecipientKey("");
      setAmount("");
      setDescription("");
      setRecipientInfo(null);
      onTransferComplete?.();
    } catch (error) {
      console.error("Transfer error:", error);
      toast.error("Erro ao processar transferência");
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1.5 text-xs px-3 h-8 border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400 hover:bg-sky-500/20 hover:text-sky-600 dark:hover:text-sky-300 rounded-full"
        >
          <Send className="h-3.5 w-3.5" />
          Transferir
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Transferir Saldo
          </DialogTitle>
          <DialogDescription>
            Transfira saldo para outra conta usando a chave de identificação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Available Balance */}
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">Saldo disponível</p>
            <p className="text-xl font-bold text-green-600">
              R$ {currentBalance.toFixed(2)}
            </p>
          </div>

          {/* Recipient Search */}
          <div className="space-y-2">
            <Label>Chave do destinatário</Label>
            <div className="flex gap-2">
              <Input
                placeholder="PRA-XXXXXXXX-XXXX-XXXX"
                value={recipientKey}
                onChange={(e) => {
                  setRecipientKey(e.target.value.toUpperCase());
                  setRecipientInfo(null);
                }}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                onClick={searchRecipient}
                disabled={isSearching || !recipientKey.trim()}
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Recipient Info */}
          {recipientInfo && (
            <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">{recipientInfo.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{recipientInfo.key}</p>
              </div>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label>Valor da transferência</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                type="number"
                step="0.01"
                min="1"
                max={currentBalance}
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Input
              placeholder="Ex: Pagamento, presente..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 p-3 text-sm text-yellow-700">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>Verifique os dados antes de confirmar. Transferências não podem ser desfeitas.</p>
          </div>

          {/* Transfer Button */}
          <Button
            className="w-full"
            onClick={handleTransfer}
            disabled={isTransferring || !recipientInfo || !amount}
          >
            {isTransferring ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Confirmar Transferência
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
