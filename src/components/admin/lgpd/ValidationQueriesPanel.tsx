import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Database, 
  Copy, 
  CheckCircle2, 
  AlertTriangle,
  Shield,
  Eye,
  Key,
  Lock
} from "lucide-react";

interface ValidationQuery {
  id: string;
  title: string;
  description: string;
  category: "rls" | "policies" | "functions" | "views" | "critical";
  risk: "high" | "medium" | "low";
  query: string;
}

const VALIDATION_QUERIES: ValidationQuery[] = [
  {
    id: "tables-without-rls",
    title: "Tabelas sem RLS habilitado",
    description: "Lista todas as tabelas públicas que não possuem Row Level Security ativado",
    category: "rls",
    risk: "high",
    query: `-- Listar tabelas sem RLS habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;`
  },
  {
    id: "permissive-policies",
    title: "Policies permissivas (USING true)",
    description: "Identifica policies que permitem acesso irrestrito com USING (true) ou WITH CHECK (true)",
    category: "policies",
    risk: "high",
    query: `-- Listar policies permissivas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual::text ILIKE '%true%'
    OR with_check::text ILIKE '%true%'
  )
ORDER BY tablename, policyname;`
  },
  {
    id: "weak-auth-policies",
    title: "Policies com auth.uid() fraco",
    description: "Policies que usam apenas auth.uid() IS NOT NULL sem validação de ownership",
    category: "policies",
    risk: "medium",
    query: `-- Listar policies com auth.uid() potencialmente fraco
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual::text ILIKE '%auth.uid()%is not null%'
    OR with_check::text ILIKE '%auth.uid()%is not null%'
  )
  AND qual::text NOT ILIKE '%user_id%'
  AND qual::text NOT ILIKE '%owner_id%'
  AND qual::text NOT ILIKE '%profile_id%'
ORDER BY tablename, policyname;`
  },
  {
    id: "functions-without-search-path",
    title: "Funções sem search_path",
    description: "Funções que não definem SET search_path, potencial risco de segurança",
    category: "functions",
    risk: "medium",
    query: `-- Listar funções sem search_path definido
SELECT 
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) NOT ILIKE '%search_path%'
ORDER BY p.proname;`
  },
  {
    id: "security-definer-views",
    title: "Views SECURITY DEFINER",
    description: "Views que executam com privilégios do criador, requer justificativa",
    category: "views",
    risk: "medium",
    query: `-- Listar views SECURITY DEFINER
SELECT 
  schemaname,
  viewname,
  viewowner,
  definition
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- Nota: Views não têm SECURITY DEFINER diretamente,
-- mas podem chamar funções SECURITY DEFINER`
  },
  {
    id: "auth-critical-tables",
    title: "Tabelas críticas de autenticação",
    description: "Verifica policies nas tabelas que impactam login, sessão e cadastro",
    category: "critical",
    risk: "high",
    query: `-- Verificar policies em tabelas críticas
SELECT 
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles',
    'user_roles',
    'user_sessions',
    'clients',
    'vendors'
  )
ORDER BY tablename, policyname;`
  },
  {
    id: "payment-tables",
    title: "Tabelas de pagamento",
    description: "Verifica segurança nas tabelas relacionadas a transações e pagamentos",
    category: "critical",
    risk: "high",
    query: `-- Verificar policies em tabelas de pagamento
SELECT 
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'transactions',
    'concha_transactions',
    'client_conchas',
    'vendor_conchas',
    'pix_withdrawals',
    'orders'
  )
ORDER BY tablename, policyname;`
  },
];

const CATEGORY_CONFIG = {
  rls: { icon: Lock, label: "RLS", color: "text-blue-500" },
  policies: { icon: Shield, label: "Policies", color: "text-purple-500" },
  functions: { icon: Key, label: "Funções", color: "text-amber-500" },
  views: { icon: Eye, label: "Views", color: "text-cyan-500" },
  critical: { icon: AlertTriangle, label: "Crítico", color: "text-red-500" },
};

const RISK_CONFIG = {
  high: { label: "Alto", className: "bg-red-500/10 text-red-500 border-red-500/30" },
  medium: { label: "Médio", className: "bg-amber-500/10 text-amber-500 border-amber-500/30" },
  low: { label: "Baixo", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" },
};

export function ValidationQueriesPanel() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (query: ValidationQuery) => {
    try {
      await navigator.clipboard.writeText(query.query);
      setCopiedId(query.id);
      toast.success(`Query "${query.title}" copiada`);
      setTimeout(() => setCopiedId(null), 2000);
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
              <Database className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Validação Pós-Migração</CardTitle>
              <CardDescription>Queries de somente leitura para validação de segurança</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Aviso Crítico */}
      <Card className="border-red-500/30 bg-red-500/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                ⚠️ Estas queries NÃO modificam dados nem executam correções.
              </p>
              <p className="text-xs text-red-500/70 mt-1">
                São exclusivamente para diagnóstico e validação em modo somente leitura.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Queries */}
      <div className="space-y-4">
        {VALIDATION_QUERIES.map((query) => {
          const CategoryIcon = CATEGORY_CONFIG[query.category].icon;
          const riskConfig = RISK_CONFIG[query.risk];
          
          return (
            <Card key={query.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <CategoryIcon className={`h-5 w-5 mt-0.5 ${CATEGORY_CONFIG[query.category].color}`} />
                    <div>
                      <CardTitle className="text-base">{query.title}</CardTitle>
                      <CardDescription className="mt-1">{query.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={riskConfig.className}>
                      {riskConfig.label}
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleCopy(query)}
                      className="gap-2"
                    >
                      {copiedId === query.id ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {copiedId === query.id ? "Copiado!" : "Copiar"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[200px]">
                  <pre className="p-3 rounded-lg bg-muted/50 border text-xs font-mono overflow-x-auto">
                    {query.query}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Rodapé */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="py-4">
          <p className="text-center text-sm font-medium text-amber-600 dark:text-amber-400">
            ⚠️ Execute estas queries manualmente no console SQL. Nenhuma execução automática.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
