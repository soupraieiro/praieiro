import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Send, X, Minus, Maximize2, Play, Pause, Volume2, Music, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import logoPraieiro from "@/assets/logo-praieiro-circle.png";

// LocalStorage key for persistence
const STORAGE_KEY = "PR_SOLAR_PLAYER_STATE";

interface PlayerState {
  videoId: string | null;
  videoTitle: string | null;
  videoArtist: string | null;
  volume: number;
  isPlaying: boolean;
  timestamp: number;
  currentTime: number;
}

interface ChatMetadata {
  action?: "play_video" | "open_link" | "show_vendor";
  query?: string;
  url?: string;
  vendorId?: string;
}

interface ChatMessage {
  id: string;
  type: "user" | "praieiro";
  content: string;
  timestamp: Date;
  metadata?: ChatMetadata;
  videoData?: {
    videoId: string;
    title: string;
    artist?: string;
    thumbnail?: string;
  };
}

type WidgetState = "closed" | "open" | "minimized";

// Create initial player state outside component to avoid initialization issues
const createInitialPlayerState = (): PlayerState => ({
  videoId: null,
  videoTitle: null,
  videoArtist: null,
  volume: 80,
  isPlaying: false,
  timestamp: Date.now(),
  currentTime: 0,
});

const createSessionId = (): string => `solar_${Date.now()}_${Math.random().toString(36).slice(2)}`;

