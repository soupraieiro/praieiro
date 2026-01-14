import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Users,
  Send,
  Bot,
  Shield,
  Hash,
  Loader2,
  RefreshCw,
  Plus,
  MessageCircle,
  Zap,
  Lock
} from "lucide-react";

interface Agent {
  id: string;
  agent_key: string;
  agent_name: string;
  agent_role: string;
  specialization: string[];
  is_active: boolean;
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

const truncateHash = (hash: string | null): string => {
  if (!hash) return "";
  return `0x${hash.slice(0, 6)}...${hash.slice(-4)}`;
};

export function MeetingRoomPanel() {
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

    // Realtime subscription
    const channel = supabase
      .channel('meeting-room-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_council_meeting_messages'
      }, (payload) => {
        const newMsg = payload.new as MeetingMessage;
        if (currentSession && newMsg.session_id === currentSession.id) {
          setMessages(prev => [...prev, newMsg]);
          scrollToBottom();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSession?.id]);

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
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar sala de reunião");
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
          session_type: "satoshi_council",
          session_topic: "Reunião Satoshi - Governança Praieiro",
          participants: agents.map(a => a.agent_key),
          status: "active"
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(session);
      setMessages([]);

      // Register flow
      await supabase.rpc('register_information_flow', {
        p_source_table: 'ai_council_sessions',
        p_source_id: session.id,
        p_flow_type: 'session_created',
        p_flow_data: {
          status: 'active',
          amount: 0,
          agent_id: agents[0]?.id || null,
          action_details: `Nova sessão criada: ${session.session_topic}`
        }
      });

      // Create welcome messages
      for (const agent of agents.slice(0, 3)) {
        await supabase.from("ai_council_meeting_messages").insert({
          session_id: session.id,
          sender_type: "agent",
          sender_id: agent.agent_key,
          sender_name: agent.agent_name,
          message_content: getAgentGreeting(agent.agent_key),
          message_type: "text"
        });
        await new Promise(r => setTimeout(r, 300));
      }

      toast.success("Nova sessão Satoshi criada!");
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
      auditor: "🔐 Auditoria Satoshi ativa. Todos os hashes verificados.",
      strategist: "📈 Análise estratégica iniciada. Métricas de crescimento carregadas.",
      analyst: "📊 Dados compilados. Pronto para fornecer insights.",
      guardian: "🛡️ Perímetro de segurança ativo. Monitorando anomalias.",
      optimizer: "⚡ Otimizações em análise. Performance sob controle."
    };
    return greetings[agentKey] || "Conectado à reunião Satoshi.";
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentSession) return;

    try {
      setSending(true);

      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from("ai_council_meeting_messages").insert({
        session_id: currentSession.id,
        sender_type: "admin",
        sender_id: user?.id,
        sender_name: "Administrador",
        message_content: newMessage,
        message_type: "text"
      });

      const messageContent = newMessage;
      setNewMessage("");

      // Simulate AI agent responses
      setTimeout(async () => {
        const respondingAgent = agents[Math.floor(Math.random() * agents.length)];
        if (respondingAgent) {
          const response = await generateAgentResponse(messageContent, respondingAgent);
          await supabase.from("ai_council_meeting_messages").insert({
            session_id: currentSession.id,
            sender_type: "agent",
            sender_id: respondingAgent.agent_key,
            sender_name: respondingAgent.agent_name,
            message_content: response,
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

  const generateAgentResponse = async (userMessage: string, agent: Agent): Promise<string> => {
    const responses: Record<string, string[]> = {
      auditor: [
        "✅ Verificação Satoshi concluída. Integridade confirmada.",
        "🔍 Logs de segurança normais. Zero anomalias detectadas.",
        "📋 Auditoria em conformidade com protocolo Satoshi."
      ],
      strategist: [
        "📈 Recomendação: Foco em conversão e retenção.",
        "💡 Análise indica oportunidade de crescimento de 15%.",
        "🎯 Estratégia competitiva favorável ao momento."
      ],
      analyst: [
        "📊 Métricas atualizadas: Performance dentro do esperado.",
        "📉 Tendência detectada. Sugestão: ações preventivas.",
        "🔢 Crescimento confirmado nos indicadores principais."
      ],
      guardian: [
        "🛡️ Perímetro seguro. Nenhuma ameaça detectada.",
        "⚠️ Alerta preventivo resolvido. Sistema estável.",
        "✔️ Todas as verificações de segurança passaram."
      ],
      optimizer: [
        "⚡ Oportunidades de otimização identificadas.",
        "🔧 Performance pode ser melhorada em 40%.",
        "💰 Economia potencial mapeada nos recursos."
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
    <div className="grid gap-4 lg:grid-cols-4">
      {/* Agents Panel */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Agentes do Conselho
          </CardTitle>
          <CardDescription className="text-xs">
            Membros online na reunião
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={AGENT_COLORS[agent.agent_key]}>
                    {AGENT_ICONS[agent.agent_key]}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{agent.agent_name}</p>
                <p className="text-xs text-muted-foreground capitalize">{agent.agent_role}</p>
              </div>
            </div>
          ))}
          {agents.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum agente configurado
            </p>
          )}
        </CardContent>
      </Card>

      {/* Chat Panel */}
      <Card className="lg:col-span-3">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                {currentSession?.session_topic || "Área de Reunião Satoshi"}
              </CardTitle>
              {currentSession && (
                <CardDescription className="flex items-center gap-4 mt-1">
                  <span className="flex items-center gap-1 font-mono text-xs">
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
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              {!currentSession && (
                <Button onClick={createNewSession} disabled={creatingSession} size="sm">
                  {creatingSession ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Nova Sessão
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Messages */}
          <ScrollArea className="h-[400px] p-4">
            <div className="space-y-4">
              {messages.map((msg) => {
                const isAdmin = msg.sender_type === "admin";
                const agentKey = msg.sender_id?.toLowerCase() || "";

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isAdmin ? "flex-row-reverse" : ""}`}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className={isAdmin ? "bg-primary text-primary-foreground" : AGENT_COLORS[agentKey]}>
                        {isAdmin ? "A" : AGENT_ICONS[agentKey] || "🤖"}
                      </AvatarFallback>
                    </Avatar>

                    <div className={`flex-1 max-w-[80%] ${isAdmin ? "text-right" : ""}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{msg.sender_name}</span>
                        <span className="text-xs text-muted-foreground">{formatTime(msg.created_at)}</span>
                      </div>
                      <div className={`inline-block p-3 rounded-lg ${
                        isAdmin 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted"
                      }`}>
                        <p className="text-sm">{msg.message_content}</p>
                      </div>
                      {msg.satoshi_hash && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground cursor-help">
                                <Lock className="h-3 w-3" />
                                <span className="font-mono">{truncateHash(msg.satoshi_hash)}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Hash Satoshi: {msg.satoshi_hash}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />

              {messages.length === 0 && !currentSession && (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Crie uma nova sessão para começar a reunião</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          {currentSession && (
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Digite sua mensagem para o Conselho..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  disabled={sending}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Mensagens protegidas por hash Satoshi
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
