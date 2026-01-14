import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, VolumeX, X } from "lucide-react";
import { PlasmaSphere } from "./PlasmaSphere";

interface MiniPlayerProps {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  videoTitle: string | null;
  videoThumbnail?: string | null;
  isInteractiveMode: boolean;
  onTogglePlay: () => void;
  onVolumeChange: (value: number[]) => void;
  onToggleMute: () => void;
  onClose: () => void;
  onExpand: () => void;
}

export function MiniPlayer({
  isPlaying,
  isMuted,
  volume,
  videoTitle,
  videoThumbnail,
  isInteractiveMode,
  onTogglePlay,
  onVolumeChange,
  onToggleMute,
  onClose,
  onExpand,
}: MiniPlayerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.95 }}
      className="fixed bottom-20 md:bottom-4 right-4 z-50"
    >
      <div 
        className="flex items-center gap-3 px-3 py-2.5 rounded-2xl shadow-2xl border border-orange-500/40"
        style={{
          background: "linear-gradient(135deg, rgba(15,12,10,0.98) 0%, rgba(35,20,12,0.98) 100%)",
          backdropFilter: "blur(16px)",
          minWidth: "320px",
        }}
      >
        {/* Mini Plasma Sphere */}
        <div className="flex-shrink-0 cursor-pointer" onClick={onExpand}>
          <PlasmaSphere
            isLoggedIn={true}
            isPlaying={isPlaying}
            isSpeaking={false}
            isInteractiveMode={isInteractiveMode}
            size="small"
            showLabel={false}
          />
        </div>

        {/* Video Thumbnail */}
        {videoThumbnail && (
          <div className="flex-shrink-0 w-14 h-10 rounded-lg overflow-hidden border border-orange-500/30">
            <img 
              src={videoThumbnail} 
              alt={videoTitle || "Video"} 
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Play/Pause Button */}
        {videoTitle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onTogglePlay}
            className="text-orange-300 hover:text-orange-100 hover:bg-orange-500/20 h-9 w-9 flex-shrink-0"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>
        )}

        {/* Volume Controls */}
        {videoTitle && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleMute}
              className="h-7 w-7 text-orange-400/70 hover:text-orange-200 p-0 flex-shrink-0"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              onValueChange={onVolumeChange}
              max={100}
              step={1}
              className="flex-1 max-w-[80px]"
            />
          </div>
        )}

        {/* Title (if no video, show Praieiro Bot) */}
        {!videoTitle && (
          <div className="flex-1 min-w-0">
            <p className="text-sm text-orange-100 truncate font-medium">Praieiro Bot</p>
            <p className="text-[10px] text-orange-400/60">
              {isInteractiveMode ? "🎤 Modo interativo" : "Assistente"}
            </p>
          </div>
        )}

        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-orange-400/60 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0 h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