export function SolarChatWidget() {
  const { user, loading: authLoading } = useAuth();
  const [widgetState, setWidgetState] = useState<WidgetState>("closed");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(createSessionId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Player state
  const [playerState, setPlayerState] = useState<PlayerState>(createInitialPlayerState);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isSearchingVideo, setIsSearchingVideo] = useState(false);
  const [showLockedTooltip, setShowLockedTooltip] = useState(false);

  // Only show widget when user is logged in
  const isUserLoggedIn = !!user && !authLoading;

  // Load persisted state on mount (only if logged in)
  useEffect(() => {
    if (!isUserLoggedIn) return;
    
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: PlayerState = JSON.parse(saved);
        // Valid for 24 hours
        if (parsed.videoId && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          setPlayerState(parsed);
          // If there was an active video, start minimized with music playing
          if (parsed.isPlaying) {
            setWidgetState("minimized");
          }
        }
      } catch (e) {
        console.error("Failed to parse saved state:", e);
      }
    }
  }, [isUserLoggedIn]);

  // Persist state changes
  useEffect(() => {
    if (playerState.videoId && isUserLoggedIn) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...playerState,
        timestamp: Date.now(),
      }));
    }
  }, [playerState, isUserLoggedIn]);

  // Welcome message on first open
  useEffect(() => {
    if (widgetState === "open" && messages.length === 0 && isUserLoggedIn) {
      setMessages([{
        id: "welcome",
        type: "praieiro",
        content: "Olá! Sou o **Praieiro Bot**, seu assistente oficial.\n\n☀️ Posso tocar músicas, responder perguntas e muito mais.\n\nDiga algo como: *\"toca um Gilberto Gil\"* ou pergunte o que quiser!",
        timestamp: new Date(),
      }]);
    }
  }, [widgetState, messages.length, isUserLoggedIn]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // YouTube IFrame API message handler
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.youtube.com") return;
      
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data.event === "onReady") {
          setIsPlayerReady(true);
          postPlayerMessage("setVolume", [playerState.volume]);
          if (playerState.isPlaying) {
            postPlayerMessage("playVideo");
          }
        }
        if (data.event === "onStateChange") {
          // 1 = playing, 2 = paused, 0 = ended
          const isNowPlaying = data.info === 1;
          setPlayerState(prev => ({ ...prev, isPlaying: isNowPlaying }));
        }
        if (data.info?.currentTime) {
          setPlayerState(prev => ({ ...prev, currentTime: data.info.currentTime }));
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [playerState.volume, playerState.isPlaying]);

  const postPlayerMessage = useCallback((func: string, args: unknown[] = []) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func, args }),
        "https://www.youtube.com"
      );
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (playerState.isPlaying) {
      postPlayerMessage("pauseVideo");
    } else {
      postPlayerMessage("playVideo");
    }
  }, [playerState.isPlaying, postPlayerMessage]);

  const handleVolumeChange = useCallback((value: number[]) => {
    const vol = value[0];
    setPlayerState(prev => ({ ...prev, volume: vol }));
    postPlayerMessage("setVolume", [vol]);
  }, [postPlayerMessage]);

  // Search YouTube and play video
  const searchAndPlayVideo = useCallback(async (query: string) => {
    if (!isUserLoggedIn) return;
    
    setIsSearchingVideo(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("search-youtube", {
        body: { query, userId: user?.id },
      });

      if (error) throw error;

      if (data?.videoId) {
        const videoData = {
          videoId: data.videoId,
          title: data.title || query,
          artist: data.artist || "",
          thumbnail: `https://img.youtube.com/vi/${data.videoId}/mqdefault.jpg`,
        };

        setPlayerState(prev => ({
          ...prev,
          videoId: data.videoId,
          videoTitle: videoData.title,
          videoArtist: videoData.artist,
          isPlaying: true,
          currentTime: 0,
        }));
        setIsPlayerReady(false);

        // Add video card message (WhatsApp style)
        setMessages(prev => [...prev, {
          id: `video_${Date.now()}`,
          type: "praieiro",
          content: `🎵 Encontrei sua música! Aproveite.`,
          timestamp: new Date(),
          videoData,
        }]);
      }
    } catch (err) {
      console.error("Video search error:", err);
      toast.error("Não foi possível encontrar a música");
    } finally {
      setIsSearchingVideo(false);
    }
  }, [user?.id, isUserLoggedIn]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading || !isUserLoggedIn) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("praieiro-chat", {
        body: {
          message: userMessage.content,
          sessionId,
          userId: user?.id,
          includeContext: true,
        },
      });

      if (error) throw error;

      const metadata = data.metadata as ChatMetadata | undefined;

      const aiMessage: ChatMessage = {
        id: `praieiro_${Date.now()}`,
        type: "praieiro",
        content: data.response || "Ocorreu um erro.",
        timestamp: new Date(),
        metadata,
      };

      setMessages(prev => [...prev, aiMessage]);

      // Handle music action from AI
      if (metadata?.action === "play_video" && metadata.query) {
        await searchAndPlayVideo(metadata.query);
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
  }, [input, isLoading, sessionId, user?.id, searchAndPlayVideo, isUserLoggedIn]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClose = useCallback(() => {
    setWidgetState("closed");
    if (playerState.isPlaying) {
      postPlayerMessage("pauseVideo");
    }
  }, [playerState.isPlaying, postPlayerMessage]);

  const handleSphereClick = () => {
    if (!isUserLoggedIn) {
      setShowLockedTooltip(true);
      setTimeout(() => setShowLockedTooltip(false), 3000);
      return;
    }
    setWidgetState("open");
  };

  // Play video from card click - toggle if same video
  const handleVideoCardClick = useCallback((videoData: ChatMessage["videoData"]) => {
    if (!videoData) return;
    
    // If clicking on the currently playing video, toggle play/pause
    if (playerState.videoId === videoData.videoId) {
      togglePlayPause();
      return;
    }
    
    // Otherwise, switch to this video
    setPlayerState(prev => ({
      ...prev,
      videoId: videoData.videoId,
      videoTitle: videoData.title,
      videoArtist: videoData.artist || null,
      isPlaying: true,
      currentTime: 0,
    }));
    setIsPlayerReady(false);
  }, [playerState.videoId, togglePlayPause]);

  // Plasma intensity based on playing state
  const plasmaIntensity = playerState.isPlaying ? 1.4 : 1;

  // Don't render if auth is loading
  if (authLoading) return null;

  // Keep track of iframe key to prevent recreation
  const iframeKey = playerState.videoId || 'no-video';

  return (
    <>
      {/* Persistent Audio Player - Always mounted when video exists (never recreated on state change) */}
      {playerState.videoId && isUserLoggedIn && (
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${playerState.videoId}?enablejsapi=1&autoplay=1&origin=${window.location.origin}&playsinline=1&rel=0&modestbranding=1`}
          className="sr-only"
          style={{ position: "fixed", bottom: -9999, left: -9999, width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
          allow="autoplay; encrypted-media"
          title="Praieiro Audio Player"
        />
      )}

      {/* Solar Sphere - Closed State */}
      <AnimatePresence>
        {widgetState === "closed" && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-20 md:bottom-6 right-6 z-50"
          >
            <div className="relative">
              <button
                onClick={handleSphereClick}
                className="relative group flex flex-col items-center"
                title={isUserLoggedIn ? "Praieiro Bot" : "Faça login para usar"}
              >
                {/* "Praieiro Bot" Label on top */}
                <motion.span
                  className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-wider whitespace-nowrap"
                  animate={{
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{
                    color: isUserLoggedIn ? "#ff8c00" : "#888",
                    textShadow: isUserLoggedIn 
                      ? "0 0 8px rgba(255, 140, 0, 0.8), 0 0 16px rgba(255, 100, 0, 0.5)"
                      : "none",
                  }}
                >
                  Praieiro Bot
                </motion.span>

                {/* Outer Plasma Aura - Darker Orange */}
                <motion.div
                  className="absolute inset-[-16px] rounded-full"
                  animate={{
                    scale: [1, 1.2 * plasmaIntensity, 1.1 * plasmaIntensity, 1],
                    rotate: [0, 180, 360],
                    opacity: [0.4, 0.2, 0.35, 0.4],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{
                    background: isUserLoggedIn 
                      ? "conic-gradient(from 0deg, rgba(255,100,0,0.5), rgba(200,60,0,0.3), rgba(255,140,0,0.5), rgba(180,50,0,0.3), rgba(255,100,0,0.5))"
                      : "radial-gradient(circle, rgba(150,150,150,0.3) 0%, rgba(100,100,100,0.1) 50%, transparent 70%)",
                    filter: "blur(12px)",
                  }}
                />
                
                {/* Middle Plasma Ring - Rotating */}
                <motion.div
                  className="absolute inset-[-10px] rounded-full"
                  animate={{
                    scale: [1.05, 1.3 * plasmaIntensity, 1.15 * plasmaIntensity, 1.05],
                    rotate: [360, 180, 0],
                    opacity: [0.5, 0.25, 0.4, 0.5],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{
                    background: isUserLoggedIn 
                      ? "conic-gradient(from 90deg, rgba(255,80,0,0.6), transparent, rgba(255,120,0,0.6), transparent, rgba(255,80,0,0.6))"
                      : "radial-gradient(circle, rgba(180,180,180,0.4) 0%, rgba(120,120,120,0.2) 60%, transparent 80%)",
                    filter: "blur(8px)",
                  }}
                />
                
                {/* Inner Plasma Ring - Pulsing */}
                <motion.div
                  className="absolute inset-[-4px] rounded-full"
                  animate={{
                    scale: [1, 1.15 * plasmaIntensity, 1.08 * plasmaIntensity, 1],
                    opacity: [0.7, 0.4, 0.55, 0.7],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.1,
                  }}
                  style={{
                    background: isUserLoggedIn
                      ? "radial-gradient(circle, rgba(255,140,0,0.7) 0%, rgba(220,80,0,0.4) 60%, transparent 80%)"
                      : "radial-gradient(circle, rgba(180,180,180,0.4) 0%, rgba(120,120,120,0.2) 60%, transparent 80%)",
                    filter: "blur(4px)",
                  }}
                />
                
                {/* Solar Core - Pure Sun Ball */}
                <motion.div
                  className="relative h-16 w-16 rounded-full flex items-center justify-center"
                  animate={{
                    scale: [1, 1.08, 1.04, 1],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{
                    background: isUserLoggedIn
                      ? "radial-gradient(circle at 35% 35%, #ffcc00 0%, #ff8c00 40%, #d85000 70%, #b33d00 100%)"
                      : "radial-gradient(circle at 35% 35%, #aaa 0%, #888 40%, #666 70%, #444 100%)",
                    boxShadow: isUserLoggedIn
                      ? `
                        0 0 25px rgba(255, 140, 0, 0.95),
                        0 0 50px rgba(255, 100, 0, 0.7),
                        0 0 80px rgba(200, 60, 0, 0.5),
                        inset 0 0 20px rgba(255, 200, 0, 0.4)
                      `
                      : `
                        0 0 15px rgba(150, 150, 150, 0.5)
                      `,
                  }}
                >
                  {/* Solar Flare Effect */}
                  {isUserLoggedIn && (
                    <>
                      <motion.div
                        className="absolute inset-2 rounded-full"
                        animate={{
                          opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        style={{
                          background: "radial-gradient(circle at 30% 30%, rgba(255, 220, 100, 0.5) 0%, transparent 60%)",
                        }}
                      />
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        animate={{
                          rotate: [0, 360],
                        }}
                        transition={{
                          duration: 20,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        style={{
                          background: "conic-gradient(from 0deg, transparent 0%, rgba(255, 180, 50, 0.15) 10%, transparent 20%, rgba(255, 140, 0, 0.1) 30%, transparent 40%)",
                        }}
                      />
                    </>
                  )}
                  
                  {/* Lock overlay for non-logged users */}
                  {!isUserLoggedIn && (
                    <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
                      <Lock className="h-6 w-6 text-white/80" />
                    </div>
                  )}
                </motion.div>

                {/* Playing indicator */}
                {playerState.isPlaying && isUserLoggedIn && (
                  <motion.div
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-green-500 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{
                      boxShadow: "0 0 10px rgba(34, 197, 94, 0.6)",
                    }}
                  >
                    <Music className="h-3 w-3 text-white" />
                  </motion.div>
                )}
              </button>

              {/* Locked tooltip */}
              <AnimatePresence>
                {showLockedTooltip && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="absolute bottom-full mb-3 right-0 px-4 py-2 bg-black/90 text-white text-sm rounded-lg whitespace-nowrap border border-orange-500/30"
                    style={{
                      boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-orange-400" />
                      <span>Faça login para acessar o Praieiro Bot</span>
                    </div>
                    <div 
                      className="absolute bottom-0 right-6 translate-y-1/2 rotate-45 w-2 h-2 bg-black/90 border-r border-b border-orange-500/30"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimized Control Bar - Only playback bar, no video/thumbnail */}
      <AnimatePresence>
        {widgetState === "minimized" && isUserLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-20 md:bottom-4 right-4 z-50 w-[300px]"
          >
            <div 
              className="flex items-center gap-3 px-4 py-3 rounded-full shadow-2xl border border-orange-500/40"
              style={{
                background: "linear-gradient(135deg, rgba(15,12,10,0.98) 0%, rgba(35,20,12,0.98) 100%)",
                backdropFilter: "blur(16px)",
              }}
            >
              {/* Mini Solar Core - Opens chat */}
              <motion.div 
                className="relative h-10 w-10 rounded-full flex-shrink-0 cursor-pointer flex items-center justify-center"
                animate={{
                  scale: playerState.isPlaying ? [1, 1.1, 1] : 1,
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                onClick={() => setWidgetState("open")}
                style={{
                  background: "radial-gradient(circle at 35% 35%, #ffcc00 0%, #ff8c00 40%, #d85000 70%, #b33d00 100%)",
                  boxShadow: playerState.isPlaying 
                    ? "0 0 15px rgba(34, 197, 94, 0.7), 0 0 25px rgba(255, 140, 0, 0.6)"
                    : "0 0 15px rgba(255, 140, 0, 0.7), 0 0 30px rgba(200, 60, 0, 0.4)",
                }}
              >
                {/* Mini plasma effect */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{
                    background: "conic-gradient(from 0deg, transparent 0%, rgba(255, 180, 50, 0.2) 15%, transparent 30%)",
                  }}
                />
              </motion.div>

              {/* Play/Pause Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlayPause}
                className="text-orange-300 hover:text-orange-100 hover:bg-orange-500/20 h-8 w-8 flex-shrink-0"
                title={playerState.isPlaying ? "Pausar" : "Reproduzir"}
              >
                {playerState.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>

              {/* Song Title */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-orange-100 truncate font-medium">
                  {playerState.videoTitle || "Praieiro Bot"}
                </p>
                {playerState.videoArtist && (
                  <p className="text-[10px] text-orange-400/60 truncate">
                    {playerState.videoArtist}
                  </p>
                )}
              </div>

              {/* Volume */}
              <div className="flex items-center gap-1.5 w-16">
                <Volume2 className="h-3.5 w-3.5 text-orange-400/60 flex-shrink-0" />
                <Slider
                  value={[playerState.volume]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="flex-1 [&_[role=slider]]:bg-orange-500 [&_[role=slider]]:border-orange-400 [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5 [&_[data-orientation=horizontal]]:h-1"
                />
              </div>

              {/* Close */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="text-orange-400/60 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0 h-7 w-7"
                title="Fechar"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Chat Window - Solar Desktop */}
      <AnimatePresence>
        {widgetState === "open" && isUserLoggedIn && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-20 md:bottom-4 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-5rem)] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
            style={{
              background: "linear-gradient(180deg, rgba(18,14,10,0.99) 0%, rgba(28,18,12,0.99) 100%)",
              border: "1px solid rgba(255, 140, 0, 0.25)",
              boxShadow: `
                0 20px 60px rgba(0, 0, 0, 0.6),
                0 0 0 1px rgba(255, 165, 0, 0.1) inset,
                0 0 50px rgba(255, 100, 0, 0.08)
              `,
            }}
          >
            {/* Header with Solar Gradient */}
            <div 
              className="p-4 flex items-center justify-between border-b border-orange-600/20"
              style={{
                background: "linear-gradient(135deg, rgba(255,120,0,0.12) 0%, rgba(255,60,0,0.08) 100%)",
              }}
            >
              <div className="flex items-center gap-3">
                {/* Solar Core Avatar */}
                <motion.div
                  animate={{
                    scale: [1, 1.06, 1],
                  }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="relative h-11 w-11 rounded-full flex items-center justify-center"
                  style={{
                    background: "radial-gradient(circle at 35% 35%, #ffcc00 0%, #ff8c00 40%, #d85000 70%, #b33d00 100%)",
                    boxShadow: playerState.isPlaying 
                      ? "0 0 15px rgba(34, 197, 94, 0.6), 0 0 25px rgba(255, 140, 0, 0.5)"
                      : "0 0 15px rgba(255, 140, 0, 0.6), 0 0 25px rgba(200, 60, 0, 0.3)",
                  }}
                >
                  {/* Plasma rotation effect */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    animate={{
                      rotate: [0, 360],
                    }}
                    transition={{
                      duration: 10,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    style={{
                      background: "conic-gradient(from 0deg, transparent 0%, rgba(255, 180, 50, 0.2) 10%, transparent 20%)",
                    }}
                  />
                  {/* Inner glow */}
                  <motion.div
                    className="absolute inset-1 rounded-full"
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    style={{
                      background: "radial-gradient(circle at 30% 30%, rgba(255, 220, 100, 0.5) 0%, transparent 60%)",
                    }}
                  />
                </motion.div>
                <div>
                  <h3 className="font-semibold text-orange-50 tracking-wide">Praieiro Bot</h3>
                  <p className="text-[11px] text-orange-400/70 font-mono tracking-wider">
                    {playerState.isPlaying ? "♪ Tocando música" : "Assistente Oficial"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
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
                  onClick={handleClose}
                  className="text-orange-400/80 hover:bg-red-500/15 hover:text-red-300"
                  title="Fechar"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages with Video Cards */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id}>
                    <div
                      className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                    >
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
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                        <p className={`text-[10px] mt-2 ${msg.type === "user" ? "text-orange-200/50" : "text-orange-500/40"}`}>
                          {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    
            {/* Embedded Video Player inside Chat (WhatsApp style) */}
                    {msg.videoData && (
                      <motion.div 
                        className="mt-3 ml-0"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div 
                          className="rounded-xl overflow-hidden border border-orange-500/25 bg-black/60"
                          style={{
                            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
                          }}
                        >
                          {/* Thumbnail with Play/Playing indicator - No embedded iframe here */}
                          <div className="relative aspect-video">
                            <div 
                              className="w-full h-full cursor-pointer group"
                              onClick={() => handleVideoCardClick(msg.videoData)}
                            >
                              <img 
                                src={msg.videoData.thumbnail}
                                alt={msg.videoData.title}
                                className="w-full h-full object-cover"
                              />
                              {playerState.videoId === msg.videoData.videoId ? (
                                /* Currently playing this video - show "playing" overlay */
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                  {playerState.isPlaying ? (
                                    <motion.div
                                      className="flex flex-col items-center gap-2"
                                      animate={{ scale: [1, 1.05, 1] }}
                                      transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                      <div className="h-14 w-14 rounded-full bg-green-500/90 flex items-center justify-center">
                                        <Pause className="h-7 w-7 text-white" />
                                      </div>
                                      <span className="text-xs text-white font-medium bg-black/50 px-2 py-1 rounded-full flex items-center gap-1.5">
                                        <span className="relative flex h-2 w-2">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                                        </span>
                                        Tocando agora
                                      </span>
                                    </motion.div>
                                  ) : (
                                    <motion.div
                                      className="h-14 w-14 rounded-full bg-orange-600/90 flex items-center justify-center"
                                      whileHover={{ scale: 1.1 }}
                                      style={{
                                        boxShadow: "0 4px 20px rgba(255, 100, 0, 0.5)",
                                      }}
                                    >
                                      <Play className="h-7 w-7 text-white ml-1" />
                                    </motion.div>
                                  )}
                                </div>
                              ) : (
                                /* Not playing - show play button */
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                                  <motion.div
                                    className="h-14 w-14 rounded-full bg-orange-600/90 flex items-center justify-center"
                                    whileHover={{ scale: 1.1 }}
                                    style={{
                                      boxShadow: "0 4px 20px rgba(255, 100, 0, 0.5)",
                                    }}
                                  >
                                    <Play className="h-7 w-7 text-white ml-1" />
                                  </motion.div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Track Info & Controls */}
                          <div className="p-3 flex items-center gap-3">
                            {/* Play/Pause button for active video */}
                            {playerState.videoId === msg.videoData.videoId && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={togglePlayPause}
                                className="text-orange-300 hover:text-orange-100 hover:bg-orange-500/15 flex-shrink-0 h-8 w-8"
                              >
                                {playerState.isPlaying ? (
                                  <Pause className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4 ml-0.5" />
                                )}
                              </Button>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-orange-100 truncate">
                                {msg.videoData.title}
                              </p>
                              {msg.videoData.artist && (
                                <p className="text-xs text-orange-400/60 truncate mt-0.5">
                                  {msg.videoData.artist}
                                </p>
                              )}
                            </div>

                            {/* Volume slider for active video */}
                            {playerState.videoId === msg.videoData.videoId && (
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <Volume2 className="h-3.5 w-3.5 text-orange-400/60" />
                                <Slider
                                  value={[playerState.volume]}
                                  onValueChange={handleVolumeChange}
                                  max={100}
                                  step={1}
                                  className="w-16 [&_[role=slider]]:bg-orange-500 [&_[role=slider]]:border-orange-400 [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5 [&_[data-orientation=horizontal]]:h-1"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                ))}

                {/* Loading States */}
                {(isLoading || isSearchingVideo) && (
                  <div className="flex justify-start">
                    <div className="bg-white/[0.06] rounded-2xl px-4 py-3 rounded-bl-md border border-orange-500/15">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <motion.span 
                            className="h-2 w-2 bg-orange-400 rounded-full"
                            animate={{ y: [0, -6, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                          />
                          <motion.span 
                            className="h-2 w-2 bg-orange-400 rounded-full"
                            animate={{ y: [0, -6, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                          />
                          <motion.span 
                            className="h-2 w-2 bg-orange-400 rounded-full"
                            animate={{ y: [0, -6, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                          />
                        </div>
                        <span className="text-xs text-orange-400/70">
                          {isSearchingVideo ? "Buscando sua música..." : "Pensando..."}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Premium Input Area */}
            <div 
              className="p-4 border-t border-orange-600/20"
              style={{
                background: "linear-gradient(180deg, transparent 0%, rgba(255, 100, 0, 0.03) 100%)",
              }}
            >
              <div className="flex gap-3">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, 500))}
                  onKeyDown={handleKeyPress}
                  placeholder="Peça uma música ou pergunte algo..."
                  disabled={isLoading}
                  className="flex-1 bg-white/[0.05] border-orange-500/25 text-orange-50 placeholder:text-orange-400/35 focus:ring-orange-500/40 focus:border-orange-500/40 rounded-xl h-11"
                  maxLength={500}
                />
                <Button
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                  size="icon"
                  className="bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 h-11 w-11 rounded-xl"
                  style={{
                    boxShadow: "0 4px 15px rgba(255, 100, 0, 0.3)",
                  }}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
