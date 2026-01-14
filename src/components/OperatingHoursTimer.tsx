import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Store, Moon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OperatingHour {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_enabled: boolean;
}

export function OperatingHoursTimer() {
  const [operatingHours, setOperatingHours] = useState<OperatingHour[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOperatingHours();
    const interval = setInterval(() => {
      updateStatus();
      updateCurrentTime();
    }, 1000);
    updateCurrentTime();
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (operatingHours.length > 0) {
      updateStatus();
    }
  }, [operatingHours]);

  const fetchOperatingHours = async () => {
    const { data, error } = await supabase
      .from("operating_hours")
      .select("*")
      .order("day_of_week");

    if (!error && data) {
      setOperatingHours(data);
    }
    setLoading(false);
  };

  const updateCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    setCurrentTime(`${hours}:${minutes}:${seconds}`);
  };

  const updateStatus = () => {
    if (operatingHours.length === 0) return;

    const now = new Date();
    const dayOfWeek = now.getDay();
    const todayHours = operatingHours.find(h => h.day_of_week === dayOfWeek);

    if (!todayHours || !todayHours.is_enabled) {
      setIsOpen(false);
      setTimeRemaining("Fechado hoje");
      return;
    }

    const [openHour, openMin] = todayHours.open_time.split(":").map(Number);
    const [closeHour, closeMin] = todayHours.close_time.split(":").map(Number);

    const openTime = new Date(now);
    openTime.setHours(openHour, openMin, 0, 0);

    const closeTime = new Date(now);
    closeTime.setHours(closeHour, closeMin, 0, 0);

    if (now >= openTime && now < closeTime) {
      setIsOpen(true);
      const diff = closeTime.getTime() - now.getTime();
      setTimeRemaining(formatTimeRemaining(diff));
    } else if (now < openTime) {
      setIsOpen(false);
      const diff = openTime.getTime() - now.getTime();
      setTimeRemaining(`Abre em ${formatTimeRemaining(diff)}`);
    } else {
      setIsOpen(false);
      // Find next open day
      const nextDayHours = findNextOpenDay(dayOfWeek);
      if (nextDayHours) {
        const [nextOpenHour, nextOpenMin] = nextDayHours.open_time.split(":").map(Number);
        const nextOpen = new Date(now);
        const daysUntil = (nextDayHours.day_of_week - dayOfWeek + 7) % 7 || 7;
        nextOpen.setDate(nextOpen.getDate() + daysUntil);
        nextOpen.setHours(nextOpenHour, nextOpenMin, 0, 0);
        const diff = nextOpen.getTime() - now.getTime();
        setTimeRemaining(`Abre em ${formatTimeRemaining(diff)}`);
      } else {
        setTimeRemaining("Fechado");
      }
    }
  };

  const findNextOpenDay = (currentDay: number): OperatingHour | null => {
    for (let i = 1; i <= 7; i++) {
      const nextDay = (currentDay + i) % 7;
      const nextHours = operatingHours.find(h => h.day_of_week === nextDay && h.is_enabled);
      if (nextHours) return nextHours;
    }
    return null;
  };

  const formatTimeRemaining = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
    }
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  if (loading) return null;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Real-time clock */}
      <div className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
        🕐 {currentTime}
      </div>
      
      {/* Operating status badge */}
      <Badge
        variant={isOpen ? "default" : "secondary"}
        className={`flex items-center gap-1.5 px-3 py-1 ${
          isOpen 
            ? "bg-green-500 hover:bg-green-600 text-white" 
            : "bg-orange-500 hover:bg-orange-600 text-white"
        }`}
      >
        {isOpen ? (
          <>
            <Store className="h-3 w-3" />
            <span className="text-xs font-medium">Aberto</span>
            <Clock className="h-3 w-3 ml-1" />
            <span className="text-xs font-mono">{timeRemaining}</span>
          </>
        ) : (
          <>
            <Moon className="h-3 w-3" />
            <span className="text-xs font-medium">{timeRemaining}</span>
          </>
        )}
      </Badge>
    </div>
  );
}
