import { useEffect } from "react";
import { Shield, AlertTriangle, Scale, Lock, Ban } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import logoPraieiro from "@/assets/logo-praieiro-circle.png";

export default function AccessBlockedPage() {
  useEffect(() => {
    // Prevent navigation away
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);
    
    // Disable back button
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", () => {
      window.history.pushState(null, "", window.location.href);
    });

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-background to-red-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header com Logo */}
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <img 
              src={logoPraieiro} 
              alt="Praieiro" 
              className="h-24 w-24 mx-auto opacity-50 grayscale"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Ban className="h-32 w-32 text-destructive/80" />
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2">
            <Shield className="h-6 w-6 text-destructive animate-pulse" />
            <h1 className="text-2xl font-bold text-destructive">
              ACESSO BLOQUEADO
            </h1>
            <Shield className="h-6 w-6 text-destructive animate-pulse" />
          </div>
        </div>

        {/* Card Principal */}
        <Card className="border-destructive/50 bg-card/80 backdrop-blur">
          <CardHeader className="text-center border-b border-destructive/20">
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">
                Decisão do Conselho de IA Satoshi
              </CardTitle>
            </div>
            <CardDescription>
              Seu acesso foi bloqueado por violação das políticas de segurança
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6 space-y-6">
            {/* Motivo */}
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">Protocolo Satoshi Ativado</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    O sistema detectou atividade suspeita originada deste endereço IP. 
                    Uma tentativa de acesso não autorizado a variáveis protegidas foi registrada 
                    e imutavelmente hashada no Ledger Satoshi.
                  </p>
                </div>
              </div>
            </div>

            {/* Veredicto do Conselho */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Veredicto Unânime do Conselho</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Auditor</p>
                  <Badge variant="destructive" className="mt-1">BLOQUEIO</Badge>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Guardião</p>
                  <Badge variant="destructive" className="mt-1">BLOQUEIO</Badge>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Analista</p>
                  <Badge variant="destructive" className="mt-1">BLOQUEIO</Badge>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Estrategista</p>
                  <Badge variant="destructive" className="mt-1">BLOQUEIO</Badge>
                </div>
              </div>
            </div>

            {/* Informações */}
            <div className="text-center pt-4 border-t space-y-2">
              <p className="text-xs text-muted-foreground">
                Este bloqueio é permanente até análise humana do Administrador.
              </p>
              <p className="text-xs text-muted-foreground">
                Caso acredite que se trata de um erro, entre em contato com o suporte.
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Shield className="h-3 w-3 text-primary" />
                <span className="text-xs font-mono text-muted-foreground">
                  Protocolo Satoshi v1.0 — Ledger Imutável
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Praieiro — Sistema de Segurança Satoshi</p>
        </div>
      </div>
    </div>
  );
}
