import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, ChevronRight, ChevronLeft, 
  User, Store, MessageCircle, Music, Shell,
  Wallet, Shield, Check, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  image?: string;
  tip?: string;
}

const clientSteps: OnboardingStep[] = [
  {
    id: "welcome-client",
    title: "Bem-vindo ao Praieiro! 🌊",
    description: "Você escolheu a experiência de CLIENTE. Vamos conhecer as vantagens exclusivas do nosso ecossistema.",
    icon: Sparkles,
  },
  {
    id: "chat-direto",
    title: "Chat Direto com Vendedores",
    description: "Na Fase 0 (Crescimento), o chat é totalmente aberto! Negocie diretamente, troque PIX e combine entregas sem intermediários.",
    icon: MessageCircle,
    tip: "Aproveite! Na Fase 0, você pode trocar contatos livremente.",
  },
  {
    id: "musica-sem-anuncios",
    title: "Música Sem Anúncios 🎵",
    description: "Curta uma playlist de verão enquanto navega, totalmente gratuita e sem interrupções publicitárias.",
    icon: Music,
  },
  {
    id: "conchas-gamificacao",
    title: "Acumule Conchas 🐚",
    description: "A cada 10 acessos diários, você ganha 1 Concha! Conchas serão a moeda do ecossistema para descontos e benefícios.",
    icon: Shell,
    tip: "Sua carteira digital será desbloqueada quando a plataforma atingir 100 mil usuários!",
  },
  {
    id: "carteira-digital",
    title: "Carteira Digital (Em Breve)",
    description: "Acompanhe a barra de progresso! Quando atingirmos a meta, sua carteira será ativada automaticamente.",
    icon: Wallet,
  },
  {
    id: "ready-client",
    title: "Tudo Pronto! 🎉",
    description: "Agora você faz parte da comunidade Praieiro. Curta a praia com mais comodidade!",
    icon: Check,
  },
];

const praieiroSteps: OnboardingStep[] = [
  {
    id: "welcome-praieiro",
    title: "Bem-vindo, Praieiro! 🏝️",
    description: "Você escolheu ser um PRAIEIRO (vendedor). Vamos entender como escalar seu negócio na plataforma.",
    icon: Sparkles,
  },
  {
    id: "fase-crescimento",
    title: "Fase 0: Crescimento Puro",
    description: "Atualmente 100% GRATUITO! Cadastre seus produtos, receba pedidos e use o chat aberto para construir sua base de clientes.",
    icon: Store,
    tip: "Negocie livremente! Não há taxas nesta fase.",
  },
  {
    id: "categorias-vendedores",
    title: "Tipos de Estabelecimento",
    description: "Desde ambulante até restaurante de praia. Você será categorizado por metragem e poderá escolher seu plano de exposição.",
    icon: Shield,
    tip: "Ambulantes, Barracas, Quiosques e Restaurantes - todos são bem-vindos!",
  },
  {
    id: "planos-exposicao",
    title: "Planos de Exposição",
    description: "Bronze (Grátis), Prata (destaque nas buscas) e Ouro (máxima visibilidade). Disponíveis após a Fase 0!",
    icon: Sparkles,
  },
  {
    id: "carteira-vendedor",
    title: "Carteira do Vendedor",
    description: "Receba pagamentos, acompanhe vendas e faça saques. Tudo integrado quando a carteira for ativada.",
    icon: Wallet,
  },
  {
    id: "ready-praieiro",
    title: "Boas Vendas! 💰",
    description: "Seu negócio agora está na maior plataforma de praia do Brasil. Cadastre seus produtos e comece a vender!",
    icon: Check,
  },
];

type UserTypeSelection = "client" | "praieiro" | null;

