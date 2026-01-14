import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { MapPin, Loader2 } from "lucide-react";

interface RequestVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: {
    id: string;
    full_name: string;
    product_category: string;
  };
  onSuccess: (orderId: string) => void;
}

export function RequestVendorDialog({ open, onOpenChange, vendor, onSuccess }: RequestVendorDialogProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const getLocation = async () => {
    setIsGettingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      toast.success("Localização capturada!");
    } catch (error) {
      console.error("Error getting location:", error);
      toast.error("Não foi possível obter sua localização");
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    setIsSubmitting(true);
    try {
      // Get client ID
      // CORRECT: profiles.id = auth.users.id (identidade soberana)
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) {
        toast.error("Perfil de cliente não encontrado");
        return;
      }

      // Check if client exists
      const { data: clientData } = await supabase
        .from("clients")
        .select("profile_id")
        .eq("profile_id", profile.id)
        .maybeSingle();

      if (!clientData) {
        toast.error("Perfil de cliente não encontrado");
        return;
      }

      // Create order
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          client_id: profile.id,
          vendor_id: vendor.id,
          client_latitude: location?.latitude,
          client_longitude: location?.longitude,
          message: message.trim() || null,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Pedido enviado! O ambulante receberá sua solicitação.");
      onOpenChange(false);
      setMessage("");
      setLocation(null);
      
      if (order) {
        onSuccess(order.id);
      }
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Erro ao enviar pedido");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chamar {vendor.full_name}</DialogTitle>
          <DialogDescription>
            {vendor.product_category}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Location */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sua localização</label>
            {location ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">Localização compartilhada</span>
              </div>
            ) : (
              <Button
                onClick={getLocation}
                disabled={isGettingLocation}
                variant="outline"
                className="w-full"
              >
                {isGettingLocation ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4 mr-2" />
                )}
                {isGettingLocation ? "Obtendo localização..." : "Compartilhar minha localização"}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Sua localização será compartilhada apenas com este ambulante.
            </p>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Mensagem (opcional)</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex: Estou perto do quiosque azul..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-accent hover:bg-accent/90"
          >
            {isSubmitting ? "Enviando..." : "Enviar pedido"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
