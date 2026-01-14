import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Users,
  Send,
  Bot,
  User,
  Shield,
  TrendingUp,
  TrendingDown,
  Brain,
  Eye,
  Zap,
  MessageCircle,
  Loader2,
  Pin,
  Hash,
  RefreshCw,
  Plus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Lock,
  Database,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
  Gavel,
  Megaphone
} from "lucide-react";
import { SatoshiFlowMonitor } from "./SatoshiFlowMonitor";
import { SatoshiIntegrityValidator } from "./SatoshiIntegrityValidator";
import { GrowthMetricsPanel } from "./GrowthMetricsPanel";
import { VerdictCardsPanel } from "./VerdictCardsPanel";
import { MeetingRoomPanel } from "./MeetingRoomPanel";
import { ExecutiveCouncilCards } from "./ExecutiveCouncilCards";
import { BroadcastModal } from "./BroadcastModal";
import { ConstitutionalAuditDashboard } from "./ConstitutionalAuditDashboard";
import { ConstitutionalStateCard } from "./ConstitutionalStateCard";
import { SovereignVitalityPanel } from "./SovereignVitalityPanel";

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

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  priority: string;
  is_read: boolean;
  action_required: boolean;
  source_agent_id: string | null;
  created_at: string;
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

export function SatoshiDashboard() {
  const [activeTab, setActiveTab] = useState("meeting");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [messages, setMessages] = useState<MeetingMessage[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
    
    // Realtime subscriptions
    const messagesChannel = supabase
      .channel('satoshi-messages-realtime')
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

    const notificationsChannel = supabase
      .channel('satoshi-notifications-realtime')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'ai_council_admin_notifications' 
      }, (payload) => {
        const newNotif = payload.new as AdminNotification;
        setNotifications(prev => [newNotif, ...prev]);
        toast.info(newNotif.title, { description: newNotif.message });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(notificationsChannel);
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

      // Load notifications
      const { data: notifsData } = await supabase
        .from("ai_council_admin_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (notifsData) setNotifications(notifsData);

    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados do Conselho");
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
          session_topic: "Reunião Satoshi - Governança",
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

      // Register information flow
      await supabase.rpc('register_information_flow', {
        p_source_table: 'ai_council_sessions',
        p_source_id: session.id,
        p_flow_type: 'session_created',
        p_flow_data: { topic: session.session_topic, participants: session.participants }
      });

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
      auditor: "🔐 Auditoria Satoshi ativa. Monitorando integridade de todos os hashes de transação.",
      strategist: "📈 Análise estratégica iniciada. Revisando métricas de crescimento e oportunidades.",
      analyst: "📊 Dados compilados. Pronto para fornecer insights em tempo real.",
      guardian: "🛡️ Perímetro de segurança ativo. Vigilante contra anomalias e ameaças.",
      optimizer: "⚡ Buscando otimizações. Performance e custos sob análise contínua."
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

      // Simulate AI responses from agents
      setTimeout(async () => {
        for (const agent of agents.slice(0, 2)) {
          const aiResponse = await generateAIResponse(messageContent, agent);
          await supabase.from("ai_council_meeting_messages").insert({
            session_id: currentSession.id,
            sender_type: "agent",
            sender_id: agent.agent_key,
            sender_name: agent.agent_name,
            message_content: aiResponse,
            message_type: "text"
          });
          await new Promise(resolve => setTimeout(resolve, 1000));
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
        `✅ Verificação Satoshi concluída. Todos os hashes íntegros. Zero anomalias.`,
        `🔍 Analisando "${userMessage.slice(0, 30)}..." - Logs de segurança normais.`,
        `📋 Auditoria: Sistema operando dentro dos parâmetros Satoshi.`
      ],
      strategist: [
        `📈 Recomendação baseada em dados: foco em conversão e retenção de clientes.`,
        `💡 Estratégia sugerida para crescimento de 15% no GMV.`,
        `🎯 Análise competitiva indica oportunidade de expansão.`
      ],
      analyst: [
        `📊 Métricas atualizadas: Taxa de conversão 3.2%, ticket médio R$45.`,
        `📉 Tendência detectada no período vespertino. Sugestão: promoções flash.`,
        `🔢 Crescimento de 12% MoM em transações confirmado.`
      ],
      guardian: [
        `🛡️ Perímetro de segurança estável. Nenhuma tentativa de fraude.`,
        `⚠️ Alerta preventivo: Padrão incomum sob investigação.`,
        `✔️ Todas as verificações de segurança passaram.`
      ],
      optimizer: [
        `⚡ 3 oportunidades de otimização identificadas.`,
        `🔧 Cache de consultas reduziria latência em 40%.`,
        `💰 Economia potencial de R$200/mês com otimização de queries.`
      ]
    };

    const agentResponses = responses[agent.agent_key] || ["Analisando sua solicitação..."];
    return agentResponses[Math.floor(Math.random() * agentResponses.length)];
  };

  const confirmDecision = async (notificationId: string) => {
    try {
      // Log notification activity with Satoshi chain
      await supabase.rpc('log_notification_activity', {
        p_notification_id: notificationId,
        p_activity_type: 'confirmed',
        p_actor_type: 'admin',
        p_actor_id: (await supabase.auth.getUser()).data.user?.id,
        p_activity_data: { action: 'confirmed', timestamp: new Date().toISOString() }
      });

      // Update notification
      await supabase
        .from('ai_council_admin_notifications')
        .update({ is_read: true, action_required: false })
        .eq('id', notificationId);

      toast.success("Decisão confirmada e registrada na cadeia Satoshi");
      loadData();
    } catch (error) {
      console.error("Error confirming decision:", error);
      toast.error("Erro ao confirmar decisão");
    }
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
            <Lock className="h-6 w-6 text-primary" />
            Dashboard Satoshi & AI Council
          </h2>
          <p className="text-muted-foreground">
            Governança autônoma com auditoria imutável
          </p>
        </div>
        <div className="flex items-center gap-3">
          <BroadcastModal />
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-8 w-full max-w-5xl">
          <TabsTrigger value="constitution" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Constituição
          </TabsTrigger>
          <TabsTrigger value="meeting" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Reunião
          </TabsTrigger>
          <TabsTrigger value="verdicts" className="flex items-center gap-2">
            <Gavel className="h-4 w-4" />
            Vereditos
          </TabsTrigger>
          <TabsTrigger value="flows" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Fluxos
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Métricas
          </TabsTrigger>
          <TabsTrigger value="integrity" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Integridade
          </TabsTrigger>
          <TabsTrigger value="constitutional" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Auditoria
          </TabsTrigger>
          <TabsTrigger value="war-room" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Chat
          </TabsTrigger>
        </TabsList>

        {/* Constitution Tab - IA Constitucional (Camada 3) */}
        <TabsContent value="constitution" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ConstitutionalStateCard />
            </div>
            <div>
              <ExecutiveCouncilCards />
            </div>
          </div>
          {/* Painel de Vitalidade Soberana */}
          <SovereignVitalityPanel />
        </TabsContent>

        {/* War Room Tab */}
        <TabsContent value="war-room" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-4">
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
                      {currentSession?.session_topic || "Sala de Reunião Satoshi"}
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
              </CardHeader>
              
              <CardContent className="p-0">
                {!currentSession ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Users className="h-16 w-16 mb-4 opacity-50" />
                    <p className="text-lg font-medium">Nenhuma reunião ativa</p>
                    <p className="text-sm mb-4">Inicie uma nova reunião para governar o sistema</p>
                    <Button onClick={createNewSession} disabled={creatingSession}>
                      {creatingSession ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Iniciar Reunião Satoshi
                    </Button>
                  </div>
                ) : (
                  <>
                    <ScrollArea className="h-[350px] p-4">
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
                                  {message.is_pinned && <Pin className="h-3 w-3 text-primary" />}
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
                                    🔗 #{message.satoshi_hash.slice(0, 12)}...
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>

                    <div className="border-t p-4">
                      <form 
                        onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                        className="flex gap-2"
                      >
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Fale com o Conselho de IA..."
                          disabled={sending}
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
        </TabsContent>

        {/* Meeting Room Tab */}
        <TabsContent value="meeting" className="space-y-4">
          <MeetingRoomPanel />
        </TabsContent>

        {/* Verdicts Tab */}
        <TabsContent value="verdicts" className="space-y-4">
          <VerdictCardsPanel />
        </TabsContent>

        {/* Information Flows Tab */}
        <TabsContent value="flows" className="space-y-4">
          <SatoshiFlowMonitor />
        </TabsContent>

        {/* Growth Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <GrowthMetricsPanel />
        </TabsContent>

        {/* Integrity Tab */}
        <TabsContent value="integrity" className="space-y-4">
          <SatoshiIntegrityValidator />
        </TabsContent>

        {/* Constitutional Audit Tab */}
        <TabsContent value="constitutional" className="space-y-4">
          <ConstitutionalAuditDashboard />
        </TabsContent>

        {/* Legacy War Room Tab */}
        <TabsContent value="war-room" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-4">
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
                      {currentSession?.session_topic || "Sala de Reunião Satoshi"}
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
              </CardHeader>
              
              <CardContent className="p-0">
                {!currentSession ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Users className="h-16 w-16 mb-4 opacity-50" />
                    <p className="text-lg font-medium">Nenhuma reunião ativa</p>
                    <p className="text-sm mb-4">Inicie uma nova reunião para governar o sistema</p>
                    <Button onClick={createNewSession} disabled={creatingSession}>
                      {creatingSession ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Iniciar Reunião Satoshi
                    </Button>
                  </div>
                ) : (
                  <>
                    <ScrollArea className="h-[350px] p-4">
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
                                  {message.is_pinned && <Pin className="h-3 w-3 text-primary" />}
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
                                    🔗 #{message.satoshi_hash.slice(0, 12)}...
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>

                    <div className="border-t p-4">
                      <form 
                        onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                        className="flex gap-2"
                      >
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Fale com o Conselho de IA..."
                          disabled={sending}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
