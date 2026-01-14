import { motion } from "framer-motion";
import { 
  Sprout, Rainbow, Shield, Heart, MessageCircle,
  Palmtree, Waves, Sun, Award, Eye, EyeOff
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: "entrada" | "comunidade" | "territorio";
  color: string;
  bgColor: string;
  earnedAt?: string;
  isHidden?: boolean;
}

// Badges do ecossistema Praieiro
export const PRAIEIRO_BADGES: Badge[] = [
  // Entrada / Identidade
  {
    id: "primeira-pegada",
    name: "🌱 Primeira Pegada",
    description: "Completou o onboarding e deu os primeiros passos",
    icon: Sprout,
    category: "entrada",
    color: "text-emerald-600",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  {
    id: "chegou-com-respeito",
    name: "🌈 Chegou com Respeito",
    description: "Aceitou os termos e a política de inclusão",
    icon: Rainbow,
    category: "entrada",
    color: "text-violet-600",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
  },
  // Comunidade
  {
    id: "heroi-da-praia",
    name: "🦸 Herói da Praia",
    description: "Escolheu conscientemente ser um Praieiro ativo",
    icon: Shield,
    category: "comunidade",
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    id: "presenca-boa",
    name: "🤝 Presença Boa",
    description: "Interações positivas recorrentes na comunidade",
    icon: Heart,
    category: "comunidade",
    color: "text-pink-600",
    bgColor: "bg-pink-100 dark:bg-pink-900/30",
  },
  {
    id: "voz-da-praia",
    name: "🗣️ Voz da Praia",
    description: "Contribuições relevantes à comunidade",
    icon: MessageCircle,
    category: "comunidade",
    color: "text-cyan-600",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
  },
  // Território
  {
    id: "guardiao-da-barra",
    name: "🏖️ Guardião da Barra",
    description: "Defensor ativo da Praia da Barra",
    icon: Palmtree,
    category: "territorio",
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  {
    id: "amigo-do-mar",
    name: "🌊 Amigo do Mar",
    description: "Respeita e protege o ambiente marinho",
    icon: Waves,
    category: "territorio",
    color: "text-sky-600",
    bgColor: "bg-sky-100 dark:bg-sky-900/30",
  },
  {
    id: "espirito-de-verao",
    name: "☀️ Espírito de Verão",
    description: "Energia positiva que contagia a todos",
    icon: Sun,
    category: "territorio",
    color: "text-orange-600",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
];

interface BadgeDisplayProps {
  badges: Badge[];
  size?: "sm" | "md" | "lg";
  showHidden?: boolean;
  onToggleVisibility?: (badgeId: string) => void;
  isOwner?: boolean;
}

export function BadgeDisplay({ 
  badges, 
  size = "md", 
  showHidden = false,
  onToggleVisibility,
  isOwner = false
}: BadgeDisplayProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const visibleBadges = showHidden ? badges : badges.filter(b => !b.isHidden);

  if (visibleBadges.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Nenhum badge conquistado ainda
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {visibleBadges.map((badge, index) => {
        const Icon = badge.icon;
        
        return (
          <Tooltip key={badge.id}>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 260,
                  damping: 20
                }}
                className="relative group"
              >
                <div
                  className={cn(
                    "rounded-full flex items-center justify-center transition-all duration-300",
                    sizeClasses[size],
                    badge.bgColor,
                    badge.isHidden && "opacity-50",
                    "hover:scale-110 cursor-pointer"
                  )}
                >
                  <Icon className={cn(iconSizes[size], badge.color)} />
                </div>
                
                {/* Visibility toggle for owner */}
                {isOwner && onToggleVisibility && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-card border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility(badge.id);
                    }}
                  >
                    {badge.isHidden ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px]">
              <div className="text-center">
                <p className="font-semibold">{badge.name}</p>
                <p className="text-xs text-muted-foreground">{badge.description}</p>
                {badge.earnedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Conquistado em {new Date(badge.earnedAt).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

interface BadgeShowcaseProps {
  earnedBadges: string[];
  className?: string;
}

export function BadgeShowcase({ earnedBadges, className }: BadgeShowcaseProps) {
  const badges = PRAIEIRO_BADGES.filter(b => earnedBadges.includes(b.id));
  
  const groupedBadges = {
    entrada: badges.filter(b => b.category === "entrada"),
    comunidade: badges.filter(b => b.category === "comunidade"),
    territorio: badges.filter(b => b.category === "territorio"),
  };

  const categoryLabels = {
    entrada: "Identidade",
    comunidade: "Comunidade", 
    territorio: "Território",
  };

  return (
    <div className={cn("space-y-4", className)}>
      {Object.entries(groupedBadges).map(([category, categoryBadges]) => {
        if (categoryBadges.length === 0) return null;
        
        return (
          <div key={category}>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {categoryLabels[category as keyof typeof categoryLabels]}
            </h4>
            <BadgeDisplay badges={categoryBadges} size="md" />
          </div>
        );
      })}
    </div>
  );
}
