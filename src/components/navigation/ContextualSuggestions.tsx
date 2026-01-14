import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, ShoppingBag, MapPin, Star, 
  MessageCircle, X, Sparkles, ArrowRight,
  User, Newspaper
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Suggestion {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  priority: number;
  context: string[];
}

const allSuggestions: Suggestion[] = [
  {
    id: "find-praieiro",
    title: "Encontre um Praieiro",
    description: "Veja vendedores próximos à sua localização",
    icon: Search,
    path: "/encontrar",
    priority: 10,
    context: ["just_logged_in", "feed", "home"],
  },
  {
    id: "view-orders",
    title: "Seus Pedidos",
    description: "Acompanhe o status das suas compras",
    icon: ShoppingBag,
    path: "/meus-pedidos",
    priority: 8,
    context: ["has_orders", "after_purchase"],
  },
  {
    id: "complete-profile",
    title: "Complete seu Perfil",
    description: "Adicione sua foto e informações",
    icon: User,
    path: "/perfil",
    priority: 9,
    context: ["incomplete_profile"],
  },
  {
    id: "explore-feed",
    title: "Explore o Feed",
    description: "Veja notícias e posts da comunidade",
    icon: Newspaper,
    path: "/feed",
    priority: 7,
    context: ["after_login", "home"],
  },
  {
    id: "rate-order",
    title: "Avalie sua Experiência",
    description: "Deixe uma avaliação para ajudar outros",
    icon: Star,
    path: "/meus-pedidos",
    priority: 9,
    context: ["completed_order"],
  },
];

export function ContextualSuggestions() {
  const { user } = useAuth();
  const location = useLocation();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [hasIncompleteProfile, setHasIncompleteProfile] = useState(false);
  const [hasOrders, setHasOrders] = useState(false);

  // Check user context
  useEffect(() => {
    const checkUserContext = async () => {
      if (!user?.id) return;

      // Check profile completeness
      // CORRECT: profiles.id = auth.users.id (identidade soberana)
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, profile_photo_url, phone")
        .eq("id", user.id)
        .maybeSingle();

      setHasIncompleteProfile(
        !profile?.full_name || !profile?.profile_photo_url || !profile?.phone
      );

      // Check if user has orders
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("client_id", user.id);

      setHasOrders((count || 0) > 0);
    };

    checkUserContext();
  }, [user?.id]);

  // Determine contextual suggestions
  useEffect(() => {
    if (!user) {
      setSuggestions([]);
      return;
    }

    const currentContext: string[] = [];
    
    // Add context based on current page
    if (location.pathname === "/feed") {
      currentContext.push("feed");
    }
    if (location.pathname === "/") {
      currentContext.push("home");
    }
    
    // Add context based on user state
    if (hasIncompleteProfile) {
      currentContext.push("incomplete_profile");
    }
    if (hasOrders) {
      currentContext.push("has_orders");
    }
    
    // Check if just logged in (session age < 5 min)
    const sessionStart = localStorage.getItem("praieiro_session_start");
    if (sessionStart) {
      const sessionAge = Date.now() - parseInt(sessionStart);
      if (sessionAge < 5 * 60 * 1000) {
        currentContext.push("just_logged_in");
        currentContext.push("after_login");
      }
    }

    // Filter and sort suggestions
    const relevantSuggestions = allSuggestions
      .filter(s => 
        s.context.some(c => currentContext.includes(c)) &&
        !dismissed.has(s.id) &&
        s.path !== location.pathname
      )
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 2);

    setSuggestions(relevantSuggestions);
  }, [user, location.pathname, hasIncompleteProfile, hasOrders, dismissed]);

  // Set session start time on mount
  useEffect(() => {
    if (user && !localStorage.getItem("praieiro_session_start")) {
      localStorage.setItem("praieiro_session_start", Date.now().toString());
    }
  }, [user]);

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set([...prev, id]));
  };

  if (!user || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-40 space-y-2">
      <AnimatePresence>
        {suggestions.map((suggestion, index) => {
          const Icon = suggestion.icon;
          
          return (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card border border-border rounded-xl shadow-lg overflow-hidden"
            >
              <div className="p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Sparkles className="h-3 w-3 text-accent" />
                    <span className="text-[10px] font-medium text-accent uppercase tracking-wide">
                      Sugestão
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm text-foreground truncate">
                    {suggestion.title}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {suggestion.description}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Link to={suggestion.path}>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0 text-muted-foreground"
                    onClick={() => handleDismiss(suggestion.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
