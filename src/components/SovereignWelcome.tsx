import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, Fingerprint, Coins, CheckCircle2, Copy, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useSatoshiLedger } from "@/hooks/useSatoshiLedger";
import { useAuth } from "@/hooks/useAuth";

interface SovereignWelcomeProps {
  onContinue?: () => void;
}

export function SovereignWelcome({ onContinue }: SovereignWelcomeProps) {
  const { user } = useAuth();
  const { userState, loading, error, loadUserLedgerState, registerUserSignup } = useSatoshiLedger();
  const { toast } = useToast();
  const [isRegistering, setIsRegistering] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserLedgerState();
    }
  }, [user, loadUserLedgerState]);

  // Auto-registrar se for novo usuário
  useEffect(() => {
    const autoRegister = async () => {
      if (user && userState && !userState.isRegistered && !isRegistering) {
        setIsRegistering(true);
        const event = await registerUserSignup('google');
        if (event) {
          toast({
            title: "🎉 Bem-vindo ao PRAIEIRO!",
            description: `Você recebeu 1.000 ZIMBU de bônus! Seu registro é imutável e soberano.`,
          });
        }
        setIsRegistering(false);
      }
    };
    autoRegister();
  }, [user, userState, registerUserSignup, toast, isRegistering]);

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast({
      title: "Hash copiado!",
      description: "Certificado de Ledger copiado para a área de transferência",
    });
  };

  const formatHash = (hash: string) => {
    if (!hash) return '';
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  if (loading || isRegistering) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
            <Skeleton className="h-6 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-destructive/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/50">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Violação Constitucional</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">{error}</p>
            <Button onClick={loadUserLedgerState} className="w-full mt-4">
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-primary/20 shadow-xl overflow-hidden">
          {/* Header com gradiente */}
          <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="flex items-center justify-center mb-4"
            >
              <div className="w-20 h-20 rounded-full bg-primary-foreground/20 flex items-center justify-center backdrop-blur">
                <Coins className="w-10 h-10" />
              </div>
            </motion.div>
            <h1 className="text-2xl font-bold text-center">Saldo Soberano</h1>
            <p className="text-center text-primary-foreground/80 text-sm">
              Sua riqueza no ecossistema PRAIEIRO
            </p>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Saldo ZIMBU */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="text-5xl font-bold text-primary mb-2">
                {userState?.balance?.toLocaleString('pt-BR') || 0}
              </div>
              <Badge variant="secondary" className="text-sm">
                <Coins className="w-3 h-3 mr-1" />
                ZIMBU
              </Badge>
              {userState?.isRegistered && (
                <p className="text-xs text-muted-foreground mt-2">
                  Inclui bônus de boas-vindas de 1.000 ZIMBU
                </p>
              )}
            </motion.div>

            {/* Certificado de Ledger */}
            {userState?.signupEvent && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <button
                  onClick={() => setShowCertificate(!showCertificate)}
                  className="w-full"
                >
                  <Card className="bg-muted/50 border-dashed cursor-pointer hover:bg-muted transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                          <Fingerprint className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-sm">Certificado de Ledger</p>
                          <p className="text-xs text-muted-foreground">
                            Registro imutável e soberano
                          </p>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                </button>

                {showCertificate && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 p-4 bg-muted/30 rounded-lg border border-dashed"
                  >
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Event Hash (SHA-256)</p>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-background px-2 py-1 rounded flex-1 overflow-hidden">
                            {formatHash(userState.signupEvent.event_hash || '')}
                          </code>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => copyHash(userState.signupEvent?.event_hash || '')}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Sequência</p>
                          <p className="font-mono font-medium">#{userState.signupEvent.sequence}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Moeda</p>
                          <p className="font-medium">{userState.signupEvent.currency}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Registrado em</p>
                        <p className="text-xs font-medium">
                          {new Date(userState.signupEvent.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-dashed">
                        <p className="text-[10px] text-muted-foreground text-center">
                          Este registro é protegido pelos Axiomas A0-A0.5 da Constituição PRAIEIRO.
                          Nenhuma entidade pode alterá-lo ou removê-lo.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Status de verificação */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-2 text-xs text-muted-foreground"
            >
              <Shield className="w-3 h-3 text-green-600" />
              <span>Protegido pela Constituição Técnica PRAIEIRO</span>
            </motion.div>

            {/* Botão continuar */}
            {onContinue && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button onClick={onContinue} className="w-full" size="lg">
                  Continuar para o App
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
