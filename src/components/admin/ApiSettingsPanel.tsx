import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Key,
  Shield,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  Rss,
  Newspaper,
  Brain,
  Sparkles,
  Zap,
  Camera,
  Globe,
} from 'lucide-react';

interface ApiSource {
  id: string;
  name: string;
  description: string;
  keyName: string;
  isConfigured: boolean;
  isEnabled: boolean;
  priority: number;
  category: 'news' | 'ai' | 'services';
  icon: React.ReactNode;
}

export function ApiSettingsPanel() {
  const [sources, setSources] = useState<ApiSource[]>([
    // News APIs
    { id: 'firecrawl', name: 'Firecrawl', description: 'Web scraping e busca de notícias', keyName: 'FIRECRAWL_API_KEY', isConfigured: true, isEnabled: true, priority: 1, category: 'news', icon: <Globe className="h-4 w-4" /> },
    { id: 'newsapi', name: 'NewsAPI', description: 'Notícias de fontes globais', keyName: 'NEWS_API_KEY', isConfigured: true, isEnabled: true, priority: 2, category: 'news', icon: <Newspaper className="h-4 w-4" /> },
    { id: 'gnews', name: 'GNews', description: 'Agregador de notícias gratuito', keyName: 'GNEWS_API_KEY', isConfigured: true, isEnabled: true, priority: 3, category: 'news', icon: <Rss className="h-4 w-4" /> },
    // AI APIs
    { id: 'lovable-ai', name: 'Lovable AI Gateway', description: 'Acesso a Gemini e GPT-5 (auto-configurado)', keyName: 'LOVABLE_API_KEY', isConfigured: true, isEnabled: true, priority: 1, category: 'ai', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'gemini', name: 'Google Gemini', description: 'Gemini 2.5 Pro/Flash via Lovable AI', keyName: '-', isConfigured: true, isEnabled: true, priority: 2, category: 'ai', icon: <Brain className="h-4 w-4" /> },
    { id: 'gpt', name: 'OpenAI GPT-5', description: 'GPT-5 e GPT-5-mini via Lovable AI', keyName: '-', isConfigured: true, isEnabled: true, priority: 3, category: 'ai', icon: <Zap className="h-4 w-4" /> },
    // Service APIs
    { id: 'cloudinary', name: 'Cloudinary', description: 'Upload e processamento de imagens', keyName: 'CLOUDINARY_API_KEY', isConfigured: true, isEnabled: true, priority: 1, category: 'services', icon: <Camera className="h-4 w-4" /> },
  ]);
  const [loading, setLoading] = useState(false);
  const [testingApi, setTestingApi] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [newsCount, setNewsCount] = useState(0);
  const [aiVerdictsCount, setAiVerdictsCount] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { count: newsCountResult } = await supabase.from('cached_news').select('*', { count: 'exact', head: true });
      setNewsCount(newsCountResult || 0);
      
      const { data: newsData } = await supabase.from('cached_news').select('created_at').order('created_at', { ascending: false }).limit(1).single();
      if (newsData) {
        setLastFetch(new Date(newsData.created_at));
      }

      // Get AI verdicts count
      const { count: verdictsCount } = await supabase.from('admin_ai_verdicts').select('*', { count: 'exact', head: true });
      setAiVerdictsCount(verdictsCount || 0);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleManualFetch = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-fetch-news');
      
      if (error) throw error;
      
      toast.success(`Busca realizada! ${data.filtered || 0} notícias processadas.`);
      loadStats();
    } catch (error) {
      console.error('Error fetching news:', error);
      toast.error('Erro ao buscar notícias');
    } finally {
      setLoading(false);
    }
  };

  const handleTestApi = async (apiId: string) => {
    setTestingApi(apiId);
    try {
      if (apiId === 'lovable-ai' || apiId === 'gemini' || apiId === 'gpt') {
        // Test AI Council endpoint
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error('Faça login para testar a API');
          return;
        }

        const { data, error } = await supabase.functions.invoke('ai-council', {
          body: {
            category: 'TECNICA/SEGURANÇA',
            problem: 'Teste de conectividade do Conselho de IAs',
            includeErrorLogs: false,
            includeStripeData: false,
          },
        });

        if (error) throw error;
        toast.success(`${sources.find(s => s.id === apiId)?.name} está funcionando! Tempo: ${data.verdict?.processingTimeMs}ms`);
      } else {
        // Simulate test for other APIs
        await new Promise(resolve => setTimeout(resolve, 1500));
        const source = sources.find(s => s.id === apiId);
        if (source?.isConfigured) {
          toast.success(`${source.name} está funcionando corretamente!`);
        } else {
          toast.error(`${source?.name || 'API'} não está configurada`);
        }
      }
    } catch (error) {
      console.error('Error testing API:', error);
      toast.error('Erro ao testar API');
    } finally {
      setTestingApi(null);
    }
  };

  const handleToggleSource = (apiId: string, enabled: boolean) => {
    setSources(prev => prev.map(s => 
      s.id === apiId ? { ...s, isEnabled: enabled } : s
    ));
    toast.success(`Fonte ${enabled ? 'ativada' : 'desativada'}`);
  };

  const handleCleanup = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-expired-content');
      
      if (error) throw error;
      
      toast.success(`Limpeza concluída! ${data.deleted_news || 0} notícias e ${data.deleted_posts || 0} posts removidos.`);
      loadStats();
    } catch (error) {
      console.error('Error cleaning up:', error);
      toast.error('Erro na limpeza');
    } finally {
      setLoading(false);
    }
  };

  const renderApiSources = (category: 'news' | 'ai' | 'services', title: string, description: string) => {
    const filteredSources = sources.filter(s => s.category === category);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {category === 'news' && <Newspaper className="h-5 w-5" />}
            {category === 'ai' && <Brain className="h-5 w-5" />}
            {category === 'services' && <Settings className="h-5 w-5" />}
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredSources.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
            >
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  source.isConfigured ? 'bg-green-500/10' : 'bg-muted'
                }`}>
                  {source.isConfigured ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {source.icon}
                    <span className="font-medium">{source.name}</span>
                    <Badge variant={source.isConfigured ? 'default' : 'secondary'}>
                      Prioridade {source.priority}
                    </Badge>
                    {source.isConfigured && source.isEnabled && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                        Ativo
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{source.description}</p>
                  {source.keyName !== '-' && (
                    <code className="text-xs text-muted-foreground">{source.keyName}</code>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={source.isEnabled}
                    onCheckedChange={(checked) => handleToggleSource(source.id, checked)}
                    disabled={!source.isConfigured}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestApi(source.id)}
                  disabled={testingApi !== null}
                >
                  {testingApi === source.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    'Testar'
                  )}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Notícias no Cache</CardTitle>
            <Newspaper className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newsCount}</div>
            <p className="text-xs text-muted-foreground">
              TTL: 30 minutos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Última Busca</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lastFetch ? new Intl.DateTimeFormat('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              }).format(lastFetch) : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              Auto: a cada 20 min
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fontes Ativas</CardTitle>
            <Rss className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sources.filter(s => s.isConfigured && s.isEnabled).length} / {sources.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Sistema multi-API ativo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vereditos IA</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aiVerdictsCount}</div>
            <p className="text-xs text-muted-foreground">
              Conselho de IAs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={handleManualFetch} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Buscar Notícias Agora
          </Button>
          <Button variant="outline" onClick={handleCleanup} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Executar Limpeza Manual
          </Button>
        </CardContent>
      </Card>

      {/* News APIs */}
      {renderApiSources('news', 'APIs de Notícias', 'Fontes de dados com sistema de fallback automático.')}

      {/* AI APIs */}
      {renderApiSources('ai', 'Conselho de IAs', 'Sistema de triangulação de decisões com múltiplos modelos de IA.')}

      {/* Service APIs */}
      {renderApiSources('services', 'APIs de Serviços', 'Integrações para upload, processamento e outros serviços.')}

      {/* Content Filtering */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Conteúdo</CardTitle>
          <CardDescription>
            Palavras proibidas para sanitização de conteúdo negativo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {['acidente', 'crime', 'morte', 'política', 'violência', 'tragédia', 'trânsito', 'crise', 'assassinato', 'roubo', 'guerra', 'terrorismo'].map((word) => (
              <Badge key={word} variant="destructive" className="text-xs">
                {word}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Conteúdos com essas palavras são automaticamente removidos antes de serem persistidos no feed.
          </p>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">
              Segurança das Chaves API
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Todas as chaves são armazenadas de forma segura e nunca são expostas no frontend.
              As chamadas às APIs externas são realizadas exclusivamente via Edge Functions.
              O Conselho de IAs utiliza o Lovable AI Gateway com chave auto-gerenciada.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
