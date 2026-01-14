import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { OrphanOperation } from '@/hooks/useOntologyDictionary';

interface OrphanAlertsPanelProps {
  orphanOperations: OrphanOperation[];
}

export function OrphanAlertsPanel({ orphanOperations }: OrphanAlertsPanelProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (orphanOperations.length === 0) {
    return (
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold text-green-500">
            Nenhuma Atividade Órfã Detectada
          </h3>
          <p className="text-muted-foreground text-center mt-2 max-w-md">
            Todas as operações registradas no Ledger Satoshi estão catalogadas no dicionário.
            O sistema está operando de forma governada.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>⚠️ ATIVIDADES NÃO CATALOGADAS</AlertTitle>
        <AlertDescription>
          Foram detectadas {orphanOperations.length} operações no Ledger cujos prefixos não estão 
          registrados no dicionário. Isso pode indicar atividades não governadas ou tentativas 
          de operações não autorizadas.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Operações Órfãs
          </CardTitle>
          <CardDescription>
            Eventos detectados que não correspondem a nenhum padrão conhecido
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>Idempotency Key</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orphanOperations.map((op) => (
                  <TableRow key={op.event_id} className="bg-destructive/5">
                    <TableCell className="font-mono text-xs">
                      {op.event_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-xs truncate">
                      {op.idempotency_key}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {op.event_type}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(op.created_at)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="destructive" className="animate-pulse">
                        ÓRFÃ
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Ações Recomendadas:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Analise cada operação para determinar se é legítima</li>
              <li>Se legítima, adicione a chave correspondente ao dicionário</li>
              <li>Se suspeita, investigue a origem e bloqueie se necessário</li>
              <li>Considere adicionar alertas automáticos para novos padrões</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
