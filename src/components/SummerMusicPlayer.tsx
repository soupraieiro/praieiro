import { useState, useEffect, useRef, useCallback } from 'react';
import { Music, X, ChevronUp, ChevronDown, SkipForward, Shuffle, GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Playlists de músicas de verão brasileiras
const SUMMER_PLAYLISTS = [
  { 
    id: 'PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG', 
    title: 'Axé Bahia',
    genre: 'Axé',
    color: 'from-orange-500 to-yellow-500'
  },
  { 
    id: 'PLDIoUOhQQPlXr63I_vwF9GD8sAKh77dWU', 
    title: 'Pagode Hits',
    genre: 'Pagode',
    color: 'from-pink-500 to-rose-500'
  },
  { 
    id: 'PLH6pfBXQXHECUaIU3bu9rjG2L6Uhl5lOB', 
    title: 'Samba de Verão',
    genre: 'Samba',
    color: 'from-green-500 to-emerald-500'
  },
  { 
    id: 'PL3oW2tjiIxvQW6c-4Iry8Bpp3QId40S5S', 
    title: 'Funk Brasil',
    genre: 'Funk',
    color: 'from-purple-500 to-violet-500'
  },
  { 
    id: 'PLkqz3S84Tw-T3_fSFZCRdSR1Nd-7U5lC7', 
    title: 'Reggae Roots',
    genre: 'Reggae',
    color: 'from-green-600 to-yellow-500'
  },
  { 
    id: 'PLgzTt0k8mXzEk586ze4BjvDXR7c-TUSnx', 
    title: 'Pop Brasileiro',
    genre: 'Pop',
    color: 'from-blue-500 to-cyan-500'
  },
  { 
    id: 'PLF4qIL3xo1R0Vqj1L4N-jtL8Zz-XK7mEj', 
    title: 'Hip Hop BR',
    genre: 'Hip Hop',
    color: 'from-gray-700 to-gray-500'
  },
];

interface SummerMusicPlayerProps {
  embedded?: boolean;
}

export function SummerMusicPlayer({ embedded = false }: SummerMusicPlayerProps) {
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [position, setPosition] = useState({ x: 72, y: window.innerHeight - 180 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  // Shuffle playlist on mount
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * SUMMER_PLAYLISTS.length);
    setCurrentPlaylistIndex(randomIndex);
  }, []);

  // Handle drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  }, [position]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      posX: position.x,
      posY: position.y,
    };
  }, [position]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const newX = Math.max(0, Math.min(window.innerWidth - 200, dragStartRef.current.posX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, dragStartRef.current.posY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.x;
      const dy = touch.clientY - dragStartRef.current.y;
      const newX = Math.max(0, Math.min(window.innerWidth - 200, dragStartRef.current.posX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, dragStartRef.current.posY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => setIsDragging(false);
    const handleTouchEnd = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  const currentPlaylist = SUMMER_PLAYLISTS[currentPlaylistIndex];

  const nextPlaylist = () => {
    setCurrentPlaylistIndex((prev) => (prev + 1) % SUMMER_PLAYLISTS.length);
  };

  const shufflePlaylist = () => {
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * SUMMER_PLAYLISTS.length);
    } while (newIndex === currentPlaylistIndex);
    setCurrentPlaylistIndex(newIndex);
  };

  // Embedded version for the wallet
  if (embedded) {
    return (
      <div className="rounded-xl overflow-hidden border border-border bg-gradient-to-br from-card to-muted">
        {/* Header */}
        <div className="p-2 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className={`h-6 w-6 rounded-lg bg-gradient-to-br ${currentPlaylist.color} flex items-center justify-center`}>
              <Music className="h-3 w-3 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-foreground flex items-center gap-1">
                Som do Verão
                <Badge variant="outline" className="text-[8px] px-1">
                  {currentPlaylist.genre}
                </Badge>
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={shufflePlaylist}
              title="Mudar playlist"
            >
              <Shuffle className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={nextPlaylist}
              title="Próxima playlist"
            >
              <SkipForward className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Player */}
        <div className="h-[140px]">
          <iframe 
            key={currentPlaylist.id}
            title="summer-music-player" 
            src={`https://www.youtube.com/embed/videoseries?list=${currentPlaylist.id}&autoplay=0&loop=1`}
            width="100%" 
            height="100%" 
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="bg-black"
          />
        </div>

        {/* Genre Pills */}
        <div className="p-1.5 border-t border-border/50 flex gap-0.5 overflow-x-auto scrollbar-hide">
          {SUMMER_PLAYLISTS.map((playlist, index) => (
            <button
              key={playlist.id}
              onClick={() => setCurrentPlaylistIndex(index)}
              className={`px-1.5 py-0.5 rounded-full text-[8px] font-medium whitespace-nowrap transition-all ${
                index === currentPlaylistIndex
                  ? `bg-gradient-to-r ${playlist.color} text-white`
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {playlist.genre}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Floating version - Draggable
  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        className={`fixed bottom-4 left-[72px] z-40 rounded-full h-12 w-12 p-0 bg-gradient-to-br ${currentPlaylist.color} shadow-lg hover:scale-105 transition-transform`}
        title="Abrir player de música"
      >
        <Music className="h-5 w-5 text-white" />
      </Button>
    );
  }

  return (
    <div 
      ref={dragRef}
      style={{ 
        left: position.x, 
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'auto'
      }}
      className={`fixed z-40 bg-card border border-border rounded-lg shadow-lg transition-shadow duration-300 ${
        isMinimized ? 'w-44' : 'w-48'
      } ${isDragging ? 'shadow-2xl' : ''}`}
    >
      {/* Compact Header with drag handle */}
      <div 
        className={`p-1.5 border-b border-border flex items-center justify-between rounded-t-lg bg-gradient-to-r ${currentPlaylist.color}`}
      >
        {/* Drag handle */}
        <div 
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="flex items-center gap-1 cursor-grab active:cursor-grabbing"
        >
          <GripHorizontal className="h-3 w-3 text-white/70" />
          <div className="h-5 w-5 rounded bg-white/20 flex items-center justify-center backdrop-blur">
            <Music className="h-2.5 w-2.5 text-white" />
          </div>
          <Badge className="text-[6px] px-1 py-0 bg-white/20 text-white border-0">
            {currentPlaylist.genre}
          </Badge>
        </div>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 text-white hover:bg-white/20"
            onClick={shufflePlaylist}
          >
            <Shuffle className="h-2 w-2" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 text-white hover:bg-white/20"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 text-white/80 hover:text-white hover:bg-white/20"
            onClick={() => setIsVisible(false)}
          >
            <X className="h-2.5 w-2.5" />
          </Button>
        </div>
      </div>

      {/* Compact Player */}
      <div className={`overflow-hidden transition-all duration-300 ${isMinimized ? 'h-0' : 'h-[100px]'}`}>
        <iframe 
          key={currentPlaylist.id}
          title="summer-music-floating" 
          src={`https://www.youtube.com/embed/videoseries?list=${currentPlaylist.id}&autoplay=0&loop=1`}
          width="100%" 
          height="100" 
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="bg-black pointer-events-auto"
        />
      </div>

      {/* Genre Pills (only when expanded) */}
      {!isMinimized && (
        <div className="p-1 border-t border-border flex gap-0.5 overflow-x-auto scrollbar-hide">
          {SUMMER_PLAYLISTS.map((playlist, index) => (
            <button
              key={playlist.id}
              onClick={() => setCurrentPlaylistIndex(index)}
              className={`px-1 py-0.5 rounded-full text-[7px] font-medium whitespace-nowrap transition-all ${
                index === currentPlaylistIndex
                  ? `bg-gradient-to-r ${playlist.color} text-white`
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {playlist.genre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
