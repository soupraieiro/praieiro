import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  Shield, DollarSign, MapPin, Globe, Crown,
  ToggleLeft, ToggleRight, AlertCircle, Check, Lock,
  Users, TrendingUp, Bell
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface MonetizationPhase {
  id: string;
  phase_number: number;
  phase_name: string;
  description: string;
  registration_trigger: number;
  transaction_fee_cents: number;
  linear_meter_fee_cents: number;
  regional_fee_min_cents: number;
  regional_fee_max_cents: number;
  chat_sentinel_enabled: boolean;
  is_active: boolean;
  activated_at: string | null;
  satoshi_hash: string | null;
}

interface Milestone {
  id: string;
  milestone_name: string;
  target_count: number;
  phase_to_activate: number;
  reached_at: string | null;
  notified_admin: boolean;
  admin_approved: boolean;
}

const phaseIcons = [Shield, DollarSign, MapPin, Globe, Crown];
const phaseColors = ["bg-green-500", "bg-blue-500", "bg-purple-500", "bg-orange-500", "bg-amber-500"];

export function MonetizationPhasesPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [phases, setPhases] = useState<MonetizationPhase[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [totalProfiles, setTotalProfiles] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [phasesRes, milestonesRes, profilesRes] = await Promise.all([
        supabase.from("monetization_phases").select("*").order("phase_number"),
        supabase.from("registration_milestones").select("*").order("target_count"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);

      setPhases(phasesRes.data || []);
      setMilestones(milestonesRes.data || []);
      setTotalProfiles(profilesRes.count || 0);
    } catch (error) {
      console.error("Error fetching phases:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("monetization-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "monetization_phases" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "registration_milestones" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const handleActivatePhase = async (phaseNumber: number) => {
    if (!user) return;

    setActivating(phaseNumber);

    try {
      const { data, error } = await supabase.rpc("activate_monetization_phase", {
        p_phase_number: phaseNumber,
        p_admin_id: user.id,
      });

      if (error) throw error;

      toast({
        title: "Fase Ativada!",
        description: `A fase ${phaseNumber} foi ativada com sucesso.`,
      });

      fetchData();
    } catch (error) {
      console.error("Error activating phase:", error);
      toast({
        title: "Erro",
        description: "Não foi possível ativar a fase.",
        variant: "destructive",
      });
    } finally {
      setActivating(null);
    }
  };

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const currentPhase = phases.find((p) => p.is_active);
  const pendingMilestones = milestones.filter(
    (m) => m.reached_at && !m.admin_approved
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="grid grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Cadastros</p>
              <p className="text-2xl font-bold">{totalProfiles.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <Shield className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fase Atual</p>
              <p className="text-lg font-bold">{currentPhase?.phase_name || "N/A"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(pendingMilestones.length > 0 && "border-amber-500")}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center",
              pendingMilestones.length > 0 ? "bg-amber-500/20" : "bg-muted"
            )}>
              <Bell className={cn(
                "h-6 w-6",
                pendingMilestones.length > 0 ? "text-amber-500 animate-pulse" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Marcos Pendentes</p>
              <p className="text-2xl font-bold">{pendingMilestones.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Milestones Alert */}
      {pendingMilestones.length > 0 && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Ação Necessária: Marcos Atingidos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingMilestones.map((milestone) => (
              <div 
                key={milestone.id}
                className="flex items-center justify-between bg-white dark:bg-card p-3 rounded-lg"
              >
                <div>
                  <p className="font-medium">{milestone.milestone_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Atingido em {new Date(milestone.reached_at!).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Button 
                  onClick={() => handleActivatePhase(milestone.phase_to_activate)}
                  disabled={activating === milestone.phase_to_activate}
                >
                  {activating === milestone.phase_to_activate ? (
                    "Ativando..."
                  ) : (
                    <>
                      Ativar Fase {milestone.phase_to_activate}
                      <Check className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Phases Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Roadmap de Monetização
          </CardTitle>
          <CardDescription>
            Interruptores de governança para cada fase do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {phases.map((phase, index) => {
              const Icon = phaseIcons[index] || Shield;
              const colorClass = phaseColors[index] || "bg-gray-500";
              const milestone = milestones.find((m) => m.phase_to_activate === phase.phase_number);
              const canActivate = milestone?.reached_at && !phase.is_active;
              const isLocked = !milestone?.reached_at && phase.phase_number > 0;

              return (
                <motion.div
                  key={phase.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={cn(
                    "relative overflow-hidden transition-all",
                    phase.is_active && "ring-2 ring-primary",
                    isLocked && "opacity-60"
                  )}>
                    {/* Active Badge */}
                    {phase.is_active && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-green-500">Ativa</Badge>
                      </div>
                    )}

                    {/* Lock Overlay */}
                    {isLocked && (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                        <Lock className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}

                    <CardContent className="p-4 space-y-3">
                      {/* Icon & Phase Number */}
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center text-white",
                          colorClass
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Fase {phase.phase_number}</p>
                          <p className="font-semibold text-sm">{phase.phase_name}</p>
                        </div>
                      </div>

                      {/* Trigger */}
                      <div className="text-xs text-muted-foreground">
                        Gatilho: {phase.registration_trigger.toLocaleString()} cadastros
                      </div>

                      {/* Fees */}
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Taxa por transação:</span>
                          <span className="font-medium">
                            {formatCurrency(phase.transaction_fee_cents)}
                          </span>
                        </div>
                        {phase.linear_meter_fee_cents > 0 && (
                          <div className="flex justify-between">
                            <span>Taxa por metro:</span>
                            <span className="font-medium">
                              {formatCurrency(phase.linear_meter_fee_cents)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Chat Sentinel */}
                      <div className="flex items-center justify-between text-xs">
                        <span>Chat Sentinela:</span>
                        {phase.chat_sentinel_enabled ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Bloqueado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-green-600">
                            Aberto
                          </Badge>
                        )}
                      </div>

                      {/* Progress to this phase */}
                      {!phase.is_active && phase.phase_number > 0 && (
                        <div className="pt-2">
                          <Progress 
                            value={Math.min((totalProfiles / phase.registration_trigger) * 100, 100)} 
                            className="h-1"
                          />
                          <p className="text-[10px] text-center text-muted-foreground mt-1">
                            {Math.round((totalProfiles / phase.registration_trigger) * 100)}%
                          </p>
                        </div>
                      )}

                      {/* Activate Button */}
                      {canActivate && (
                        <Button
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => handleActivatePhase(phase.phase_number)}
                          disabled={activating === phase.phase_number}
                        >
                          {activating === phase.phase_number ? "Ativando..." : "Ativar Fase"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Milestones Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Marcos de Cadastro</CardTitle>
          <CardDescription>
            Acompanhe os marcos que disparam as mudanças de fase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-muted" />
            
            <div className="space-y-6">
              {milestones.map((milestone, index) => {
                const isReached = !!milestone.reached_at;
                const isApproved = milestone.admin_approved;

                return (
                  <div key={milestone.id} className="relative flex gap-4">
                    {/* Circle */}
                    <div className={cn(
                      "relative z-10 h-12 w-12 rounded-full flex items-center justify-center border-2",
                      isApproved 
                        ? "bg-green-500 border-green-500 text-white"
                        : isReached
                          ? "bg-amber-500 border-amber-500 text-white"
                          : "bg-background border-muted"
                    )}>
                      {isApproved ? (
                        <Check className="h-6 w-6" />
                      ) : isReached ? (
                        <AlertCircle className="h-6 w-6" />
                      ) : (
                        <span className="text-sm font-bold">{index + 1}</span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{milestone.milestone_name}</h4>
                        {isApproved && <Badge variant="outline" className="text-green-600">Concluído</Badge>}
                        {isReached && !isApproved && (
                          <Badge variant="outline" className="text-amber-600 animate-pulse">
                            Aguardando Aprovação
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Meta: {milestone.target_count.toLocaleString()} cadastros
                      </p>
                      <Progress 
                        value={Math.min((totalProfiles / milestone.target_count) * 100, 100)} 
                        className="h-1 mt-2 max-w-xs"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
