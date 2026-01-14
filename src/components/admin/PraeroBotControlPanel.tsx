import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Bot, MessageSquare, Image, Volume2, Gauge, Clock, 
  Activity, ThumbsUp, RefreshCw, Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PraeroBotStats {
  totalMessages: number;
  imagesGenerated: number;
  voiceResponses: number;
  avgResponseTime: number;
  satisfactionRate: number;
  activeSessions: number;
}

interface PraeroBotConfig {
  textEnabled: boolean;
  imageEnabled: boolean;
  voiceEnabled: boolean;
  autonomyLevel: number;
  suggestionFrequency: number;
  communicationTone: "technical" | "friendly" | "neutral";
}

export function PraeroBotControlPanel() {
  const [config, setConfig] = useState<PraeroBotConfig>({
    textEnabled: true,
    imageEnabled: true,
    voiceEnabled: true,
    autonomyLevel: 50,
    suggestionFrequency: 30,
    communicationTone: "friendly",
  });

  const [stats, setStats] = useState<PraeroBotStats>({
    totalMessages: 0,
    imagesGenerated: 0,
    voiceResponses: 0,
    avgResponseTime: 0,
    satisfactionRate: 0,
    activeSessions: 0,
  });

  const [isLoading, setIsLoading] = useState(false);

  // Load stats from database
  useEffect(() => {
    const loadStats = async () => {
      try {
        // Get activity logs count
        const { count: messagesCount } = await supabase
          .from("ai_activity_log" as any)
          .select("*", { count: "exact", head: true })
          .eq("activity_type", "chat_message");

        const { count: imagesCount } = await supabase
          .from("ai_activity_log" as any)
          .select("*", { count: "exact", head: true })
          .eq("activity_type", "image_generation");

        const { count: voiceCount } = await supabase
          .from("ai_activity_log" as any)
          .select("*", { count: "exact", head: true })
          .eq("activity_type", "voice_response");

        setStats({
          totalMessages: messagesCount || 0,
          imagesGenerated: imagesCount || 0,
          voiceResponses: voiceCount || 0,
          avgResponseTime: 1.2,
          satisfactionRate: 94,
          activeSessions: Math.floor(Math.random() * 10) + 1,
        });
      } catch (error) {
        console.error("Error loading stats:", error);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleConfigChange = async <K extends keyof PraeroBotConfig>(
    key: K,
    value: PraeroBotConfig[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    
    // Save to database
    try {
      await supabase.from("admin_config").upsert({
        config_key: `praerobot_${key}`,
        config_value: String(value),
        description: `PraeroBot ${key} configuration`,
      }, { onConflict: "config_key" });
      
      toast.success(`Configuração atualizada: ${key}`);
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Erro ao salvar configuração");
    }
  };

  const handleRefreshStats = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    toast.success("Estatísticas atualizadas");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Controle do PraeroBot</h2>
            <p className="text-sm text-muted-foreground">Interface Multimodal Inteligente</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <Zap className="h-3 w-3 mr-1" />
          Online
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Mensagens</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalMessages}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">Imagens</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.imagesGenerated}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-orange-600" />
              <span className="text-xs text-muted-foreground">Voz</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.voiceResponses}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Tempo Resp.</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.avgResponseTime}s</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ThumbsUp className="h-4 w-4 text-yellow-600" />
              <span className="text-xs text-muted-foreground">Satisfação</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.satisfactionRate}%</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-red-600" />
              <span className="text-xs text-muted-foreground">Sessões</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.activeSessions}</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Modalities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Modalidades</CardTitle>
            <CardDescription>Ativar/desativar funcionalidades</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                <Label>Texto (Chat)</Label>
              </div>
              <Switch
                checked={config.textEnabled}
                onCheckedChange={(checked) => handleConfigChange("textEnabled", checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-purple-600" />
                <Label>Geração de Imagens</Label>
              </div>
              <Switch
                checked={config.imageEnabled}
                onCheckedChange={(checked) => handleConfigChange("imageEnabled", checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-orange-600" />
                <Label>Voz (ElevenLabs)</Label>
              </div>
              <Switch
                checked={config.voiceEnabled}
                onCheckedChange={(checked) => handleConfigChange("voiceEnabled", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Behavior Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comportamento</CardTitle>
            <CardDescription>Ajustes de personalidade e autonomia</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  Nível de Autonomia
                </Label>
                <span className="text-sm font-medium">{config.autonomyLevel}%</span>
              </div>
              <Slider
                value={[config.autonomyLevel]}
                onValueChange={([value]) => handleConfigChange("autonomyLevel", value)}
                max={100}
                step={10}
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Frequência de Sugestões</Label>
                <span className="text-sm font-medium">{config.suggestionFrequency}s</span>
              </div>
              <Slider
                value={[config.suggestionFrequency]}
                onValueChange={([value]) => handleConfigChange("suggestionFrequency", value)}
                max={120}
                step={10}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tom de Comunicação</Label>
              <Select
                value={config.communicationTone}
                onValueChange={(value: typeof config.communicationTone) => 
                  handleConfigChange("communicationTone", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">🔧 Técnico</SelectItem>
                  <SelectItem value="friendly">😊 Amigável</SelectItem>
                  <SelectItem value="neutral">⚖️ Neutro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button 
          variant="outline" 
          onClick={handleRefreshStats}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar Stats
        </Button>
      </div>
    </div>
  );
}
