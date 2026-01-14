import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Activity,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ProviderHealth {
  id: string;
  provider: string;
  status: 'healthy' | 'degraded' | 'down';
  avg_latency_ms: number | null;
  total_requests: number | null;
  total_failures: number | null;
  consecutive_failures: number | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  updated_at: string;
}

interface AIProviderHealthCardProps {
  health: ProviderHealth;
}

export function AIProviderHealthCard({ health }: AIProviderHealthCardProps) {
  const statusConfig = {
    healthy: {
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
      label: 'Saudável',
      badgeVariant: 'default' as const,
    },
    degraded: {
      icon: AlertTriangle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
      label: 'Degradado',
      badgeVariant: 'secondary' as const,
    },
    down: {
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      label: 'Offline',
      badgeVariant: 'destructive' as const,
    },
  };

  const config = statusConfig[health.status] || statusConfig.healthy;
  const StatusIcon = config.icon;

  const successRate = health.total_requests && health.total_requests > 0
    ? (((health.total_requests - (health.total_failures || 0)) / health.total_requests) * 100).toFixed(1)
    : '100.0';

  const formatLatency = (ms: number | null) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${diffDays}d atrás`;
  };

  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}>
      <Card className={`${config.bgColor} ${config.borderColor} border-2`}>
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <StatusIcon className={`h-5 w-5 ${config.color}`} />
              <span className="font-semibold text-sm truncate max-w-[100px]">
                {health.provider}
              </span>
            </div>
            <Badge variant={config.badgeVariant} className="text-xs">
              {config.label}
            </Badge>
          </div>

          {/* Metrics */}
          <div className="space-y-2">
            {/* Latency */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Latência
              </span>
              <span className="font-mono">{formatLatency(health.avg_latency_ms)}</span>
            </div>

            {/* Success Rate */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Sucesso
              </span>
              <span className="font-mono flex items-center gap-1">
                {parseFloat(successRate) >= 95 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                {successRate}%
              </span>
            </div>

            {/* Total Requests */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Requisições</span>
              <span className="font-mono">
                {(health.total_requests || 0).toLocaleString()}
              </span>
            </div>

            {/* Last Activity */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
              <span className="text-muted-foreground">
                Última atividade
              </span>
              <span className={health.status === 'down' ? 'text-red-400' : 'text-muted-foreground'}>
                {formatTimeAgo(health.last_success_at || health.last_failure_at)}
              </span>
            </div>

            {/* Consecutive Failures Warning */}
            {(health.consecutive_failures || 0) > 0 && (
              <div className="flex items-center gap-1 text-xs text-yellow-500 pt-1">
                <AlertTriangle className="h-3 w-3" />
                {health.consecutive_failures} falha(s) consecutiva(s)
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
