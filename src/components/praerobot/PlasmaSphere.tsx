import { motion } from "framer-motion";
import { Lock, Music, Mic } from "lucide-react";
import logoPraieiro from "@/assets/logo-praieiro-circle.png";

interface PlasmaSphereProps {
  isLoggedIn: boolean;
  isPlaying: boolean;
  isSpeaking: boolean;
  isInteractiveMode: boolean;
  audioLevel?: number;
  size?: "small" | "medium" | "large";
  onClick?: () => void;
  showLabel?: boolean;
}

export function PlasmaSphere({
  isLoggedIn,
  isPlaying,
  isSpeaking,
  isInteractiveMode,
  audioLevel = 0,
  size = "medium",
  onClick,
  showLabel = true,
}: PlasmaSphereProps) {
  const sizeClasses = {
    small: "h-12 w-12",
    medium: "h-16 w-16",
    large: "h-20 w-20",
  };

  const plasmaIntensity = isPlaying ? 1.4 : 1;
  const audioIntensity = 1 + (audioLevel * 0.5);

  return (
    <div className="relative flex flex-col items-center">
      {/* Label "Praieiro Bot" */}
      {showLabel && (
        <motion.span
          className="absolute -top-8 left-1/2 -translate-x-1/2 text-[11px] font-bold tracking-wider whitespace-nowrap z-10"
          animate={{
            opacity: [0.7, 1, 0.7],
            scale: isPlaying ? [1, 1.02, 1] : 1,
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            color: isLoggedIn ? "#ff8c00" : "#888",
            textShadow: isLoggedIn 
              ? "0 0 10px rgba(255, 140, 0, 0.9), 0 0 20px rgba(255, 100, 0, 0.6)"
              : "none",
          }}
        >
          Praieiro Bot
        </motion.span>
      )}

      <button
        onClick={onClick}
        className="relative group flex items-center justify-center"
        title={isLoggedIn ? "Praieiro Bot" : "Faça login para usar"}
      >
        {/* Sound Wave Rings - React to audio */}
        {isLoggedIn && (isPlaying || isSpeaking) && (
          <>
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={`wave-${i}`}
                className="absolute rounded-full border-2 border-orange-500/30"
                animate={{
                  scale: [1, 1.5 + (i * 0.3) * audioIntensity, 1],
                  opacity: [0.4, 0, 0.4],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeOut",
                }}
                style={{
                  width: size === "small" ? 48 : size === "medium" ? 64 : 80,
                  height: size === "small" ? 48 : size === "medium" ? 64 : 80,
                }}
              />
            ))}
          </>
        )}

        {/* Outer Plasma Aura */}
        <motion.div
          className="absolute inset-[-18px] rounded-full"
          animate={{
            scale: [1, 1.25 * plasmaIntensity * audioIntensity, 1.15 * plasmaIntensity, 1],
            rotate: [0, 180, 360],
            opacity: [0.5, 0.25, 0.4, 0.5],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          style={{
            background: isLoggedIn 
              ? "conic-gradient(from 0deg, rgba(255,100,0,0.6), rgba(200,60,0,0.4), rgba(255,140,0,0.6), rgba(180,50,0,0.4), rgba(255,100,0,0.6))"
              : "radial-gradient(circle, rgba(150,150,150,0.3) 0%, rgba(100,100,100,0.1) 50%, transparent 70%)",
            filter: "blur(14px)",
          }}
        />
        
        {/* Middle Plasma Ring - Rotating */}
        <motion.div
          className="absolute inset-[-12px] rounded-full"
          animate={{
            scale: [1.05, 1.35 * plasmaIntensity * audioIntensity, 1.2 * plasmaIntensity, 1.05],
            rotate: [360, 180, 0],
            opacity: [0.55, 0.3, 0.45, 0.55],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background: isLoggedIn 
              ? "conic-gradient(from 90deg, rgba(255,80,0,0.7), transparent, rgba(255,120,0,0.7), transparent, rgba(255,80,0,0.7))"
              : "radial-gradient(circle, rgba(180,180,180,0.4) 0%, rgba(120,120,120,0.2) 60%, transparent 80%)",
            filter: "blur(10px)",
          }}
        />
        
        {/* Inner Plasma Ring - Pulsing */}
        <motion.div
          className="absolute inset-[-5px] rounded-full"
          animate={{
            scale: [1, 1.18 * plasmaIntensity * audioIntensity, 1.1 * plasmaIntensity, 1],
            opacity: [0.75, 0.45, 0.6, 0.75],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
          style={{
            background: isLoggedIn
              ? "radial-gradient(circle, rgba(255,140,0,0.8) 0%, rgba(220,80,0,0.5) 60%, transparent 80%)"
              : "radial-gradient(circle, rgba(180,180,180,0.4) 0%, rgba(120,120,120,0.2) 60%, transparent 80%)",
            filter: "blur(5px)",
          }}
        />
        
        {/* Solar Core - Pure Sun Ball with Logo */}
        <motion.div
          className={`relative ${sizeClasses[size]} rounded-full flex items-center justify-center overflow-hidden`}
          animate={{
            scale: [1, 1.08 * audioIntensity, 1.04, 1],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background: isLoggedIn
              ? "radial-gradient(circle at 35% 35%, #ffcc00 0%, #ff8c00 40%, #d85000 70%, #b33d00 100%)"
              : "radial-gradient(circle at 35% 35%, #aaa 0%, #888 40%, #666 70%, #444 100%)",
            boxShadow: isLoggedIn
              ? `
                0 0 30px rgba(255, 140, 0, 0.95),
                0 0 60px rgba(255, 100, 0, 0.7),
                0 0 100px rgba(200, 60, 0, 0.5),
                inset 0 0 25px rgba(255, 200, 0, 0.4)
              `
              : "0 0 15px rgba(150, 150, 150, 0.5)",
          }}
        >
          {/* Solar Flare Effect */}
          {isLoggedIn && (
            <>
              <motion.div
                className="absolute inset-2 rounded-full"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  background: "radial-gradient(circle at 30% 30%, rgba(255, 220, 100, 0.5) 0%, transparent 60%)",
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                style={{
                  background: "conic-gradient(from 0deg, transparent 0%, rgba(255, 180, 50, 0.15) 10%, transparent 20%, rgba(255, 140, 0, 0.1) 30%, transparent 40%)",
                }}
              />
            </>
          )}
          
          {/* Logo */}
          <img 
            src={logoPraieiro} 
            alt="Praieiro Bot" 
            className="h-2/3 w-2/3 object-contain relative z-10"
          />
          
          {/* Lock for non-logged users */}
          {!isLoggedIn && (
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center z-20">
              <Lock className="h-6 w-6 text-white/80" />
            </div>
          )}
        </motion.div>

        {/* Playing indicator */}
        {isPlaying && isLoggedIn && (
          <motion.div
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-green-500 flex items-center justify-center z-20"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{ boxShadow: "0 0 12px rgba(34, 197, 94, 0.7)" }}
          >
            <Music className="h-3 w-3 text-white" />
          </motion.div>
        )}

        {/* Interactive mode indicator */}
        {isInteractiveMode && isLoggedIn && (
          <motion.div
            className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center z-20"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            style={{ boxShadow: "0 0 12px rgba(59, 130, 246, 0.7)" }}
          >
            <Mic className="h-3 w-3 text-white" />
          </motion.div>
        )}
      </button>
    </div>
  );
}
