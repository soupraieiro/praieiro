import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, Search, ShoppingBag, User, 
  Newspaper, Star, X, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Shortcut {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  count: number;
}

const defaultShortcuts: Shortcut[] = [
  { id: "find", label: "Encontrar", path: "/encontrar", icon: Search, count: 0 },
  { id: "orders", label: "Pedidos", path: "/meus-pedidos", icon: ShoppingBag, count: 0 },
  { id: "profile", label: "Perfil", path: "/perfil", icon: User, count: 0 },
  { id: "feed", label: "Feed", path: "/feed", icon: Newspaper, count: 0 },
];

const STORAGE_KEY = "praieiro_shortcuts";
const MAX_SHORTCUTS = 4;

export function QuickShortcuts() {
  const { user } = useAuth();
  const location = useLocation();
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load shortcuts from localStorage
  useEffect(() => {
    if (!user) return;

    const savedShortcuts = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
    if (savedShortcuts) {
      try {
        const parsed = JSON.parse(savedShortcuts);
        // Merge with default shortcuts to ensure icons are present
        const merged = parsed.map((saved: Shortcut) => {
          const defaultShortcut = defaultShortcuts.find(d => d.id === saved.id);
          return defaultShortcut ? { ...defaultShortcut, count: saved.count } : saved;
        });
        setShortcuts(merged);
      } catch {
        setShortcuts(defaultShortcuts);
      }
    } else {
      setShortcuts(defaultShortcuts);
    }
  }, [user?.id]);

  // Track navigation and update counts
  useEffect(() => {
    if (!user) return;

    const path = location.pathname;
    const shortcutIndex = shortcuts.findIndex(s => s.path === path);
    
    if (shortcutIndex >= 0) {
      const updated = [...shortcuts];
      updated[shortcutIndex] = {
        ...updated[shortcutIndex],
        count: updated[shortcutIndex].count + 1,
      };
      
      // Sort by usage count
      updated.sort((a, b) => b.count - a.count);
      
      setShortcuts(updated);
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(updated));
    }
  }, [location.pathname]);

  // Hide on certain pages
  const hiddenPaths = ["/", "/autenticacao", "/login-ambulante", "/admin/login", "/cadastro"];
  if (!user || hiddenPaths.includes(location.pathname)) {
    return null;
  }

  // Get top shortcuts (most used)
  const topShortcuts = shortcuts
    .filter(s => s.path !== location.pathname)
    .slice(0, MAX_SHORTCUTS);

  return (
    <div className="fixed top-20 right-4 z-40 hidden md:block">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col items-end gap-2"
      >
        {/* Toggle button */}
        <Button
          variant="secondary"
          size="sm"
          className="rounded-full shadow-lg gap-1.5"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Zap className="h-4 w-4 text-accent" />
          <span className="text-xs font-medium">Atalhos</span>
        </Button>

        {/* Shortcuts panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="bg-card border border-border rounded-xl shadow-lg p-2 min-w-[160px]"
            >
              <div className="flex items-center justify-between px-2 py-1 mb-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Seus favoritos
                </span>
              </div>
              
              <div className="space-y-1">
                {topShortcuts.map((shortcut) => {
                  const Icon = shortcut.icon;
                  
                  return (
                    <Link
                      key={shortcut.id}
                      to={shortcut.path}
                      onClick={() => setIsExpanded(false)}
                    >
                      <motion.div
                        whileHover={{ x: 4 }}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{shortcut.label}</span>
                        {shortcut.count > 0 && (
                          <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                            {shortcut.count}x
                          </span>
                        )}
                      </motion.div>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground text-center px-2">
                  💡 Os atalhos são organizados pelo seu uso
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
