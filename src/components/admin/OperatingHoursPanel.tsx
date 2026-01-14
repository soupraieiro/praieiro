import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Clock, Save } from "lucide-react";

interface OperatingHour {
  id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_enabled: boolean;
}

const DAY_NAMES = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado"
];

export function OperatingHoursPanel() {
  const [hours, setHours] = useState<OperatingHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchHours();
  }, []);

  const fetchHours = async () => {
    const { data, error } = await supabase
      .from("operating_hours")
      .select("*")
      .order("day_of_week");

    if (error) {
      toast.error("Erro ao carregar horários");
    } else {
      setHours(data || []);
    }
    setLoading(false);
  };

  const handleTimeChange = (id: string, field: "open_time" | "close_time", value: string) => {
    setHours(prev => prev.map(h => 
      h.id === id ? { ...h, [field]: value } : h
    ));
  };

  const handleEnabledChange = (id: string, enabled: boolean) => {
    setHours(prev => prev.map(h => 
      h.id === id ? { ...h, is_enabled: enabled } : h
    ));
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      for (const hour of hours) {
        const { error } = await supabase
          .from("operating_hours")
          .update({
            open_time: hour.open_time,
            close_time: hour.close_time,
            is_enabled: hour.is_enabled,
            updated_at: new Date().toISOString()
          })
          .eq("id", hour.id);

        if (error) throw error;
      }
      toast.success("Horários atualizados com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar horários");
    } finally {
      setSaving(false);
    }
  };

  const applyToAll = (openTime: string, closeTime: string) => {
    setHours(prev => prev.map(h => ({
      ...h,
      open_time: openTime,
      close_time: closeTime
    })));
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Horário de Funcionamento
        </CardTitle>
        <CardDescription>
          Configure os horários de abertura e fechamento da plataforma para vendas.
          A carteira digital funciona 24h.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyToAll("05:00", "18:30")}
          >
            Aplicar padrão (05:00 - 18:30)
          </Button>
        </div>

        <div className="space-y-4">
          {hours.map((hour) => (
            <div 
              key={hour.id}
              className={`flex items-center gap-4 p-4 rounded-lg border ${
                hour.is_enabled ? "bg-card" : "bg-muted/50 opacity-60"
              }`}
            >
              <div className="w-32">
                <Label className="font-medium">{DAY_NAMES[hour.day_of_week]}</Label>
              </div>
              
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Abre:</Label>
                <Input
                  type="time"
                  value={hour.open_time.slice(0, 5)}
                  onChange={(e) => handleTimeChange(hour.id, "open_time", e.target.value)}
                  className="w-28"
                  disabled={!hour.is_enabled}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Fecha:</Label>
                <Input
                  type="time"
                  value={hour.close_time.slice(0, 5)}
                  onChange={(e) => handleTimeChange(hour.id, "close_time", e.target.value)}
                  className="w-28"
                  disabled={!hour.is_enabled}
                />
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <Label className="text-sm text-muted-foreground">Ativo:</Label>
                <Switch
                  checked={hour.is_enabled}
                  onCheckedChange={(checked) => handleEnabledChange(hour.id, checked)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <Button onClick={saveChanges} disabled={saving} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
