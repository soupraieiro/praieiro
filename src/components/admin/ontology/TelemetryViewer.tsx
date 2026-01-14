import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { RefreshCw, TrendingUp, Coins } from 'lucide-react';
import type { TelemetryData } from '@/hooks/useOntologyDictionary';

interface TelemetryViewerProps {
  telemetry: TelemetryData[];
  onRefresh: (category?: string, hours?: number) => Promise<void>;
}

const PERIOD_OPTIONS = [
  { value: '1', label: 'Última hora' },
  { value: '6', label: 'Últimas 6h' },
  { value: '24', label: 'Últimas 24h' },
  { value: '72', label: 'Últimos 3 dias' },
  { value: '168', label: 'Última semana' }
];

const CATEGORY_COLORS: Record<string, string> = {
  'FINANCEIRO': '#10b981',
  'USUÁRIO': '#3b82f6',
  'SISTEMA': '#a855f7',
  'GOVERNANÇA': '#f59e0b',
  'COMUNICAÇÃO': '#06b6d4',
  'RECOMPENSA': '#ec4899',
  'SEGURANÇA': '#ef4444'
};

export function TelemetryViewer({ telemetry, onRefresh }: TelemetryViewerProps) {
  const [period, setPeriod] = useState('24');
  const [category, setCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await onRefresh(category === 'all' ? undefined : category, parseInt(period));
    } finally {
      setLoading(false);
    }
  };

  const totalEvents = telemetry.reduce((sum, t) => sum + t.event_count, 0);
  const totalZimbu = telemetry.reduce((sum, t) => sum + t.total_zimbu, 0);

  // Dados para gráfico
  const chartData = telemetry
    .filter(t => t.event_count > 0)
    .slice(0, 10)
    .map(t => ({
      name: t.op_key.split(':').slice(-1)[0] || t.op_key,
      fullName: t.op_key,
      count: t.event_count,
      zimbu: t.total_zimbu,
      category: t.category,
      color: CATEGORY_COLORS[t.category] || '#6b7280'
    }));

  // Agrupar por categoria para resumo
  const categoryTotals = telemetry.reduce((acc, t) => {
    if (!acc[t.category]) {
      acc[t.category] = { events: 0, zimbu: 0 };
    }
    acc[t.category].events += t.event_count;
    acc[t.category].zimbu += t.total_zimbu;
    return acc;
  }, {} as Record<string, { events: number; zimbu: number }>);

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.keys(CATEGORY_COLORS).map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleRefresh} disabled={loading} variant="outline" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Métricas resumidas */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvents.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground">
              {PERIOD_OPTIONS.find(p => p.value === period)?.label}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Volume ZIMBU</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalZimbu.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Movimentado no período
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Operações</CardTitle>
            <CardDescription>Operações mais frequentes no período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Eventos']}
                    labelFormatter={(label: string) => chartData.find(d => d.name === label)?.fullName || label}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo por categoria */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
            {Object.entries(categoryTotals).map(([cat, data]) => (
              <div
                key={cat}
                className="p-3 rounded-lg border"
                style={{ borderColor: `${CATEGORY_COLORS[cat]}40` }}
              >
                <Badge
                  variant="outline"
                  className="mb-2"
                  style={{ 
                    color: CATEGORY_COLORS[cat],
                    borderColor: CATEGORY_COLORS[cat]
                  }}
                >
                  {cat}
                </Badge>
                <div className="text-lg font-bold">{data.events.toLocaleString('pt-BR')}</div>
                <div className="text-xs text-muted-foreground">
                  {data.zimbu.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ZIMBU
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabela detalhada */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento</CardTitle>
          <CardDescription>Todas as operações com atividade no período</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operação</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Eventos</TableHead>
                  <TableHead className="text-right">ZIMBU</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {telemetry.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum dado de telemetria disponível
                    </TableCell>
                  </TableRow>
                ) : (
                  telemetry.map((t, i) => (
                    <TableRow key={`${t.op_key}-${i}`}>
                      <TableCell className="font-mono text-xs font-medium">
                        {t.op_key}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          style={{ 
                            color: CATEGORY_COLORS[t.category],
                            borderColor: CATEGORY_COLORS[t.category]
                          }}
                        >
                          {t.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {t.description}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {t.event_count.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {t.total_zimbu.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
