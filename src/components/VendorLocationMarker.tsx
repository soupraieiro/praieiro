import { cn } from "@/lib/utils";

interface VendorLocationMarkerProps {
  heading: number | null;
  speed: number | null;
  accuracyRadius: number | null;
  freshness: "fresh" | "recent" | "stale" | "outdated";
  isSelected?: boolean;
  size?: "sm" | "md" | "lg";
}

/**
 * Marcador de vendedor com rotação baseada em azimute
 * e indicação visual de precisão e frescor
 */
export function VendorLocationMarker({
  heading,
  speed,
  accuracyRadius,
  freshness,
  isSelected = false,
  size = "md",
}: VendorLocationMarkerProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
  };

  const freshnessColors = {
    fresh: "bg-green-500 border-green-400",
    recent: "bg-yellow-500 border-yellow-400",
    stale: "bg-orange-500 border-orange-400",
    outdated: "bg-gray-500 border-gray-400",
  };

  const pulseClasses = {
    fresh: "animate-pulse",
    recent: "",
    stale: "opacity-75",
    outdated: "opacity-50",
  };

  const isMoving = speed !== null && speed > 0.5; // > 0.5 m/s

  return (
    <div className="relative flex items-center justify-center">
      {/* Círculo de precisão (accuracy radius) */}
      {accuracyRadius !== null && (
        <div
          className={cn(
            "absolute rounded-full border-2 border-dashed opacity-30",
            freshnessColors[freshness]
          )}
          style={{
            width: `${Math.max(40, accuracyRadius * 2)}px`,
            height: `${Math.max(40, accuracyRadius * 2)}px`,
          }}
        />
      )}

      {/* Marcador principal */}
      <div
        className={cn(
          "relative rounded-full flex items-center justify-center shadow-lg border-2 transition-all duration-300",
          sizeClasses[size],
          freshnessColors[freshness],
          pulseClasses[freshness],
          isSelected && "ring-4 ring-primary/50 scale-110"
        )}
        style={{
          transform: heading !== null ? `rotate(${heading}deg)` : undefined,
        }}
      >
        {/* Ícone */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size === "sm" ? 16 : size === "md" ? 20 : 28}
          height={size === "sm" ? 16 : size === "md" ? 20 : 28}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            // Contra-rotação para manter ícone legível
            transform: heading !== null ? `rotate(${-heading}deg)` : undefined,
          }}
        >
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>

        {/* Indicador de direção (seta) */}
        {heading !== null && isMoving && (
          <div className="absolute -top-1 left-1/2 -translate-x-1/2">
            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-white" />
          </div>
        )}
      </div>

      {/* Indicador de movimento */}
      {isMoving && (
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 text-xs whitespace-nowrap">
          <span className="bg-background/80 rounded px-1 py-0.5 text-muted-foreground">
            {speed && speed >= 1 
              ? `${(speed * 3.6).toFixed(1)} km/h` 
              : `${speed?.toFixed(1)} m/s`}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Gera o HTML para um marcador Mapbox
 */
export function createVendorMarkerHTML(
  heading: number | null,
  speed: number | null,
  freshness: "fresh" | "recent" | "stale" | "outdated"
): string {
  const freshnessColors = {
    fresh: "#22c55e",
    recent: "#eab308",
    stale: "#f97316",
    outdated: "#6b7280",
  };

  const isMoving = speed !== null && speed > 0.5;
  const rotation = heading !== null ? `transform: rotate(${heading}deg);` : "";
  const iconRotation = heading !== null ? `transform: rotate(${-heading}deg);` : "";

  return `
    <div style="
      width: 40px;
      height: 40px;
      background: ${freshnessColors[freshness]};
      border: 2px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3);
      ${rotation}
      cursor: pointer;
      transition: transform 0.3s;
    ">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="20" 
        height="20" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="white" 
        stroke-width="2" 
        stroke-linecap="round" 
        stroke-linejoin="round"
        style="${iconRotation}"
      >
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <path d="M16 10a4 4 0 0 1-8 0"></path>
      </svg>
      ${isMoving && heading !== null ? `
        <div style="
          position: absolute;
          top: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-bottom: 8px solid white;
        "></div>
      ` : ''}
    </div>
  `;
}
