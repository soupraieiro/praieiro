import { useState, useEffect } from "react";
import { MapPin, Wifi, WifiOff, AlertTriangle, CheckCircle2, QrCode, Loader2, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProximityStatus } from "@/hooks/useRadarTracking";
import { Progress } from "@/components/ui/progress";

interface ProximitySignalIndicatorProps {
  proximityStatus: ProximityStatus;
  isChecking?: boolean;
  showDetails?: boolean;
  onRetry?: () => void;
  className?: string;
}

const THRESHOLD_APPROVED = 3;
const THRESHOLD_QR = 10;

export function ProximitySignalIndicator({
  proximityStatus,
  isChecking = false,
  showDetails = true,
  onRetry,
  className,
}: ProximitySignalIndicatorProps) {
  const [pulseAnimation, setPulseAnimation] = useState(false);

  // Pulse animation when checking
  useEffect(() => {
    if (isChecking || proximityStatus.verdict === "CHECKING") {
      setPulseAnimation(true);
    } else {
      setPulseAnimation(false);
    }
  }, [isChecking, proximityStatus.verdict]);

  // Calculate signal strength (0-100) based on distance
  const getSignalStrength = (): number => {
    if (proximityStatus.distanceMeters < 0) return 0;
    if (proximityStatus.distanceMeters <= THRESHOLD_APPROVED) return 100;
    if (proximityStatus.distanceMeters <= THRESHOLD_QR) {
      // Linear interpolation between 50-100 for 3-10m range
      return 100 - ((proximityStatus.distanceMeters - THRESHOLD_APPROVED) / (THRESHOLD_QR - THRESHOLD_APPROVED)) * 50;
    }
    // Below 50 for distances > 10m
    return Math.max(0, 50 - ((proximityStatus.distanceMeters - THRESHOLD_QR) / 20) * 50);
  };

  const signalStrength = getSignalStrength();

  // Get visual configuration based on verdict
  const getVerdictConfig = () => {
    switch (proximityStatus.verdict) {
      case "APPROVED":
        return {
          icon: CheckCircle2,
          color: "text-green-500",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/30",
          progressColor: "bg-green-500",
          label: "Proximidade Verificada",
        };
      case "QR_REQUIRED":
        return {
          icon: QrCode,
          color: "text-amber-500",
          bgColor: "bg-amber-500/10",
          borderColor: "border-amber-500/30",
          progressColor: "bg-amber-500",
          label: "QR Code Necessário",
        };
      case "GEOGRAPHIC_INCONSISTENCY":
        return {
          icon: AlertTriangle,
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
          progressColor: "bg-red-500",
          label: "Fora do Alcance",
        };
      case "POOR_SIGNAL":
        return {
          icon: WifiOff,
          color: "text-orange-500",
          bgColor: "bg-orange-500/10",
          borderColor: "border-orange-500/30",
          progressColor: "bg-orange-500",
          label: "Sinal GPS Fraco",
        };
      case "COORDINATES_REQUIRED":
        return {
          icon: MapPin,
          color: "text-muted-foreground",
          bgColor: "bg-muted/50",
          borderColor: "border-muted",
          progressColor: "bg-muted-foreground",
          label: "GPS Desativado",
        };
      case "CHECKING":
        return {
          icon: Loader2,
          color: "text-primary",
          bgColor: "bg-primary/10",
          borderColor: "border-primary/30",
          progressColor: "bg-primary",
          label: "Verificando...",
        };
      case "ERROR":
        return {
          icon: AlertTriangle,
          color: "text-destructive",
          bgColor: "bg-destructive/10",
          borderColor: "border-destructive/30",
          progressColor: "bg-destructive",
          label: "Erro",
        };
      default:
        return {
          icon: Wifi,
          color: "text-muted-foreground",
          bgColor: "bg-muted/50",
          borderColor: "border-muted",
          progressColor: "bg-muted-foreground",
          label: "Aguardando...",
        };
    }
  };

  const config = getVerdictConfig();
  const Icon = config.icon;

  // Format distance display
  const formatDistance = (meters: number): string => {
    if (meters < 0) return "--";
    if (meters < 1) return "< 1m";
    if (meters < 1000) return `${meters.toFixed(1)}m`;
    return `${(meters / 1000).toFixed(2)}km`;
  };

  // Calculate remaining distance to threshold
  const getRemainingDistance = (): string => {
    if (proximityStatus.distanceMeters <= THRESHOLD_APPROVED) return "✓";
    const remaining = proximityStatus.distanceMeters - THRESHOLD_APPROVED;
    return `-${remaining.toFixed(1)}m`;
  };

  return (
    <div className={cn(
      "rounded-xl border-2 p-4 transition-all duration-300",
      config.bgColor,
      config.borderColor,
      pulseAnimation && "animate-pulse",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-2 rounded-full",
            config.bgColor
          )}>
            <Icon className={cn(
              "h-5 w-5",
              config.color,
              proximityStatus.verdict === "CHECKING" && "animate-spin"
            )} />
          </div>
          <div>
            <p className={cn("font-semibold text-sm", config.color)}>
              {config.label}
            </p>
            {proximityStatus.distanceMeters >= 0 && (
              <p className="text-xs text-muted-foreground">
                Distância: {formatDistance(proximityStatus.distanceMeters)}
              </p>
            )}
          </div>
        </div>

        {/* Signal strength indicator */}
        <div className="flex items-center gap-1">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-1.5 rounded-full transition-all duration-300",
                i === 0 ? "h-2" : i === 1 ? "h-3" : i === 2 ? "h-4" : "h-5",
                signalStrength >= (i + 1) * 25 ? config.progressColor : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Progress bar showing distance to threshold */}
      {proximityStatus.verdict !== "IDLE" && proximityStatus.verdict !== "CHECKING" && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0m</span>
            <span className="font-medium">{THRESHOLD_APPROVED}m</span>
            <span>{THRESHOLD_QR}m</span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            {/* Threshold markers */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-green-500 z-10"
              style={{ left: `${(THRESHOLD_APPROVED / THRESHOLD_QR) * 100}%` }}
            />
            {/* Current position */}
            <div 
              className={cn(
                "h-full transition-all duration-500 rounded-full",
                config.progressColor
              )}
              style={{ 
                width: `${Math.min(100, (proximityStatus.distanceMeters / THRESHOLD_QR) * 100)}%` 
              }}
            />
          </div>
        </div>
      )}

      {/* Detailed message */}
      {showDetails && proximityStatus.message && (
        <p className="mt-3 text-sm text-center text-muted-foreground">
          {proximityStatus.message}
        </p>
      )}

      {/* Accuracy info */}
      {showDetails && proximityStatus.clientAccuracy > 0 && (
        <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Navigation className="h-3 w-3" />
            <span>Precisão: ±{proximityStatus.clientAccuracy.toFixed(0)}m</span>
          </div>
          {proximityStatus.verdict === "APPROVED" && (
            <span className="text-green-500 font-medium">
              {getRemainingDistance()}
            </span>
          )}
        </div>
      )}

      {/* Retry button */}
      {onRetry && (proximityStatus.verdict === "ERROR" || proximityStatus.verdict === "POOR_SIGNAL") && (
        <button
          onClick={onRetry}
          className={cn(
            "mt-3 w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors",
            "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          Tentar Novamente
        </button>
      )}
    </div>
  );
}
