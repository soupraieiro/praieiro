import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Sparkles, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BotHint {
  id: string;
  message: string;
  type: "tip" | "welcome" | "badge" | "event" | "milestone";
  emoji?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface PraieiroBotHintProps {
  hint: BotHint;
  onDismiss: () => void;
  position?: "bottom-right" | "bottom-left" | "top-right" | "center";
  autoHide?: number;
  className?: string;
}

export function PraieiroBotHint({
  hint,
  onDismiss,
  position = "bottom-right",
  autoHide,
  className,
}: PraieiroBotHintProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoHide && autoHide > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300);
      }, autoHide);
      return () => clearTimeout(timer);
    }
  }, [autoHide, onDismiss]);

  const positionClasses = {
    "bottom-right": "fixed bottom-20 right-4 md:bottom-6 md:right-6",
    "bottom-left": "fixed bottom-20 left-4 md:bottom-6 md:left-6",
    "top-right": "fixed top-20 right-4 md:top-24 md:right-6",
    "center": "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  };

  const typeStyles = {
    tip: {
      bg: "bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/90 dark:to-cyan-950/90",
      border: "border-blue-200 dark:border-blue-800",
      icon: "text-blue-600",
    },
    welcome: {
      bg: "bg-gradient-to-br from-primary/10 to-accent/10",
      border: "border-primary/30",
      icon: "text-primary",
    },
    badge: {
      bg: "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/90 dark:to-orange-950/90",
      border: "border-amber-200 dark:border-amber-800",
      icon: "text-amber-600",
    },
    event: {
      bg: "bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/90 dark:to-pink-950/90",
      border: "border-purple-200 dark:border-purple-800",
      icon: "text-purple-600",
    },
    milestone: {
      bg: "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/90 dark:to-teal-950/90",
      border: "border-emerald-200 dark:border-emerald-800",
      icon: "text-emerald-600",
    },
  };

  const style = typeStyles[hint.type];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={cn(
            positionClasses[position],
            "z-50 max-w-sm w-[calc(100%-2rem)]",
            className
          )}
        >
          <div
            className={cn(
              "rounded-2xl border-2 shadow-xl backdrop-blur-md p-4",
              style.bg,
              style.border
            )}
          >
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className={cn(
                "h-10 w-10 rounded-full bg-white dark:bg-card flex items-center justify-center shrink-0 shadow-md"
              )}>
                <Bot className={cn("h-5 w-5", style.icon)} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">Praieiro Bot</span>
                  <Sparkles className="h-3 w-3 text-amber-500" />
                </div>
                
                <p className="text-sm text-foreground leading-relaxed">
                  {hint.emoji && <span className="mr-1">{hint.emoji}</span>}
                  {hint.message}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 -mt-1 -mr-1"
                onClick={() => {
                  setIsVisible(false);
                  setTimeout(onDismiss, 300);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Action Button */}
            {hint.action && (
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-xs"
                  onClick={hint.action.onClick}
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  {hint.action.label}
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Floating Bot Icon (draggable placeholder)
interface FloatingBotIconProps {
  onClick: () => void;
  hasNotification?: boolean;
}

export function FloatingBotIcon({ onClick, hasNotification }: FloatingBotIconProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-40 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-accent shadow-xl flex items-center justify-center text-primary-foreground"
      style={{
        boxShadow: "0 4px 20px rgba(0,0,0,0.2), 0 0 40px rgba(14,165,233,0.3)"
      }}
    >
      <Bot className="h-7 w-7" />
      
      {hasNotification && (
        <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-destructive border-2 border-white animate-pulse" />
      )}
    </motion.button>
  );
}
