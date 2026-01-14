import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ShieldAlert,
  CheckCircle2,
  Clock
} from 'lucide-react';
import type { HealthLog } from '@/hooks/useOntologyDictionary';

interface HealthAlertsPanelProps {
  healthLogs: HealthLog[];
  onResolve: (logId: string) => Promise<void>;
}

const SEVERITY_CONFIG = {
  info: {
    icon: Info,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    label: 'Info'
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    label: 'Aviso'
  },
  critical: {
    icon: AlertCircle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    label: 'Crítico'
  },
  emergency: {
    icon: ShieldAlert,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    label: 'Emergência'
  }
};

export function HealthAlertsPanel({ healthLogs, onResolve }: HealthAlertsPanelProps) {
  const [showResolved, setShowResolved] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const filteredLogs = showResolved 
    ? healthLogs 
    : healthLogs.filter(log => !log.is_resolved);

  const handleResolve = async (logId: string) => {
    setResolvingId(logId);
    try {
      await onResolve(logId);
    } finally {
      setResolvingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const unresolvedCount = healthLogs.filter(l => !l.is_resolved).length;
  const criticalCount = healthLogs.filter(
    l => !l.is_resolved && (l.severity === 'critical' || l.severity === 'emergency')
  ).length;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(SEVERITY_CONFIG).map(([severity, config]) => {
          const Icon = config.icon;
          const count = healthLogs.filter(
            l => l.severity === severity && !l.is_resolved
          ).length;
          
          return (
            <Card key={severity} className={`${config.borderColor} border`}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`p-2 rounded-full ${config.bgColor}`}>
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs text-muted-foreground">{config.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Critical alert banner */}
      {criticalCount > 0 && (
        <Card className="border-red-500 bg-red-500/5">
          <CardContent className="flex items-center gap-4 p-4">
            <ShieldAlert className="h-8 w-8 text-red-500 animate-pulse" />
            <div>
              <h3 className="font-semibold text-red-500">
                {criticalCount} Alerta(s) Crítico(s) Pendente(s)
              </h3>
              <p className="text-sm text-muted-foreground">
                Requer atenção imediata do administrador
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Logs de Saúde do Sistema
              </CardTitle>
              <CardDescription>
                Alertas e anomalias detectadas pelo Praieiro OPS
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-resolved"
                checked={showResolved}
                onCheckedChange={setShowResolved}
              />
              <Label htmlFor="show-resolved" className="text-sm">
                Mostrar resolvidos
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-green-500">
                Sistema Saudável
              </h3>
              <p className="text-muted-foreground mt-2">
                {showResolved 
                  ? 'Nenhum log de saúde registrado'
                  : 'Nenhum alerta pendente. Todos os problemas foram resolvidos.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => {
                const config = SEVERITY_CONFIG[log.severity];
                const Icon = config.icon;
                
                return (
                  <div
                    key={log.id}
                    className={`p-4 rounded-lg border ${config.borderColor} ${config.bgColor} ${
                      log.is_resolved ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold">{log.title}</h4>
                          <Badge variant="outline" className={config.color}>
                            {config.label}
                          </Badge>
                          {log.source_component && (
                            <Badge variant="secondary" className="text-xs">
                              {log.source_component}
                            </Badge>
                          )}
                          {log.is_resolved && (
                            <Badge variant="default" className="bg-green-500">
                              Resolvido
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {log.message}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(log.created_at)}
                          </span>
                          {log.satoshi_hash && (
                            <span className="font-mono">
                              Hash: {log.satoshi_hash.slice(0, 12)}...
                            </span>
                          )}
                        </div>
                      </div>
                      {!log.is_resolved && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolve(log.id)}
                          disabled={resolvingId === log.id}
                        >
                          {resolvingId === log.id ? 'Resolvendo...' : 'Resolver'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
