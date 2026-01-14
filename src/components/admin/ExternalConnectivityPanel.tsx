import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Wifi, WifiOff, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProviderHealth {
  id: string;
  provider: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  last_success_at: string | null;
  last_failure_at: string | null;
  consecutive_failures: number;
  total_requests: number;
  total_failures: number;
  avg_latency_ms: number | null;
  updated_at: string;
}

const PROVIDER_ICONS: Record<string, string> = {
  openai: '🤖',
  anthropic: '🧠',
  perplexity: '🔍',
  lovable: '💜',
};

const PROVIDER_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  perplexity: 'Perplexity',
  lovable: 'Lovable AI',
};

export function ExternalConnectivityPanel() {
  const [providers, setProviders] = useState<ProviderHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_provider_health')
        .select('*')
        .order('provider');

      if (error) throw error;
      setProviders((data || []) as unknown as ProviderHealth[]);
    } catch (err) {
      console.error('Error loading provider health:', err);
      toast.error('Erro ao carregar status dos providers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();

    // Realtime subscription
    const channel = supabase
      .channel('provider-health')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_provider_health' },
        () => loadProviders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProviders();
    setRefreshing(false);
    toast.success('Status atualizado');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'down': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'down': return <WifiOff className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca';
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <Card className="bg-background/50 backdrop-blur border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            🌐 Conectividade Externa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background/50 backdrop-blur border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            🌐 Conectividade Externa
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(provider.status)} animate-pulse`} />
              <span className="text-lg">{PROVIDER_ICONS[provider.provider]}</span>
              <div>
                <div className="font-medium text-sm">
                  {PROVIDER_NAMES[provider.provider]}
                </div>
                <div className="text-xs text-muted-foreground">
                  {provider.avg_latency_ms ? `${provider.avg_latency_ms}ms` : '-'} | 
                  {provider.total_requests} reqs
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {provider.consecutive_failures > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {provider.consecutive_failures} falhas
                </Badge>
              )}
              <Badge
                variant={provider.status === 'healthy' ? 'default' : 'secondary'}
                className="gap-1"
              >
                {getStatusIcon(provider.status)}
                <span className="capitalize">{provider.status}</span>
              </Badge>
            </div>
          </div>
        ))}

        {providers.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Nenhum provider configurado
          </div>
        )}

        <div className="pt-2 border-t text-xs text-muted-foreground">
          Última atualização: {providers[0] ? formatTime(providers[0].updated_at) : '-'}
        </div>
      </CardContent>
    </Card>
  );
}
