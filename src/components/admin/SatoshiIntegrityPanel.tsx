/**
 * SATOSHI INTEGRITY PANEL
 * Painel de verificação de integridade dos logs usando Satoshi Hash
 * Garante que os registros não foram adulterados
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX, RefreshCw, Search,
  Lock, Unlock, AlertTriangle, CheckCircle, XCircle, Clock,
  FileWarning, Eye, Loader2, Database, Hash
} from 'lucide-react';

interface IntegrityRecord {
  logId: string;
  isValid: boolean;
  logSeverity: string;
  createdAt: string;
  storedHash: string | null;
}

interface IntegrityStats {
  total: number;
  valid: number;
  invalid: number;
  missing: number;
  percentage: number;
}

export default function SatoshiIntegrityPanel() {
  const [records, setRecords] = useState<IntegrityRecord[]>([]);
  const [stats, setStats] = useState<IntegrityStats>({
    total: 0,
    valid: 0,
    invalid: 0,
    missing: 0,
    percentage: 100
  });
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [hoursFilter, setHoursFilter] = useState('24');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const runIntegrityAudit = useCallback(async () => {
    try {
      setAuditing(true);
      
      // Chamar a função de auditoria
      const { data, error } = await supabase
        .rpc('audit_log_integrity', { p_hours: parseInt(hoursFilter) });

      if (error) throw error;

      const auditResults = (data || []) as Array<{
        log_id: string;
        is_valid: boolean;
        log_severity: string;
        created_at: string;
      }>;

      // Buscar os hashes originais
      const logIds = auditResults.map(r => r.log_id);
      const { data: logs } = await supabase
        .from('sys_orch_logs')
        .select('id, satoshi_hash')
        .in('id', logIds);

      const hashMap = new Map((logs || []).map(l => [l.id, l.satoshi_hash]));

      const parsed: IntegrityRecord[] = auditResults.map(r => ({
        logId: r.log_id,
        isValid: r.is_valid,
        logSeverity: r.log_severity,
        createdAt: r.created_at,
        storedHash: hashMap.get(r.log_id) || null
      }));

      setRecords(parsed);

      // Calcular estatísticas
      const valid = parsed.filter(r => r.isValid).length;
      const invalid = parsed.filter(r => !r.isValid && r.storedHash).length;
      const missing = parsed.filter(r => !r.storedHash).length;
      
      setStats({
        total: parsed.length,
        valid,
        invalid,
        missing,
        percentage: parsed.length > 0 ? (valid / parsed.length) * 100 : 100
      });

      if (invalid > 0) {
        toast.error(`${invalid} registros com integridade comprometida!`, {
          description: 'Verifique os logs marcados em vermelho.'
        });
      } else if (missing > 0) {
        toast.warning(`${missing} registros sem hash Satoshi`, {
          description: 'Considere regenerar os hashes.'
        });
      } else {
        toast.success('Todos os registros estão íntegros!');
      }

    } catch (error) {
      console.error('Erro na auditoria:', error);
      toast.error('Erro ao executar auditoria de integridade');
    } finally {
      setAuditing(false);
      setLoading(false);
    }
  }, [hoursFilter]);

  useEffect(() => {
    runIntegrityAudit();
  }, [runIntegrityAudit]);

  const filteredRecords = records.filter(record => {
    if (severityFilter !== 'all' && record.logSeverity !== severityFilter) return false;
    if (searchTerm && !record.logId.includes(searchTerm)) return false;
    return true;
  });

  const getIntegrityIcon = (record: IntegrityRecord) => {
    if (!record.storedHash) {
      return <ShieldAlert className="w-5 h-5 text-yellow-500" />;
    }
    if (record.isValid) {
      return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
    }
    return <ShieldX className="w-5 h-5 text-red-500" />;
  };

  const getStatusBadge = (record: IntegrityRecord) => {
    if (!record.storedHash) {
      return <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">Sem Hash</Badge>;
    }
    if (record.isValid) {
      return <Badge className="bg-emerald-500">Íntegro</Badge>;
    }
    return <Badge variant="destructive">Adulterado</Badge>;
  };

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      'error': 'bg-red-500',
      'warning': 'bg-yellow-500',
      'info': 'bg-blue-500',
      'success': 'bg-emerald-500'
    };
    return <Badge className={colors[severity] || 'bg-gray-500'}>{severity}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Integridade Satoshi
          </h2>
          <p className="text-muted-foreground">
            Verificação de integridade dos registros usando hash criptográfico
          </p>
        </div>
        <Button onClick={runIntegrityAudit} disabled={auditing}>
          {auditing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Executar Auditoria
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-2 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Auditado</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <Database className="w-10 h-10 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-2 border-emerald-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Íntegros</p>
                  <p className="text-3xl font-bold text-emerald-500">{stats.valid}</p>
                </div>
                <ShieldCheck className="w-10 h-10 text-emerald-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className={`border-2 ${stats.invalid > 0 ? 'border-red-500/50 bg-red-500/5' : 'border-red-500/20'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Adulterados</p>
                  <p className="text-3xl font-bold text-red-500">{stats.invalid}</p>
                </div>
                <ShieldX className="w-10 h-10 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-2 border-yellow-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sem Hash</p>
                  <p className="text-3xl font-bold text-yellow-500">{stats.missing}</p>
                </div>
                <ShieldAlert className="w-10 h-10 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Integrity Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Índice de Integridade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Registros verificados e íntegros</span>
              <span className={stats.percentage === 100 ? 'text-emerald-500' : 'text-yellow-500'}>
                {stats.percentage.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={stats.percentage} 
              className={`h-3 ${stats.percentage === 100 ? '' : stats.percentage > 90 ? '' : ''}`}
            />
            {stats.percentage < 100 && (
              <p className="text-xs text-muted-foreground mt-2">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                {stats.invalid > 0 
                  ? 'Registros adulterados detectados. Investigue imediatamente.'
                  : 'Alguns registros não possuem hash de verificação.'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <Select value={hoursFilter} onValueChange={setHoursFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Última hora</SelectItem>
              <SelectItem value="6">Últimas 6 horas</SelectItem>
              <SelectItem value="24">Últimas 24 horas</SelectItem>
              <SelectItem value="48">Últimas 48 horas</SelectItem>
              <SelectItem value="168">Última semana</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="success">Success</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Hash className="w-5 h-5" />
            Registros Auditados
          </CardTitle>
          <CardDescription>
            {filteredRecords.length} de {records.length} registros
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum registro encontrado</p>
                </div>
              ) : (
                filteredRecords.map((record, index) => (
                  <motion.div
                    key={record.logId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={`p-4 rounded-lg border flex items-center gap-4 ${
                      !record.isValid && record.storedHash
                        ? 'bg-red-500/5 border-red-500/30'
                        : !record.storedHash
                        ? 'bg-yellow-500/5 border-yellow-500/30'
                        : 'bg-muted/30 border-muted'
                    }`}
                  >
                    {getIntegrityIcon(record)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm truncate">
                          {record.logId}
                        </span>
                        {getSeverityBadge(record.logSeverity)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(record.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </div>

                    {getStatusBadge(record)}

                    {record.storedHash && (
                      <div className="text-xs font-mono text-muted-foreground max-w-32 truncate" title={record.storedHash}>
                        {record.storedHash.slice(0, 16)}...
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Warning for compromised records */}
      {stats.invalid > 0 && (
        <Card className="border-2 border-red-500 bg-red-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-8 h-8 text-red-500 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-red-500 mb-2">
                  ⚠️ Alerta de Segurança: Registros Adulterados Detectados
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {stats.invalid} registro(s) apresentam divergência entre o hash armazenado e o hash calculado.
                  Isso pode indicar que os dados foram modificados de forma não autorizada.
                </p>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm">
                    <FileWarning className="w-4 h-4 mr-2" />
                    Gerar Relatório de Incidente
                  </Button>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Detalhes
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
