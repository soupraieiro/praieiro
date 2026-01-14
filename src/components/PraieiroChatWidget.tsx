import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { MessageCircle, Send, X, Play, Pause, Volume2, VolumeX, Maximize2, Minus, Square } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMetadata {
  action?: 'open_link' | 'show_vendor' | 'play_music';
  url?: string;
  vendorId?: string;
  videoId?: string;
  videoTitle?: string;
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
}

interface MusicState {
  isPlaying: boolean;
  videoId: string | null;
  videoTitle: string | null;
  volume: number;
  isMuted: boolean;
  hasEnded: boolean;
}

// Generate unique session ID
function generateSessionId(userId?: string) {
  const userPart = userId?.slice(0, 8) || 'anon';
  return `session_${userPart}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function PraieiroChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => generateSessionId());
  const scrollRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLIFrameElement>(null);
  const [playerReady, setPlayerReady] = useState(false);
  
  // Music state - persists across minimize/maximize
  const [music, setMusic] = useState<MusicState>({
    isPlaying: false,
    videoId: null,
    videoTitle: null,
    volume: 80,
    isMuted: false,
    hasEnded: false,
  });

  // Generate Satoshi hash for any action
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

  // Complete cleanup function - stops music, clears state, regenerates session
  const resetChatSession = useCallback(async () => {
    // Generate audit for session close
    if (music.videoId) {
      await generateSatoshiAudit('session_close', {
        videoId: music.videoId,
        videoTitle: music.videoTitle,
        reason: 'user_closed_chat',
      });
    }
    
    // Stop music via iframe command
    if (playerRef.current?.contentWindow) {
      playerRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "stopVideo", args: [] }),
        "*"
      );
    }
    
    // Reset all state
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
    
    console.log('[Praieiro] ₿ Session reset - complete cleanup');
  }, [music.videoId, music.videoTitle, user?.id, generateSatoshiAudit]);

  // Welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: "welcome",
        type: "praieiro",
        content: "Olá! Sou o Praieiro, seu assistente virtual.\n\nPosso ajudar com informações sobre praias, vendedores, produtos, ou tocar músicas para você. Como posso ser útil?",
        timestamp: new Date(),
      }]);
    }
  }, [isOpen, messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle YouTube iframe API messages - track state changes and end of video
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== "https://www.youtube.com") return;
      
      try {
        const data = JSON.parse(event.data);
        
        // Player ready event
        if (data.event === "onReady" || (data.info?.playerState !== undefined && !playerReady)) {
          setPlayerReady(true);
        }
        
        // State changes
        if (data.event === "onStateChange" || data.info?.playerState !== undefined) {
          const state = data.info?.playerState ?? data.info;
          
          if (typeof state === 'number') {
            // YouTube states: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
            
            // Video ended (state 0) - music should stop and require user interaction
            if (state === 0) {
              const audit = await generateSatoshiAudit('music_ended', {
                videoId: music.videoId,
                videoTitle: music.videoTitle,
                playedToCompletion: true,
              });
              
              console.log(`[Praieiro] ₿ Music ENDED | ${music.videoTitle} | Audit: ${audit.hash.slice(0, 12)}...`);
              
              setMusic(prev => ({
                ...prev,
                isPlaying: false,
                hasEnded: true,
              }));
              
              // Add system message about music ending
              setMessages(prev => [...prev, {
                id: `music_ended_${Date.now()}`,
                type: "praieiro",
                content: `🎵 A música "${music.videoTitle}" terminou.\n\nSe quiser ouvir outra, é só me pedir!`,
                timestamp: new Date(),
                audit: {
                  hash: audit.hash,
                  satoshi_timestamp: audit.timestamp,
                  btc_context: audit.context,
                },
              }]);
            }
            
            // Sync playing state
            const isActuallyPlaying = state === 1;
            setMusic(prev => {
              if (prev.isPlaying !== isActuallyPlaying && state !== 0) {
                return { ...prev, isPlaying: isActuallyPlaying };
              }
              return prev;
            });
          }
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [playerReady, music.videoId, music.videoTitle, generateSatoshiAudit]);

  // Send command to YouTube player
  const sendPlayerCommand = useCallback((command: string, args?: unknown[]) => {
    if (playerRef.current?.contentWindow) {
      playerRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: command, args: args || [] }),
        "*"
      );
    }
  }, []);

  // Toggle play/pause with Satoshi audit
  const togglePlay = useCallback(async () => {
    if (music.hasEnded) {
      // If music ended, user needs to request new music
      toast.info("A música terminou. Peça outra música no chat!");
      return;
    }
    
    const newPlayingState = !music.isPlaying;
    const action = newPlayingState ? 'play' : 'pause';
    
    await generateSatoshiAudit(`player_${action}`, {
      videoId: music.videoId,
      videoTitle: music.videoTitle,
      previousState: music.isPlaying ? 'playing' : 'paused',
    });
    
    if (newPlayingState) {
      sendPlayerCommand("playVideo");
    } else {
      sendPlayerCommand("pauseVideo");
    }
    
    setMusic(prev => ({ ...prev, isPlaying: newPlayingState }));
    console.log(`[Praieiro] ₿ Player ${action.toUpperCase()} | ${music.videoTitle}`);
  }, [music.isPlaying, music.videoId, music.videoTitle, music.hasEnded, sendPlayerCommand, generateSatoshiAudit]);

  // Volume change with Satoshi audit for significant changes
  const handleVolumeChange = useCallback(async (value: number[]) => {
    const vol = value[0];
    
    if (Math.abs(vol - music.volume) > 20) {
      await generateSatoshiAudit('volume_change', {
        videoId: music.videoId,
        fromVolume: music.volume,
        toVolume: vol,
      });
    }
    
    setMusic(prev => ({ ...prev, volume: vol, isMuted: vol === 0 }));
    sendPlayerCommand("setVolume", [vol]);
  }, [music.volume, music.videoId, sendPlayerCommand, generateSatoshiAudit]);

  // Toggle mute with Satoshi audit
  const toggleMute = useCallback(async () => {
    const newMutedState = !music.isMuted;
    
    await generateSatoshiAudit(newMutedState ? 'mute' : 'unmute', {
      videoId: music.videoId,
      videoTitle: music.videoTitle,
    });
    
    if (newMutedState) {
      sendPlayerCommand("mute");
    } else {
      sendPlayerCommand("unMute");
      sendPlayerCommand("setVolume", [music.volume]);
    }
    
    setMusic(prev => ({ ...prev, isMuted: newMutedState }));
  }, [music.isMuted, music.volume, music.videoId, music.videoTitle, sendPlayerCommand, generateSatoshiAudit]);

  // Stop music completely with Satoshi audit
  const stopMusic = useCallback(async () => {
    await generateSatoshiAudit('stop_music', {
      videoId: music.videoId,
      videoTitle: music.videoTitle,
      stoppedBy: 'user_action',
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
    
    console.log(`[Praieiro] ₿ Music STOPPED by user`);
  }, [music.videoId, music.videoTitle, sendPlayerCommand, generateSatoshiAudit]);

  // Play music from chat - with Satoshi audit (plays once, no loop)
  const playMusic = useCallback(async (videoId: string, title: string) => {
    const audit = await generateSatoshiAudit('play_music_request', {
      videoId,
      videoTitle: title,
      source: 'chat_ai_response',
      playMode: 'single_play',
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

  // Send message to chat
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

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

      if (audit?.hash) {
        console.log(`[Praieiro] ₿ Satoshi Audit: ${audit.hash.slice(0, 16)}... | BTC: ${audit.btc_context || 'N/A'}`);
      }

      // Handle music action from AI
      if (metadata?.action === 'play_music' && metadata.videoId) {
        playMusic(metadata.videoId, metadata.videoTitle || 'Música');
      }

    } catch (err) {
      console.error("Chat error:", err);
      toast.error("Erro ao enviar mensagem");
      
      setMessages(prev => [...prev, {
        id: `error_${Date.now()}`,
        type: "praieiro",
        content: "Ocorreu um erro no processamento. Por favor, tente novamente.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, sessionId, user?.id, playMusic]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const hasActiveMusic = music.videoId !== null;

  return (
    <>
      {/* 
        CRITICAL: YouTube Player is ALWAYS mounted when there's active music
        This ensures music continues playing when minimizing/maximizing chat
        Player is positioned off-screen but remains active
      */}
      {hasActiveMusic && (
        <iframe
          ref={playerRef}
          title="praieiro-music-player"
          src={`https://www.youtube.com/embed/${music.videoId}?autoplay=1&enablejsapi=1&playsinline=1&rel=0&modestbranding=1&loop=0&origin=${encodeURIComponent(window.location.origin)}`}
          className="fixed -top-[9999px] -left-[9999px] w-1 h-1 pointer-events-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          onLoad={() => {
            // Initialize YouTube API listening
            setTimeout(() => {
              if (playerRef.current?.contentWindow) {
                playerRef.current.contentWindow.postMessage(
                  JSON.stringify({ event: "listening" }),
                  "*"
                );
                // Set initial volume
                sendPlayerCommand("setVolume", [music.volume]);
                setPlayerReady(true);
              }
            }, 500);
          }}
        />
      )}

      {/* Minimized State: Floating controls */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2"
          >
            {/* Music Control Bar (only when music is active) */}
            {hasActiveMusic && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-slate-800/95 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border border-slate-700 flex items-center gap-2"
              >
                <Button
                  onClick={() => setIsOpen(true)}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10"
                  title="Abrir chat"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>

                <Button
                  onClick={toggleMute}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10"
                >
                  {music.isMuted || music.volume === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                <Slider
                  value={[music.isMuted ? 0 : music.volume]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="w-20"
                />
                
                {/* Stop button */}
                <Button
                  onClick={stopMusic}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-white/10"
                  title="Parar música"
                >
                  <Square className="h-3 w-3 fill-current" />
                </Button>
              </motion.div>
            )}

            {/* Main Chat Bubble with Play/Pause overlay */}
            <div className="relative">
              <Button
                onClick={() => setIsOpen(true)}
                className="h-14 w-14 rounded-full shadow-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-600"
                size="icon"
                title="Assistente Praieiro"
              >
                <MessageCircle className="h-6 w-6" />
              </Button>
              
              {/* Play/Pause overlay on the bubble */}
              {hasActiveMusic && !music.hasEnded && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  className={`absolute -top-1 -right-1 h-7 w-7 rounded-full shadow-md p-0 ${
                    music.isPlaying 
                      ? 'bg-green-500 hover:bg-green-600' 
                      : 'bg-amber-500 hover:bg-amber-600'
                  } text-white`}
                  size="icon"
                  title={music.isPlaying ? "Pausar" : "Reproduzir"}
                >
                  {music.isPlaying ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5 ml-0.5" />
                  )}
                </Button>
              )}
              
              {/* Music ended indicator */}
              {hasActiveMusic && music.hasEnded && (
                <div 
                  className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-slate-500 flex items-center justify-center"
                  title="Música terminou"
                >
                  <span className="text-xs">✓</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window (Open State) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-4 right-4 z-50 w-[320px] max-w-[calc(100vw-2rem)] h-[450px] max-h-[calc(100vh-6rem)] flex flex-col bg-white rounded-2xl shadow-2xl border overflow-hidden"
          >
            {/* Header with Minimize and Close */}
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base tracking-tight">Praieiro</h3>
                  <p className="text-[11px] text-white/60 font-mono">Assistente Virtual</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Minimize Button - just hides chat, music continues */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:bg-white/10 hover:text-white"
                  title="Minimizar (música continua)"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                {/* Close Button - stops everything, resets session */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsOpen(false);
                    resetChatSession();
                  }}
                  className="text-white/80 hover:bg-white/10 hover:text-white"
                  title="Fechar e limpar conversa"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Now Playing Bar (inside chat when open) */}
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
                      {music.isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4 ml-0.5" />
                      )}
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
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-slate-50" ref={scrollRef}>
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-xl px-4 py-2.5 ${
                        msg.type === "user"
                          ? "bg-slate-700 text-white rounded-br-sm"
                          : "bg-white text-slate-800 rounded-bl-sm border border-slate-200 shadow-sm"
                      }`}
                    >
                      {msg.type === "praieiro" && (
                        <div className="flex items-center justify-between gap-1.5 mb-1.5 pb-1.5 border-b border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <div className="h-4 w-4 rounded-full bg-slate-100 flex items-center justify-center">
                              <MessageCircle className="h-2.5 w-2.5 text-slate-500" />
                            </div>
                            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Praieiro</span>
                          </div>
                          {msg.audit?.hash && (
                            <span 
                              className="text-[8px] font-mono text-amber-600/70 cursor-help" 
                              title={`₿ Satoshi Audit\nHash: ${msg.audit.hash}\nBTC Context: ${msg.audit.btc_context || 'N/A'}\nTimestamp: ${msg.audit.satoshi_timestamp}`}
                            >
                              ₿ {msg.audit.hash.slice(0, 8)}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                      <p className={`text-[10px] mt-2 flex items-center justify-between ${msg.type === "user" ? "text-white/50" : "text-slate-400"}`}>
                        <span>{msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                        {msg.audit?.btc_context && msg.type === "praieiro" && (
                          <span className="text-[8px] text-amber-600/50">{msg.audit.btc_context}</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-xl px-4 py-2.5 rounded-bl-sm border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        <span className="text-[10px] text-slate-400">processando</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t border-slate-200 bg-white">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, 500))}
                  onKeyDown={handleKeyPress}
                  placeholder="Escreva sua pergunta..."
                  disabled={isLoading}
                  className="flex-1 bg-slate-50 border-slate-200 text-sm focus:ring-slate-400"
                  maxLength={500}
                />
                <Button
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                  size="icon"
                  className="bg-slate-700 hover:bg-slate-600"
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
