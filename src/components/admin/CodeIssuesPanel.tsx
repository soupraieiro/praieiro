import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Code,
  FileCode,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Lock,
  Eye,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  RefreshCw,
  Loader2,
  Hash,
  XCircle
} from "lucide-react";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileNode[];
  issueCount?: number;
}

interface CodeIssue {
  id: string;
  file_path: string;
  line_start: number;
  line_end: number | null;
  issue_type: string;
  severity: string;
  title: string;
  description: string;
  suggested_fix: string | null;
  detected_by: string;
  status: string;
  satoshi_hash: string | null;
  created_at: string;
}

// Sample code with line numbers for demonstration
const SAMPLE_CODE_WITH_ISSUES: Record<string, { content: string; lines: number }> = {
  "src/components/Header.tsx": {
    content: `import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogIn, LogOut, User, History, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-praieiro-circle.png";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  useEffect(() => {
    // TODO: Implementar cache de roles
    checkUserRole();
  }, [user]);

  const checkUserRole = async () => {
    if (!user) return;
    // Potencial memory leak se componente desmontar
    const { data } = await supabase.from("user_roles").select("role");
    setUserRole(data?.[0]?.role || null);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="bg-white shadow-sm">
      {/* ... resto do componente */}
    </header>
  );
}`,
    lines: 35
  },
  "src/hooks/useAuth.tsx": {
    content: `import { createContext, useContext, useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    // ATENÇÃO: Falta validação de input
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}`,
    lines: 52
  },
  "supabase/functions/ai-council/index.ts": {
    content: `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // WARNING: Service key exposto em ambiente de produção
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { category, problem } = await req.json();

    // Chamar AI para análise
    const response = await fetch('https://api.lovable.dev/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: problem })
    });

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // ERRO: Não está logando detalhes do erro
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});`,
    lines: 42
  }
};

// Sample issues for demonstration
const SAMPLE_ISSUES: CodeIssue[] = [
  {
    id: "1",
    file_path: "src/components/Header.tsx",
    line_start: 21,
    line_end: 24,
    issue_type: "memory_leak",
    severity: "error",
    title: "Potencial Memory Leak",
    description: "A chamada assíncrona pode completar após o componente ser desmontado, causando memory leak.",
    suggested_fix: "Adicionar cleanup no useEffect ou usar AbortController",
    detected_by: "ai_analyzer",
    status: "open",
    satoshi_hash: "a1b2c3d4e5f6",
    created_at: new Date().toISOString()
  },
  {
    id: "2",
    file_path: "src/components/Header.tsx",
    line_start: 16,
    line_end: 17,
    issue_type: "todo",
    severity: "warning",
    title: "TODO pendente",
    description: "Há um TODO não implementado que pode afetar performance.",
    suggested_fix: "Implementar cache de roles do usuário",
    detected_by: "ai_analyzer",
    status: "open",
    satoshi_hash: "b2c3d4e5f6g7",
    created_at: new Date().toISOString()
  },
  {
    id: "3",
    file_path: "src/hooks/useAuth.tsx",
    line_start: 32,
    line_end: 35,
    issue_type: "security",
    severity: "error",
    title: "Validação de Input Ausente",
    description: "O método signIn não valida email e password antes de enviar ao servidor.",
    suggested_fix: "Adicionar validação com zod ou yup antes da chamada de autenticação",
    detected_by: "guardian",
    status: "open",
    satoshi_hash: "c3d4e5f6g7h8",
    created_at: new Date().toISOString()
  },
  {
    id: "4",
    file_path: "supabase/functions/ai-council/index.ts",
    line_start: 18,
    line_end: 19,
    issue_type: "security",
    severity: "error",
    title: "Service Key Potencialmente Exposta",
    description: "A service role key está sendo usada diretamente. Garantir que não seja exposta no client.",
    suggested_fix: "Verificar se esta function só é chamada server-side",
    detected_by: "auditor",
    status: "open",
    satoshi_hash: "d4e5f6g7h8i9",
    created_at: new Date().toISOString()
  },
  {
    id: "5",
    file_path: "supabase/functions/ai-council/index.ts",
    line_start: 36,
    line_end: 39,
    issue_type: "logging",
    severity: "warning",
    title: "Error Handling Insuficiente",
    description: "Detalhes do erro não estão sendo logados, dificultando debugging.",
    suggested_fix: "Adicionar console.error(error) antes de retornar resposta de erro",
    detected_by: "optimizer",
    status: "open",
    satoshi_hash: "e5f6g7h8i9j0",
    created_at: new Date().toISOString()
  }
];

