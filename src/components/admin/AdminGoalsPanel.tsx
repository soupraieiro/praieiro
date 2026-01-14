import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Target, 
  Plus, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  Store,
  Star,
  Trash2,
  Edit2
} from "lucide-react";

interface Goal {
  id: string;
  month: string;
  goal_type: string;
  goal_name: string;
  target_value: number;
  current_value: number;
  unit: string;
}

const GOAL_TYPES = [
  { value: "financial", label: "Financeiro", icon: DollarSign, color: "text-green-500" },
  { value: "evaluation", label: "Avaliação", icon: Star, color: "text-yellow-500" },
  { value: "client_adhesion", label: "Adesão de Clientes", icon: Users, color: "text-blue-500" },
  { value: "vendor_adhesion", label: "Adesão de Vendedores", icon: Store, color: "text-purple-500" },
  { value: "orders", label: "Pedidos", icon: TrendingUp, color: "text-orange-500" },
];

export function AdminGoalsPanel() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState({
    month: new Date().toISOString().slice(0, 7),
    goal_type: "financial",
    goal_name: "",
    target_value: 0,
    unit: "count"
  });

  useEffect(() => {
    loadGoals();
    loadCurrentValues();
  }, []);

  const loadGoals = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_goals")
        .select("*")
        .order("month", { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error("Error loading goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentValues = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const startOfMonth = `${currentMonth}-01`;
      const endOfMonth = new Date(new Date(startOfMonth).setMonth(new Date(startOfMonth).getMonth() + 1)).toISOString().split("T")[0];

      // Get current values for different metrics
      const [clientsRes, vendorsRes, ordersRes, revenueRes] = await Promise.all([
        supabase.from("clients").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth).lt("created_at", endOfMonth),
        supabase.from("vendors").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth).lt("created_at", endOfMonth),
        supabase.from("orders").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth).lt("created_at", endOfMonth),
        supabase.from("orders").select("total_amount").gte("created_at", startOfMonth).lt("created_at", endOfMonth).eq("status", "completed")
      ]);

      const revenue = revenueRes.data?.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) || 0;

      // Update goals with current values
      const { data: currentGoals } = await supabase
        .from("admin_goals")
        .select("*")
        .eq("month", startOfMonth);

      for (const goal of currentGoals || []) {
        let currentValue = 0;
        switch (goal.goal_type) {
          case "client_adhesion":
            currentValue = clientsRes.count || 0;
            break;
          case "vendor_adhesion":
            currentValue = vendorsRes.count || 0;
            break;
          case "orders":
            currentValue = ordersRes.count || 0;
            break;
          case "financial":
            currentValue = revenue;
            break;
        }

        if (currentValue !== goal.current_value) {
          await supabase
            .from("admin_goals")
            .update({ current_value: currentValue })
            .eq("id", goal.id);
        }
      }

      loadGoals();
    } catch (error) {
      console.error("Error loading current values:", error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.goal_name || formData.target_value <= 0) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const goalData = {
        ...formData,
        month: `${formData.month}-01`,
        current_value: 0
      };

      if (editingGoal) {
        const { error } = await supabase
          .from("admin_goals")
          .update(goalData)
          .eq("id", editingGoal.id);

        if (error) throw error;
        toast.success("Meta atualizada!");
      } else {
        const { error } = await supabase
          .from("admin_goals")
          .insert(goalData);

        if (error) throw error;
        toast.success("Meta criada!");
      }

      setDialogOpen(false);
      setEditingGoal(null);
      setFormData({
        month: new Date().toISOString().slice(0, 7),
        goal_type: "financial",
        goal_name: "",
        target_value: 0,
        unit: "count"
      });
      loadGoals();
    } catch (error) {
      console.error("Error saving goal:", error);
      toast.error("Erro ao salvar meta");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("admin_goals")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Meta excluída!");
      loadGoals();
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast.error("Erro ao excluir meta");
    }
  };

  const openEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      month: goal.month.slice(0, 7),
      goal_type: goal.goal_type,
      goal_name: goal.goal_name,
      target_value: goal.target_value,
      unit: goal.unit
    });
    setDialogOpen(true);
  };

  const getGoalIcon = (type: string) => {
    const goalType = GOAL_TYPES.find(t => t.value === type);
    if (!goalType) return Target;
    return goalType.icon;
  };

  const getGoalColor = (type: string) => {
    const goalType = GOAL_TYPES.find(t => t.value === type);
    return goalType?.color || "text-primary";
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === "currency") {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    }
    if (unit === "percentage") {
      return `${value}%`;
    }
    return value.toLocaleString("pt-BR");
  };

  const getProgress = (goal: Goal) => {
    if (goal.target_value === 0) return 0;
    return Math.min((goal.current_value / goal.target_value) * 100, 100);
  };

  const isGoalNegative = (goal: Goal) => {
    return getProgress(goal) < 50;
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader><div className="h-5 bg-muted rounded w-1/3" /></CardHeader>
        <CardContent><div className="h-48 bg-muted rounded" /></CardContent>
      </Card>
    );
  }

  const currentMonthGoals = goals.filter(g => g.month.startsWith(new Date().toISOString().slice(0, 7)));
  const previousGoals = goals.filter(g => !g.month.startsWith(new Date().toISOString().slice(0, 7)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Metas do Mês
          </h2>
          <p className="text-muted-foreground">Defina e acompanhe suas metas mensais</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingGoal(null); setFormData({ month: new Date().toISOString().slice(0, 7), goal_type: "financial", goal_name: "", target_value: 0, unit: "count" }); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Meta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGoal ? "Editar Meta" : "Nova Meta"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Mês</Label>
                <Input 
                  type="month" 
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                />
              </div>
              <div>
                <Label>Tipo de Meta</Label>
                <Select value={formData.goal_type} onValueChange={(v) => setFormData({ ...formData, goal_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className={`h-4 w-4 ${type.color}`} />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nome da Meta</Label>
                <Input 
                  placeholder="Ex: Faturamento mensal"
                  value={formData.goal_name}
                  onChange={(e) => setFormData({ ...formData, goal_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor Alvo</Label>
                  <Input 
                    type="number"
                    min={0}
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Unidade</Label>
                  <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="count">Quantidade</SelectItem>
                      <SelectItem value="currency">Moeda (R$)</SelectItem>
                      <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full" onClick={handleSubmit}>
                {editingGoal ? "Salvar Alterações" : "Criar Meta"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Month Goals */}
      {currentMonthGoals.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {currentMonthGoals.map((goal) => {
            const GoalIcon = getGoalIcon(goal.goal_type);
            const progress = getProgress(goal);
            const isNegative = isGoalNegative(goal);

            return (
              <Card key={goal.id} className={isNegative ? "border-destructive/50" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GoalIcon className={`h-5 w-5 ${getGoalColor(goal.goal_type)}`} />
                      <CardTitle className="text-sm">{goal.goal_name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(goal)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(goal.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className={`font-medium ${isNegative ? "text-destructive" : "text-green-600"}`}>
                        {progress.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={progress} className={isNegative ? "[&>div]:bg-destructive" : ""} />
                    <div className="flex justify-between text-sm">
                      <span>
                        {isNegative ? (
                          <TrendingDown className="inline h-4 w-4 text-destructive mr-1" />
                        ) : (
                          <TrendingUp className="inline h-4 w-4 text-green-600 mr-1" />
                        )}
                        {formatValue(goal.current_value, goal.unit)}
                      </span>
                      <span className="text-muted-foreground">
                        de {formatValue(goal.target_value, goal.unit)}
                      </span>
                    </div>
                  </div>
                  {isNegative && (
                    <Badge variant="destructive" className="mt-2">
                      Atenção: Meta em risco
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma meta definida para este mês</p>
            <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar primeira meta
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Previous Goals */}
      {previousGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Metas</CardTitle>
            <CardDescription>Metas de meses anteriores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {previousGoals.slice(0, 10).map((goal) => {
                const GoalIcon = getGoalIcon(goal.goal_type);
                const progress = getProgress(goal);
                const achieved = progress >= 100;

                return (
                  <div key={goal.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <GoalIcon className={`h-5 w-5 ${getGoalColor(goal.goal_type)}`} />
                      <div>
                        <p className="font-medium text-sm">{goal.goal_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(goal.month).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatValue(goal.current_value, goal.unit)} / {formatValue(goal.target_value, goal.unit)}
                        </p>
                        <p className="text-xs text-muted-foreground">{progress.toFixed(0)}%</p>
                      </div>
                      <Badge variant={achieved ? "default" : "secondary"}>
                        {achieved ? "Atingida" : "Não atingida"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
