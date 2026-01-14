import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Users,
  Send,
  Bot,
  User,
  Shield,
  TrendingUp,
  Brain,
  Eye,
  Zap,
  MessageCircle,
  Loader2,
  Pin,
  Hash,
  RefreshCw,
  Plus
} from "lucide-react";

interface Agent {
  id: string;
  agent_key: string;
  agent_name: string;
  agent_role: string;
  specialization: string[];
  is_active: boolean;
  last_activity_at: string | null;
}

interface MeetingMessage {
  id: string;
  session_id: string;
  sender_type: string;
  sender_id: string | null;
  sender_name: string;
  message_content: string;
  message_type: string;
  is_pinned: boolean;
  satoshi_hash: string | null;
  created_at: string;
}

interface Session {
  id: string;
  session_type: string;
  session_topic: string | null;
  participants: string[];
  status: string;
  started_at: string;
  decisions_made: number;
  suggestions_generated: number;
}

const AGENT_ICONS: Record<string, string> = {
  auditor: "🔐",
  strategist: "📈",
  analyst: "📊",
  guardian: "🛡️",
  optimizer: "⚡"
};

const AGENT_COLORS: Record<string, string> = {
  auditor: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  strategist: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  analyst: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  guardian: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  optimizer: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
};

export function AICouncilMeetingPanel() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [messages, setMessages] = useState<MeetingMessage[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
    
    // Realtime subscription for messages
    const messagesChannel = supabase
      .channel('meeting-messages-realtime')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'ai_council_meeting_messages' 
      }, (payload) => {
        const newMsg = payload.new as MeetingMessage;
        setMessages(prev => [...prev, newMsg]);
        scrollToBottom();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Load agents
      const { data: agentsData } = await supabase
        .from("ai_council_agents")
        .select("*")
        .eq("is_active", true);
      
      if (agentsData) setAgents(agentsData);

      // Load active session
      const { data: sessionData } = await supabase
        .from("ai_council_sessions")
        .select("*")
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionData) {
        setCurrentSession(sessionData);
        
        // Load messages for this session
        const { data: messagesData } = await supabase
          .from("ai_council_meeting_messages")
          .select("*")
          .eq("session_id", sessionData.id)
          .order("created_at", { ascending: true });
        
        if (messagesData) setMessages(messagesData);
      }
    } catch (error) {
      console.error("Error loading meeting data:", error);
      toast.error("Erro ao carregar dados da reunião");
    } finally {
      setLoading(false);
    }
  };

  const createNewSession = async () => {
    try {
      setCreatingSession(true);
      
      const { data: session, error } = await supabase
        .from("ai_council_sessions")
        .insert({
          session_type: "standard",
          session_topic: "Reunião Geral do Conselho",
          participants: agents.map(a => a.agent_key),
          status: "active"
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(session);
      setMessages([]);

      // Create welcome message from each agent
      for (const agent of agents) {
        await supabase.from("ai_council_meeting_messages").insert({
          session_id: session.id,
          sender_type: "agent",
          sender_id: agent.agent_key,
          sender_name: agent.agent_name,
          message_content: getAgentGreeting(agent.agent_key),
          message_type: "text"
        });
      }

      toast.success("Nova sessão criada com sucesso!");
      loadData();
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Erro ao criar sessão");
    } finally {
      setCreatingSession(false);
    }
  };

  const getAgentGreeting = (agentKey: string): string => {
    const greetings: Record<string, string> = {
      auditor: "🔐 Pronto para auditar todas as transações e garantir a integridade do sistema Satoshi.",
      strategist: "📈 Analisando métricas de crescimento e oportunidades estratégicas para o Praieiro.",
      analyst: "📊 Monitorando padrões de dados e gerando insights em tempo real.",
      guardian: "🛡️ Vigilante contra anomalias e ameaças de segurança.",
      optimizer: "⚡ Buscando oportunidades de otimização de performance e custos."
    };
    return greetings[agentKey] || "Conectado à reunião.";
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentSession) return;

    try {
      setSending(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Insert admin message
      const { error: msgError } = await supabase
        .from("ai_council_meeting_messages")
        .insert({
          session_id: currentSession.id,
          sender_type: "admin",
          sender_id: user?.id,
          sender_name: "Administrador",
          message_content: newMessage,
          message_type: "text"
        });

      if (msgError) throw msgError;

      setNewMessage("");

      // Simulate AI response from a random agent
      setTimeout(async () => {
        const randomAgent = agents[Math.floor(Math.random() * agents.length)];
        if (randomAgent) {
          const aiResponse = await generateAIResponse(newMessage, randomAgent);
          await supabase.from("ai_council_meeting_messages").insert({
            session_id: currentSession.id,
            sender_type: "agent",
            sender_id: randomAgent.agent_key,
            sender_name: randomAgent.agent_name,
            message_content: aiResponse,
            message_type: "text"
          });
        }
      }, 1500);

    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const generateAIResponse = async (userMessage: string, agent: Agent): Promise<string> => {
    const responses: Record<string, string[]> = {
      auditor: [
        `✅ Analisei a solicitação. Todos os hashes Satoshi estão íntegros. Sem anomalias detectadas.`,
        `🔍 Verificando logs de segurança... Não há atividades suspeitas relacionadas a "${userMessage.slice(0, 30)}..."`,
        `📋 Relatório de auditoria: Sistema operando dentro dos parâmetros normais.`
      ],
      strategist: [
        `📈 Com base nos dados atuais, recomendo focar em: conversão de novos clientes e retenção.`,
        `💡 Estratégia sugerida: Implementar campanhas de engajamento para aumentar GMV em 15%.`,
        `🎯 Análise competitiva indica oportunidade de expansão para novas praias.`
      ],
      analyst: [
        `📊 Métricas atualizadas: Taxa de conversão em 3.2%, ticket médio R$45, NPS 78.`,
        `📉 Detectei tendência de queda no período vespertino. Sugestão: promoções flash.`,
        `🔢 Dados consolidados mostram crescimento de 12% MoM em transações.`
      ],
      guardian: [
        `🛡️ Perímetro de segurança estável. Nenhuma tentativa de fraude detectada.`,
        `⚠️ Alerta preventivo: Monitorando padrão incomum de acessos. Investigando...`,
        `✔️ Todas as verificações de segurança passaram. Sistema protegido.`
      ],
      optimizer: [
        `⚡ Identificadas 3 oportunidades de otimização de performance.`,
        `🔧 Sugestão: Cache de consultas frequentes reduziria latência em 40%.`,
        `💰 Otimização de custos: Migração de queries pesadas pode economizar R$200/mês.`
      ]
    };

    const agentResponses = responses[agent.agent_key] || ["Analisando sua solicitação..."];
    return agentResponses[Math.floor(Math.random() * agentResponses.length)];
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("pt-BR", { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Sala de Reunião do Conselho
          </h2>
          <p className="text-muted-foreground">
            Converse com os agentes de IA em tempo real
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          {!currentSession && (
            <Button onClick={createNewSession} disabled={creatingSession}>
              {creatingSession ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Nova Reunião
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Agents Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Agentes Online
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {agents.map((agent) => (
              <div 
                key={agent.id} 
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
              >
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={AGENT_COLORS[agent.agent_key]}>
                      {AGENT_ICONS[agent.agent_key]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{agent.agent_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{agent.agent_role}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Chat Panel */}
        <Card className="lg:col-span-3">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  {currentSession?.session_topic || "Reunião do Conselho"}
                </CardTitle>
                {currentSession && (
                  <CardDescription className="flex items-center gap-4 mt-1">
                    <span className="flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      Sessão: {currentSession.id.slice(0, 8)}
                    </span>
                    <Badge variant="outline" className="text-green-600">
                      <span className="h-2 w-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                      Ativa
                    </Badge>
                  </CardDescription>
                )}
              </div>
              {currentSession && (
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Brain className="h-3 w-3" />
                    {currentSession.decisions_made} decisões
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {currentSession.suggestions_generated} sugestões
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {!currentSession ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Users className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhuma reunião ativa</p>
                <p className="text-sm mb-4">Inicie uma nova reunião para conversar com o conselho</p>
                <Button onClick={createNewSession} disabled={creatingSession}>
                  {creatingSession ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Iniciar Reunião
                </Button>
              </div>
            ) : (
              <>
                {/* Messages Area */}
                <ScrollArea className="h-[400px] p-4">
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isAdmin = message.sender_type === "admin";
                      const agentKey = message.sender_id || "";
                      
                      return (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${isAdmin ? "flex-row-reverse" : ""}`}
                        >
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback className={isAdmin ? "bg-primary text-primary-foreground" : AGENT_COLORS[agentKey]}>
                              {isAdmin ? <User className="h-4 w-4" /> : AGENT_ICONS[agentKey] || "🤖"}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`flex-1 ${isAdmin ? "text-right" : ""}`}>
                            <div className={`flex items-center gap-2 mb-1 ${isAdmin ? "justify-end" : ""}`}>
                              <span className="text-sm font-medium">{message.sender_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(message.created_at)}
                              </span>
                              {message.is_pinned && (
                                <Pin className="h-3 w-3 text-primary" />
                              )}
                            </div>
                            <div 
                              className={`inline-block p-3 rounded-lg max-w-[80%] ${
                                isAdmin 
                                  ? "bg-primary text-primary-foreground" 
                                  : "bg-muted"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{message.message_content}</p>
                            </div>
                            {message.satoshi_hash && (
                              <p className="text-xs text-muted-foreground mt-1 font-mono">
                                #{message.satoshi_hash.slice(0, 12)}...
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="border-t p-4">
                  <form 
                    onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                    className="flex gap-2"
                  >
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Envie uma mensagem para o conselho..."
                      disabled={sending}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={sending || !newMessage.trim()}>
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
