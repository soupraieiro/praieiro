import { motion } from "framer-motion";
import { User, Store, ShoppingBag, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type UserIdentity = "cliente" | "praieiro" | "vendedor";

interface IdentityOption {
  id: UserIdentity;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  borderColor: string;
  iconBg: string;
  iconColor: string;
  badge?: string;
}

const IDENTITY_OPTIONS: IdentityOption[] = [
  {
    id: "cliente",
    title: "Cliente",
    subtitle: "Explorar a Barra",
    description: "Só quero conhecer, comprar e curtir a praia",
    icon: User,
    gradient: "from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30",
    borderColor: "border-blue-200 hover:border-blue-400 dark:border-blue-800",
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "praieiro",
    title: "Praieiro",
    subtitle: "Herói da Praia",
    description: "Quero participar, cuidar e fazer parte da comunidade",
    icon: Sparkles,
    gradient: "from-primary/10 to-accent/10",
    borderColor: "border-primary/30 hover:border-primary",
    iconBg: "bg-primary/20",
    iconColor: "text-primary",
    badge: "🦸",
  },
  {
    id: "vendedor",
    title: "Vendedor",
    subtitle: "Marketplace",
    description: "Tenho produtos ou serviços para oferecer na praia",
    icon: Store,
    gradient: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30",
    borderColor: "border-amber-200 hover:border-amber-500 dark:border-amber-800",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
];

interface IdentityCardProps {
  identity: IdentityOption;
  selected?: boolean;
  onClick: () => void;
  disabled?: boolean;
  showMarketplaceOption?: boolean;
}

export function IdentityCard({ 
  identity, 
  selected, 
  onClick, 
  disabled = false 
}: IdentityCardProps) {
  const Icon = identity.icon;

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.02, y: -2 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full p-5 rounded-2xl border-2 text-left transition-all duration-300",
        "bg-gradient-to-br",
        identity.gradient,
        identity.borderColor,
        selected && "ring-2 ring-primary ring-offset-2",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "h-14 w-14 rounded-full flex items-center justify-center shrink-0",
          identity.iconBg
        )}>
          {identity.badge ? (
            <span className="text-2xl">{identity.badge}</span>
          ) : (
            <Icon className={cn("h-7 w-7", identity.iconColor)} />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg">{identity.title}</h3>
            {identity.badge && !identity.id.includes("cliente") && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                {identity.subtitle}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {identity.description}
          </p>
        </div>

        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
      </div>
    </motion.button>
  );
}

interface RoleSelectorProps {
  onSelect: (identity: UserIdentity) => void;
  selected?: UserIdentity;
  showMarketplace?: boolean;
  disabled?: boolean;
}

export function RoleSelector({ 
  onSelect, 
  selected, 
  showMarketplace = false,
  disabled = false
}: RoleSelectorProps) {
  const options = showMarketplace 
    ? IDENTITY_OPTIONS 
    : IDENTITY_OPTIONS.filter(o => o.id !== "vendedor");

  return (
    <div className="space-y-3">
      {options.map((option, index) => (
        <motion.div
          key={option.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <IdentityCard
            identity={option}
            selected={selected === option.id}
            onClick={() => onSelect(option.id)}
            disabled={disabled}
          />
        </motion.div>
      ))}
      
      <p className="text-xs text-center text-muted-foreground pt-2">
        Você pode mudar sua identidade depois nas configurações
      </p>
    </div>
  );
}

export { IDENTITY_OPTIONS };
export type { IdentityOption };
