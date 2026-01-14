import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Mic, MicOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface InteractiveModeToggleProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  isListening?: boolean;
}

export function InteractiveModeToggle({
  isEnabled,
  onToggle,
  isListening = false,
}: InteractiveModeToggleProps) {
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    setIsRequestingPermission(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      localStorage.setItem("praieiro_mic_granted", "true");
      return true;
    } catch (error) {
      console.error("[InteractiveMode] Microphone permission denied:", error);
      setHasPermission(false);
      toast.error("Permissão do microfone negada. Ative nas configurações do navegador.");
      return false;
    } finally {
      setIsRequestingPermission(false);
    }
  }, []);

  const handleToggle = useCallback(async (checked: boolean) => {
    if (checked) {
      // Check if we already have permission
      const storedPermission = localStorage.getItem("praieiro_mic_granted");
      
      if (storedPermission === "true") {
        onToggle(true);
        toast.success("Modo interativo ativado! Fale com o Praieiro Bot.");
        return;
      }

      // Request permission
      const granted = await requestMicrophonePermission();
      if (granted) {
        onToggle(true);
        toast.success("Modo interativo ativado! Fale com o Praieiro Bot.");
      }
    } else {
      onToggle(false);
      toast.info("Modo interativo desativado.");
    }
  }, [onToggle, requestMicrophonePermission]);

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-lg border border-orange-500/20">
      <div className="flex items-center gap-2 flex-1">
        <motion.div
          animate={isListening ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.5, repeat: isListening ? Infinity : 0 }}
        >
          {isEnabled ? (
            <Mic className="h-4 w-4 text-blue-400" />
          ) : (
            <MicOff className="h-4 w-4 text-orange-400/50" />
          )}
        </motion.div>
        
        <div className="flex flex-col">
          <span className="text-xs font-medium text-orange-100">
            Modo Interativo
          </span>
          <span className="text-[10px] text-orange-400/60">
            {isListening ? "🎤 Ouvindo..." : isEnabled ? "Pronto para ouvir" : "Desativado"}
          </span>
        </div>
      </div>

      {hasPermission === false && (
        <AlertCircle className="h-4 w-4 text-yellow-500" />
      )}

      <Switch
        checked={isEnabled}
        onCheckedChange={handleToggle}
        disabled={isRequestingPermission}
        className="data-[state=checked]:bg-blue-500"
      />
    </div>
  );
}
