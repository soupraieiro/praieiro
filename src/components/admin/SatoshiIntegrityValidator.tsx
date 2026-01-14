import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Shield,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Lock,
  Hash,
  Activity
} from "lucide-react";

interface IntegrityResult {
  source_table: string;
  total_records: number;
  valid_records: number;
  invalid_records: number;
  integrity_percentage: number;
}

interface AuditRecord {
  source_table: string;
  record_id: string;
  hash_value: string | null;
  record_created: string;
  integrity_valid: boolean;
}

export function SatoshiIntegrityValidator() {
  const [integrityResults, setIntegrityResults] = useState<IntegrityResult[]>([]);
  const [recentAudits, setRecentAudits] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [hasIntegrityBreach, setHasIntegrityBreach] = useState(false);

  useEffect(() => {
    runIntegrityScan();
  }, []);

  const runIntegrityScan = async () => {
    try {
      setScanning(true);
      setLoading(true);

      // Call the verify_satoshi_integrity_v2 RPC (now returns IntegrityResult shape)
      const { data: integrityData, error: integrityError } = await supabase
        .rpc('verify_satoshi_integrity_v2');

      if (integrityError) {
        console.error("Integrity check error:", integrityError);
        // Fallback to manual count
        await runManualIntegrityCheck();
      } else if (integrityData && Array.isArray(integrityData) && integrityData.length > 0) {
        // RPC now returns the correct shape directly
        const results: IntegrityResult[] = integrityData.map((item: {
          source_table: string;
          total_records: number;
          valid_records: number;
          integrity_percentage: number;
        }) => ({
          source_table: item.source_table,
          total_records: item.total_records,
          valid_records: item.valid_records,
          invalid_records: item.total_records - item.valid_records,
          integrity_percentage: item.integrity_percentage
        }));

        setIntegrityResults(results);
        const hasBreach = results.some(r => r.integrity_percentage < 100);
        setHasIntegrityBreach(hasBreach);
      } else {
        // No data returned, fallback to manual check
        await runManualIntegrityCheck();
      }

      // Load recent audit records
      await loadRecentAudits();

    } catch (error) {
      // Silent failure - don't show toast for network errors on initial load
      // Only log if it's not a network error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('Failed to fetch')) {
        console.error("Error running integrity scan:", { message: errorMessage, details: error });
      }
      // Set default safe state
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  const runManualIntegrityCheck = async () => {
    const results: IntegrityResult[] = [];

    // Check ledger
    try {
      const { count: ledgerTotal } = await supabase.from('ledger').select('*', { count: 'exact', head: true });
      const { count: ledgerValid } = await supabase.from('ledger').select('*', { count: 'exact', head: true }).not('satoshi_hash', 'is', null);
      results.push({
        source_table: 'ledger',
        total_records: ledgerTotal || 0,
        valid_records: ledgerValid || 0,
        invalid_records: (ledgerTotal || 0) - (ledgerValid || 0),
        integrity_percentage: (ledgerTotal || 0) > 0 ? ((ledgerValid || 0) / (ledgerTotal || 1)) * 100 : 100
      });
    } catch (e) { console.error('ledger check error:', e); }

    // Check orders
    try {
      const { count: ordersTotal } = await supabase.from('orders').select('*', { count: 'exact', head: true });
      const { count: ordersValid } = await supabase.from('orders').select('*', { count: 'exact', head: true }).not('satoshi_hash', 'is', null);
      results.push({
        source_table: 'orders',
        total_records: ordersTotal || 0,
        valid_records: ordersValid || 0,
        invalid_records: (ordersTotal || 0) - (ordersValid || 0),
        integrity_percentage: (ordersTotal || 0) > 0 ? ((ordersValid || 0) / (ordersTotal || 1)) * 100 : 100
      });
    } catch (e) { console.error('orders check error:', e); }

    // Check payments
    try {
      const { count: paymentsTotal } = await supabase.from('payments').select('*', { count: 'exact', head: true });
      const { count: paymentsValid } = await supabase.from('payments').select('*', { count: 'exact', head: true }).not('satoshi_hash', 'is', null);
      results.push({
        source_table: 'payments',
        total_records: paymentsTotal || 0,
        valid_records: paymentsValid || 0,
        invalid_records: (paymentsTotal || 0) - (paymentsValid || 0),
        integrity_percentage: (paymentsTotal || 0) > 0 ? ((paymentsValid || 0) / (paymentsTotal || 1)) * 100 : 100
      });
    } catch (e) { console.error('payments check error:', e); }

    setIntegrityResults(results);
    const hasBreach = results.some(r => r.integrity_percentage < 100);
    setHasIntegrityBreach(hasBreach);
  };

  const loadRecentAudits = async () => {
    try {
      // Get recent records from key tables
      const { data: ledgerData } = await supabase
        .from('ledger')
        .select('id, satoshi_hash, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, satoshi_hash, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      const audits: AuditRecord[] = [];

      if (ledgerData) {
        ledgerData.forEach(record => {
          audits.push({
            source_table: 'ledger',
            record_id: record.id,
            hash_value: record.satoshi_hash,
            record_created: record.created_at,
            integrity_valid: record.satoshi_hash !== null
          });
        });
      }

      if (ordersData) {
        ordersData.forEach(record => {
          audits.push({
            source_table: 'orders',
            record_id: record.id,
            hash_value: record.satoshi_hash,
            record_created: record.created_at,
            integrity_valid: record.satoshi_hash !== null
          });
        });
      }

      // Sort by date
      audits.sort((a, b) => 
        new Date(b.record_created).getTime() - new Date(a.record_created).getTime()
      );

      setRecentAudits(audits.slice(0, 10));
    } catch (error) {
      console.error("Error loading recent audits:", error);
    }
  };

  const getIntegrityColor = (percentage: number) => {
    if (percentage === 100) return "text-green-500";
    if (percentage >= 95) return "text-yellow-500";
    return "text-red-500";
  };

  const getIntegrityBadge = (percentage: number) => {
    if (percentage === 100) return "default";
    if (percentage >= 95) return "secondary";
    return "destructive";
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", { 
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit", 
      minute: "2-digit"
    });
  };

  const overallIntegrity = integrityResults.length > 0
    ? integrityResults.reduce((sum, r) => sum + r.integrity_percentage, 0) / integrityResults.length
    : 100;

  if (loading && !scanning) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Integrity Breach Alert */}
      {hasIntegrityBreach && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Quebra de Cadeia Satoshi Detectada</AlertTitle>
          <AlertDescription>
            Foram encontrados registros sem hash de integridade. 
            Isso pode indicar inserções não autorizadas ou falha no sistema de auditoria.
            Revise os registros afetados imediatamente.
          </AlertDescription>
        </Alert>
      )}

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Validador de Integridade Satoshi
              </CardTitle>
              <CardDescription>
                Verificação da cadeia de hashes imutáveis em todas as tabelas transacionais
              </CardDescription>
            </div>
            <Button onClick={runIntegrityScan} disabled={scanning}>
              {scanning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {scanning ? "Verificando..." : "Verificar Agora"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Integridade Geral</span>
                <span className={`text-2xl font-bold ${getIntegrityColor(overallIntegrity)}`}>
                  {overallIntegrity.toFixed(2)}%
                </span>
              </div>
              <Progress value={overallIntegrity} className="h-3" />
            </div>
            <div className="flex items-center gap-2">
              {overallIntegrity === 100 ? (
                <>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="font-medium text-green-600">Cadeia Íntegra</p>
                    <p className="text-xs text-muted-foreground">Todos os hashes válidos</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-8 w-8 text-red-500" />
                  <div>
                    <p className="font-medium text-red-600">Atenção Requerida</p>
                    <p className="text-xs text-muted-foreground">Hashes inválidos detectados</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Table-by-Table Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Integridade por Tabela
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {integrityResults.map((result) => (
              <div key={result.source_table} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium capitalize">{result.source_table}</span>
                  </div>
                  <Badge variant={getIntegrityBadge(result.integrity_percentage)}>
                    {result.integrity_percentage.toFixed(2)}%
                  </Badge>
                </div>
                <Progress value={result.integrity_percentage} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    <CheckCircle className="h-3 w-3 inline mr-1 text-green-500" />
                    {result.valid_records} válidos
                  </span>
                  <span>
                    <XCircle className="h-3 w-3 inline mr-1 text-red-500" />
                    {result.invalid_records} inválidos
                  </span>
                  <span>Total: {result.total_records}</span>
                </div>
              </div>
            ))}

            {integrityResults.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum resultado disponível</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Audit Trail */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Trilha de Auditoria Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAudits.map((audit, index) => (
                <div 
                  key={`${audit.source_table}-${audit.record_id}-${index}`}
                  className={`p-3 rounded-lg border ${
                    audit.integrity_valid 
                      ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800" 
                      : "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {audit.integrity_valid ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-medium text-sm capitalize">{audit.source_table}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(audit.record_created)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Hash className="h-3 w-3 text-muted-foreground" />
                    <span className="font-mono text-muted-foreground truncate">
                      {audit.hash_value ? audit.hash_value.slice(0, 32) + "..." : "SEM HASH"}
                    </span>
                  </div>
                </div>
              ))}

              {recentAudits.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum registro de auditoria</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
