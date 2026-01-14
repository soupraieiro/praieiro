import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, Copy, CheckCircle2, AlertTriangle, Lock, FileCode } from "lucide-react";

const HARDENING_PROMPT = `Prompt Mestre de Hardening

Você deve auditar o sistema tabela por tabela, função por função e policy por policy.

É estritamente proibido executar alterações automaticamente.

Seu papel é identificar riscos reais, preservar funcionalidades existentes e propor correções mínimas, reversíveis e idempotentes.

É PROIBIDO:
• Quebrar login
• Quebrar cadastro
• Quebrar pagamentos
• Quebrar sessões
• Quebrar webhooks

Toda correção deve:
• Ser mínima
• Ser reversível
• Ser idempotente
• Ser aprovada explicitamente pelo administrador

CHECKLIST DE VERIFICAÇÃO:
□ Todas as tabelas possuem RLS habilitado?
□ Existem policies USING (true) ou WITH CHECK (true)?
□ Existem policies com auth.uid() IS NOT NULL sem validação de ownership?
□ Existem funções sem SET search_path definido?
□ Existem views SECURITY DEFINER sem justificativa?
□ O frontend depende de permissões implícitas ou frágeis?
□ Existe risco de quebra de login, sessão, cadastro ou pagamento?

FORMATO DE ENTREGA:
1. Relatório técnico detalhado
2. Classificação de risco: 🔴 Alto | 🟡 Médio | 🟢 Baixo
3. Recomendações idempotentes e reversíveis
4. Script SQL completo (somente leitura até aprovação)`;

const RULES = [
  { icon: Lock, text: "Nenhuma execução automática", variant: "destructive" as const },
  { icon: AlertTriangle, text: "Nenhuma alteração silenciosa", variant: "destructive" as const },
  { icon: Shield, text: "Nenhuma dependência implícita", variant: "destructive" as const },
  { icon: CheckCircle2, text: "Tudo auditável", variant: "default" as const },
  { icon: CheckCircle2, text: "Tudo reversível", variant: "default" as const },
  { icon: CheckCircle2, text: "Tudo idempotente", variant: "default" as const },
  { icon: CheckCircle2, text: "Tudo decidido pelo administrador", variant: "default" as const },
];

export function HardeningPanel() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(HARDENING_PROMPT);
      setCopied(true);
      toast.success("Prompt copiado para a área de transferência");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Hardening & Correção Controlada</CardTitle>
              <CardDescription>Prompt mestre para auditoria e correção segura do sistema</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Regras Absolutas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Regras Absolutas do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {RULES.map((rule, i) => (
              <div 
                key={i} 
                className={`flex items-center gap-2 p-3 rounded-lg ${
                  rule.variant === "destructive" 
                    ? "bg-destructive/10 border border-destructive/20" 
                    : "bg-emerald-500/10 border border-emerald-500/20"
                }`}
              >
                <rule.icon className={`h-4 w-4 ${
                  rule.variant === "destructive" ? "text-destructive" : "text-emerald-500"
                }`} />
                <span className="text-sm font-medium">{rule.text}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Prompt Mestre */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Prompt Mestre de Hardening</CardTitle>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCopy}
            className="gap-2"
          >
            {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado!" : "Copiar"}
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <pre className="p-4 rounded-lg bg-muted/50 border text-sm font-mono whitespace-pre-wrap">
              {HARDENING_PROMPT}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Instruções de Uso */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como Usar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {[
              "Copie o prompt mestre acima",
              "Cole em uma sessão com a IA assistente (PraieiroBot)",
              "Aguarde o relatório de diagnóstico completo",
              "Analise cada recomendação manualmente",
              "Aprove ou rejeite cada correção individualmente",
              "Execute migrações somente após revisão completa",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 font-mono">
                  {String(i + 1).padStart(2, '0')}
                </Badge>
                <span className="text-sm text-muted-foreground">{step}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rodapé */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="py-4">
          <p className="text-center text-sm font-medium text-amber-600 dark:text-amber-400">
            ⚠️ Nenhuma correção é aplicada automaticamente. Toda ação requer aprovação explícita.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
