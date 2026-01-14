import { useState, useEffect, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Volume2, VolumeX, Mic, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface VoiceActivationToggleProps {
  voiceEnabled: boolean;
  onVoiceChange: (enabled: boolean) => void;
  isSpeaking?: boolean;
}

export function VoiceActivationToggle({ 
  voiceEnabled, 
  onVoiceChange, 
  isSpeaking = false 
}: VoiceActivationToggleProps) {
  const [hasAudioPermission, setHasAudioPermission] = useState<boolean | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Check initial permission state
  useEffect(() => {
    const checkPermission = async () => {
      try {
        // Check if we already have permission stored
        const stored = localStorage.getItem("praieiro_audio_permission");
        if (stored === "granted") {
          setHasAudioPermission(true);
          return;
        }
        
        // Check navigator permissions API if available
        if (navigator.permissions) {
          const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
          setHasAudioPermission(result.state === "granted");
        }
      } catch {
        // Permission API not supported, we'll need to request
        setHasAudioPermission(null);
      }
    };
    checkPermission();
  }, []);

  const requestAudioPermission = useCallback(async () => {
    setIsRequestingPermission(true);
    
    try {
      // Request microphone access to trigger permission dialog
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      setHasAudioPermission(true);
      localStorage.setItem("praieiro_audio_permission", "granted");
      
      // Enable voice automatically after permission granted
      onVoiceChange(true);
      
      toast.success("🎙️ Modo interativo ativado! O PraeroBot agora pode falar com você.");
    } catch (error) {
      console.error("Audio permission denied:", error);
      setHasAudioPermission(false);
      
      toast.error("Permissão de áudio negada. Ative nas configurações do navegador.");
    } finally {
      setIsRequestingPermission(false);
    }
  }, [onVoiceChange]);

  const handleToggle = useCallback((checked: boolean) => {
    if (checked && !hasAudioPermission) {
      // Need to request permission first
      requestAudioPermission();
      return;
    }
    
    onVoiceChange(checked);
    
    if (checked) {
      toast.success("🔊 Modo interativo ativado!");
    } else {
      toast("🔇 Modo silencioso ativado");
    }
  }, [hasAudioPermission, onVoiceChange, requestAudioPermission]);

  return (
    <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {voiceEnabled ? (
              <Volume2 className="h-5 w-5 text-green-500" />
            ) : (
              <VolumeX className="h-5 w-5 text-muted-foreground" />
            )}
            <CardTitle className="text-base">Modo Interativo</CardTitle>
          </div>
          <Badge 
            variant={voiceEnabled ? "default" : "secondary"}
            className={voiceEnabled ? "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30" : ""}
          >
            {isSpeaking ? "🔊 Falando..." : voiceEnabled ? "Ativo" : "Silencioso"}
          </Badge>
        </div>
        <CardDescription>
          {voiceEnabled 
            ? "O PraeroBot está falando com você! Ouça as respostas em voz."
            : "Ative para ouvir o PraeroBot responder com voz natural."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission Status */}
        {hasAudioPermission === false && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Permissão de áudio necessária para ativar a voz.</span>
            </div>
          </div>
        )}

        {hasAudioPermission === null && !voiceEnabled && (
          <Button 
            variant="outline" 
            className="w-full border-green-500/30 hover:bg-green-500/10"
            onClick={requestAudioPermission}
            disabled={isRequestingPermission}
          >
            <Mic className="h-4 w-4 mr-2" />
            {isRequestingPermission ? "Solicitando..." : "Ativar Modo Interativo"}
          </Button>
        )}

        {/* Toggle */}
        {hasAudioPermission && (
          <div className="flex items-center justify-between">
            <Label htmlFor="voice-mode" className="text-sm font-medium cursor-pointer flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Voz ativada
            </Label>
            <Switch
              id="voice-mode"
              checked={voiceEnabled}
              onCheckedChange={handleToggle}
              className="data-[state=checked]:bg-green-500"
            />
          </div>
        )}

        {voiceEnabled && (
          <div className="mt-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
              <Volume2 className="h-4 w-4" />
              <span>Powered by ElevenLabs Voice AI</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
