import { Shield, ShieldAlert, ShieldCheck, Loader2, MapPin, Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { formatDistance } from "@/hooks/useProximityVerification";

interface ProximityIndicatorProps {
  distanceMeters: number | null;
  clientAccuracy: number | null;
  vendorAccuracy: number | null;
  maxAllowed?: number;
  isVerifying?: boolean;
  isVerified?: boolean;
  className?: string;
}

export function ProximityIndicator({
  distanceMeters,
  clientAccuracy,
  vendorAccuracy,
  maxAllowed = 30,
  isVerifying = false,
  isVerified = false,
  className,
}: ProximityIndicatorProps) {
  // Calcular margem efetiva (distância + precisões)
  const effectiveMargin = maxAllowed + (clientAccuracy ?? 0) + (vendorAccuracy ?? 0);
  const isWithinRange = distanceMeters !== null && distanceMeters <= effectiveMargin;

  // Determinar status visual
  const getStatus = () => {
    if (isVerifying) return "verifying";
    if (distanceMeters === null) return "unknown";
    if (isVerified && isWithinRange) return "verified";
    if (isWithinRange) return "in_range";
    return "out_of_range";
  };

  const status = getStatus();

  const statusConfig = {
    verifying: {
      icon: Loader2,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50 border-yellow-200",
      label: "Verificando...",
      iconClass: "animate-spin",
    },
    unknown: {
      icon: MapPin,
      color: "text-muted-foreground",
      bgColor: "bg-muted/50 border-muted",
      label: "Aguardando localização",
      iconClass: "",
    },
    in_range: {
      icon: Crosshair,
      color: "text-blue-600",
      bgColor: "bg-blue-50 border-blue-200",
      label: "Dentro do alcance",
      iconClass: "",
    },
    verified: {
      icon: ShieldCheck,
      color: "text-green-600",
      bgColor: "bg-green-50 border-green-200",
      label: "Proximidade Verificada",
      iconClass: "",
    },
    out_of_range: {
      icon: ShieldAlert,
      color: "text-red-600",
      bgColor: "bg-red-50 border-red-200",
      label: "Fora do alcance",
      iconClass: "",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-all duration-300",
        config.bgColor,
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-full", config.bgColor)}>
          <Icon className={cn("h-6 w-6", config.color, config.iconClass)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("font-semibold", config.color)}>{config.label}</span>
            {isVerified && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                PoP
              </Badge>
            )}
          </div>

          {distanceMeters !== null && (
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span>
                Distância: <strong className={config.color}>{formatDistance(distanceMeters)}</strong>
              </span>
              {clientAccuracy !== null && (
                <span>Cliente: ±{Math.round(clientAccuracy)}m</span>
              )}
              {vendorAccuracy !== null && (
                <span>Vendedor: ±{Math.round(vendorAccuracy)}m</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Barra de proximidade visual */}
      {distanceMeters !== null && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>0m</span>
            <span>{maxAllowed}m (limite)</span>
            <span>{Math.round(effectiveMargin)}m (margem)</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden relative">
            {/* Zona permitida */}
            <div
              className="absolute h-full bg-green-200"
              style={{ width: `${Math.min(100, (maxAllowed / effectiveMargin) * 100)}%` }}
            />
            {/* Zona de margem */}
            <div
              className="absolute h-full bg-yellow-200"
              style={{
                left: `${Math.min(100, (maxAllowed / effectiveMargin) * 100)}%`,
                width: `${100 - Math.min(100, (maxAllowed / effectiveMargin) * 100)}%`,
              }}
            />
            {/* Indicador de posição */}
            <div
              className={cn(
                "absolute top-0 w-1 h-full transition-all duration-300",
                isWithinRange ? "bg-green-600" : "bg-red-600"
              )}
              style={{
                left: `${Math.min(100, (distanceMeters / effectiveMargin) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
