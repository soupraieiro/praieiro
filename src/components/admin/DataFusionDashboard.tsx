import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  MapPin, 
  Brain, 
  Database, 
  Wifi, 
  WifiOff,
  RefreshCw,
  Send,
  Layers,
  Zap,
  CheckCircle,
  AlertCircle,
  Activity,
  Globe,
  Server,
} from 'lucide-react';
import { useGeoFusion } from '@/hooks/useGeoFusion';
import { useAICouncil } from '@/hooks/useAICouncil';
import { useQueueProcessor } from '@/hooks/useQueueProcessor';
import { toast } from 'sonner';

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'geo' | 'ai' | 'queue' | 'system';
  message: string;
  status: 'success' | 'error' | 'info' | 'warning';
  data?: Record<string, unknown>;
}

export function DataFusionDashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [councilQuestion, setCouncilQuestion] = useState('');
  const [testCoords, setTestCoords] = useState({ lat: -12.9714, lng: -38.5014 }); // Salvador

  const { reverseGeocode, isSearching: geoLoading, lastResult: geoResult } = useGeoFusion();
  const { consult, isConsulting, lastDecision } = useAICouncil();
  const { getStatus, isProcessing: queueProcessing } = useQueueProcessor();

  const [queueStatus, setQueueStatus] = useState<{ length: number; backend: string } | null>(null);

  // Add log entry
  const addLog = (type: LogEntry['type'], message: string, status: LogEntry['status'], data?: Record<string, unknown>) => {
    setLogs(prev => [{
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type,
      message,
      status,
      data,
    }, ...prev].slice(0, 100));
  };

  // Test Geo Fusion
  const handleTestGeoFusion = async () => {
    addLog('geo', 'Iniciando fusão de geolocalização...', 'info');
    
    try {
      const result = await reverseGeocode(testCoords.lat, testCoords.lng);
      if (result) {
        addLog('geo', `Fusão completa: ${result.all_sources.length} fontes, ${result.total_latency_ms}ms`, 'success', result as unknown as Record<string, unknown>);
        toast.success(`Geo-fusion: ${result.all_sources.length} fontes consultadas`);
      } else {
        throw new Error('Sem resultado');
      }
    } catch (err) {
      addLog('geo', `Erro: ${err instanceof Error ? err.message : 'Desconhecido'}`, 'error');
      toast.error('Falha na geo-fusão');
    }
  };

  // Consult AI Council
  const handleConsultCouncil = async () => {
    if (!councilQuestion.trim()) {
      toast.error('Digite uma pergunta');
      return;
    }

    addLog('ai', `Consultando Conselho: "${councilQuestion.slice(0, 50)}..."`, 'info');

    try {
      const decision = await consult(councilQuestion, {
        mode: 'consensus',
        providers: ['groq', 'openrouter'],
      });

      addLog('ai', 
        `Decisão: ${decision.consensus ? 'CONSENSO' : 'DIVERGÊNCIA'} | ${decision.providers_consulted.length} IAs`,
        decision.consensus ? 'success' : 'warning',
        { consensus: decision.consensus, providers: decision.providers_consulted.length }
      );

      toast.success(`Conselho: ${decision.providers_consulted.length} IAs consultadas`);
      setCouncilQuestion('');
    } catch (err) {
      addLog('ai', `Erro: ${err instanceof Error ? err.message : 'Desconhecido'}`, 'error');
      toast.error('Falha na consulta ao Conselho');
    }
  };

  // Check queue status
  const handleCheckQueue = async () => {
    addLog('queue', 'Verificando status da fila...', 'info');

    try {
      const status = await getStatus('registration');
      setQueueStatus({ length: status.length, backend: status.backend });
      addLog('queue', `Fila: ${status.length} itens | Backend: ${status.backend}`, 'success');
    } catch (err) {
      addLog('queue', `Erro: ${err instanceof Error ? err.message : 'Desconhecido'}`, 'error');
    }
  };

  // Check queue on mount
  useEffect(() => {
    handleCheckQueue();
  }, []);

  const getStatusIcon = (status: LogEntry['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTypeIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'geo': return <MapPin className="h-4 w-4" />;
      case 'ai': return <Brain className="h-4 w-4" />;
      case 'queue': return <Database className="h-4 w-4" />;
      default: return <Server className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6" />
            Infraestrutura de Fusão de Dados
          </h2>
          <p className="text-muted-foreground">
            Georreferenciamento Multi-Fonte + Conselho de IAs + Fila de Resiliência
          </p>
        </div>

        <div className="flex gap-2">
          <Badge variant={queueStatus?.backend === 'upstash-redis' ? 'default' : 'secondary'}>
            {queueStatus?.backend === 'upstash-redis' ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
            {queueStatus?.backend || 'Verificando...'}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{geoResult?.all_sources?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Fontes Geo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{lastDecision?.providers_consulted?.length || 0}</p>
                <p className="text-xs text-muted-foreground">IAs Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{queueStatus?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Fila</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{geoResult?.total_latency_ms || '-'}ms</p>
                <p className="text-xs text-muted-foreground">Latência</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="geo" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="geo" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Geo-Fusão
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Conselho IAs
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Fila
          </TabsTrigger>
        </TabsList>

        {/* Geo-Fusion Tab */}
        <TabsContent value="geo" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Matriz de Georreferenciamento</CardTitle>
              <CardDescription>
                Fusão de 4 fontes: Photon (OSM), IP-API, Nominatim, Mapbox
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={testCoords.lat}
                    onChange={(e) => setTestCoords(prev => ({ ...prev, lat: parseFloat(e.target.value) }))}
                    className="w-full p-2 border rounded mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={testCoords.lng}
                    onChange={(e) => setTestCoords(prev => ({ ...prev, lng: parseFloat(e.target.value) }))}
                    className="w-full p-2 border rounded mt-1"
                  />
                </div>
              </div>

              <Button onClick={handleTestGeoFusion} disabled={geoLoading} className="w-full">
                {geoLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <MapPin className="h-4 w-4 mr-2" />}
                Testar Geo-Fusão
              </Button>

              {geoResult && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Resultado</span>
                    <Badge variant="outline">{geoResult.total_latency_ms}ms</Badge>
                  </div>
                  <p className="text-sm">{geoResult.best_source?.address || 'Endereço não encontrado'}</p>
                  <div className="flex flex-wrap gap-1">
                    {geoResult.all_sources?.map((s) => (
                      <Badge key={s.name} variant="secondary" className="text-xs">{s.name}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Council Tab */}
        <TabsContent value="ai" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Conselho de IAs</CardTitle>
              <CardDescription>
                Groq (Llama 3) + OpenRouter (DeepSeek V3) + HuggingFace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Digite sua pergunta para o Conselho de IAs..."
                value={councilQuestion}
                onChange={(e) => setCouncilQuestion(e.target.value)}
                rows={3}
              />

              <Button onClick={handleConsultCouncil} disabled={isConsulting} className="w-full">
                {isConsulting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Consultar Conselho
              </Button>

              {lastDecision && (
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Decisão</span>
                    <Badge variant={lastDecision.consensus ? 'default' : 'destructive'}>
                      {lastDecision.consensus ? 'CONSENSO' : 'DIVERGÊNCIA'}
                    </Badge>
                  </div>
                  <p className="text-sm">{lastDecision.final_answer.slice(0, 300)}...</p>
                  <p className="text-xs text-muted-foreground">{lastDecision.reasoning}</p>
                  <div className="flex flex-wrap gap-1">
                    {lastDecision.providers_consulted.map((p) => (
                      <Badge key={p.provider} variant="secondary" className="text-xs">
                        {p.provider} ({p.latency_ms}ms)
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Queue Tab */}
        <TabsContent value="queue" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Fila de Resiliência</CardTitle>
              <CardDescription>
                Upstash Redis/Kafka para prevenir exaustão do Gmail
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Fila de Cadastros</p>
                  <p className="text-sm text-muted-foreground">
                    Backend: {queueStatus?.backend || 'Desconhecido'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{queueStatus?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">itens na fila</p>
                </div>
              </div>

              <Button onClick={handleCheckQueue} disabled={queueProcessing} className="w-full" variant="outline">
                {queueProcessing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Atualizar Status
              </Button>

              <div className="p-4 border rounded-lg space-y-2">
                <p className="text-sm font-medium">Configuração de API Keys:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    UPSTASH_REDIS_URL
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    UPSTASH_REDIS_TOKEN
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Logs Terminal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Terminal de Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64 rounded-lg bg-black/90 p-4 font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-gray-500">Nenhum log ainda. Execute uma operação para ver os logs.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 py-1 text-gray-300">
                  <span className="text-gray-500">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  {getTypeIcon(log.type)}
                  {getStatusIcon(log.status)}
                  <span className={
                    log.status === 'error' ? 'text-red-400' :
                    log.status === 'success' ? 'text-green-400' :
                    log.status === 'warning' ? 'text-yellow-400' :
                    'text-blue-400'
                  }>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
