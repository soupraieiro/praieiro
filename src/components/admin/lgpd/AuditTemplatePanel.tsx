import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  ClipboardList, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  Shield,
  Database,
  Key,
  Eye
} from "lucide-react";

const AUDIT_TEMPLATE = `🧾 Template de Auditoria Técnica de Hardening
(Somente Diagnóstico)

═══════════════════════════════════════════════════════

OBJETIVO:
Auditar segurança, RLS, policies, funções, papéis e 
sincronização frontend/backend.

═══════════════════════════════════════════════════════

REGRAS ABSOLUTAS:
❌ NÃO executar SQL
❌ NÃO aplicar migrações
❌ NÃO alterar código
✅ Somente leitura, análise e diagnóstico

═══════════════════════════════════════════════════════

CHECKLIST MÍNIMO:

□ Todas as tabelas possuem RLS habilitado?
□ Existem policies USING (true) ou WITH CHECK (true)?
□ Existem policies com auth.uid() IS NOT NULL 
  sem validação de ownership?
□ Existem funções sem SET search_path definido?
□ Existem views SECURITY DEFINER sem justificativa?
□ O frontend depende de permissões implícitas ou frágeis?
□ Existe risco de quebra de login, sessão, 
  cadastro ou pagamento?

═══════════════════════════════════════════════════════

ENTREGA DA AUDITORIA:

1. Relatório técnico detalhado
2. Classificação de risco: 
   🔴 Alto | 🟡 Médio | 🟢 Baixo
3. Recomendações idempotentes e reversíveis
4. Nenhuma execução automática

═══════════════════════════════════════════════════════`;

const CHECKLIST_ITEMS = [
  { id: "rls", label: "Todas as tabelas possuem RLS habilitado?", category: "security" },
  { id: "using-true", label: "Existem policies USING (true) ou WITH CHECK (true)?", category: "policies" },
  { id: "auth-uid", label: "Existem policies com auth.uid() IS NOT NULL sem validação de ownership?", category: "policies" },
  { id: "search-path", label: "Existem funções sem SET search_path definido?", category: "functions" },
  { id: "security-definer", label: "Existem views SECURITY DEFINER sem justificativa?", category: "views" },
  { id: "frontend-deps", label: "O frontend depende de permissões implícitas ou frágeis?", category: "frontend" },
  { id: "critical-flows", label: "Existe risco de quebra de login, sessão, cadastro ou pagamento?", category: "critical" },
];

export function AuditTemplatePanel() {
  const [copied, setCopied] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(AUDIT_TEMPLATE);
      setCopied(true);
      toast.success("Template copiado para a área de transferência");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const toggleItem = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const progress = (checkedCount / CHECKLIST_ITEMS.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ClipboardList className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Auditoria Técnica</CardTitle>
              <CardDescription>Templates reutilizáveis para diagnóstico de segurança</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Aviso Importante */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-600 dark:text-amber-400">
              <strong>Somente Diagnóstico:</strong> Estas ferramentas não executam alterações. 
              Todas as análises são apenas para leitura.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Template Copiável */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Template de Auditoria</CardTitle>
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
              <pre className="p-4 rounded-lg bg-muted/50 border text-xs font-mono whitespace-pre-wrap">
                {AUDIT_TEMPLATE}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Checklist Interativo */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Checklist de Verificação</CardTitle>
              </div>
              <Badge variant="outline" className="font-mono">
                {checkedCount}/{CHECKLIST_ITEMS.length}
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {CHECKLIST_ITEMS.map((item) => (
                  <div 
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      checkedItems[item.id] 
                        ? "bg-emerald-500/10 border-emerald-500/30" 
                        : "bg-muted/30 hover:bg-muted/50"
                    }`}
                    onClick={() => toggleItem(item.id)}
                  >
                    <Checkbox 
                      checked={checkedItems[item.id] || false}
                      onCheckedChange={() => toggleItem(item.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="text-sm">{item.label}</p>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {item.category}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Categorias de Análise */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Áreas de Análise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Database, label: "RLS & Policies", desc: "Row Level Security" },
              { icon: Key, label: "Funções", desc: "search_path & SECURITY" },
              { icon: Eye, label: "Views", desc: "SECURITY DEFINER" },
              { icon: Shield, label: "Fluxos Críticos", desc: "Auth, Pagamentos" },
            ].map((area, i) => (
              <div key={i} className="p-4 rounded-lg border bg-muted/30">
                <area.icon className="h-8 w-8 text-primary mb-2" />
                <h4 className="font-medium">{area.label}</h4>
                <p className="text-xs text-muted-foreground">{area.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
