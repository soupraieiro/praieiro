import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Activity,
  RefreshCw,
  Loader2,
  Hash,
  AlertTriangle,
  CheckCircle,
  Database,
  ArrowRight,
  Eye,
  Clock
} from "lucide-react";

interface InformationFlow {
  id: string;
  source_table: string;
  source_id: string | null;
  flow_type: string;
  flow_data: unknown;
  risk_score: number | null;
  anomaly_detected: boolean | null;
  anomaly_details: unknown;
  processed_by: string[] | null;
  satoshi_hash: string | null;
  created_at: string;
}

export function SatoshiFlowMonitor() {
  const [flows, setFlows] = useState<InformationFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlow, setSelectedFlow] = useState<InformationFlow | null>(null);

  useEffect(() => {
    loadFlows();

    // Realtime subscription
    const channel = supabase
      .channel('satoshi-flows-realtime')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'ai_council_information_flows' 
      }, (payload) => {
        const newFlow = payload.new as InformationFlow;
        setFlows(prev => [newFlow, ...prev]);
        if (newFlow.anomaly_detected) {
          toast.warning("Anomalia Detectada!", { 
            description: `Fluxo ${newFlow.flow_type} com risk_score ${newFlow.risk_score}` 
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadFlows = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("ai_council_information_flows")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      if (data) setFlows(data);
    } catch (error) {
      console.error("Error loading flows:", error);
      toast.error("Erro ao carregar fluxos");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score >= 0.7) return "text-red-500";
    if (score >= 0.4) return "text-yellow-500";
    return "text-green-500";
  };

  const getRiskBadge = (score: number | null) => {
    if (score === null) return "secondary";
    if (score >= 0.7) return "destructive";
    if (score >= 0.4) return "warning" as "secondary";
    return "default";
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", { 
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit", 
      minute: "2-digit",
      second: "2-digit"
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
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Flows List */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Monitor de Fluxos Satoshi
            </CardTitle>
            <CardDescription>
              Eventos registrados em tempo real com hash de integridade
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadFlows}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {flows.map((flow) => (
                <div
                  key={flow.id}
                  onClick={() => setSelectedFlow(flow)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedFlow?.id === flow.id ? "border-primary bg-primary/5" : ""
                  } ${flow.anomaly_detected ? "border-red-300 bg-red-50 dark:bg-red-900/10" : ""}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{flow.source_table}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="outline">{flow.flow_type}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {flow.anomaly_detected && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      <Badge variant={getRiskBadge(flow.risk_score)}>
                        Risk: {flow.risk_score?.toFixed(2) || "N/A"}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(flow.created_at)}</span>
                    </div>
                    {flow.satoshi_hash && (
                      <div className="flex items-center gap-1 font-mono">
                        <Hash className="h-3 w-3" />
                        <span>{flow.satoshi_hash.slice(0, 16)}...</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {flows.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum fluxo registrado</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Flow Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Detalhes do Fluxo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedFlow ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">ID</label>
                <p className="text-sm font-mono">{selectedFlow.id}</p>
              </div>
              
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tabela Origem</label>
                <p className="text-sm">{selectedFlow.source_table}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                <Badge variant="outline">{selectedFlow.flow_type}</Badge>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Risk Score</label>
                <p className={`text-sm font-bold ${getRiskColor(selectedFlow.risk_score)}`}>
                  {selectedFlow.risk_score?.toFixed(4) || "N/A"}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Anomalia</label>
                <div className="flex items-center gap-2">
                  {selectedFlow.anomaly_detected ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-500">Detectada</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-500">Normal</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Hash Satoshi</label>
                <p className="text-xs font-mono break-all bg-muted p-2 rounded">
                  {selectedFlow.satoshi_hash || "N/A"}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Payload JSON</label>
                <pre className="text-xs font-mono bg-muted p-2 rounded overflow-auto max-h-48">
                  {JSON.stringify(selectedFlow.flow_data, null, 2)}
                </pre>
              </div>

              {selectedFlow.anomaly_details && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Detalhes da Anomalia</label>
                  <pre className="text-xs font-mono bg-red-50 dark:bg-red-900/20 p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(selectedFlow.anomaly_details, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground">Processado Por</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedFlow.processed_by?.map((agent) => (
                    <Badge key={agent} variant="secondary" className="text-xs">
                      {agent}
                    </Badge>
                  )) || <span className="text-xs text-muted-foreground">-</span>}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Selecione um fluxo para ver detalhes</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
