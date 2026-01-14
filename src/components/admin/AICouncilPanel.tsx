import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { 
  Brain, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Loader2,
  Zap,
  MessageSquare,
  TrendingUp,
  Shield,
  Bitcoin,
  Hash
} from "lucide-react";

interface AIVerdict {
  id: string;
  category: string;
  problem_description: string;
  final_verdict: string;
  gpt_response: string | null;
  gemini_response: string | null;
  deepseek_response: string | null;
  consensus_reached: boolean | null;
  processing_time_ms: number | null;
  solutions: any;
  context_data: any;
  created_at: string;
  requested_by: string | null;
}

interface AICouncilEvent {
  id: string;
  event_type: string;
  agent_id: string;
  decision_payload: any;
  btc_context: any;
  consensus_reached: boolean | null;
  consensus_required: boolean | null;
  target_type: string | null;
  target_id: string | null;
  created_at: string | null;
  session_id: string | null;
  audit_hash: string | null;
}

interface Stats {
  totalVerdicts: number;
  consensusRate: number;
  avgProcessingTime: number;
  todayVerdicts: number;
}

export function AICouncilPanel() {
  const [verdicts, setVerdicts] = useState<AIVerdict[]>([]);
  const [events, setEvents] = useState<AICouncilEvent[]>([]);
  const [stats, setStats] = useState<Stats>({ totalVerdicts: 0, consensusRate: 0, avgProcessingTime: 0, todayVerdicts: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedVerdict, setSelectedVerdict] = useState<AIVerdict | null>(null);

  useEffect(() => {
    loadData();
    
    // Subscribe to realtime updates
    const verdictsChannel = supabase
      .channel('ai-verdicts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_ai_verdicts' }, () => {
        loadData();
      })
      .subscribe();

    const eventsChannel = supabase
      .channel('ai-events-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_council_events' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(verdictsChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch verdicts
      const { data: verdictsData, error: verdictsError } = await supabase
        .from("admin_ai_verdicts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (verdictsError) throw verdictsError;
      setVerdicts(verdictsData || []);

      // Fetch council events
      const { data: eventsData, error: eventsError } = await supabase
        .from("ai_council_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);

      // Calculate stats
      if (verdictsData) {
        const today = new Date().toISOString().split('T')[0];
        const todayVerdicts = verdictsData.filter(v => v.created_at.startsWith(today)).length;
        const consensusCount = verdictsData.filter(v => v.consensus_reached === true).length;
        const avgTime = verdictsData.reduce((sum, v) => sum + (v.processing_time_ms || 0), 0) / (verdictsData.length || 1);

        setStats({
          totalVerdicts: verdictsData.length,
          consensusRate: verdictsData.length > 0 ? (consensusCount / verdictsData.length) * 100 : 0,
          avgProcessingTime: Math.round(avgTime),
          todayVerdicts
        });
      }
    } catch (error) {
      console.error("Error loading AI council data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("pt-BR");
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "security": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      "financial": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      "user": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      "system": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
      "moderation": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    };
    return colors[category.toLowerCase()] || "bg-gray-100 text-gray-800";
  };

  const getAgentIcon = (agentId: string) => {
    if (agentId.includes("gpt")) return "🤖";
    if (agentId.includes("gemini")) return "💎";
    if (agentId.includes("deepseek")) return "🔍";
    return "🧠";
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
            <Brain className="h-6 w-6 text-primary" />
            Conselho de IAs
          </h2>
          <p className="text-muted-foreground">
            Monitoramento em tempo real das decisões do conselho
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Vereditos</p>
                <p className="text-2xl font-bold">{stats.totalVerdicts}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Consenso</p>
                <p className="text-2xl font-bold">{stats.consensusRate.toFixed(1)}%</p>
              </div>
              <Users className="h-8 w-8 text-green-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tempo Médio</p>
                <p className="text-2xl font-bold">{stats.avgProcessingTime}ms</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hoje</p>
                <p className="text-2xl font-bold">{stats.todayVerdicts}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Verdicts List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Vereditos Recentes
            </CardTitle>
            <CardDescription>
              Decisões tomadas pelo conselho de IAs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {verdicts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum veredito registrado ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {verdicts.map((verdict) => (
                    <div
                      key={verdict.id}
                      className="p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedVerdict(verdict)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge className={getCategoryColor(verdict.category)}>
                          {verdict.category}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {verdict.consensus_reached ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {verdict.processing_time_ms}ms
                          </span>
                        </div>
                      </div>
                      <p className="text-sm font-medium line-clamp-2 mb-1">
                        {verdict.problem_description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(verdict.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Events Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Eventos em Tempo Real
            </CardTitle>
            <CardDescription>
              Atividade dos agentes de IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum evento registrado ainda</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map((event) => (
                    <div key={event.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{getAgentIcon(event.agent_id)}</span>
                        <span className="font-medium text-sm">{event.agent_id}</span>
                        <Badge variant="outline" className="text-xs">
                          {event.event_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(event.created_at)}
                        </div>
                        {event.btc_context && (
                          <div className="flex items-center gap-1">
                            <Bitcoin className="h-3 w-3 text-orange-500" />
                            BTC Context
                          </div>
                        )}
                        {event.audit_hash && (
                          <div className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {event.audit_hash.slice(0, 8)}...
                          </div>
                        )}
                      </div>
                      {event.target_type && (
                        <p className="text-xs mt-1 text-muted-foreground">
                          Alvo: {event.target_type} {event.target_id ? `(${event.target_id.slice(0, 8)}...)` : ""}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Selected Verdict Detail */}
      {selectedVerdict && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Detalhes do Veredito
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedVerdict(null)}>
                Fechar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-1">Problema</h4>
                <p className="text-sm text-muted-foreground">{selectedVerdict.problem_description}</p>
              </div>
              <Separator />
              <div>
                <h4 className="font-medium mb-1">Veredito Final</h4>
                <p className="text-sm">{selectedVerdict.final_verdict}</p>
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-3">
                {selectedVerdict.gpt_response && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span>🤖</span>
                      <span className="font-medium text-sm">GPT</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-4">
                      {selectedVerdict.gpt_response}
                    </p>
                  </div>
                )}
                {selectedVerdict.gemini_response && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span>💎</span>
                      <span className="font-medium text-sm">Gemini</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-4">
                      {selectedVerdict.gemini_response}
                    </p>
                  </div>
                )}
                {selectedVerdict.deepseek_response && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span>🔍</span>
                      <span className="font-medium text-sm">DeepSeek</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-4">
                      {selectedVerdict.deepseek_response}
                    </p>
                  </div>
                )}
              </div>
              {selectedVerdict.solutions && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-1">Soluções Propostas</h4>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(selectedVerdict.solutions, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
