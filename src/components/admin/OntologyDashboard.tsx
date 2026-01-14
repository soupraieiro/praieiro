import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useOntologyDictionary } from '@/hooks/useOntologyDictionary';
import { DictionaryManager } from './ontology/DictionaryManager';
import { ActivityTree } from './ontology/ActivityTree';
import { OrphanAlertsPanel } from './ontology/OrphanAlertsPanel';
import { TelemetryViewer } from './ontology/TelemetryViewer';
import { HealthAlertsPanel } from './ontology/HealthAlertsPanel';
import { 
  Book, 
  GitBranch, 
  AlertTriangle, 
  BarChart3, 
  Shield,
  Zap
} from 'lucide-react';

export function OntologyDashboard() {
  const {
    dictionary,
    categoryTree,
    orphanOperations,
    telemetry,
    healthLogs,
    loading,
    addOperationEntry,
    updateOperationEntry,
    deleteOperationEntry,
    resolveHealthLog,
    fetchTelemetry
  } = useOntologyDictionary();

  const [activeTab, setActiveTab] = useState('dictionary');

  const unresolvedAlerts = healthLogs.filter(log => !log.is_resolved);
  const criticalAlerts = unresolvedAlerts.filter(
    log => log.severity === 'critical' || log.severity === 'emergency'
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com métricas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Operações Catalogadas</CardTitle>
            <Book className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dictionary.length}</div>
            <p className="text-xs text-muted-foreground">
              {Object.keys(categoryTree).length} categorias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Operações Órfãs</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {orphanOperations.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Não catalogadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Alertas Ativos</CardTitle>
            <Shield className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{unresolvedAlerts.length}</span>
              {criticalAlerts.length > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {criticalAlerts.length} crítico(s)
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Pendentes de resolução
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Eventos 24h</CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {telemetry.reduce((sum, t) => sum + t.event_count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de operações
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs principais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Central de Ontologia e Atividades
          </CardTitle>
          <CardDescription>
            Gerencie o dicionário de operações, monitore telemetria e analise atividades do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="dictionary" className="flex items-center gap-2">
                <Book className="h-4 w-4" />
                <span className="hidden sm:inline">Dicionário</span>
              </TabsTrigger>
              <TabsTrigger value="tree" className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                <span className="hidden sm:inline">Árvore</span>
              </TabsTrigger>
              <TabsTrigger value="telemetry" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Telemetria</span>
              </TabsTrigger>
              <TabsTrigger value="orphans" className="relative flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">Órfãs</span>
                {orphanOperations.length > 0 && (
                  <Badge variant="destructive" className="absolute -right-1 -top-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {orphanOperations.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="health" className="relative flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Alertas</span>
                {criticalAlerts.length > 0 && (
                  <Badge variant="destructive" className="absolute -right-1 -top-1 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse">
                    !
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dictionary" className="mt-6">
              <DictionaryManager
                dictionary={dictionary}
                onAdd={addOperationEntry}
                onUpdate={updateOperationEntry}
                onDelete={deleteOperationEntry}
              />
            </TabsContent>

            <TabsContent value="tree" className="mt-6">
              <ActivityTree categoryTree={categoryTree} />
            </TabsContent>

            <TabsContent value="telemetry" className="mt-6">
              <TelemetryViewer
                telemetry={telemetry}
                onRefresh={fetchTelemetry}
              />
            </TabsContent>

            <TabsContent value="orphans" className="mt-6">
              <OrphanAlertsPanel orphanOperations={orphanOperations} />
            </TabsContent>

            <TabsContent value="health" className="mt-6">
              <HealthAlertsPanel
                healthLogs={healthLogs}
                onResolve={resolveHealthLog}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
