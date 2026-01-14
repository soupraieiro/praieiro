import { motion } from "framer-motion";
import { Play, Pause } from "lucide-react";

interface VideoCardProps {
  videoId: string;
  title: string;
  thumbnail?: string;
  isCurrentlyPlaying: boolean;
  onPlay: () => void;
}

export function VideoCard({
  videoId,
  title,
  thumbnail,
  isCurrentlyPlaying,
  onPlay,
}: VideoCardProps) {
  const thumbnailUrl = thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

  return (
    <motion.div 
      className="rounded-xl overflow-hidden border border-orange-500/25 bg-black/60 cursor-pointer hover:border-orange-500/50 transition-colors"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onPlay}
      whileHover={{ scale: 1.02 }}
      style={{ boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)" }}
    >
      <div className="relative aspect-video">
        <img 
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          {isCurrentlyPlaying ? (
            <motion.div
              className="flex flex-col items-center gap-2"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div className="h-12 w-12 rounded-full bg-green-500/90 flex items-center justify-center">
                <Pause className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs text-white font-medium bg-black/50 px-2 py-1 rounded-full flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                </span>
                Tocando agora
              </span>
            </motion.div>
          ) : (
            <motion.div
              className="h-12 w-12 rounded-full bg-orange-600/90 flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
              style={{ boxShadow: "0 4px 20px rgba(255, 100, 0, 0.5)" }}
            >
              <Play className="h-6 w-6 text-white ml-1" />
            </motion.div>
          )}
        </div>
      </div>
      <div className="p-3 bg-black/80">
        <p className="text-sm text-white font-medium truncate">{title}</p>
      </div>
    </motion.div>
  );
}
