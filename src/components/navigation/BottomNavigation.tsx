import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, Search, ShoppingBag, User, 
  Newspaper, Store, Settings, LogIn 
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  requiresAuth?: boolean;
  roles?: string[];
}

const publicItems: NavItem[] = [
  { path: "/", label: "Início", icon: Home },
  { path: "/ambulantes", label: "Praieiros", icon: Store },
  { path: "/sobre", label: "Sobre", icon: Newspaper },
  { path: "/autenticacao", label: "Entrar", icon: LogIn },
];

const clientItems: NavItem[] = [
  { path: "/feed", label: "Início", icon: Home, requiresAuth: true },
  { path: "/encontrar", label: "Encontrar", icon: Search, requiresAuth: true },
  { path: "/meus-pedidos", label: "Pedidos", icon: ShoppingBag, requiresAuth: true },
  { path: "/perfil", label: "Perfil", icon: User, requiresAuth: true },
];

const vendorItems: NavItem[] = [
  { path: "/painel-ambulante", label: "Meu Painel", icon: Store, requiresAuth: true, roles: ["vendor"] },
  { path: "/encontrar", label: "Encontrar", icon: Search, requiresAuth: true },
  { path: "/meus-pedidos", label: "Pedidos", icon: ShoppingBag, requiresAuth: true },
  { path: "/perfil", label: "Perfil", icon: User, requiresAuth: true },
];

const adminItems: NavItem[] = [
  { path: "/admin", label: "Admin", icon: Settings, requiresAuth: true, roles: ["admin"] },
  { path: "/encontrar", label: "Encontrar", icon: Search, requiresAuth: true },
  { path: "/meus-pedidos", label: "Pedidos", icon: ShoppingBag, requiresAuth: true },
  { path: "/perfil", label: "Perfil", icon: User, requiresAuth: true },
];

export function BottomNavigation() {
  const { user } = useAuth();
  const location = useLocation();
  const { role: userRole } = useUserRole(user?.id);

  // Hide on certain pages
  const hiddenPaths = ["/", "/admin/login", "/autenticacao", "/login-ambulante", "/cadastro"];
  if (hiddenPaths.includes(location.pathname)) {
    return null;
  }

  const getNavItems = (): NavItem[] => {
    if (!user) return publicItems;
    
    switch (userRole) {
      case "admin":
        return adminItems;
      case "vendor":
        return vendorItems;
      default:
        return clientItems;
    }
  };

  const navItems = getNavItems();

  return (
    <motion.nav 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-lg border-t border-border shadow-lg safe-area-bottom"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex-1 flex flex-col items-center justify-center py-2 group"
            >
              <motion.div
                className={cn(
                  "flex flex-col items-center justify-center transition-all duration-200",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                whileTap={{ scale: 0.9 }}
              >
                <div className={cn(
                  "relative p-1.5 rounded-xl transition-all duration-200",
                  isActive && "bg-primary/10"
                )}>
                  <Icon className={cn(
                    "h-5 w-5 transition-transform",
                    isActive && "scale-110"
                  )} />
                  
                  {/* Active indicator */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
                      />
                    )}
                  </AnimatePresence>
                </div>
                
                <span className={cn(
                  "text-[10px] mt-0.5 font-medium transition-all",
                  isActive ? "text-primary font-semibold" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </motion.div>
            </NavLink>
          );
        })}
      </div>
    </motion.nav>
  );
}