export function SatoshiOnboarding() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userTypeSelection, setUserTypeSelection] = useState<UserTypeSelection>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSelectingType, setIsSelectingType] = useState(true);

  useEffect(() => {
    if (!user) return;
    checkOnboardingStatus();
  }, [user]);

  const checkOnboardingStatus = async () => {
    if (!user) return;

    // Check if user already completed onboarding
    const { data: userType } = await supabase
      .from("user_types")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (userType?.onboarding_completed) {
      return; // Already completed
    }

    // Check localStorage as fallback
    const hasCompletedOnboarding = localStorage.getItem(`satoshi_onboarding_${user.id}`);
    if (hasCompletedOnboarding) return;

    // Show onboarding after a delay
    setTimeout(() => setShowOnboarding(true), 1500);
  };

  const handleUserTypeSelect = async (type: UserTypeSelection) => {
    if (!user || !type) return;

    setUserTypeSelection(type);
    setIsSelectingType(false);
    setCurrentStep(0);

    // Save user type to database
    await supabase.from("user_types").upsert({
      user_id: user.id,
      user_type: type,
      tutorial_step: 0,
      onboarding_completed: false,
    });
  };

  const steps = userTypeSelection === "client" ? clientSteps : praieiroSteps;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      // Go back to type selection
      setIsSelectingType(true);
      setUserTypeSelection(null);
    }
  };

  const completeOnboarding = async () => {
    if (!user) return;

    // Update database
    await supabase
      .from("user_types")
      .update({ 
        onboarding_completed: true,
        tutorial_step: steps.length,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", user.id);

    // Also set localStorage
    localStorage.setItem(`satoshi_onboarding_${user.id}`, "true");
    
    setShowOnboarding(false);
    setCurrentStep(0);
    setUserTypeSelection(null);
    setIsSelectingType(true);
  };

  const dismissOnboarding = () => {
    if (user) {
      localStorage.setItem(`satoshi_onboarding_seen_${user.id}`, "true");
    }
    setShowOnboarding(false);
  };

  if (!showOnboarding) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && dismissOnboarding()}
      >
        {isSelectingType ? (
          <UserTypeSelector 
            onSelect={handleUserTypeSelect} 
            onDismiss={dismissOnboarding}
          />
        ) : (
          <OnboardingStepCard
            step={steps[currentStep]}
            currentStep={currentStep}
            totalSteps={steps.length}
            userType={userTypeSelection}
            onNext={handleNext}
            onPrev={handlePrev}
            onDismiss={dismissOnboarding}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

interface UserTypeSelectorProps {
  onSelect: (type: UserTypeSelection) => void;
  onDismiss: () => void;
}

function UserTypeSelector({ onSelect, onDismiss }: UserTypeSelectorProps) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="bg-card rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
    >
      {/* Header */}
      <div className="relative bg-gradient-to-br from-primary to-accent p-6 text-primary-foreground">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-8 w-8 p-0 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
        
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Bem-vindo ao Praieiro! 🌊</h2>
          <p className="text-primary-foreground/80">
            Para começar, nos diga: qual é o seu perfil?
          </p>
        </div>
      </div>

      {/* Options */}
      <div className="p-6 space-y-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect("client")}
          className="w-full p-5 rounded-xl border-2 border-primary/20 hover:border-primary bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 text-left transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Sou CLIENTE</h3>
              <p className="text-sm text-muted-foreground">
                Procurando serviços, produtos e lazer na praia
              </p>
            </div>
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect("praieiro")}
          className="w-full p-5 rounded-xl border-2 border-amber-500/20 hover:border-amber-500 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 text-left transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Store className="h-7 w-7 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Sou PRAIEIRO</h3>
              <p className="text-sm text-muted-foreground">
                Vendedor ambulante, barraca, quiosque ou restaurante
              </p>
            </div>
          </div>
        </motion.button>

        <p className="text-xs text-center text-muted-foreground pt-2">
          Você pode mudar depois nas configurações do perfil
        </p>
      </div>
    </motion.div>
  );
}

interface OnboardingStepCardProps {
  step: OnboardingStep;
  currentStep: number;
  totalSteps: number;
  userType: UserTypeSelection;
  onNext: () => void;
  onPrev: () => void;
  onDismiss: () => void;
}

function OnboardingStepCard({
  step,
  currentStep,
  totalSteps,
  userType,
  onNext,
  onPrev,
  onDismiss,
}: OnboardingStepCardProps) {
  const Icon = step.icon;
  const isLastStep = currentStep === totalSteps - 1;
  const gradientClass = userType === "client" 
    ? "from-primary to-blue-600" 
    : "from-amber-500 to-orange-600";

  return (
    <motion.div
      key={step.id}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="bg-card rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
    >
      {/* Header */}
      <div className={`relative bg-gradient-to-br ${gradientClass} p-6 text-white`}>
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
        
        <motion.div
          key={step.id + "-icon"}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center mb-4"
        >
          <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
            <Icon className="h-8 w-8" />
          </div>
        </motion.div>

        <motion.h2
          key={step.id + "-title"}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-xl font-bold text-center"
        >
          {step.title}
        </motion.h2>
      </div>

      {/* Content */}
      <div className="p-6">
        <motion.p
          key={step.id + "-desc"}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-muted-foreground text-center mb-4"
        >
          {step.description}
        </motion.p>

        {step.tip && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-accent/10 border border-accent/20 rounded-lg p-3 text-center"
          >
            <span className="text-sm text-accent font-medium">💡 {step.tip}</span>
          </motion.div>
        )}

        {/* Progress indicators */}
        <div className="flex items-center justify-center gap-1.5 mt-6">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                index === currentStep 
                  ? `w-6 ${userType === "client" ? "bg-primary" : "bg-amber-500"}` 
                  : index < currentStep 
                    ? `w-1.5 ${userType === "client" ? "bg-primary/50" : "bg-amber-500/50"}` 
                    : "w-1.5 bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 pb-6 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={onPrev}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>

        <Button 
          onClick={onNext}
          className={userType === "praieiro" ? "bg-amber-500 hover:bg-amber-600" : ""}
        >
          {isLastStep ? (
            <>
              Começar
              <Check className="h-4 w-4 ml-1" />
            </>
          ) : (
            <>
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
