import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Shell, Wallet, TrendingUp, Sparkles, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MonetizationPhase {
  phase_number: number;
  phase_name: string;
  description: string;
  registration_trigger: number;
  is_active: boolean;
}

interface DailyAccess {
  access_count: number;
  conchas_earned: number;
}

interface GamificationData {
  totalProfiles: number;
  currentPhase: MonetizationPhase | null;
  nextPhase: MonetizationPhase | null;
  dailyAccess: DailyAccess | null;
  conchasBalance: number;
}

export function GamificationProgress() {
  const { user } = useAuth();
  const [data, setData] = useState<GamificationData>({
    totalProfiles: 0,
    currentPhase: null,
    nextPhase: null,
    dailyAccess: null,
    conchasBalance: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch all data in parallel
      const [profilesRes, phasesRes, accessRes, conchasRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("monetization_phases").select("*").order("phase_number"),
        supabase
          .from("user_daily_access")
          .select("access_count, conchas_earned")
          .eq("user_id", user.id)
          .eq("access_date", new Date().toISOString().split("T")[0])
          .single(),
        supabase
          .from("client_conchas")
          .select("balance")
          .eq("client_id", user.id)
          .single(),
      ]);

      const phases = phasesRes.data || [];
      const currentPhase = phases.find((p) => p.is_active) || null;
      const nextPhase = currentPhase 
        ? phases.find((p) => p.phase_number === currentPhase.phase_number + 1) || null
        : null;

      setData({
        totalProfiles: profilesRes.count || 0,
        currentPhase,
        nextPhase,
        dailyAccess: accessRes.data || null,
        conchasBalance: conchasRes.data?.balance || 0,
      });

      // Register daily access
      await supabase.rpc("register_daily_access", { p_user_id: user.id });

    } catch (error) {
      console.error("Error fetching gamification data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !user) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { totalProfiles, currentPhase, nextPhase, dailyAccess, conchasBalance } = data;
  
  // Calculate progress to next phase
  const currentTarget = currentPhase?.registration_trigger || 0;
  const nextTarget = nextPhase?.registration_trigger || 100000;
  const progressToNextPhase = Math.min(
    ((totalProfiles - currentTarget) / (nextTarget - currentTarget)) * 100,
    100
  );

  // Calculate progress to next Concha
  const accessCount = dailyAccess?.access_count || 0;
  const progressToConcha = (accessCount % 10) * 10;
  const nextConchaIn = 10 - (accessCount % 10);

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-primary" />
          Progresso Satoshi
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-5">
        {/* Current Phase */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Fase Atual</span>
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
              {currentPhase?.phase_name || "Crescimento Puro"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {currentPhase?.description || "Fase 100% gratuita - Chat aberto para negociação direta"}
          </p>
        </div>

        {/* Progress to Wallet */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5">
              <Wallet className="h-4 w-4 text-amber-500" />
              <span>Abertura da Carteira Digital</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {totalProfiles.toLocaleString()} / {nextTarget.toLocaleString()}
            </span>
          </div>
          <Progress value={progressToNextPhase} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            Faltam {(nextTarget - totalProfiles).toLocaleString()} cadastros para a próxima fase
          </p>
        </div>

        {/* Conchas Counter */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shell className="h-5 w-5 text-amber-600" />
              <span className="font-semibold">Suas Conchas</span>
            </div>
            <motion.span 
              key={conchasBalance}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-2xl font-bold text-amber-600"
            >
              {conchasBalance}
            </motion.span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Próxima Concha</span>
              <span className="text-amber-600 font-medium">
                {nextConchaIn} {nextConchaIn === 1 ? "acesso" : "acessos"}
              </span>
            </div>
            <Progress value={progressToConcha} className="h-1.5 bg-amber-200 dark:bg-amber-900">
              <div 
                className="h-full bg-amber-500 transition-all" 
                style={{ width: `${progressToConcha}%` }}
              />
            </Progress>
          </div>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
            <Sparkles className="h-3 w-3" />
            <span>A cada 10 acessos = 1 Concha</span>
          </div>
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="bg-muted/50 rounded-lg p-3 text-center cursor-help">
                <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-500" />
                <p className="text-lg font-bold">{accessCount}</p>
                <p className="text-xs text-muted-foreground">Acessos Hoje</p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Seus acessos únicos hoje na plataforma</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="bg-muted/50 rounded-lg p-3 text-center cursor-help">
                <Shell className="h-4 w-4 mx-auto mb-1 text-amber-500" />
                <p className="text-lg font-bold">{dailyAccess?.conchas_earned || 0}</p>
                <p className="text-xs text-muted-foreground">Ganhas Hoje</p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Conchas ganhas hoje com seus acessos</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}
