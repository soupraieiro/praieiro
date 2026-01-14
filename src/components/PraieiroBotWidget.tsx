/**
 * PRAIEIRO BOT WIDGET - VERSÃO 2.0
 * - Bola de plasma/sol com logo sobreposta
 * - Texto "Praieiro Bot" com animação de ondas sonoras
 * - Player YouTube integrado
 * - Modo interativo com microfone
 * - Chat arrastável quando maximizado
 * - Minimizado com player compacto
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { 
  Send, X, Minus, Play, Pause, Volume2, VolumeX, 
  Lock, Loader2, GripHorizontal, Square
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useDraggable } from "./praerobot/useDraggable";
import { PlasmaSphere } from "./praerobot/PlasmaSphere";
import { MiniPlayer } from "./praerobot/MiniPlayer";
import { InteractiveModeToggle } from "./praerobot/InteractiveModeToggle";
import { VideoCard } from "./praerobot/VideoCard";

// ═══════════════════════════════════════════════════════════════════
// TIPOS E INTERFACES
// ═══════════════════════════════════════════════════════════════════

interface ChatMetadata {
  action?: 'play_music' | 'open_link' | 'show_vendor';
  videoId?: string;
  videoTitle?: string;
  url?: string;
  vendorId?: string;
}

interface SatoshiAudit {
  hash: string;
  satoshi_timestamp: number;
  btc_context: string | null;
}

interface ChatMessage {
  id: string;
  type: "user" | "praieiro";
  content: string;
  timestamp: Date;
  metadata?: ChatMetadata;
  audit?: SatoshiAudit;
  imageUrl?: string;
  videoData?: {
    videoId: string;
    title: string;
    thumbnail?: string;
  };
}

interface MusicState {
  isPlaying: boolean;
  videoId: string | null;
  videoTitle: string | null;
  volume: number;
  isMuted: boolean;
  hasEnded: boolean;
}

type WidgetState = "closed" | "open" | "minimized";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function generateSessionId(userId?: string): string {
  const userPart = userId?.slice(0, 8) || 'anon';
  return `praieiro_${userPart}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

export function PraieiroBotWidget() {
  const { user, loading: authLoading } = useAuth();
  const [widgetState, setWidgetState] = useState<WidgetState>("closed");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => generateSessionId());
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showLockedTooltip, setShowLockedTooltip] = useState(false);
  const [isInteractiveMode, setIsInteractiveMode] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLIFrameElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playerReady, setPlayerReady] = useState(false);

  // Music state
  const [music, setMusic] = useState<MusicState>({
    isPlaying: false,
    videoId: null,
    videoTitle: null,
    volume: 80,
    isMuted: false,
    hasEnded: false,
  });

  // Draggable para estado aberto (canto inferior direito)
  const { position, isDragging, dragHandlers, resetPosition } = useDraggable({
    initialPosition: { 
      x: typeof window !== 'undefined' ? window.innerWidth - 420 : 0, 
      y: typeof window !== 'undefined' ? window.innerHeight - 620 : 0 
    },
    bounds: 'window',
    snapToEdges: true,
  });

  // Draggable para estado fechado (bola de plasma)
  const closedDrag = useDraggable({
    initialPosition: { 
      x: typeof window !== 'undefined' ? window.innerWidth - 90 : 0, 
      y: typeof window !== 'undefined' ? window.innerHeight - 180 : 0 
    },
    bounds: 'window',
    snapToEdges: true,
  });

  const isUserLoggedIn = !!user && !authLoading;

  // ═══════════════════════════════════════════════════════════════════
  // SATOSHI AUDIT
  // ═══════════════════════════════════════════════════════════════════

  const generateSatoshiAudit = useCallback(async (
    action: string, 
    details: Record<string, unknown>
  ): Promise<{ hash: string; timestamp: number; context: string }> => {
    const timestamp = Date.now();
    const payload = JSON.stringify({
      action,
      sessionId,
      userId: user?.id || 'anon',
      timestamp,
      details,
      btc_chain: 'immutable_audit',
    });
    
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const context = `satoshi:${action}:${timestamp}`;
    console.log(`[Praieiro] ₿ Satoshi Audit | Action: ${action} | Hash: ${hashHex.slice(0, 16)}...`);
    
    return { hash: hashHex, timestamp, context };
  }, [sessionId, user?.id]);

  // ═══════════════════════════════════════════════════════════════════
  // VOZ (TTS via ElevenLabs)
  // ═══════════════════════════════════════════════════════════════════

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setAudioLevel(0);
  }, []);

  const speakText = useCallback(async (text: string) => {
    if (!voiceEnabled || !text.trim()) return;

    stopSpeaking();
    setIsSpeaking(true);

    try {
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
            text: text.slice(0, 500), 
            voiceId: "onwK4e9ZLuTAKqWW03F9"
          }),
        }
      );

      if (!response.ok) {
        throw new Error("TTS failed");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Simulate audio level animation
      const audioLevelInterval = setInterval(() => {
        if (audioRef.current && !audioRef.current.paused) {
          setAudioLevel(Math.random() * 0.5 + 0.3);
        }
      }, 100);

      audio.onended = () => {
        setIsSpeaking(false);
        setAudioLevel(0);
        clearInterval(audioLevelInterval);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        setAudioLevel(0);
        clearInterval(audioLevelInterval);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (err) {
      console.error("TTS error:", err);
      setIsSpeaking(false);
      setAudioLevel(0);
    }
  }, [voiceEnabled, stopSpeaking]);

  // ═══════════════════════════════════════════════════════════════════
  // RESET SESSÃO
  // ═══════════════════════════════════════════════════════════════════

  const resetChatSession = useCallback(async () => {
    if (music.videoId) {
      await generateSatoshiAudit('session_close', {
        videoId: music.videoId,
        videoTitle: music.videoTitle,
        reason: 'user_closed_chat',
      });
    }
    
    if (playerRef.current?.contentWindow) {
      playerRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "stopVideo", args: [] }),
        "*"
      );
    }
    
    stopSpeaking();
    setMusic({
      isPlaying: false,
      videoId: null,
      videoTitle: null,
      volume: 80,
      isMuted: false,
      hasEnded: false,
    });
    setMessages([]);
    setPlayerReady(false);
    setSessionId(generateSessionId(user?.id));
    setIsInteractiveMode(false);
    
    console.log('[Praieiro] ₿ Session reset - complete cleanup');
  }, [music.videoId, music.videoTitle, user?.id, generateSatoshiAudit, stopSpeaking]);

  // ═══════════════════════════════════════════════════════════════════
  // WELCOME MESSAGE
  // ═══════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (widgetState === "open" && messages.length === 0 && isUserLoggedIn) {
      const welcomeMsg: ChatMessage = {
        id: "welcome",
        type: "praieiro",
        content: "Olá! Sou o **Praieiro Bot**, seu assistente oficial. ☀️\n\nPosso ajudar com informações, tocar músicas do YouTube para você, ou simplesmente conversar.\n\nDiga algo como: *\"toca um Gilberto Gil\"* ou pergunte o que quiser!",
        timestamp: new Date(),
      };
      setMessages([welcomeMsg]);
      
      if (voiceEnabled) {
        setTimeout(() => {
          speakText("Olá! Sou o Praieiro Bot, seu assistente oficial. Como posso ajudar?");
        }, 500);
      }
    }
  }, [widgetState, messages.length, isUserLoggedIn, voiceEnabled, speakText]);

  // ═══════════════════════════════════════════════════════════════════
  // AUTO-SCROLL
  // ═══════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // ═══════════════════════════════════════════════════════════════════
  // YOUTUBE PLAYER HANDLERS
  // ═══════════════════════════════════════════════════════════════════

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== "https://www.youtube.com") return;
      
      try {
        const data = JSON.parse(event.data);
        
        if (data.event === "onReady" || (data.info?.playerState !== undefined && !playerReady)) {
          setPlayerReady(true);
        }
        
        if (data.event === "onStateChange" || data.info?.playerState !== undefined) {
          const state = data.info?.playerState ?? data.info;
          
          if (typeof state === 'number') {
            if (state === 0) {
              await generateSatoshiAudit('music_ended', {
                videoId: music.videoId,
                videoTitle: music.videoTitle,
                playedToCompletion: true,
              });
              
              setMusic(prev => ({
                ...prev,
                isPlaying: false,
                hasEnded: true,
              }));
              
              setMessages(prev => [...prev, {
                id: `music_ended_${Date.now()}`,
                type: "praieiro",
                content: `🎵 A música "${music.videoTitle}" terminou.\n\nSe quiser ouvir outra, é só me pedir!`,
                timestamp: new Date(),
              }]);
            }
            
            const isActuallyPlaying = state === 1;
            setMusic(prev => {
              if (prev.isPlaying !== isActuallyPlaying && state !== 0) {
                return { ...prev, isPlaying: isActuallyPlaying };
              }
              return prev;
            });

            // Update audio level based on playing state
            if (isActuallyPlaying) {
              setAudioLevel(0.5);
            } else {
              setAudioLevel(0);
            }
          }
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [playerReady, music.videoId, music.videoTitle, generateSatoshiAudit]);

  const sendPlayerCommand = useCallback((command: string, args?: unknown[]) => {
    if (playerRef.current?.contentWindow) {
      playerRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: command, args: args || [] }),
        "*"
      );
    }
  }, []);

  const togglePlay = useCallback(async () => {
    if (music.hasEnded) {
      toast.info("A música terminou. Peça outra música!");
      return;
    }
    
    const newPlayingState = !music.isPlaying;
    await generateSatoshiAudit(`player_${newPlayingState ? 'play' : 'pause'}`, {
      videoId: music.videoId,
      videoTitle: music.videoTitle,
    });
    
    if (newPlayingState) {
      sendPlayerCommand("playVideo");
    } else {
      sendPlayerCommand("pauseVideo");
    }
    
    setMusic(prev => ({ ...prev, isPlaying: newPlayingState }));
  }, [music.isPlaying, music.videoId, music.videoTitle, music.hasEnded, sendPlayerCommand, generateSatoshiAudit]);

  const handleVolumeChange = useCallback((value: number[]) => {
    const vol = value[0];
    setMusic(prev => ({ ...prev, volume: vol, isMuted: vol === 0 }));
    sendPlayerCommand("setVolume", [vol]);
  }, [sendPlayerCommand]);

  const toggleMute = useCallback(() => {
    const newMutedState = !music.isMuted;
    
    if (newMutedState) {
      sendPlayerCommand("mute");
    } else {
      sendPlayerCommand("unMute");
      sendPlayerCommand("setVolume", [music.volume]);
    }
    
    setMusic(prev => ({ ...prev, isMuted: newMutedState }));
  }, [music.isMuted, music.volume, sendPlayerCommand]);

  const stopMusic = useCallback(async () => {
    await generateSatoshiAudit('stop_music', {
      videoId: music.videoId,
      videoTitle: music.videoTitle,
    });
    
    sendPlayerCommand("stopVideo");
    setPlayerReady(false);
    setMusic({
      isPlaying: false,
      videoId: null,
      videoTitle: null,
      volume: 80,
      isMuted: false,
      hasEnded: false,
    });
    setAudioLevel(0);
  }, [music.videoId, music.videoTitle, sendPlayerCommand, generateSatoshiAudit]);

  const playMusic = useCallback(async (videoId: string, title: string) => {
    const audit = await generateSatoshiAudit('play_music_request', {
      videoId,
      videoTitle: title,
      source: 'chat_ai_response',
    });
    
    console.log(`[Praieiro] ₿ NEW MUSIC | ${title} | Audit: ${audit.hash.slice(0, 12)}...`);
    
    setPlayerReady(false);
    setMusic({
      isPlaying: true,
      videoId,
      videoTitle: title,
      volume: 80,
      isMuted: false,
      hasEnded: false,
    });
  }, [generateSatoshiAudit]);

  // ═══════════════════════════════════════════════════════════════════
  // GENERATE IMAGE
  // ═══════════════════════════════════════════════════════════════════

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const generateImage = useCallback(async (prompt: string): Promise<string | null> => {
    setIsGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: {
          prompt,
          userId: user?.id,
          sessionId,
        },
      });

      if (error) throw error;

      if (data?.success && data?.imageUrl) {
        await generateSatoshiAudit('image_generated', {
          prompt: prompt.slice(0, 50),
          success: true,
        });
        return data.imageUrl;
      }
      
      throw new Error(data?.error || "Falha na geração de imagem");
    } catch (err) {
      console.error("[PraieiroBot] Image generation error:", err);
      toast.error("Erro ao gerar imagem. Tente novamente.");
      return null;
    } finally {
      setIsGeneratingImage(false);
    }
  }, [user?.id, sessionId, generateSatoshiAudit]);

  // Detectar pedido de imagem
  const detectImageRequest = useCallback((message: string): boolean => {
    const patterns = [
      /gerar?\s*(uma?\s*)?(imagem|foto|ilustra|desenh|arte)/i,
      /criar?\s*(uma?\s*)?(imagem|foto|ilustra|desenh|arte)/i,
      /fazer?\s*(uma?\s*)?(imagem|foto|ilustra|desenh|arte)/i,
      /desenh(ar|e|a)\s/i,
      /cri(e|a)\s.*imagem/i,
      /mostre?\s*(uma?\s*)?(imagem|foto)/i,
    ];
    return patterns.some(p => p.test(message));
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // SEND MESSAGE
  // ═══════════════════════════════════════════════════════════════════

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading || !isUserLoggedIn) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      // Check if user wants to generate an image
      const wantsImage = detectImageRequest(messageText);

      if (wantsImage) {
        // Generate image directly
        setMessages(prev => [...prev, {
          id: `loading_${Date.now()}`,
          type: "praieiro",
          content: "🎨 Gerando sua imagem... Aguarde um momento!",
          timestamp: new Date(),
        }]);

        const imageUrl = await generateImage(messageText);

        // Remove loading message
        setMessages(prev => prev.filter(m => !m.id.startsWith('loading_')));

        if (imageUrl) {
          setMessages(prev => [...prev, {
            id: `image_${Date.now()}`,
            type: "praieiro",
            content: "🎨 Aqui está sua imagem! Criei baseado no que você pediu.",
            timestamp: new Date(),
            imageUrl,
          }]);

          if (voiceEnabled) {
            speakText("Pronto! Aqui está a imagem que você pediu.");
          }
        } else {
          setMessages(prev => [...prev, {
            id: `error_${Date.now()}`,
            type: "praieiro",
            content: "Desculpe, não consegui gerar a imagem. Por favor, tente novamente com uma descrição diferente.",
            timestamp: new Date(),
          }]);
        }

        setIsLoading(false);
        return;
      }

      // Regular chat message
      const { data, error } = await supabase.functions.invoke("praieiro-chat", {
        body: {
          message: messageText,
          sessionId,
          userId: user?.id,
          includeContext: true,
        },
      });

      if (error) throw error;

      const metadata = data.metadata as ChatMetadata | undefined;
      const audit = data.audit as SatoshiAudit | undefined;
      
      const aiMessage: ChatMessage = {
        id: `praieiro_${Date.now()}`,
        type: "praieiro",
        content: data.response || "Opa, algo deu errado! 🌴",
        timestamp: new Date(),
        metadata,
        audit,
      };

      setMessages(prev => [...prev, aiMessage]);

      if (voiceEnabled && data.response) {
        speakText(data.response);
      }

      // Handle music action from AI
      if (metadata?.action === 'play_music' && metadata.videoId) {
        playMusic(metadata.videoId, metadata.videoTitle || 'Música');
        
        setMessages(prev => [...prev, {
          id: `video_${Date.now()}`,
          type: "praieiro",
          content: `🎵 Tocando agora...`,
          timestamp: new Date(),
          videoData: {
            videoId: metadata.videoId!,
            title: metadata.videoTitle || 'Música',
            thumbnail: `https://img.youtube.com/vi/${metadata.videoId}/mqdefault.jpg`,
          },
        }]);
      }

    } catch (err) {
      console.error("Chat error:", err);
      toast.error("Erro ao enviar mensagem");
      
      setMessages(prev => [...prev, {
        id: `error_${Date.now()}`,
        type: "praieiro",
        content: "Ocorreu um erro. Por favor, tente novamente.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, sessionId, user?.id, playMusic, voiceEnabled, speakText, isUserLoggedIn, detectImageRequest, generateImage]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSphereClick = () => {
    if (!isUserLoggedIn) {
      setShowLockedTooltip(true);
      setTimeout(() => setShowLockedTooltip(false), 3000);
      return;
    }
    setWidgetState("open");
    resetPosition();
  };

  const handleClose = useCallback(() => {
    setWidgetState("closed");
    stopSpeaking();
    if (music.isPlaying) {
      sendPlayerCommand("pauseVideo");
    }
  }, [music.isPlaying, sendPlayerCommand, stopSpeaking]);

  const handleVideoCardClick = useCallback((videoData: ChatMessage["videoData"]) => {
    if (!videoData) return;
    
    if (music.videoId === videoData.videoId) {
      togglePlay();
      return;
    }
    
    playMusic(videoData.videoId, videoData.title);
  }, [music.videoId, togglePlay, playMusic]);

  const hasActiveMusic = music.videoId !== null;

  if (authLoading) return null;

  return (
    <>
      {/* YouTube Player - Hidden */}
      {hasActiveMusic && isUserLoggedIn && (
        <iframe
          ref={playerRef}
          title="praieiro-music-player"
          src={`https://www.youtube.com/embed/${music.videoId}?autoplay=1&enablejsapi=1&playsinline=1&rel=0&modestbranding=1&loop=0&origin=${encodeURIComponent(window.location.origin)}`}
          className="fixed -top-[9999px] -left-[9999px] w-1 h-1 pointer-events-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          onLoad={() => {
            setTimeout(() => {
              if (playerRef.current?.contentWindow) {
                playerRef.current.contentWindow.postMessage(
                  JSON.stringify({ event: "listening" }),
                  "*"
                );
                sendPlayerCommand("setVolume", [music.volume]);
                setPlayerReady(true);
              }
            }, 500);
          }}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CLOSED STATE - Plasma Sphere (Draggable) */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {widgetState === "closed" && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed z-50"
            style={{
              left: closedDrag.position.x,
              top: closedDrag.position.y,
              cursor: closedDrag.isDragging ? 'grabbing' : 'grab',
            }}
            {...closedDrag.dragHandlers}
          >
            <div className="relative">
              <PlasmaSphere
                isLoggedIn={isUserLoggedIn}
                isPlaying={music.isPlaying}
                isSpeaking={isSpeaking}
                isInteractiveMode={isInteractiveMode}
                audioLevel={audioLevel}
                size="medium"
                onClick={handleSphereClick}
                showLabel={true}
              />

              {/* Locked tooltip */}
              <AnimatePresence>
                {showLockedTooltip && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="absolute bottom-full mb-3 right-0 px-4 py-2 bg-black/90 text-white text-sm rounded-lg whitespace-nowrap border border-orange-500/30"
                    style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}
                  >
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-orange-400" />
                      <span>Faça login para acessar o Praieiro Bot</span>
                    </div>
                    <div className="absolute bottom-0 right-6 translate-y-1/2 rotate-45 w-2 h-2 bg-black/90 border-r border-b border-orange-500/30" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MINIMIZED STATE - Mini Player with Controls */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {widgetState === "minimized" && isUserLoggedIn && (
          <MiniPlayer
            isPlaying={music.isPlaying}
            isMuted={music.isMuted}
            volume={music.volume}
            videoTitle={music.videoTitle}
            videoThumbnail={music.videoId ? `https://img.youtube.com/vi/${music.videoId}/default.jpg` : null}
            isInteractiveMode={isInteractiveMode}
            onTogglePlay={togglePlay}
            onVolumeChange={handleVolumeChange}
            onToggleMute={toggleMute}
            onClose={handleClose}
            onExpand={() => setWidgetState("open")}
          />
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* OPEN STATE - Full Chat Window (Draggable, Bottom Right) */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {widgetState === "open" && isUserLoggedIn && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: 'fixed',
              left: position.x,
              top: position.y,
              zIndex: 9999,
              cursor: isDragging ? 'grabbing' : 'default',
            }}
            className="w-[400px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100vh-4rem)] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Glass Container */}
            <div 
              className="flex-1 flex flex-col rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(180deg, rgba(18,14,10,0.99) 0%, rgba(28,18,12,0.99) 100%)",
                border: "1px solid rgba(255, 140, 0, 0.25)",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 165, 0, 0.1) inset, 0 0 50px rgba(255, 100, 0, 0.08)",
              }}
            >
              {/* Header - Draggable */}
              <div 
                {...dragHandlers}
                className="p-4 flex items-center justify-between border-b border-orange-600/20 cursor-grab active:cursor-grabbing select-none"
                style={{
                  background: "linear-gradient(135deg, rgba(255,120,0,0.12) 0%, rgba(255,60,0,0.08) 100%)",
                }}
              >
                <div className="flex items-center gap-3">
                  <GripHorizontal className="h-4 w-4 text-orange-400/40" />
                  
                  {/* Mini Plasma Avatar */}
                  <motion.div
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                    className="relative h-11 w-11 rounded-full flex items-center justify-center"
                    style={{
                      background: "radial-gradient(circle at 35% 35%, #ffcc00 0%, #ff8c00 40%, #d85000 70%, #b33d00 100%)",
                      boxShadow: music.isPlaying 
                        ? "0 0 15px rgba(34, 197, 94, 0.6), 0 0 25px rgba(255, 140, 0, 0.5)"
                        : "0 0 15px rgba(255, 140, 0, 0.6), 0 0 25px rgba(200, 60, 0, 0.3)",
                    }}
                  >
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      style={{
                        background: "conic-gradient(from 0deg, transparent 0%, rgba(255, 180, 50, 0.2) 10%, transparent 20%)",
                      }}
                    />
                  </motion.div>
                  
                  <div>
                    <h3 className="font-semibold text-orange-50 tracking-wide">Praieiro Bot</h3>
                    <p className="text-[11px] text-orange-400/70 font-mono tracking-wider">
                      {isLoading ? "Pensando..." : isSpeaking ? "🔊 Falando" : music.isPlaying ? "♪ Tocando música" : "Assistente Oficial"}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setVoiceEnabled(!voiceEnabled);
                      if (isSpeaking) stopSpeaking();
                    }}
                    className={`text-orange-400/80 hover:bg-orange-500/15 ${voiceEnabled ? 'text-orange-200' : 'opacity-50'}`}
                    title={voiceEnabled ? "Desativar voz" : "Ativar voz"}
                  >
                    {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setWidgetState("minimized")}
                    className="text-orange-400/80 hover:bg-orange-500/15 hover:text-orange-200"
                    title="Minimizar"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      handleClose();
                      resetChatSession();
                    }}
                    className="text-orange-400/80 hover:bg-red-500/15 hover:text-red-300"
                    title="Fechar"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Now Playing Bar */}
              {hasActiveMusic && (
                <div className={`px-3 py-2 flex items-center justify-between gap-2 ${
                  music.hasEnded 
                    ? 'bg-gradient-to-r from-slate-500 to-slate-600' 
                    : 'bg-gradient-to-r from-green-600 to-green-500'
                }`}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {!music.hasEnded && (
                      <Button
                        onClick={togglePlay}
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-white hover:bg-white/20 flex-shrink-0"
                      >
                        {music.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                      </Button>
                    )}
                    <span className="text-xs text-white truncate flex-1">
                      {music.hasEnded ? '✓ Terminou: ' : '🎵 '}{music.videoTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!music.hasEnded && (
                      <>
                        <Button
                          onClick={toggleMute}
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-white/80 hover:text-white hover:bg-white/20"
                        >
                          {music.isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                        </Button>
                        <Slider
                          value={[music.isMuted ? 0 : music.volume]}
                          onValueChange={handleVolumeChange}
                          max={100}
                          step={1}
                          className="w-16"
                        />
                      </>
                    )}
                    <Button
                      onClick={stopMusic}
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-white/80 hover:text-white hover:bg-white/20"
                      title="Parar música"
                    >
                      <Square className="h-3 w-3 fill-current" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Interactive Mode Toggle */}
              <div className="px-3 py-2 border-b border-orange-600/10">
                <InteractiveModeToggle
                  isEnabled={isInteractiveMode}
                  onToggle={setIsInteractiveMode}
                  isListening={isInteractiveMode && !isLoading}
                />
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id}>
                      <div className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[88%] rounded-2xl px-4 py-3 ${
                            msg.type === "user"
                              ? "bg-gradient-to-br from-orange-600 to-orange-700 text-white rounded-br-md"
                              : "bg-white/[0.06] text-orange-50 rounded-bl-md border border-orange-500/15"
                          }`}
                          style={{
                            boxShadow: msg.type === "user" 
                              ? "0 4px 15px rgba(255, 100, 0, 0.3)"
                              : "0 2px 10px rgba(0, 0, 0, 0.2)",
                          }}
                        >
                          {msg.type === "praieiro" && msg.audit?.hash && (
                            <div className="flex items-center justify-between gap-1.5 mb-1.5 pb-1.5 border-b border-orange-500/10">
                              <span className="text-[10px] font-medium text-orange-400/60 uppercase tracking-wide">Praieiro Bot</span>
                              <span 
                                className="text-[8px] font-mono text-amber-500/50 cursor-help" 
                                title={`₿ Satoshi Audit\nHash: ${msg.audit.hash}\nBTC Context: ${msg.audit.btc_context || 'N/A'}`}
                              >
                                ₿ {msg.audit.hash.slice(0, 8)}
                              </span>
                            </div>
                          )}
                          <div className="text-sm whitespace-pre-wrap leading-relaxed break-words">{msg.content}</div>
                          
                          {/* Generated Image */}
                          {msg.imageUrl && (
                            <div className="mt-3 rounded-lg overflow-hidden border border-orange-500/20">
                              <img 
                                src={msg.imageUrl} 
                                alt="Imagem gerada" 
                                className="w-full max-h-64 object-contain bg-black/20"
                                loading="lazy"
                              />
                            </div>
                          )}
                          
                          <p className={`text-[10px] mt-2 ${msg.type === "user" ? "text-orange-200/50" : "text-orange-500/40"}`}>
                            {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                      
                      {/* Video Card */}
                      {msg.videoData && (
                        <div className="mt-3">
                          <VideoCard
                            videoId={msg.videoData.videoId}
                            title={msg.videoData.title}
                            thumbnail={msg.videoData.thumbnail}
                            isCurrentlyPlaying={music.videoId === msg.videoData.videoId && music.isPlaying}
                            onPlay={() => handleVideoCardClick(msg.videoData)}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {(isLoading || isGeneratingImage) && (
                    <div className="flex justify-start">
                      <div className="bg-white/[0.06] rounded-2xl px-4 py-3 rounded-bl-md border border-orange-500/15">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
                          <span className="text-sm text-orange-300/70">
                            {isGeneratingImage ? "🎨 Gerando imagem..." : "Processando..."}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t border-orange-600/20 bg-black/30">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, 500))}
                    onKeyDown={handleKeyPress}
                    placeholder="Pergunte algo ou peça uma música..."
                    disabled={isLoading}
                    className="flex-1 bg-white/5 border-orange-500/20 text-orange-50 placeholder:text-orange-300/40 focus:ring-orange-500 focus:border-orange-500"
                    maxLength={500}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={isLoading || !input.trim()}
                    size="icon"
                    className="bg-orange-600 hover:bg-orange-500"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-orange-400/40 mt-2 text-center">
                  🎨 Gere imagens • 🎵 Peça músicas • 🔊 Voz {voiceEnabled ? "ativada" : "desativada"} • ₿ Auditoria Satoshi
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
