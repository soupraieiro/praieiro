import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  AlertTriangle, 
  Shield, 
  Bug, 
  TrendingUp, 
  Send, 
  Loader2,
  RefreshCw,
  FileText,
  MessageSquare,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  category?: string;
}

interface SecurityAlert {
  type: "bug" | "security" | "suspicious";
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: Date;
}

export function AIReportsPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<"TECNICA/SEGURANÇA" | "COMERCIAL/ESTRATÉGIA">("TECNICA/SEGURANÇA");
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch security logs for analysis
  const { data: securityLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["security-logs-analysis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch AI verdicts history
  const { data: verdicts, isLoading: verdictsLoading, refetch: refetchVerdicts } = useQuery({
    queryKey: ["ai-verdicts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_ai_verdicts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  // Analyze security alerts
  const securityAlerts: SecurityAlert[] = (securityLogs || [])
    .filter(log => ["login_failed", "rate_limit_exceeded", "suspicious_activity"].includes(log.event_type))
    .slice(0, 10)
    .map(log => ({
      type: log.event_type === "login_failed" ? "security" : 
            log.event_type === "rate_limit_exceeded" ? "suspicious" : "bug",
      title: log.event_type === "login_failed" ? "Tentativa de login falhou" :
             log.event_type === "rate_limit_exceeded" ? "Rate limit excedido" : "Atividade suspeita",
      description: `Identificador: ${log.identifier} - IP: ${log.ip_address || "N/A"}`,
      severity: log.event_type === "login_failed" ? "medium" : "high",
      timestamp: new Date(log.created_at),
    }));

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
      category: activeCategory,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-council", {
        body: {
          problem: inputMessage,
          category: activeCategory,
          includeErrorLogs: true,
          includeSalesData: activeCategory === "COMERCIAL/ESTRATÉGIA",
        },
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.verdict || "Não foi possível processar a análise.",
        timestamp: new Date(),
        category: activeCategory,
      };

      setMessages(prev => [...prev, assistantMessage]);
      refetchVerdicts();
    } catch (error) {
      console.error("AI Council error:", error);
      toast.error("Erro ao consultar o Conselho de IA");
      
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Desculpe, ocorreu um erro ao processar sua consulta. Tente novamente.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500";
      case "high": return "bg-orange-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "bug": return <Bug className="h-4 w-4" />;
      case "security": return <Shield className="h-4 w-4" />;
      case "suspicious": return <AlertTriangle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Relatórios do Conselho de IA
          </h2>
          <p className="text-muted-foreground">
            Análise inteligente de bugs, segurança e transações suspeitas
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => {
            refetchLogs();
            refetchVerdicts();
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts Summary */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Alertas Ativos
            </CardTitle>
            <CardDescription>Problemas detectados recentemente</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {logsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : securityAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mb-2 text-green-500" />
                  <p>Nenhum alerta ativo</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {securityAlerts.map((alert, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${getSeverityColor(alert.severity)} text-white`}>
                          {getAlertIcon(alert.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{alert.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {alert.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(alert.timestamp, "dd/MM HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            alert.severity === "critical" ? "border-red-500 text-red-500" :
                            alert.severity === "high" ? "border-orange-500 text-orange-500" :
                            "border-yellow-500 text-yellow-500"
                          }`}
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* AI Chat Interface */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Chat Estratégico
                </CardTitle>
                <CardDescription>Converse com o Conselho de IA</CardDescription>
              </div>
              <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as any)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="TECNICA/SEGURANÇA" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Técnico
                  </TabsTrigger>
                  <TabsTrigger value="COMERCIAL/ESTRATÉGIA" className="text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Estratégia
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Chat Messages */}
            <ScrollArea className="h-[280px] pr-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Brain className="h-12 w-12 mb-2" />
                  <p className="text-center">
                    Inicie uma conversa para receber análises e recomendações estratégicas
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setInputMessage("Analise os últimos logs de segurança e identifique padrões suspeitos")}
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      Análise de segurança
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setInputMessage("Quais são as métricas mais críticas para acompanhar esta semana?")}
                    >
                      <Activity className="h-3 w-3 mr-1" />
                      Métricas críticas
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div 
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div 
                        className={`max-w-[85%] p-3 rounded-lg ${
                          msg.role === "user" 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted"
                        }`}
                      >
                        {msg.role === "assistant" && (
                          <div className="flex items-center gap-2 mb-2">
                            <Brain className="h-4 w-4 text-primary" />
                            <span className="text-xs font-medium text-primary">Conselho de IA</span>
                            {msg.category && (
                              <Badge variant="outline" className="text-xs">
                                {msg.category === "TECNICA/SEGURANÇA" ? "Técnico" : "Estratégia"}
                              </Badge>
                            )}
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {format(msg.timestamp, "HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted p-3 rounded-lg flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Analisando...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Digite sua pergunta estratégica..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                disabled={isLoading}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={isLoading || !inputMessage.trim()}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Verdicts History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Histórico de Análises
          </CardTitle>
          <CardDescription>Últimas consultas e respostas do Conselho de IA</CardDescription>
        </CardHeader>
        <CardContent>
          {verdictsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : !verdicts || verdicts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2" />
              <p>Nenhuma análise registrada ainda</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {verdicts.map((verdict) => (
                  <div 
                    key={verdict.id}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={verdict.category === "TECNICA/SEGURANÇA" ? "default" : "secondary"}>
                          {verdict.category === "TECNICA/SEGURANÇA" ? (
                            <><Shield className="h-3 w-3 mr-1" />Técnico</>
                          ) : (
                            <><TrendingUp className="h-3 w-3 mr-1" />Estratégia</>
                          )}
                        </Badge>
                        {verdict.consensus_reached && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Consenso
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(verdict.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm font-medium mb-1">{verdict.problem_description}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {verdict.final_verdict}
                    </p>
                    {verdict.processing_time_ms && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        Processado em {verdict.processing_time_ms}ms
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
