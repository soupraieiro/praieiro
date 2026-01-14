import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Settings,
  Save,
  RefreshCw,
  Loader2,
  DollarSign,
  MapPin,
  Gauge,
  Rocket,
  Shield,
  AlertTriangle,
  Hash,
  Clock,
  Zap
} from "lucide-react";

// Match exact Supabase schema
interface ProtocolParameter {
  param_id: string;
  param_key: string;
  param_name: string;
  param_value: number;
  param_unit: string | null;
  category: string;
  description: string | null;
  min_value: number | null;
  max_value: number | null;
  is_ai_adjustable: boolean | null;
  ai_adjustment_reason: string | null;
  last_ai_adjustment: string | null;
  updated_by: string | null;
  checksum: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  financial: <DollarSign className="h-5 w-5" />,
  geofencing: <MapPin className="h-5 w-5" />,
  performance: <Gauge className="h-5 w-5" />,
  phase: <Rocket className="h-5 w-5" />,
  security: <Shield className="h-5 w-5" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  financial: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  geofencing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  performance: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  phase: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  security: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const PHASE_NAMES: Record<number, string> = {
  1: "Gênese",
  2: "Atração",
  3: "Sustento",
  4: "Tokenização",
};

export function ProtocolParametersPanel() {
  const [parameters, setParameters] = useState<ProtocolParameter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, number>>({});

  useEffect(() => {
    loadParameters();

    // Realtime subscription
    const channel = supabase
      .channel("protocol-params-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "protocol_parameters" },
        () => {
          loadParameters();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadParameters = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("protocol_parameters")
        .select("*")
        .order("category", { ascending: true })
        .order("param_key", { ascending: true });

      if (error) throw error;

      // Transform to match our interface
      const transformed: ProtocolParameter[] = (data || []).map((p) => ({
        param_id: p.param_id,
        param_key: p.param_key,
        param_name: p.param_name,
        param_value: p.param_value,
        param_unit: p.param_unit,
        category: p.category,
        description: p.description,
        min_value: p.min_value,
        max_value: p.max_value,
        is_ai_adjustable: p.is_ai_adjustable,
        ai_adjustment_reason: p.ai_adjustment_reason,
        last_ai_adjustment: p.last_ai_adjustment,
        updated_by: p.updated_by,
        checksum: p.checksum,
        created_at: p.created_at,
        updated_at: p.updated_at,
      }));

      setParameters(transformed);

      // Initialize edit values
      const initialValues: Record<string, number> = {};
      transformed.forEach((p) => {
        initialValues[p.param_key] = p.param_value;
      });
      setEditValues(initialValues);
    } catch (error) {
      console.error("Error loading parameters:", error);
      toast.error("Erro ao carregar parâmetros");
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (key: string, value: number) => {
    setEditValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleAIAdjustable = async (param: ProtocolParameter) => {
    try {
      const { error } = await supabase
        .from("protocol_parameters")
        .update({ is_ai_adjustable: !param.is_ai_adjustable })
        .eq("param_id", param.param_id);

      if (error) throw error;

      toast.success(
        `IA ${!param.is_ai_adjustable ? "habilitada" : "desabilitada"} para ${param.param_name}`
      );
      loadParameters();
    } catch (error) {
      console.error("Error toggling AI adjustable:", error);
      toast.error("Erro ao alterar configuração");
    }
  };

  const saveParameter = async (param: ProtocolParameter) => {
    const newValue = editValues[param.param_key];

    if (newValue === param.param_value) {
      toast.info("Valor não alterado");
      return;
    }

    // Validate min/max
    if (param.min_value !== null && newValue < param.min_value) {
      toast.error(`Valor mínimo: ${param.min_value}`);
      return;
    }
    if (param.max_value !== null && newValue > param.max_value) {
      toast.error(`Valor máximo: ${param.max_value}`);
      return;
    }

    try {
      setSaving(param.param_key);

      const { error } = await supabase
        .from("protocol_parameters")
        .update({
          param_value: newValue,
          updated_by: "admin",
          updated_at: new Date().toISOString(),
        })
        .eq("param_id", param.param_id);

      if (error) throw error;

      toast.success(`${param.param_name} atualizado com sucesso!`);
      loadParameters();
    } catch (error) {
      console.error("Error saving parameter:", error);
      toast.error("Erro ao salvar parâmetro");
    } finally {
      setSaving(null);
    }
  };

  const formatValue = (value: number, unit: string | null, key: string): string => {
    if (key.includes("fee")) {
      return `R$ ${value.toFixed(2)}`;
    }
    if (key.includes("radius")) {
      return `${value}m`;
    }
    if (key.includes("phase")) {
      return PHASE_NAMES[value] || `Fase ${value}`;
    }
    if (unit) {
      return `${value} ${unit}`;
    }
    return value.toString();
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "Nunca";
    return new Date(dateString).toLocaleString("pt-BR");
  };

  const groupedParameters = parameters.reduce(
    (acc, param) => {
      if (!acc[param.category]) acc[param.category] = [];
      acc[param.category].push(param);
      return acc;
    },
    {} as Record<string, ProtocolParameter[]>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Central de Parâmetros do Protocolo
          </h2>
          <p className="text-muted-foreground">
            Governança Satoshi - Matriz de Poder
          </p>
        </div>
        <Button variant="outline" onClick={loadParameters} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Warning Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Atenção - Poder de Deus</AlertTitle>
        <AlertDescription>
          Alterações nestes parâmetros afetam GLOBALMENTE todos os cálculos financeiros e
          operações do sistema. Cada modificação é registrada no Ledger Satoshi.
        </AlertDescription>
      </Alert>

      {/* Current Phase Indicator */}
      {parameters.find((p) => p.param_key === "current_phase") && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/20">
                  <Rocket className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fase Atual do Protocolo</p>
                  <p className="text-3xl font-bold text-primary">
                    {
                      PHASE_NAMES[
                        parameters.find((p) => p.param_key === "current_phase")
                          ?.param_value || 1
                      ]
                    }
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((phase) => (
                  <div
                    key={phase}
                    className={`w-3 h-3 rounded-full ${
                      phase <=
                      (parameters.find((p) => p.param_key === "current_phase")
                        ?.param_value || 1)
                        ? "bg-primary"
                        : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parameters by Category */}
      <div className="grid gap-6 lg:grid-cols-2">
        {Object.entries(groupedParameters).map(([category, categoryParams]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 capitalize">
                <div className={`p-2 rounded-lg ${CATEGORY_COLORS[category] || "bg-muted"}`}>
                  {CATEGORY_ICONS[category] || <Settings className="h-5 w-5" />}
                </div>
                {category}
              </CardTitle>
              <CardDescription>
                {categoryParams.length} parâmetro(s) configurável(is)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[400px] pr-4">
                <div className="space-y-6">
                  {categoryParams.map((param) => (
                    <div key={param.param_id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">{param.param_name}</Label>
                          {param.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {param.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            IA
                          </span>
                          <Switch
                            checked={param.is_ai_adjustable ?? false}
                            onCheckedChange={() => handleToggleAIAdjustable(param)}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <Input
                            type="number"
                            value={editValues[param.param_key] ?? param.param_value}
                            onChange={(e) =>
                              handleValueChange(param.param_key, parseFloat(e.target.value) || 0)
                            }
                            step={param.param_key.includes("fee") ? 0.01 : 1}
                            min={param.min_value ?? undefined}
                            max={param.max_value ?? undefined}
                            className="font-mono"
                          />
                        </div>
                        <Badge variant="outline" className="min-w-[80px] justify-center">
                          {formatValue(
                            editValues[param.param_key] ?? param.param_value,
                            param.param_unit,
                            param.param_key
                          )}
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => saveParameter(param)}
                          disabled={
                            saving === param.param_key ||
                            editValues[param.param_key] === param.param_value
                          }
                        >
                          {saving === param.param_key ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {/* Min/Max Range */}
                      {(param.min_value !== null || param.max_value !== null) && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Intervalo:</span>
                          <span className="font-mono">
                            [{param.min_value ?? "-∞"} ~ {param.max_value ?? "+∞"}]
                          </span>
                        </div>
                      )}

                      {/* Last Adjusted Info */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {param.updated_by && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {param.updated_by} em {formatTime(param.updated_at)}
                          </span>
                        )}
                        {param.checksum && (
                          <span className="flex items-center gap-1 font-mono">
                            <Hash className="h-3 w-3" />
                            {param.checksum.slice(0, 12)}...
                          </span>
                        )}
                      </div>

                      <Separator />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Parâmetros</p>
                <p className="text-2xl font-bold">{parameters.length}</p>
              </div>
              <Settings className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">IA Habilitada</p>
                <p className="text-2xl font-bold">
                  {parameters.filter((p) => p.is_ai_adjustable).length}
                </p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Categorias</p>
                <p className="text-2xl font-bold">{Object.keys(groupedParameters).length}</p>
              </div>
              <Shield className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa Serviço</p>
                <p className="text-2xl font-bold">
                  R${" "}
                  {(
                    parameters.find((p) => p.param_key === "service_fee_base")?.param_value || 0
                  ).toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500/30" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
