import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Bot, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  AlertTriangle,
  Shield,
  Brain,
  Loader2,
  User,
  Sparkles
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SYSTEM_CONTEXT = `Você é o PraieiroBot ADM, um conselheiro técnico, jurídico e gerencial especializado em:

1. LGPD e Compliance de Dados
2. Hardening e Segurança de Sistemas
3. Auditoria Técnica de Banco de Dados
4. Governança de IA

REGRAS ABSOLUTAS:
- Você NUNCA executa código ou comandos
- Você NUNCA aplica correções automaticamente
- Você NUNCA ignora princípios da LGPD
- Você NUNCA toma decisões sozinho
- Você SEMPRE explica riscos, impactos e alternativas
- Você SEMPRE recomenda aprovação explícita do administrador

Seu papel é:
- Explicar auditorias, riscos e impactos
- Ajudar o administrador a entender relatórios
- Sugerir correções (sem executá-las)
- Responder dúvidas sobre segurança e compliance
- Orientar sobre melhores práticas

Sempre responda de forma clara, técnica mas acessível, e nunca execute ações diretamente.`;

const QUICK_ACTIONS = [
  { label: "O que é RLS?", prompt: "Explique o que é Row Level Security (RLS) e por que é importante" },
  { label: "Riscos de USING true", prompt: "Quais são os riscos de ter policies com USING (true)?" },
  { label: "LGPD Básico", prompt: "Resuma os principais pontos da LGPD que devo considerar" },
  { label: "Checklist de Segurança", prompt: "Quais são os itens essenciais de um checklist de segurança?" },
];

export function PraieiroAdmBotPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Olá! Sou o **PraieiroBot ADM**, seu conselheiro técnico para governança, segurança e compliance.\n\n⚠️ **Importante:** Eu não executo código nem aplico correções. Meu papel é ajudá-lo a entender riscos, analisar relatórios e tomar decisões informadas.\n\nComo posso ajudar hoje?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    const win = window as any;
    if ('webkitSpeechRecognition' in win || 'SpeechRecognition' in win) {
      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionClass();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'pt-BR';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast.error("Erro no reconhecimento de voz");
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsListening(true);
    } else {
      toast.error("Reconhecimento de voz não suportado neste navegador");
    }
  };

  const speakText = useCallback((text: string) => {
    if (!voiceEnabled) return;
    
    // Remove markdown formatting for speech
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/`/g, '')
      .replace(/\n/g, ' ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1;
    utterance.pitch = 1;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
        body: {
          message: content,
          systemPrompt: SYSTEM_CONTEXT,
          capability: "text",
          maxTokens: 1500,
          temperature: 0.7,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "Desculpe, não consegui processar sua solicitação.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (voiceEnabled) {
        speakText(assistantMessage.content);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao processar mensagem");
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  PraieiroBot ADM
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    IA Assistiva
                  </Badge>
                </CardTitle>
                <CardDescription>Conselheiro técnico, jurídico e gerencial</CardDescription>
              </div>
            </div>
            <Button
              variant={voiceEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="gap-2"
            >
              {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              {voiceEnabled ? "Voz Ativa" : "Voz Desativada"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Aviso de Segurança */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-600 dark:text-amber-400">
              <strong>Modo Consultivo:</strong> O PraieiroBot não executa código, não aplica correções e não toma decisões. 
              Ele apenas orienta e explica.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card className="h-[500px] flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Conversa</span>
            </div>
            {isSpeaking && (
              <Button variant="ghost" size="sm" onClick={stopSpeaking} className="gap-2">
                <VolumeX className="h-4 w-4" />
                Parar
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 px-4" ref={scrollRef}>
            <div className="space-y-4 py-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <span className="text-xs opacity-50 mt-1 block">
                      {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {message.role === "user" && (
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <p className="text-sm text-muted-foreground">Analisando...</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <Separator />

          {/* Quick Actions */}
          <div className="px-4 py-2 flex gap-2 overflow-x-auto">
            {QUICK_ACTIONS.map((action, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => sendMessage(action.prompt)}
                disabled={isLoading}
                className="whitespace-nowrap text-xs"
              >
                {action.label}
              </Button>
            ))}
          </div>

          <Separator />

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 flex gap-2">
            <Button
              type="button"
              variant={isListening ? "default" : "outline"}
              size="icon"
              onClick={toggleVoice}
              disabled={isLoading}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua pergunta sobre segurança, LGPD ou hardening..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={!input.trim() || isLoading} size="icon">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Capacidades */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Capacidades do Conselheiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Brain, label: "Análise de Riscos", desc: "Avaliação de vulnerabilidades" },
              { icon: Shield, label: "Compliance LGPD", desc: "Orientação regulatória" },
              { icon: AlertTriangle, label: "Hardening", desc: "Recomendações de segurança" },
              { icon: Bot, label: "Auditoria", desc: "Interpretação de relatórios" },
            ].map((cap, i) => (
              <div key={i} className="p-3 rounded-lg border bg-muted/30">
                <cap.icon className="h-6 w-6 text-primary mb-2" />
                <h4 className="font-medium text-sm">{cap.label}</h4>
                <p className="text-xs text-muted-foreground">{cap.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
