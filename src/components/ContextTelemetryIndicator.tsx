/**
 * CONTEXT TELEMETRY INDICATOR
 * Subtle real-time display of weather, financial, and connection status
 * Shows the system is "alive" and connected to user's reality
 */

import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  Zap, 
  Snowflake, 
  CloudFog,
  TrendingUp, 
  TrendingDown,
  Wifi,
  WifiOff,
  MapPin,
  Thermometer,
  DollarSign,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextTelemetryProps {
  weather?: {
    condition: string;
    temperature: number;
    description: string;
  };
  financial?: {
    btcPrice: number;
    btcChange24h: number;
    localCurrency: string;
    currencySymbol: string;
  };
  location?: {
    city?: string;
    region?: string;
  };
  isConnected?: boolean;
  latency?: number;
  className?: string;
  variant?: 'minimal' | 'compact' | 'full';
}

const weatherIcons: Record<string, React.ElementType> = {
  sunny: Sun,
  clear: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  stormy: Zap,
  snowy: Snowflake,
  foggy: CloudFog,
};

const ContextTelemetryIndicator = memo(function ContextTelemetryIndicator({
  weather,
  financial,
  location,
  isConnected = true,
  latency = 0,
  className,
  variant = 'compact',
}: ContextTelemetryProps) {
  const [pulse, setPulse] = useState(false);

  // Pulse animation on data update
  useEffect(() => {
    setPulse(true);
    const timer = setTimeout(() => setPulse(false), 1000);
    return () => clearTimeout(timer);
  }, [weather?.temperature, financial?.btcPrice]);

  const WeatherIcon = weather?.condition 
    ? weatherIcons[weather.condition] || Cloud 
    : Cloud;

  const btcTrend = financial?.btcChange24h ?? 0;
  const isPositive = btcTrend >= 0;

  // Latency indicator color
  const getLatencyColor = () => {
    if (latency < 50) return 'text-green-500';
    if (latency < 150) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (variant === 'minimal') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          'flex items-center gap-2 text-xs text-muted-foreground',
          className
        )}
      >
        {/* Connection status dot */}
        <motion.div
          animate={{ scale: pulse ? [1, 1.2, 1] : 1 }}
          className={cn(
            'w-2 h-2 rounded-full',
            isConnected ? 'bg-green-500' : 'bg-red-500'
          )}
        />
        
        {weather && (
          <span className="flex items-center gap-1">
            <WeatherIcon className="h-3 w-3" />
            {weather.temperature.toFixed(0)}°
          </span>
        )}

        {financial && (
          <span className={cn(
            'flex items-center gap-0.5',
            isPositive ? 'text-green-500' : 'text-red-500'
          )}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(btcTrend).toFixed(1)}%
          </span>
        )}
      </motion.div>
    );
  }

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex items-center gap-3 px-3 py-1.5 rounded-full',
          'bg-background/80 backdrop-blur-sm border border-border/50',
          'text-xs shadow-sm',
          className
        )}
      >
        {/* Weather */}
        {weather && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <WeatherIcon className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">{weather.temperature.toFixed(0)}°C</span>
          </div>
        )}

        {/* Divider */}
        {weather && financial && (
          <div className="w-px h-3 bg-border" />
        )}

        {/* Financial */}
        {financial && financial.btcPrice > 0 && (
          <div className={cn(
            'flex items-center gap-1',
            isPositive ? 'text-green-600' : 'text-red-600'
          )}>
            <DollarSign className="h-3 w-3" />
            <span className="font-mono text-[10px]">
              {(financial.btcPrice / 1000).toFixed(1)}k
            </span>
            <span className="flex items-center">
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(btcTrend).toFixed(1)}%
            </span>
          </div>
        )}

        {/* Connection indicator */}
        <div className={cn('flex items-center gap-1', getLatencyColor())}>
          {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {latency > 0 && (
            <span className="text-[10px] font-mono">{latency}ms</span>
          )}
        </div>

        {/* Live pulse */}
        <motion.div
          animate={{ 
            opacity: [0.5, 1, 0.5],
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="w-1.5 h-1.5 rounded-full bg-green-500"
        />
      </motion.div>
    );
  }

  // Full variant
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col gap-2 p-3 rounded-lg',
        'bg-background/90 backdrop-blur-md border border-border/50',
        'shadow-lg',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Contexto Global
        </span>
        <motion.div
          animate={{ 
            opacity: [0.5, 1, 0.5],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex items-center gap-1"
        >
          <Activity className="h-3 w-3 text-green-500" />
          <span className="text-[10px] text-green-500">LIVE</span>
        </motion.div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Weather Card */}
        {weather && (
          <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
            <div className="p-1.5 rounded-full bg-primary/10">
              <WeatherIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">
                {weather.temperature.toFixed(0)}°C
              </span>
              <span className="text-[10px] text-muted-foreground capitalize">
                {weather.description}
              </span>
            </div>
          </div>
        )}

        {/* Financial Card */}
        {financial && financial.btcPrice > 0 && (
          <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
            <div className={cn(
              'p-1.5 rounded-full',
              isPositive ? 'bg-green-500/10' : 'bg-red-500/10'
            )}>
              {isPositive 
                ? <TrendingUp className="h-4 w-4 text-green-600" />
                : <TrendingDown className="h-4 w-4 text-red-600" />
              }
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold font-mono">
                ${(financial.btcPrice / 1000).toFixed(1)}k
              </span>
              <span className={cn(
                'text-[10px] font-medium',
                isPositive ? 'text-green-600' : 'text-red-600'
              )}>
                {isPositive ? '+' : ''}{btcTrend.toFixed(2)}% 24h
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Location & Connection Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border/30">
        {location && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {location.city && <span>{location.city}</span>}
            {location.region && <span>, {location.region}</span>}
          </div>
        )}

        <div className={cn('flex items-center gap-1.5', getLatencyColor())}>
          {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          <span className="text-[10px] font-mono">
            {isConnected ? `${latency}ms` : 'Offline'}
          </span>
        </div>
      </div>
    </motion.div>
  );
});

export default ContextTelemetryIndicator;
