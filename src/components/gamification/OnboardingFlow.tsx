import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, ChevronRight, ChevronLeft, Waves, Sun, Palmtree,
  Check, Sparkles, Shield, Heart, Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { RoleSelector, UserIdentity } from "./IdentityCard";
import { PRAIEIRO_BADGES, Badge } from "./BadgeDisplay";
import { cn } from "@/lib/utils";
import logoPraieiro from "@/assets/logo-praieiro-circle.png";

type OnboardingPhase = "welcome" | "identity" | "badges" | "complete";

interface OnboardingFlowProps {
  onComplete: (identity: UserIdentity) => void;
  onSkip?: () => void;
}

export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<OnboardingPhase>("welcome");
  const [selectedIdentity, setSelectedIdentity] = useState<UserIdentity | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(true);

  // Welcome animation
  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleIdentitySelect = async (identity: UserIdentity) => {
    setSelectedIdentity(identity);
    
    // Award initial badges
    const newBadges = ["primeira-pegada", "chegou-com-respeito"];
    if (identity === "praieiro") {
      newBadges.push("heroi-da-praia");
    }
    setEarnedBadges(newBadges);
    
    // Save to database
    if (user) {
      await supabase.from("user_types").upsert({
        user_id: user.id,
        user_type: identity === "praieiro" ? "praieiro" : identity === "vendedor" ? "vendor" : "client",
        selected_identity: identity,
        onboarding_completed: false,
        tutorial_step: 1,
      });
    }
    
    setPhase("badges");
  };

  const handleComplete = async () => {
    if (!selectedIdentity || !user) return;
    
    // Mark onboarding as complete
    await supabase.from("user_types").update({
      onboarding_completed: true,
      tutorial_step: 3,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);
    
    // Award badges - badges are recorded via frontend state, not directly in satoshi_events
    // The Ledger records transactional events, badges are symbolic and stored in user profile
    console.log("Badges awarded during onboarding:", earnedBadges);
    
    onComplete(selectedIdentity);
  };

  const phaseIndex = ["welcome", "identity", "badges", "complete"].indexOf(phase);
  const progress = ((phaseIndex + 1) / 4) * 100;

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-primary/95 via-primary to-accent/90 flex items-center justify-center p-4">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ 
            x: [0, 100, 0], 
            y: [0, -50, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-white/5 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            x: [0, -80, 0], 
            y: [0, 80, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/20 rounded-full blur-3xl"
        />
      </div>

      {/* Skip button */}
      {onSkip && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/10"
          onClick={onSkip}
        >
          <X className="h-4 w-4 mr-1" />
          Pular
        </Button>
      )}

      {/* Progress Bar */}
      <div className="absolute top-4 left-4 right-16 md:left-1/4 md:right-1/4">
        <Progress value={progress} className="h-1 bg-white/20" />
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {phase === "welcome" && (
          <WelcomePhase 
            key="welcome"
            isAnimating={isAnimating}
            onContinue={() => setPhase("identity")}
          />
        )}
        
        {phase === "identity" && (
          <IdentityPhase
            key="identity"
            onSelect={handleIdentitySelect}
            onBack={() => setPhase("welcome")}
          />
        )}
        
        {phase === "badges" && (
          <BadgesPhase
            key="badges"
            earnedBadges={earnedBadges}
            identity={selectedIdentity!}
            onContinue={handleComplete}
            onBack={() => setPhase("identity")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Welcome Phase
function WelcomePhase({ 
  isAnimating, 
  onContinue 
}: { 
  isAnimating: boolean; 
  onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, x: -100 }}
      className="text-center text-white max-w-lg"
    >
      {/* Animated Wave */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <motion.div
          animate={{ 
            y: [0, -10, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Waves className="h-20 w-20 mx-auto text-white/80" />
        </motion.div>
      </motion.div>

      {/* Logo */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
        className="mb-6"
      >
        <div className="w-24 h-24 mx-auto rounded-full bg-white shadow-2xl flex items-center justify-center overflow-hidden">
          <img src={logoPraieiro} alt="Praieiro" className="w-20 h-20 object-contain" />
        </div>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-3xl md:text-4xl font-bold mb-4"
      >
        🌴 Como você quer viver o Praieiro hoje?
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-lg text-white/80 mb-8"
      >
        Nossa rede balança no ritmo do mar.<br />
        Bem-vindo ao Praieiro. Aqui a rede é nossa.
      </motion.p>

      {/* CTA */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <Button
          size="lg"
          onClick={onContinue}
          className="bg-white text-primary hover:bg-white/90 font-bold px-8 py-6 rounded-full shadow-xl"
        >
          Começar Jornada
          <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

// Identity Selection Phase
function IdentityPhase({
  onSelect,
  onBack,
}: {
  onSelect: (identity: UserIdentity) => void;
  onBack: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="bg-card rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-accent p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-6 w-6" />
          <h2 className="text-xl font-bold">🌈 Quem é você no Praieiro?</h2>
        </div>
        <p className="text-white/80 text-sm">
          Escolha sua identidade para personalizar sua experiência
        </p>
      </div>

      {/* Options */}
      <div className="p-6">
        <RoleSelector 
          onSelect={onSelect}
          showMarketplace={true}
        />
        
        <div className="mt-6 flex justify-start">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// Badges Award Phase
function BadgesPhase({
  earnedBadges,
  identity,
  onContinue,
  onBack,
}: {
  earnedBadges: string[];
  identity: UserIdentity;
  onContinue: () => void;
  onBack: () => void;
}) {
  const badges = PRAIEIRO_BADGES.filter(b => earnedBadges.includes(b.id));

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="bg-card rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
        >
          <Award className="h-16 w-16 mx-auto mb-3" />
        </motion.div>
        <h2 className="text-xl font-bold">🎉 Parabéns!</h2>
        <p className="text-white/80 text-sm mt-1">
          Você conquistou seus primeiros badges!
        </p>
      </div>

      {/* Badges */}
      <div className="p-6">
        <div className="space-y-4">
          {badges.map((badge, index) => {
            const Icon = badge.icon;
            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.15 }}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border-2",
                  badge.bgColor,
                  "border-transparent"
                )}
              >
                <div className={cn(
                  "h-12 w-12 rounded-full flex items-center justify-center",
                  "bg-white dark:bg-card shadow-md"
                )}>
                  <Icon className={cn("h-6 w-6", badge.color)} />
                </div>
                <div>
                  <p className="font-semibold">{badge.name}</p>
                  <p className="text-sm text-muted-foreground">{badge.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Esses badges são simbólicos e aparecem no seu perfil.
          <br />Não são compráveis e não criam ranking.
        </p>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          
          <Button onClick={onContinue} className="bg-primary">
            Continuar
            <Check className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
