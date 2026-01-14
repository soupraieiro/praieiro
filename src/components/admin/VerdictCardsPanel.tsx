import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Gavel,
  RefreshCw,
  Loader2,
  Hash,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  User,
  Shield,
  Zap
} from "lucide-react";

interface VerdictFlow {
  id: string;
  source_table: string;
  source_id: string | null;
  flow_type: string;
  flow_data: {
    status?: string;
    amount?: number;
    agent_id?: string;
    action_details?: string;
    [key: string]: unknown;
  };
  risk_score: number | null;
  anomaly_detected: boolean | null;
  satoshi_hash: string | null;
  created_at: string;
}

interface VerdictCardProps {
  verdict: VerdictFlow;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
}

const truncateHash = (hash: string | null): string => {
  if (!hash) return "N/A";
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
};

const getStatusColor = (status?: string) => {
  switch (status?.toLowerCase()) {
    case "approved":
    case "confirmed":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "pending":
    case "waiting":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "rejected":
    case "denied":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getStatusIcon = (status?: string) => {
  switch (status?.toLowerCase()) {
    case "approved":
    case "confirmed":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "pending":
    case "waiting":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case "rejected":
    case "denied":
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
  }
};

function VerdictCard({ verdict, onConfirm, onReject }: VerdictCardProps) {
  const { flow_data, satoshi_hash, created_at, risk_score, anomaly_detected } = verdict;
  const status = flow_data?.status || "unknown";
  const amount = flow_data?.amount;
  const agentId = flow_data?.agent_id;
  const actionDetails = flow_data?.action_details;

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const isPending = status?.toLowerCase() === "pending" || status?.toLowerCase() === "waiting";

  return (
    <Card className={`transition-all duration-300 hover:shadow-lg ${
      anomaly_detected ? "border-red-400 bg-red-50/50 dark:bg-red-900/10" : ""
    } ${isPending ? "border-yellow-400 animate-pulse-slow" : ""}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Veredito do Agente</span>
          </div>
          <Badge className={getStatusColor(status)}>
            <span className="flex items-center gap-1">
              {getStatusIcon(status)}
              {status}
            </span>
          </Badge>
        </div>

        {/* Amount */}
        {amount !== undefined && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-muted/50 rounded-lg">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="font-mono font-bold text-lg">
              R$ {typeof amount === 'number' ? amount.toFixed(2) : amount}
            </span>
          </div>
        )}

        {/* Agent ID */}
        {agentId && (
          <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="font-mono text-xs truncate">{agentId}</span>
          </div>
        )}

        {/* Action Details */}
        {actionDetails && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {actionDetails}
          </p>
        )}

        {/* Risk Score */}
        {risk_score !== null && (
          <div className="flex items-center gap-2 mb-2">
            <Shield className={`h-3 w-3 ${
              risk_score >= 0.7 ? "text-red-500" :
              risk_score >= 0.4 ? "text-yellow-500" : "text-green-500"
            }`} />
            <span className="text-xs text-muted-foreground">
              Risk: {(risk_score * 100).toFixed(1)}%
            </span>
            {anomaly_detected && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Anomalia
              </Badge>
            )}
          </div>
        )}

        {/* Satoshi Hash */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg cursor-help">
                <Hash className="h-4 w-4 text-primary" />
                <span className="font-mono text-xs text-primary font-medium">
                  {truncateHash(satoshi_hash)}
                </span>
                <Shield className="h-3 w-3 text-green-500 ml-auto" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-sm">
              <p className="text-xs">Hash Satoshi (Imutável):</p>
              <p className="font-mono text-xs break-all">{satoshi_hash}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Timestamp */}
        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatTime(created_at)}</span>
          </div>
          <span className="font-mono">{verdict.flow_type}</span>
        </div>

        {/* Actions for pending verdicts */}
        {isPending && (
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <Button 
              size="sm" 
              className="flex-1" 
              onClick={() => onConfirm(verdict.id)}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Confirmar
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="flex-1"
              onClick={() => onReject(verdict.id)}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Rejeitar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function VerdictCardsPanel() {
  const [verdicts, setVerdicts] = useState<VerdictFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  useEffect(() => {
    loadVerdicts();

    // Realtime subscription for new verdicts
    const channel = supabase
      .channel('verdict-flows-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_council_information_flows'
      }, (payload) => {
        const newVerdict = payload.new as VerdictFlow;
        setVerdicts(prev => [newVerdict, ...prev]);
        
        const status = (newVerdict.flow_data as { status?: string })?.status;
        if (status === "pending" || status === "waiting") {
          toast.info("Novo Veredito Pendente!", {
            description: "Um agente enviou uma decisão para aprovação.",
            action: {
              label: "Ver",
              onClick: () => setFilter("pending")
            }
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadVerdicts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("ai_council_information_flows")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (data) setVerdicts(data as VerdictFlow[]);
    } catch (error) {
      console.error("Error loading verdicts:", error);
      toast.error("Erro ao carregar vereditos");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      // Register the confirmation flow
      await supabase.rpc('register_information_flow', {
        p_source_table: 'ai_council_information_flows',
        p_source_id: id,
        p_flow_type: 'verdict_confirmed',
        p_flow_data: {
          status: 'confirmed',
          original_verdict_id: id,
          confirmed_at: new Date().toISOString(),
          confirmed_by: 'admin'
        }
      });

      toast.success("Veredito confirmado!", {
        description: "Registrado na cadeia Satoshi."
      });
      
      loadVerdicts();
    } catch (error) {
      console.error("Error confirming verdict:", error);
      toast.error("Erro ao confirmar veredito");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await supabase.rpc('register_information_flow', {
        p_source_table: 'ai_council_information_flows',
        p_source_id: id,
        p_flow_type: 'verdict_rejected',
        p_flow_data: {
          status: 'rejected',
          original_verdict_id: id,
          rejected_at: new Date().toISOString(),
          rejected_by: 'admin'
        }
      });

      toast.info("Veredito rejeitado", {
        description: "Registrado na cadeia Satoshi."
      });
      
      loadVerdicts();
    } catch (error) {
      console.error("Error rejecting verdict:", error);
      toast.error("Erro ao rejeitar veredito");
    }
  };

  const filteredVerdicts = verdicts.filter(v => {
    if (filter === "all") return true;
    const status = (v.flow_data as { status?: string })?.status?.toLowerCase();
    if (filter === "pending") return status === "pending" || status === "waiting";
    if (filter === "approved") return status === "approved" || status === "confirmed";
    if (filter === "rejected") return status === "rejected" || status === "denied";
    return true;
  });

  const pendingCount = verdicts.filter(v => {
    const status = (v.flow_data as { status?: string })?.status?.toLowerCase();
    return status === "pending" || status === "waiting";
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" />
            Cards de Veredito do Conselho
          </h3>
          <p className="text-sm text-muted-foreground">
            Decisões auditáveis com hash Satoshi
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              <Zap className="h-3 w-3 mr-1" />
              {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={loadVerdicts}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "all" && "Todos"}
            {f === "pending" && "Pendentes"}
            {f === "approved" && "Aprovados"}
            {f === "rejected" && "Rejeitados"}
          </Button>
        ))}
      </div>

      {/* Verdict Cards Grid */}
      <ScrollArea className="h-[600px]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredVerdicts.map((verdict) => (
            <VerdictCard
              key={verdict.id}
              verdict={verdict}
              onConfirm={handleConfirm}
              onReject={handleReject}
            />
          ))}

          {filteredVerdicts.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Gavel className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum veredito encontrado</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
