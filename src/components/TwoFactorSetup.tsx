import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Shield, Loader2, Copy, Check } from "lucide-react";

interface TwoFactorSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function TwoFactorSetup({ open, onOpenChange, onComplete }: TwoFactorSetupProps) {
  const [step, setStep] = useState<"intro" | "qrcode" | "verify">("intro");
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [factorId, setFactorId] = useState<string>("");
  const [verifyCode, setVerifyCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep("intro");
      setQrCode("");
      setSecret("");
      setVerifyCode("");
      setFactorId("");
    }
  }, [open]);

  const handleStartEnrollment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator App",
      });

      if (error) throw error;

      if (data) {
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
        setStep("qrcode");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao iniciar configuração 2FA";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verifyCode.length !== 6) {
      toast.error("O código deve ter 6 dígitos");
      return;
    }

    setLoading(true);
    try {
      const { data: challengeData, error: challengeError } = 
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      });

      if (verifyError) throw verifyError;

      toast.success("Autenticação de dois fatores ativada com sucesso!");
      onComplete();
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Código inválido. Tente novamente.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Código copiado!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Configurar Autenticação de Dois Fatores
          </DialogTitle>
          <DialogDescription>
            Adicione uma camada extra de segurança à sua conta de administrador
          </DialogDescription>
        </DialogHeader>

        {step === "intro" && (
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>A autenticação de dois fatores (2FA) protege sua conta contra acessos não autorizados.</p>
              <p>Você precisará de um aplicativo autenticador como:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Google Authenticator</li>
                <li>Authy</li>
                <li>Microsoft Authenticator</li>
              </ul>
            </div>
            <Button onClick={handleStartEnrollment} className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando...
                </>
              ) : (
                "Começar Configuração"
              )}
            </Button>
          </div>
        )}

        {step === "qrcode" && (
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48" />
            </div>
            <div className="text-center text-sm text-muted-foreground">
              <p>Escaneie o QR code com seu aplicativo autenticador</p>
              <p className="mt-2">Ou insira o código manualmente:</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted p-2 rounded text-xs break-all font-mono">
                {secret}
              </code>
              <Button variant="outline" size="icon" onClick={copySecret}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button onClick={() => setStep("verify")} className="w-full">
              Continuar
            </Button>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="verifyCode">Digite o código do autenticador</Label>
              <Input
                id="verifyCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl tracking-widest"
              />
            </div>
            <Button onClick={handleVerify} className="w-full" disabled={loading || verifyCode.length !== 6}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Verificar e Ativar"
              )}
            </Button>
            <Button variant="outline" onClick={() => setStep("qrcode")} className="w-full">
              Voltar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