const PROJECT_STRUCTURE: FileNode[] = [
  {
    name: "src",
    path: "src",
    type: "folder",
    children: [
      {
        name: "components",
        path: "src/components",
        type: "folder",
        children: [
          { name: "Header.tsx", path: "src/components/Header.tsx", type: "file", issueCount: 2 },
          { name: "DigitalWallet.tsx", path: "src/components/DigitalWallet.tsx", type: "file", issueCount: 0 },
          { name: "VendorCard.tsx", path: "src/components/VendorCard.tsx", type: "file", issueCount: 0 },
        ]
      },
      {
        name: "hooks",
        path: "src/hooks",
        type: "folder",
        children: [
          { name: "useAuth.tsx", path: "src/hooks/useAuth.tsx", type: "file", issueCount: 1 },
          { name: "useProfile.ts", path: "src/hooks/useProfile.ts", type: "file", issueCount: 0 },
        ]
      },
      { name: "App.tsx", path: "src/App.tsx", type: "file", issueCount: 0 },
    ]
  },
  {
    name: "supabase",
    path: "supabase",
    type: "folder",
    children: [
      {
        name: "functions",
        path: "supabase/functions",
        type: "folder",
        children: [
          { name: "ai-council", path: "supabase/functions/ai-council/index.ts", type: "file", issueCount: 2 },
        ]
      },
    ]
  },
];

