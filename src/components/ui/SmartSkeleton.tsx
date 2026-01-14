/**
 * SMART SKELETON COMPONENTS
 * Intelligent loading states that anticipate AI responses
 * Provides high-availability aesthetics
 * 
 * @aesthetic Minimalist and fast-loading
 */

import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SmartSkeletonProps {
  variant?: 'text' | 'card' | 'avatar' | 'chat' | 'list' | 'chart';
  lines?: number;
  className?: string;
  animated?: boolean;
  anticipateContent?: boolean;
}

const shimmer = {
  initial: { x: '-100%' },
  animate: { 
    x: '100%',
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: 'linear',
    }
  },
};

const pulseAnimation = {
  opacity: [0.4, 0.7, 0.4],
  transition: {
    repeat: Infinity,
    duration: 2,
    ease: 'easeInOut' as const,
  }
};

export function SmartSkeleton({ 
  variant = 'text', 
  lines = 3,
  className,
  animated = true,
  anticipateContent = false,
}: SmartSkeletonProps) {
  if (variant === 'chat') {
    return (
      <div className={cn('space-y-3', className)}>
        {/* AI is typing indicator */}
        <motion.div 
          className="flex items-center gap-2 text-sm text-muted-foreground"
          animate={animated ? pulseAnimation : undefined}
        >
          <div className="flex gap-1">
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-primary"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
            />
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-primary"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
            />
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-primary"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
            />
          </div>
          <span className="text-xs">Praieiro está pensando...</span>
        </motion.div>
        
        {/* Anticipated response shape */}
        {anticipateContent && (
          <motion.div 
            className="space-y-2 p-3 rounded-lg bg-muted/30"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </motion.div>
        )}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <motion.div 
        className={cn('rounded-xl border bg-card p-4 space-y-4', className)}
        animate={animated ? pulseAnimation : undefined}
      >
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </motion.div>
    );
  }

  if (variant === 'chart') {
    return (
      <motion.div 
        className={cn('rounded-xl border bg-card p-4', className)}
        animate={animated ? pulseAnimation : undefined}
      >
        <Skeleton className="h-5 w-1/3 mb-4" />
        <div className="flex items-end gap-2 h-32">
          {[0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.3].map((h, i) => (
            <motion.div
              key={i}
              className="flex-1 bg-muted rounded-t"
              initial={{ height: 0 }}
              animate={{ height: `${h * 100}%` }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <motion.div
            key={i}
            className="flex items-center gap-3 p-2 rounded-lg"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  if (variant === 'avatar') {
    return (
      <motion.div animate={animated ? pulseAnimation : undefined}>
        <Skeleton className={cn('h-12 w-12 rounded-full', className)} />
      </motion.div>
    );
  }

  // Default: text
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1 }}
        >
          <Skeleton 
            className={cn(
              'h-4',
              i === lines - 1 ? 'w-2/3' : 'w-full'
            )} 
          />
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Connection status indicator
 */
export function ConnectionIndicator({
  isConnected,
  reconnectAttempts,
  className,
}: {
  isConnected: boolean;
  reconnectAttempts?: number;
  className?: string;
}) {
  return (
    <motion.div 
      className={cn('flex items-center gap-2 text-xs', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className={cn(
          'w-2 h-2 rounded-full',
          isConnected ? 'bg-green-500' : 'bg-yellow-500'
        )}
        animate={isConnected ? {} : { scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 1 }}
      />
      <span className="text-muted-foreground">
        {isConnected 
          ? 'Conectado' 
          : `Reconectando${reconnectAttempts ? ` (${reconnectAttempts})` : '...'}`
        }
      </span>
    </motion.div>
  );
}

/**
 * Loading overlay with progress
 */
export function LoadingOverlay({
  isLoading,
  progress,
  message,
}: {
  isLoading: boolean;
  progress?: number;
  message?: string;
}) {
  if (!isLoading) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex flex-col items-center gap-4">
        <motion.div
          className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        />
        {message && (
          <p className="text-sm text-muted-foreground">{message}</p>
        )}
        {progress !== undefined && (
          <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
