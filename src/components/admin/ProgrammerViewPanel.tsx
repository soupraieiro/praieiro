import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Code, FileCode, FolderOpen, ChevronRight, ChevronDown, Lock, Eye } from "lucide-react";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileNode[];
  content?: string;
}

// Representação visual da estrutura do projeto
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
          { name: "Header.tsx", path: "src/components/Header.tsx", type: "file" },
          { name: "DigitalWallet.tsx", path: "src/components/DigitalWallet.tsx", type: "file" },
          { name: "VendorCard.tsx", path: "src/components/VendorCard.tsx", type: "file" },
          { name: "PraieiroChatWidget.tsx", path: "src/components/PraieiroChatWidget.tsx", type: "file" },
          { name: "BeachWeatherCard.tsx", path: "src/components/BeachWeatherCard.tsx", type: "file" },
          { name: "OperatingHoursTimer.tsx", path: "src/components/OperatingHoursTimer.tsx", type: "file" },
        ]
      },
      {
        name: "pages",
        path: "src/pages",
        type: "folder",
        children: [
          { name: "Index.tsx", path: "src/pages/Index.tsx", type: "file" },
          { name: "DashboardPage.tsx", path: "src/pages/DashboardPage.tsx", type: "file" },
          { name: "VendorDashboardPage.tsx", path: "src/pages/VendorDashboardPage.tsx", type: "file" },
          { name: "AdminDashboardPage.tsx", path: "src/pages/AdminDashboardPage.tsx", type: "file" },
        ]
      },
      {
        name: "hooks",
        path: "src/hooks",
        type: "folder",
        children: [
          { name: "useAuth.tsx", path: "src/hooks/useAuth.tsx", type: "file" },
          { name: "useProfile.ts", path: "src/hooks/useProfile.ts", type: "file" },
          { name: "useTransactions.ts", path: "src/hooks/useTransactions.ts", type: "file" },
        ]
      },
      { name: "App.tsx", path: "src/App.tsx", type: "file" },
      { name: "main.tsx", path: "src/main.tsx", type: "file" },
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
          { name: "praieiro-chat", path: "supabase/functions/praieiro-chat/index.ts", type: "file" },
          { name: "weather-multi", path: "supabase/functions/weather-multi/index.ts", type: "file" },
          { name: "ai-council", path: "supabase/functions/ai-council/index.ts", type: "file" },
        ]
      },
      { name: "config.toml", path: "supabase/config.toml", type: "file" },
    ]
  },
];

const SAMPLE_CODE: Record<string, string> = {
  "src/components/Header.tsx": `import { useState, useEffect } from "react";
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

  // ... resto do código
}`,
  "src/App.tsx": `import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PraieiroChatWidget } from "@/components/PraieiroChatWidget";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* ... rotas */}
          </Routes>
          <PraieiroChatWidget />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);`,
  "supabase/functions/praieiro-chat/index.ts": `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { message, sessionId, userId } = await req.json();
  
  // Lógica do chatbot Praieiro
  // Usa o Lovable AI Gateway para respostas
  
  return new Response(JSON.stringify({ response }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});`,
};

export function ProgrammerViewPanel() {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["src", "supabase"]));
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderNode = (node: FileNode, depth: number = 0): JSX.Element => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFile === node.path;

    if (node.type === "folder") {
      return (
        <div key={node.path}>
          <button
            onClick={() => toggleFolder(node.path)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded text-left text-sm`}
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
        <FileCode className="h-4 w-4 text-blue-500" />
        <span>{node.name}</span>
      </button>
    );
  };

  return (
    <Card className="h-[calc(100vh-200px)]">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Code className="h-5 w-5" />
          Visualizador de Código-Fonte
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          <Lock className="h-4 w-4" />
          Modo somente leitura - Código não pode ser alterado nesta visualização
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex h-[calc(100vh-320px)] border-t">
          {/* File Tree */}
          <div className="w-64 border-r overflow-y-auto p-2 bg-muted/20">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-2">
              Estrutura do Projeto
            </div>
            {PROJECT_STRUCTURE.map(node => renderNode(node))}
          </div>

          {/* Code View */}
          <div className="flex-1 flex flex-col">
            {selectedFile ? (
              <>
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-mono">{selectedFile}</span>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    Somente Leitura
                  </Badge>
                </div>
                <ScrollArea className="flex-1 p-4">
                  <pre className="text-sm font-mono text-muted-foreground whitespace-pre-wrap">
                    {SAMPLE_CODE[selectedFile] || `// Conteúdo do arquivo: ${selectedFile}\n\n// Este é um visualizador seguro.\n// O código completo está protegido.`}
                  </pre>
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Selecione um arquivo para visualizar</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
