import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown,
  MessageSquare,
  TrendingUp,
  Lightbulb,
  BarChart3
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface Evaluation {
  id: string;
  user_type: string;
  rating: number;
  ease_of_use: number | null;
  design_rating: number | null;
  functionality_rating: number | null;
  comment: string | null;
  suggestion: string | null;
  would_recommend: boolean;
  page_evaluated: string | null;
  created_at: string;
}

interface EvaluationStats {
  totalEvaluations: number;
  averageRating: number;
  averageEaseOfUse: number;
  averageDesign: number;
  averageFunctionality: number;
  recommendationRate: number;
  ratingDistribution: { rating: number; count: number }[];
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

export function SiteEvaluationPanel() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [stats, setStats] = useState<EvaluationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvaluations();
  }, []);

  const loadEvaluations = async () => {
    try {
      const { data, error } = await supabase
        .from("site_evaluations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const evals = data || [];
      setEvaluations(evals);

      // Calculate stats
      if (evals.length > 0) {
        const avgRating = evals.reduce((sum, e) => sum + e.rating, 0) / evals.length;
        const easeOfUseVals = evals.filter(e => e.ease_of_use).map(e => e.ease_of_use!);
        const designVals = evals.filter(e => e.design_rating).map(e => e.design_rating!);
        const functionalityVals = evals.filter(e => e.functionality_rating).map(e => e.functionality_rating!);
        const recommendations = evals.filter(e => e.would_recommend).length;

        const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        evals.forEach(e => { ratingDist[e.rating]++; });

        setStats({
          totalEvaluations: evals.length,
          averageRating: avgRating,
          averageEaseOfUse: easeOfUseVals.length > 0 ? easeOfUseVals.reduce((a, b) => a + b, 0) / easeOfUseVals.length : 0,
          averageDesign: designVals.length > 0 ? designVals.reduce((a, b) => a + b, 0) / designVals.length : 0,
          averageFunctionality: functionalityVals.length > 0 ? functionalityVals.reduce((a, b) => a + b, 0) / functionalityVals.length : 0,
          recommendationRate: (recommendations / evals.length) * 100,
          ratingDistribution: Object.entries(ratingDist).map(([rating, count]) => ({
            rating: parseInt(rating),
            count
          }))
        });
      }
    } catch (error) {
      console.error("Error loading evaluations:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star 
        key={i} 
        className={`h-4 w-4 ${i < rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} 
      />
    ));
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader><div className="h-5 bg-muted rounded w-1/3" /></CardHeader>
            <CardContent><div className="h-32 bg-muted rounded" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Star className="h-6 w-6 text-yellow-500" />
          Avaliações do Site
        </h2>
        <p className="text-muted-foreground">Feedback dos usuários sobre a plataforma</p>
      </div>

      {stats && stats.totalEvaluations > 0 ? (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Nota Geral</p>
                    <p className="text-3xl font-bold">{stats.averageRating.toFixed(1)}</p>
                  </div>
                  <div className="flex">{renderStars(Math.round(stats.averageRating))}</div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {stats.totalEvaluations} avaliações
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Taxa de Recomendação</p>
                    <p className="text-3xl font-bold text-green-600">{stats.recommendationRate.toFixed(0)}%</p>
                  </div>
                  <ThumbsUp className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Usuários que recomendam
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Facilidade de Uso</p>
                    <p className="text-3xl font-bold">{stats.averageEaseOfUse.toFixed(1)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
                <Progress value={(stats.averageEaseOfUse / 5) * 100} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Design</p>
                    <p className="text-3xl font-bold">{stats.averageDesign.toFixed(1)}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-500" />
                </div>
                <Progress value={(stats.averageDesign / 5) * 100} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Notas</CardTitle>
                <CardDescription>Quantidade de avaliações por nota</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.ratingDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="rating" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))">
                      {stats.ratingDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Métricas Detalhadas</CardTitle>
                <CardDescription>Comparação entre áreas</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Geral", value: stats.averageRating },
                        { name: "Facilidade", value: stats.averageEaseOfUse },
                        { name: "Design", value: stats.averageDesign },
                        { name: "Funcionalidade", value: stats.averageFunctionality }
                      ].filter(d => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}`}
                    >
                      {[0, 1, 2, 3].map((index) => (
                        <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042'][index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Comments and Suggestions */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Comentários Recentes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                {evaluations.filter(e => e.comment).slice(0, 10).map((evaluation) => (
                  <div key={evaluation.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{evaluation.user_type}</Badge>
                        <div className="flex">{renderStars(evaluation.rating)}</div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(evaluation.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-sm">{evaluation.comment}</p>
                    {evaluation.would_recommend ? (
                      <Badge variant="default" className="mt-2 bg-green-500">
                        <ThumbsUp className="h-3 w-3 mr-1" /> Recomenda
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="mt-2">
                        <ThumbsDown className="h-3 w-3 mr-1" /> Não recomenda
                      </Badge>
                    )}
                  </div>
                ))}
                {evaluations.filter(e => e.comment).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum comentário ainda
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Sugestões dos Usuários
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                {evaluations.filter(e => e.suggestion).slice(0, 10).map((evaluation) => (
                  <div key={evaluation.id} className="p-3 border rounded-lg bg-yellow-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{evaluation.user_type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(evaluation.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-sm">{evaluation.suggestion}</p>
                    {evaluation.page_evaluated && (
                      <Badge variant="secondary" className="mt-2">
                        Página: {evaluation.page_evaluated}
                      </Badge>
                    )}
                  </div>
                ))}
                {evaluations.filter(e => e.suggestion).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma sugestão ainda
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma avaliação recebida ainda</p>
            <p className="text-sm text-muted-foreground mt-2">
              As avaliações aparecerão aqui quando os usuários avaliarem o site
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
