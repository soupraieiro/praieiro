import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Code,
  FileCode,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  RefreshCw,
  Loader2,
  Hash,
  XCircle,
  Eye
} from "lucide-react";

interface SourceAudit {
  id: string;
  file_path: string;
  file_name: string;
  source_code: string;
  language: string;
  version: number;
  satoshi_hash: string | null;
  created_at: string;
  updated_at: string;
}

interface CodeIssue {
  id: string;
  source_audit_id: string | null;
  file_path: string;
  line_start: number;
  line_end: number | null;
  severity: string;
  issue_type: string;
  issue_description: string;
  suggested_fix: string | null;
  detected_by: string;
  status: string;
  satoshi_hash: string | null;
  created_at: string;
}

interface FileNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileNode[];
  issueCount: number;
  criticalCount: number;
  warningCount: number;
}

export function DeveloperCodeViewer() {
  const [sources, setSources] = useState<SourceAudit[]>([]);
  const [issues, setIssues] = useState<CodeIssue[]>([]);
  const [selectedFile, setSelectedFile] = useState<SourceAudit | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["src"]));
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    loadData();

    // Realtime subscription for issues
    const channel = supabase
      .channel('developer-issues-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'developer_code_issues' 
      }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load source audits
      const { data: sourcesData, error: sourcesError } = await supabase
        .from("developer_source_audit")
        .select("*")
        .order("file_path", { ascending: true });
      
      if (sourcesError) {
        console.error("Error loading sources:", sourcesError);
      } else if (sourcesData) {
        setSources(sourcesData);
        if (sourcesData.length > 0 && !selectedFile) {
          setSelectedFile(sourcesData[0]);
        }
      }

      // Load code issues
      const { data: issuesData, error: issuesError } = await supabase
        .from("developer_code_issues")
        .select("*")
        .order("severity", { ascending: true })
        .order("line_start", { ascending: true });
      
      if (issuesError) {
        console.error("Error loading issues:", issuesError);
      } else if (issuesData) {
        setIssues(issuesData);
      }

    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados do código");
    } finally {
      setLoading(false);
    }
  };

  const buildFileTree = (): FileNode[] => {
    const tree: Record<string, FileNode> = {};
    
    sources.forEach(source => {
      const parts = source.file_path.split('/');
      let currentPath = '';
      
      parts.forEach((part, index) => {
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!tree[currentPath]) {
          const isFile = index === parts.length - 1;
          const fileIssues = issues.filter(i => i.file_path === source.file_path);
          
          tree[currentPath] = {
            name: part,
            path: currentPath,
            type: isFile ? "file" : "folder",
            children: [],
            issueCount: isFile ? fileIssues.length : 0,
            criticalCount: isFile ? fileIssues.filter(i => i.severity === 'critical').length : 0,
            warningCount: isFile ? fileIssues.filter(i => i.severity === 'warning').length : 0
          };
          
          if (parentPath && tree[parentPath]) {
            tree[parentPath].children?.push(tree[currentPath]);
          }
        }
      });
    });

    // Return only root level nodes
    return Object.values(tree).filter(node => !node.path.includes('/'));
  };

  const getFileIssues = (filePath: string) => {
    return issues.filter(issue => issue.file_path === filePath);
  };

  const getIssueLines = (filePath: string) => {
    const fileIssues = getFileIssues(filePath);
    const criticalLines = new Set<number>();
    const warningLines = new Set<number>();
    
    fileIssues.forEach(issue => {
      const start = issue.line_start;
      const end = issue.line_end || start;
      for (let line = start; line <= end; line++) {
        if (issue.severity === 'critical') criticalLines.add(line);
        else if (issue.severity === 'warning') warningLines.add(line);
      }
    });
    
    return { criticalLines, warningLines };
  };

  const getIssueAtLine = (filePath: string, lineNumber: number): CodeIssue | undefined => {
    return issues.find(issue => 
      issue.file_path === filePath && 
      lineNumber >= issue.line_start && 
      lineNumber <= (issue.line_end || issue.line_start)
    );
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const resolveIssue = async (issueId: string) => {
    try {
      await supabase
        .from('developer_code_issues')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', issueId);
      
      toast.success("Issue marcada como resolvida");
      loadData();
    } catch (error) {
      console.error("Error resolving issue:", error);
      toast.error("Erro ao resolver issue");
    }
  };

  const renderNode = (node: FileNode, depth: number = 0): JSX.Element => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFile?.file_path === node.path;
    const hasIssues = node.issueCount > 0;

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

    const source = sources.find(s => s.file_path === node.path);
    if (!source) return <div key={node.path} />;

    return (
      <button
        key={node.path}
        onClick={() => setSelectedFile(source)}
        className={`w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded text-left text-sm ${
          isSelected ? "bg-primary/10 text-primary" : ""
        }`}
        style={{ paddingLeft: `${depth * 16 + 24}px` }}
      >
        <FileCode className={`h-4 w-4 ${node.criticalCount > 0 ? "text-red-500" : node.warningCount > 0 ? "text-yellow-500" : "text-blue-500"}`} />
        <span className="flex-1 truncate">{node.name}</span>
        {node.criticalCount > 0 && (
          <Badge variant="destructive" className="h-5 px-1.5 text-xs">
            {node.criticalCount}
          </Badge>
        )}
        {node.warningCount > 0 && (
          <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-yellow-100 text-yellow-800">
            {node.warningCount}
          </Badge>
        )}
      </button>
    );
  };

  const filteredIssues = issues.filter(issue => {
    if (activeTab === "all") return true;
    if (activeTab === "critical") return issue.severity === "critical";
    if (activeTab === "warning") return issue.severity === "warning";
    return true;
  });

  const fileTree = buildFileTree();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Code className="h-5 w-5" />
            Visualizador de Código (Read-Only)
          </h3>
          <p className="text-sm text-muted-foreground">
            Código fonte auditável com issues destacadas
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {/* File Tree */}
        <Card className="lg:col-span-1">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Arquivos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px] px-2">
              {fileTree.map(node => renderNode(node))}
              {fileTree.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum arquivo auditado
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Code Viewer */}
        <Card className="lg:col-span-3">
          <CardHeader className="py-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  {selectedFile?.file_name || "Selecione um arquivo"}
                </CardTitle>
                {selectedFile?.satoshi_hash && (
                  <p className="text-xs font-mono text-muted-foreground mt-1">
                    🔗 Hash: {selectedFile.satoshi_hash.slice(0, 24)}...
                  </p>
                )}
              </div>
              {selectedFile && (
                <div className="flex gap-2">
                  <Badge variant="outline">
                    v{selectedFile.version}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {selectedFile.language}
                  </Badge>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {selectedFile ? (
              <TooltipProvider>
                <ScrollArea className="h-[400px]">
                  <div className="font-mono text-sm">
                    {selectedFile.source_code.split('\n').map((line, index) => {
                      const lineNumber = index + 1;
                      const { criticalLines, warningLines } = getIssueLines(selectedFile.file_path);
                      const isCritical = criticalLines.has(lineNumber);
                      const isWarning = !isCritical && warningLines.has(lineNumber);
                      const issue = getIssueAtLine(selectedFile.file_path, lineNumber);

                      const lineContent = (
                        <div
                          className={`flex ${
                            isCritical 
                              ? "bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500" 
                              : isWarning 
                                ? "bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500"
                                : "hover:bg-muted/50"
                          }`}
                        >
                          <span className="w-12 text-right pr-4 text-muted-foreground select-none border-r bg-muted/30 flex-shrink-0">
                            {lineNumber}
                          </span>
                          <span className="pl-4 flex-1 whitespace-pre overflow-x-auto">
                            {line || " "}
                          </span>
                          {(isCritical || isWarning) && (
                            <span className="px-2 flex-shrink-0">
                              {isCritical ? (
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
                            <TooltipContent side="right" className="max-w-sm p-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  {issue.severity === 'critical' ? (
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                  ) : (
                                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                  )}
                                  <span className="font-medium">{issue.issue_type}</span>
                                </div>
                                <p className="text-sm">{issue.issue_description}</p>
                                {issue.suggested_fix && (
                                  <div className="pt-2 border-t">
                                    <p className="text-xs text-muted-foreground">Sugestão:</p>
                                    <p className="text-sm text-green-600">{issue.suggested_fix}</p>
                                  </div>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  Detectado por: {issue.detected_by}
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      }

                      return <div key={lineNumber}>{lineContent}</div>;
                    })}
                  </div>
                </ScrollArea>
              </TooltipProvider>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <FileCode className="h-12 w-12 mb-2 opacity-50" />
                <p>Selecione um arquivo para visualizar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Issues List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Issues Detectadas
            </CardTitle>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-3 h-6">
                  Todas ({issues.length})
                </TabsTrigger>
                <TabsTrigger value="critical" className="text-xs px-3 h-6">
                  Críticas ({issues.filter(i => i.severity === 'critical').length})
                </TabsTrigger>
                <TabsTrigger value="warning" className="text-xs px-3 h-6">
                  Atenção ({issues.filter(i => i.severity === 'warning').length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {filteredIssues.map((issue) => (
                <div 
                  key={issue.id}
                  className={`p-3 border rounded-lg ${
                    issue.severity === 'critical' 
                      ? 'border-red-200 bg-red-50 dark:bg-red-900/10' 
                      : 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {issue.severity === 'critical' ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className="font-medium text-sm">{issue.issue_type}</span>
                        <Badge variant="outline" className="text-xs">
                          Linha {issue.line_start}{issue.line_end ? `-${issue.line_end}` : ''}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{issue.issue_description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        📁 {issue.file_path} | 🤖 {issue.detected_by}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => resolveIssue(issue.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Resolver
                    </Button>
                  </div>
                </div>
              ))}

              {filteredIssues.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
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
