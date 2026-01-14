import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  imageUrl?: string;
  audioUrl?: string;
  metadata?: Record<string, unknown>;
}

interface PraeroBotConfig {
  textEnabled: boolean;
  imageEnabled: boolean;
  voiceEnabled: boolean;
  autonomyLevel: "low" | "medium" | "high";
  communicationTone: "technical" | "friendly" | "neutral";
}

interface UsePraeroBotReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isGeneratingImage: boolean;
  isSpeaking: boolean;
  sendMessage: (content: string) => Promise<void>;
  generateImage: (prompt: string) => Promise<string | null>;
  speakText: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  clearMessages: () => void;
  config: PraeroBotConfig;
  sessionId: string;
}

const DEFAULT_CONFIG: PraeroBotConfig = {
  textEnabled: true,
  imageEnabled: true,
  voiceEnabled: true,
  autonomyLevel: "medium",
  communicationTone: "friendly",
};

const generateSessionId = (userId?: string): string => {
  const userPart = userId?.slice(0, 8) || 'anon';
  return `praerobot_${userPart}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export function usePraeroBot(): UsePraeroBotReturn {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [config] = useState<PraeroBotConfig>(DEFAULT_CONFIG);
  const [sessionId] = useState(() => generateSessionId(user?.id));
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Stop any ongoing audio playback
  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  }, []);

  // Text-to-Speech using ElevenLabs
  const speakText = useCallback(async (text: string) => {
    if (!config.voiceEnabled) return;
    
    try {
      stopSpeaking();
      setIsSpeaking(true);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            text: text.slice(0, 1000), // Limit to 1000 chars
            voiceId: "JBFqnCBsd6RMkjVDRZzb" // George - professional voice
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsSpeaking(false);
      audioRef.current.onerror = () => setIsSpeaking(false);
      await audioRef.current.play();

    } catch (error) {
      console.error("[PraeroBot] TTS error:", error);
      setIsSpeaking(false);
    }
  }, [config.voiceEnabled, stopSpeaking]);

  // Image generation using Lovable AI
  const generateImage = useCallback(async (prompt: string): Promise<string | null> => {
    if (!config.imageEnabled) return null;

    try {
      setIsGeneratingImage(true);

      const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
        body: {
          message: prompt,
          capability: "image",
          userId: user?.id,
          sessionId,
        },
      });

      if (error) throw error;

      // Log activity
      await supabase.from("ai_activity_log" as any).insert({
        user_id: user?.id,
        activity_type: "image_generation",
        session_id: sessionId,
        details: { prompt: prompt.slice(0, 100) },
      }).then(() => {});

      return data?.imageUrl || null;

    } catch (error) {
      console.error("[PraeroBot] Image generation error:", error);
      toast.error("Erro ao gerar imagem");
      return null;
    } finally {
      setIsGeneratingImage(false);
    }
  }, [config.imageEnabled, user?.id, sessionId]);

  // Send message to AI
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      abortControllerRef.current = new AbortController();

      // Detect if user wants an image
      const wantsImage = /gerar?\s*(uma?\s*)?(imagem|foto|ilustra|desenh)/i.test(content);

      const { data, error } = await supabase.functions.invoke("praieiro-chat", {
        body: {
          message: content,
          sessionId,
          userId: user?.id,
          includeContext: true,
          role: user ? "user" : "guest",
        },
      });

      if (error) throw error;

      let imageUrl: string | undefined;

      // Generate image if requested
      if (wantsImage && config.imageEnabled) {
        imageUrl = await generateImage(content) || undefined;
      }

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: data.response || "Ocorreu um erro.",
        timestamp: new Date(),
        imageUrl,
        metadata: data.audit,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Log activity
      await supabase.from("ai_activity_log" as any).insert({
        user_id: user?.id,
        activity_type: "chat_message",
        session_id: sessionId,
        details: { hasImage: !!imageUrl },
      }).then(() => {});

    } catch (error) {
      console.error("[PraeroBot] Chat error:", error);
      
      setMessages(prev => [...prev, {
        id: `error_${Date.now()}`,
        role: "assistant",
        content: "Ocorreu um erro. Por favor, tente novamente.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, user?.id, sessionId, generateImage, config.imageEnabled]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    stopSpeaking();
  }, [stopSpeaking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      abortControllerRef.current?.abort();
    };
  }, [stopSpeaking]);

  return {
    messages,
    isLoading,
    isGeneratingImage,
    isSpeaking,
    sendMessage,
    generateImage,
    speakText,
    stopSpeaking,
    clearMessages,
    config,
    sessionId,
  };
}
