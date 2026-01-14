import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coffee, Store, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface DayOffToggleProps {
  onModeChange?: (isDayOff: boolean) => void;
}

export function DayOffToggle({ onModeChange }: DayOffToggleProps) {
  const { user } = useAuth();
  const [isDayOff, setIsDayOff] = useState(false);
  const [isVendor, setIsVendor] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkVendorStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check if user is a vendor
        const { data: vendorData } = await supabase
          .from("vendors")
          .select("profile_id, status")
          .eq("profile_id", user.id)
          .maybeSingle();

        if (vendorData) {
          setIsVendor(true);
          
          // Check current day off status from profile or localStorage
          const savedStatus = localStorage.getItem(`praieiro_dayoff_${user.id}`);
          if (savedStatus === "true") {
            setIsDayOff(true);
            onModeChange?.(true);
          }
        }
      } catch (error) {
        console.error("Error checking vendor status:", error);
      } finally {
        setLoading(false);
      }
    };

    checkVendorStatus();
  }, [user, onModeChange]);

  const handleToggle = async (checked: boolean) => {
    if (!user) return;

    setIsDayOff(checked);
    
    // Persist to localStorage
    localStorage.setItem(`praieiro_dayoff_${user.id}`, String(checked));
    
    // Notify parent
    onModeChange?.(checked);

    // Log event to Satoshi (best effort, don't block UX)
    (async () => {
      try {
        await supabase.from("satoshi_events").insert({
          idempotency_key: `DAYOFF_${user.id}_${Date.now()}`,
          event_type: checked ? "PRAIEIRO_DAY_OFF_ENABLED" : "PRAIEIRO_DAY_OFF_DISABLED",
          payload: {
            user_id: user.id,
            timestamp: new Date().toISOString(),
            mode: checked ? "cliente" : "vendedor"
          },
          currency: "ZIMBU",
          sequence: Date.now()
        } as any);
      } catch (err) {
        console.error("Error logging day off event:", err);
      }
    })();

    toast.success(
      checked 
        ? "🏖️ Modo Folga ativado! Agora você navega como cliente." 
        : "🦸 Modo Herói ativado! Volte a vender na plataforma."
    );
  };

  // Don't show if not a vendor or still loading
  if (loading || !isVendor) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isDayOff ? (
              <Coffee className="h-5 w-5 text-amber-500" />
            ) : (
              <Store className="h-5 w-5 text-primary" />
            )}
            <CardTitle className="text-base">Modo de Operação</CardTitle>
          </div>
          <Badge 
            variant={isDayOff ? "secondary" : "default"}
            className={isDayOff ? "bg-amber-500/20 text-amber-700 border-amber-500/30" : ""}
          >
            {isDayOff ? "🏖️ De Folga" : "🦸 Vendendo"}
          </Badge>
        </div>
        <CardDescription>
          {isDayOff 
            ? "Navegando como cliente - você pode comprar de outros Praieiros!"
            : "Modo vendedor ativo - clientes podem te encontrar na plataforma."
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Label htmlFor="day-off-mode" className="text-sm font-medium cursor-pointer">
            Tô de Folga
          </Label>
          <Switch
            id="day-off-mode"
            checked={isDayOff}
            onCheckedChange={handleToggle}
            className="data-[state=checked]:bg-amber-500"
          />
        </div>
        
        {isDayOff && (
          <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
              <Sparkles className="h-4 w-4" />
              <span>Aproveite para explorar! Compre de outros heróis da praia.</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
