import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, ChevronRight, ChevronLeft, 
  Search, ShoppingBag, User, Newspaper,
  MapPin, MessageCircle, Star, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  tip?: string;
}

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Bem-vindo ao Praieiro! 🌊",
    description: "A plataforma que conecta você aos melhores vendedores de praia. Vamos fazer um tour rápido?",
    icon: Search,
  },
  {
    id: "find",
    title: "Encontre seu Praieiro",
    description: "Use a busca para encontrar vendedores próximos. Veja o cardápio, avaliações e faça seu pedido direto pelo app.",
    icon: MapPin,
    tip: "Ative a localização para melhores resultados!",
  },
  {
    id: "chat",
    title: "Converse Direto",
    description: "Fale diretamente com o vendedor pelo chat da plataforma. Tire dúvidas e combine a entrega.",
    icon: MessageCircle,
    tip: "O chat fica salvo no seu histórico de pedidos.",
  },
  {
    id: "orders",
    title: "Acompanhe seus Pedidos",
    description: "Veja o status das suas compras em tempo real. Receba notificações quando o vendedor aceitar ou entregar.",
    icon: ShoppingBag,
    tip: "Você pode avaliar após a entrega!",
  },
  {
    id: "profile",
    title: "Complete seu Perfil",
    description: "Adicione sua foto e informações para uma experiência personalizada. Os vendedores poderão te reconhecer!",
    icon: User,
    tip: "Perfis completos têm prioridade no atendimento.",
  },
  {
    id: "ready",
    title: "Tudo Pronto! 🎉",
    description: "Agora você está pronto para curtir a praia com mais comodidade. Boas compras!",
    icon: Check,
  },
];

export function OnboardingTour() {
  const { user } = useAuth();
  const [showTour, setShowTour] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Check if user has completed tour
    const hasCompletedTour = localStorage.getItem(`praieiro_tour_completed_${user.id}`);
    const hasSeenTour = localStorage.getItem(`praieiro_tour_seen_${user.id}`);
    
    // Show tour for new users who haven't dismissed it
    if (!hasCompletedTour && !hasSeenTour) {
      // Delay to let page load
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTour();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const completeTour = () => {
    if (user) {
      localStorage.setItem(`praieiro_tour_completed_${user.id}`, "true");
    }
    setShowTour(false);
    setCurrentStep(0);
  };

  const dismissTour = () => {
    if (user) {
      localStorage.setItem(`praieiro_tour_seen_${user.id}`, "true");
    }
    setShowTour(false);
    setCurrentStep(0);
  };

  if (!showTour) {
    return null;
  }

  const step = tourSteps[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === tourSteps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && dismissTour()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-card rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-8 w-8 p-0 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
              onClick={dismissTour}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <motion.div
              key={step.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-center mb-4"
            >
              <div className="h-16 w-16 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Icon className="h-8 w-8" />
              </div>
            </motion.div>

            <motion.h2
              key={`title-${step.id}`}
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
              key={`desc-${step.id}`}
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
              {tourSteps.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    index === currentStep 
                      ? "w-6 bg-primary" 
                      : index < currentStep 
                        ? "w-1.5 bg-primary/50" 
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
              onClick={handlePrev}
              disabled={isFirstStep}
              className={cn(isFirstStep && "invisible")}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>

            <Button onClick={handleNext}>
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
      </motion.div>
    </AnimatePresence>
  );
}