export function CodeIssuesPanel() {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["src", "supabase", "src/components", "src/hooks", "supabase/functions"]));
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [issues, setIssues] = useState<CodeIssue[]>(SAMPLE_ISSUES);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const getIssuesForFile = (filePath: string) => {
    return issues.filter(issue => issue.file_path === filePath);
  };

  const getIssueLinesForFile = (filePath: string) => {
    const fileIssues = getIssuesForFile(filePath);
    const errorLines = new Set<number>();
    const warningLines = new Set<number>();
    
    fileIssues.forEach(issue => {
      const start = issue.line_start;
      const end = issue.line_end || start;
      for (let line = start; line <= end; line++) {
        if (issue.severity === "error") errorLines.add(line);
        else if (issue.severity === "warning") warningLines.add(line);
      }
    });
    
    return { errorLines, warningLines };
  };

  const getIssueAtLine = (filePath: string, lineNumber: number): CodeIssue | undefined => {
    return issues.find(issue => 
      issue.file_path === filePath && 
      lineNumber >= issue.line_start && 
      lineNumber <= (issue.line_end || issue.line_start)
    );
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error": return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "error": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "warning": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      default: return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    }
  };

  const resolveIssue = async (issueId: string) => {
    setIssues(prev => prev.filter(i => i.id !== issueId));
    toast.success("Issue marcada como resolvida");
  };

  const filteredIssues = issues.filter(issue => {
    if (activeTab === "all") return true;
    if (activeTab === "errors") return issue.severity === "error";
    if (activeTab === "warnings") return issue.severity === "warning";
    return true;
  });

  const renderNode = (node: FileNode, depth: number = 0): JSX.Element => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFile === node.path;
    const hasIssues = (node.issueCount || 0) > 0;

    if (node.type === "folder") {
      return (
        <div key={node.path}>
          <button
            onClick={() => toggleFolder(node.path)}
            className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded text-left text-sm"
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <FolderOpen className="h-4 w-4 text-amber-500" />
            <span className="font-medium">{node.name}</span>
          </button>
          {isExpanded && node.children?.map(child => renderNode(child, depth + 1))}
        </div>
      );
    }

    return (
      <button
        key={node.path}
        onClick={() => setSelectedFile(node.path)}
        className={`w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded text-left text-sm ${
          isSelected ? "bg-primary/10 text-primary" : ""
        }`}
        style={{ paddingLeft: `${depth * 16 + 24}px` }}
      >
        <FileCode className={`h-4 w-4 ${hasIssues ? "text-red-500" : "text-blue-500"}`} />
        <span className="flex-1">{node.name}</span>
        {hasIssues && (
          <Badge variant="destructive" className="h-5 px-1.5 text-xs">
            {node.issueCount}
          </Badge>
        )}
      </button>
    );
  };

  const renderCodeWithHighlighting = (filePath: string) => {
    const fileData = SAMPLE_CODE_WITH_ISSUES[filePath];
    if (!fileData) {
      return (
        <pre className="text-sm font-mono text-muted-foreground">
          {`// Arquivo: ${filePath}\n// Conteúdo não disponível para visualização`}
        </pre>
      );
    }

    const lines = fileData.content.split("\n");
    const { errorLines, warningLines } = getIssueLinesForFile(filePath);

    return (
      <TooltipProvider>
        <div className="font-mono text-sm">
          {lines.map((line, index) => {
            const lineNumber = index + 1;
            const isError = errorLines.has(lineNumber);
            const isWarning = !isError && warningLines.has(lineNumber);
            const issue = getIssueAtLine(filePath, lineNumber);

            const lineContent = (
              <div
                className={`flex ${
                  isError 
                    ? "bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500" 
                    : isWarning 
                      ? "bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500"
                      : "hover:bg-muted/50"
                }`}
              >
                <span className="w-12 text-right pr-4 text-muted-foreground select-none border-r bg-muted/30">
                  {lineNumber}
                </span>
                <span className="pl-4 flex-1 whitespace-pre">
                  {line || " "}
                </span>
                {(isError || isWarning) && (
                  <span className="px-2">
                    {isError ? (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                  </span>
                )}
              </div>
            );

            if (issue) {
              return (
                <Tooltip key={lineNumber}>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">{lineContent}</div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(issue.severity)}
                        <span className="font-semibold">{issue.title}</span>
                      </div>
                      <p className="text-sm">{issue.description}</p>
                      {issue.suggested_fix && (
                        <div className="text-sm text-muted-foreground">
                          <strong>Sugestão:</strong> {issue.suggested_fix}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        {issue.satoshi_hash}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={lineNumber}>{lineContent}</div>;
          })}
        </div>
      </TooltipProvider>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Code className="h-6 w-6 text-primary" />
            Visualizador de Código com Issues
          </h2>
          <p className="text-muted-foreground flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Modo somente leitura - Linhas problemáticas são destacadas
          </p>
        </div>
        <Button variant="outline" onClick={() => setLoading(true)}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Escanear
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Issues</p>
                <p className="text-2xl font-bold">{issues.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Erros</p>
                <p className="text-2xl font-bold text-red-600">
                  {issues.filter(i => i.severity === "error").length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avisos</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {issues.filter(i => i.severity === "warning").length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Arquivos Afetados</p>
                <p className="text-2xl font-bold">
                  {new Set(issues.map(i => i.file_path)).size}
                </p>
              </div>
              <FileCode className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* File Tree */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Estrutura do Projeto</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="h-[500px]">
              {PROJECT_STRUCTURE.map(node => renderNode(node))}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Code View */}
        <Card className="lg:col-span-3">
          {selectedFile ? (
            <>
              <CardHeader className="border-b py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-mono">{selectedFile}</span>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    Somente Leitura
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {renderCodeWithHighlighting(selectedFile)}
                </ScrollArea>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-[500px] text-muted-foreground">
              <div className="text-center">
                <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecione um arquivo para visualizar</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Issues List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Lista de Issues
            </CardTitle>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">Todas ({issues.length})</TabsTrigger>
                <TabsTrigger value="errors" className="text-red-600">
                  Erros ({issues.filter(i => i.severity === "error").length})
                </TabsTrigger>
                <TabsTrigger value="warnings" className="text-yellow-600">
                  Avisos ({issues.filter(i => i.severity === "warning").length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {filteredIssues.map((issue) => (
                <div 
                  key={issue.id} 
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedFile(issue.file_path)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(issue.severity)}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{issue.title}</span>
                          <Badge className={getSeverityBadge(issue.severity)}>
                            {issue.severity}
                          </Badge>
                          <Badge variant="outline">{issue.issue_type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{issue.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="font-mono">{issue.file_path}</span>
                          <span>Linha {issue.line_start}{issue.line_end ? `-${issue.line_end}` : ""}</span>
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {issue.satoshi_hash?.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); resolveIssue(issue.id); }}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Resolver
                    </Button>
                  </div>
                </div>
              ))}
              {filteredIssues.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
                  <p>Nenhuma issue encontrada</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
