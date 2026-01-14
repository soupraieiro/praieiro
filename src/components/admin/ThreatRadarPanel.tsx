import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Shield, ShieldCheck, ShieldOff, AlertTriangle, Ban, CheckCircle, Scale, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BannedIP {
  id: string;
  ip_address: string;
  reason: string;
  blocked_variable: string | null;
  blocked_at: string;
  unblocked_at: string | null;
  is_active: boolean;
  attack_type: string | null;
  severity: string | null;
  satoshi_hash: string | null;
}

interface CLOAnalysis {
  ip: string;
  variable: string;
  analysis: string;
}

export function ThreatRadarPanel() {
  const [bannedIPs, setBannedIPs] = useState<BannedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [unbanning, setUnbanning] = useState<string | null>(null);
  const [todayBlocked, setTodayBlocked] = useState(0);
  const [cloAnalysis, setCloAnalysis] = useState<CLOAnalysis | null>(null);
  const [generatingCLO, setGeneratingCLO] = useState<string | null>(null);

  useEffect(() => {
    loadBannedIPs();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('banned_ips_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'banned_ips' },
        () => loadBannedIPs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadBannedIPs = async () => {
    try {
      const { data, error } = await supabase
        .from('banned_ips')
        .select('*')
        .order('blocked_at', { ascending: false });

      if (error) throw error;

      setBannedIPs(data || []);

      // Count today's blocked IPs
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCount = (data || []).filter(ip => 
        ip.is_active && new Date(ip.blocked_at) >= today
      ).length;
      setTodayBlocked(todayCount);
    } catch (error) {
      console.error('Error loading banned IPs:', error);
      toast.error('Erro ao carregar IPs banidos');
    } finally {
      setLoading(false);
    }
  };

  const handleUnban = async (id: string, ipAddress: string) => {
    setUnbanning(id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('banned_ips')
        .update({
          is_active: false,
          unblocked_at: new Date().toISOString(),
          unblocked_by: user?.id
        })
        .eq('id', id);

      if (error) throw error;

      toast.success(`IP ${ipAddress} desbanido com sucesso`);
      loadBannedIPs();
    } catch (error) {
      console.error('Error unbanning IP:', error);
      toast.error('Erro ao desbanir IP');
    } finally {
      setUnbanning(null);
    }
  };

  const generateCLOAnalysis = async (ip: BannedIP) => {
    setGeneratingCLO(ip.id);
    
    // Simulated AI legal analysis (CLO = Chief Legal Officer)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const analysis = `Doutor, o sistema baniu o IP ${ip.ip_address} por tentar acessar a variável dinâmica "${ip.blocked_variable || 'auth_token_bypass'}". A integridade do Ledger permanece intacta. O ataque foi classificado como ${ip.attack_type || 'injection_attempt'} com severidade ${ip.severity || 'média'}. Recomendo manter o banimento por 72 horas conforme protocolo de segurança Satoshi. Hash de auditoria: ${ip.satoshi_hash || 'STH-' + Date.now()}.`;
    
    setCloAnalysis({
      ip: ip.ip_address,
      variable: ip.blocked_variable || 'auth_token_bypass',
      analysis
    });
    
    setGeneratingCLO(null);
  };

  const getSeverityBadge = (severity: string | null) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive" className="animate-pulse">Crítico</Badge>;
      case 'high':
        return <Badge variant="destructive">Alto</Badge>;
      case 'medium':
        return <Badge className="bg-orange-500">Médio</Badge>;
      case 'low':
        return <Badge variant="secondary">Baixo</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const getAttackTypeBadge = (type: string | null) => {
    const typeLabels: Record<string, string> = {
      'sql_injection': 'SQL Injection',
      'xss': 'XSS',
      'brute_force': 'Força Bruta',
      'api_abuse': 'Abuso de API',
      'rate_limit': 'Rate Limit',
      'auth_bypass': 'Bypass Auth',
      'injection_attempt': 'Tentativa Injeção'
    };
    return typeLabels[type || ''] || type || 'Desconhecido';
  };

  const activeCount = bannedIPs.filter(ip => ip.is_active).length;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status de Defesa */}
      <Card className="border-2 border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-green-500/20 animate-pulse">
                <ShieldCheck className="h-10 w-10 text-green-500" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-green-600">
                  Escudo Satoshi Ativo
                </h3>
                <p className="text-muted-foreground">
                  Protocolo Chameleon operando em modo defensivo
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-primary">{activeCount}</div>
              <p className="text-sm text-muted-foreground">IPs bloqueados ativos</p>
              <Badge variant="outline" className="mt-2">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {todayBlocked} bloqueados hoje
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Análise CLO (Jurídico) */}
      {cloAnalysis && (
        <Card className="border-2 border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">Análise Jurídica CLO</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm italic text-muted-foreground leading-relaxed">
              "{cloAnalysis.analysis}"
            </p>
            <div className="mt-3 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setCloAnalysis(null)}>
                Fechar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gestão de Blacklist */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                Radar de Ameaças - Blacklist Satoshi
              </CardTitle>
              <CardDescription>
                Gestão de IPs banidos pelo sistema de proteção Satoshi
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              Total: {bannedIPs.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {bannedIPs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShieldCheck className="h-16 w-16 text-green-500 mb-4 animate-pulse" />
              <h3 className="text-xl font-semibold text-green-600">Aguardando Inteligência Satoshi...</h3>
              <p className="text-muted-foreground mt-2">
                Nenhum IP foi banido ainda. O Escudo Satoshi está vigilante e conectado.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Tipo de Ataque</TableHead>
                    <TableHead>Variável</TableHead>
                    <TableHead>Severidade</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bannedIPs.map((ip) => (
                    <TableRow key={ip.id} className={!ip.is_active ? 'opacity-50' : ''}>
                      <TableCell>
                        {ip.is_active ? (
                          <Badge variant="destructive" className="gap-1">
                            <ShieldOff className="h-3 w-3" />
                            Banido
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            Perdoado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono font-bold">{ip.ip_address}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getAttackTypeBadge(ip.attack_type)}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {ip.blocked_variable || '-'}
                      </TableCell>
                      <TableCell>{getSeverityBadge(ip.severity)}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(ip.blocked_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={ip.reason}>
                        {ip.reason}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateCLOAnalysis(ip)}
                            disabled={generatingCLO === ip.id}
                          >
                            {generatingCLO === ip.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Scale className="h-4 w-4" />
                            )}
                          </Button>
                          {ip.is_active && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnban(ip.id, ip.ip_address)}
                              disabled={unbanning === ip.id}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              {unbanning === ip.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-1" />
                              )}
                              Desbanir
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estatísticas Rápidas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <Ban className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">IPs Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{bannedIPs.filter(ip => !ip.is_active).length}</p>
                <p className="text-xs text-muted-foreground">Perdoados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {bannedIPs.filter(ip => ip.severity === 'critical' || ip.severity === 'high').length}
                </p>
                <p className="text-xs text-muted-foreground">Alta Severidade</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayBlocked}</p>
                <p className="text-xs text-muted-foreground">Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
