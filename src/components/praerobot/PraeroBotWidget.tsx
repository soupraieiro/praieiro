import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageCircle, Send, X, Minus, GripHorizontal,
  Image, Volume2, VolumeX, Loader2, Bot, Sparkles
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { useDraggable } from "./useDraggable";
import { usePraeroBot } from "./PraeroBotCore";
import logoPraieiro from "@/assets/logo-praieiro-circle.png";

type WidgetState = "closed" | "open" | "minimized";

export function PraeroBotWidget() {
  const { user, loading: authLoading } = useAuth();
  const [widgetState, setWidgetState] = useState<WidgetState>("closed");
  const [input, setInput] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    isLoading,
    isGeneratingImage,
    isSpeaking,
    sendMessage,
    speakText,
    stopSpeaking,
    clearMessages,
  } = usePraeroBot();

  // Draggable functionality - starts from bottom right
  const { position, isDragging, dragHandlers } = useDraggable({
    initialPosition: { 
      x: typeof window !== 'undefined' ? window.innerWidth - 420 : 0, 
      y: typeof window !== 'undefined' ? window.innerHeight - 600 : 0 
    },
    bounds: 'window',
    snapToEdges: true,
  });

  const isUserLoggedIn = !!user && !authLoading;

  // Welcome message
  useEffect(() => {
    if (widgetState === "open" && messages.length === 0 && isUserLoggedIn) {
      sendMessage("Olá");
    }
  }, [widgetState, messages.length, isUserLoggedIn]);

  // Auto-speak assistant responses when voice is enabled
  useEffect(() => {
    if (!voiceEnabled || messages.length === 0) return;
    
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === "assistant" && !isLoading) {
      // Only speak if this is a new message (within last 2 seconds)
      const messageAge = Date.now() - lastMessage.timestamp.getTime();
      if (messageAge < 2000) {
        speakText(lastMessage.content);
      }
    }
  }, [messages, voiceEnabled, isLoading, speakText]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const userInput = input;
    setInput("");
    await sendMessage(userInput);
  }, [input, isLoading, sendMessage]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSpeak = useCallback((text: string) => {
    if (voiceEnabled) {
      speakText(text);
    }
  }, [voiceEnabled, speakText]);

  const handleClose = useCallback(() => {
    setWidgetState("closed");
    stopSpeaking();
  }, [stopSpeaking]);

  if (authLoading) return null;

  return (
    <>
      {/* Closed State - Floating Bot Sphere */}
      <AnimatePresence>
        {widgetState === "closed" && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-20 md:bottom-6 right-6 z-50"
          >
            <button
              onClick={() => isUserLoggedIn && setWidgetState("open")}
              className="relative group flex flex-col items-center"
              title={isUserLoggedIn ? "PraeroBot" : "Faça login para usar"}
            >
              {/* Label */}
              <motion.span
                className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-wider whitespace-nowrap"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  color: isUserLoggedIn ? "#22c55e" : "#888",
                  textShadow: isUserLoggedIn 
                    ? "0 0 8px rgba(34, 197, 94, 0.8)"
                    : "none",
                }}
              >
                PraeroBot
              </motion.span>

              {/* Outer Glow */}
              <motion.div
                className="absolute inset-[-12px] rounded-full"
                animate={{
                  scale: [1, 1.2, 1.1, 1],
                  opacity: [0.4, 0.2, 0.35, 0.4],
                }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{
                  background: isUserLoggedIn 
                    ? "radial-gradient(circle, rgba(34, 197, 94, 0.4) 0%, transparent 70%)"
                    : "radial-gradient(circle, rgba(150,150,150,0.2) 0%, transparent 70%)",
                  filter: "blur(8px)",
                }}
              />
              
              {/* Core Sphere */}
              <motion.div
                className="relative h-16 w-16 rounded-full flex items-center justify-center overflow-hidden"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  background: isUserLoggedIn
                    ? "linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)"
                    : "linear-gradient(135deg, #666 0%, #444 100%)",
                  boxShadow: isUserLoggedIn
                    ? "0 0 20px rgba(34, 197, 94, 0.6), 0 0 40px rgba(34, 197, 94, 0.3)"
                    : "0 0 10px rgba(100, 100, 100, 0.3)",
                }}
              >
                <img 
                  src={logoPraieiro} 
                  alt="PraeroBot" 
                  className="h-10 w-10 object-contain"
                />
              </motion.div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimized State */}
      <AnimatePresence>
        {widgetState === "minimized" && isUserLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 md:bottom-4 right-4 z-50"
          >
            <div className="flex items-center gap-2 px-4 py-3 rounded-full bg-green-600/95 backdrop-blur-sm shadow-lg border border-green-500/50">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setWidgetState("open")}
                className="h-8 w-8 text-white hover:bg-white/20"
              >
                <Bot className="h-4 w-4" />
              </Button>
              <span className="text-sm text-white font-medium">PraeroBot</span>
              {isSpeaking && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  <Volume2 className="h-4 w-4 text-white" />
                </motion.div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8 text-white/80 hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Chat Window - Draggable */}
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
            className="w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-4rem)] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header - Draggable */}
            <div 
              {...dragHandlers}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
            >
              <div className="flex items-center gap-3">
                <GripHorizontal className="h-4 w-4 text-white/60" />
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                  <img src={logoPraieiro} alt="PraeroBot" className="h-7 w-7 object-contain" />
                </div>
                <div>
                  <h3 className="font-semibold text-base flex items-center gap-2">
                    PraeroBot
                    <Sparkles className="h-3 w-3 text-yellow-300" />
                  </h3>
                  <p className="text-[11px] text-white/70">
                    {isLoading ? "Pensando..." : isGeneratingImage ? "Gerando imagem..." : isSpeaking ? "🔊 Falando" : "Multimodal AI"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {/* Voice Toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setVoiceEnabled(!voiceEnabled);
                    if (isSpeaking) stopSpeaking();
                  }}
                  className={`text-white/80 hover:bg-white/20 ${voiceEnabled ? '' : 'opacity-50'}`}
                  title={voiceEnabled ? "Desativar voz" : "Ativar voz"}
                >
                  {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setWidgetState("minimized")}
                  className="text-white/80 hover:bg-white/20"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="text-white/80 hover:bg-red-500/30"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-slate-50" ref={scrollRef}>
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-green-600 text-white rounded-br-sm"
                          : "bg-white text-slate-800 rounded-bl-sm border border-slate-200 shadow-sm"
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                      
                      {/* Image Preview */}
                      {msg.imageUrl && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-slate-200">
                          <img 
                            src={msg.imageUrl} 
                            alt="Generated" 
                            className="w-full h-auto"
                          />
                        </div>
                      )}
                      
                      <div className={`flex items-center justify-between mt-2 ${msg.role === "user" ? "text-white/60" : "text-slate-400"}`}>
                        <span className="text-[10px]">
                          {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        
                        {/* Speak button for assistant messages */}
                        {msg.role === "assistant" && voiceEnabled && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSpeak(msg.content)}
                            className="h-5 w-5 text-slate-400 hover:text-green-600"
                            title="Ouvir resposta"
                          >
                            <Volume2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loading States */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-2xl px-4 py-3 rounded-bl-sm border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                        <span className="text-sm text-slate-500">Processando...</span>
                      </div>
                    </div>
                  </div>
                )}

                {isGeneratingImage && (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-2xl px-4 py-3 rounded-bl-sm border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Image className="h-4 w-4 text-green-600 animate-pulse" />
                        <span className="text-sm text-slate-500">Gerando imagem...</span>
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
                  placeholder="Pergunte algo ou peça uma imagem..."
                  disabled={isLoading}
                  className="flex-1 bg-slate-50 border-slate-200 text-sm focus:ring-green-500 focus:border-green-500"
                  maxLength={500}
                />
                <Button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  size="icon"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 text-center">
                💡 Dica: Peça para "gerar uma imagem de..." para criar imagens
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
