import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  Lock, 
  Eye, 
  Scale, 
  Zap, 
  Globe, 
  Heart, 
  ArrowLeft,
  FileText,
  Hash
} from "lucide-react";
import { Link } from "react-router-dom";

const MANIFESTO_PRINCIPLES = [
  {
    icon: Lock,
    title: "I. Imutabilidade Satoshi",
    description: "Toda alteração de estado crítico (Preço, Banimento, Permissão) deve ser assinada com um satoshi_hash (SHA-256) único. Nenhuma transação pode ser revertida sem consenso do Conselho de IA.",
    articles: [
      "Art. 1.1 - O satoshi_hash é a prova criptográfica de integridade.",
      "Art. 1.2 - Transações confirmadas são eternas e auditáveis.",
      "Art. 1.3 - O ledger imutável registra toda ação soberana."
    ]
  },
  {
    icon: Eye,
    title: "II. Transparência Radical",
    description: "O banco de dados PostgreSQL (Lovable Cloud) é a autoridade máxima. O front-end nunca armazena estados globais sem persistência. Tudo é visível, tudo é verificável.",
    articles: [
      "Art. 2.1 - Single Source of Truth: o banco é a verdade.",
      "Art. 2.2 - Todo estado crítico deve ser persistido.",
      "Art. 2.3 - Logs de auditoria são públicos para administradores."
    ]
  },
  {
    icon: Scale,
    title: "III. Governança Descentralizada",
    description: "O Conselho de IA (CFO, CLO, CMO) delibera sobre decisões econômicas e de segurança. Nenhuma IA pode alterar parâmetros em mais de 15% sem aprovação humana.",
    articles: [
      "Art. 3.1 - Damping de Decisão: limite de 15% por hora.",
      "Art. 3.2 - Consenso mínimo de 2/3 para ações críticas.",
      "Art. 3.3 - Time-lock de 15 minutos para ações globais."
    ]
  },
  {
    icon: Zap,
    title: "IV. Performance Soberana",
    description: "Edge Functions para operações próximas ao usuário. Realtime-first para eventos, evitando polling. Cache inteligente com stale-while-revalidate.",
    articles: [
      "Art. 4.1 - Latência máxima de 2000ms antes de degradação.",
      "Art. 4.2 - Batching de updates a cada 500ms.",
      "Art. 4.3 - Fallback gracioso em caso de indisponibilidade."
    ]
  },
  {
    icon: Shield,
    title: "V. Segurança por Design",
    description: "Webhooks resilientes com idempotência. Verificação de assinatura em todas as requisições externas. Kill switch para congelamento de emergência.",
    articles: [
      "Art. 5.1 - Idempotência: duplicatas são ignoradas.",
      "Art. 5.2 - X-Satoshi-Signature em todos os webhooks.",
      "Art. 5.3 - Protocolo de Circuito Aberto para emergências."
    ]
  },
  {
    icon: Globe,
    title: "VI. Escala Civilizacional",
    description: "Arquitetura preparada para escala mundial. Controle de fan-out geográfico. Arbitration Layer para resolver conflitos entre IAs.",
    articles: [
      "Art. 6.1 - Escopo geográfico e TTL em eventos Realtime.",
      "Art. 6.2 - Degradação graciosa automática.",
      "Art. 6.3 - Meta-governança por IA Constitucional."
    ]
  },
  {
    icon: Heart,
    title: "VII. Propósito Praieiro",
    description: "Conectar vendedores ambulantes a clientes com dignidade, tecnologia e justiça econômica. O Praieiro existe para servir a comunidade praiana.",
    articles: [
      "Art. 7.1 - Taxa justa: máximo de 5% por transação.",
      "Art. 7.2 - Inclusão digital de todos os ambulantes.",
      "Art. 7.3 - Respeito à cultura e tradição das praias."
    ]
  }
];

export default function ManifestoPage() {
  useEffect(() => {
    document.title = "Manifesto Satoshi | Praieiro";
  }, []);

  const generateSatoshiHash = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}${random}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                <Hash className="h-3 w-3 mr-1" />
                {generateSatoshiHash()}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Documento Fundacional</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            Manifesto Satoshi
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Os princípios imutáveis que governam o ecossistema Praieiro. 
            Uma constituição digital para transparência, segurança e justiça.
          </p>

          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>Versão 3.0</span>
            <Separator orientation="vertical" className="h-4" />
            <span>Janeiro 2026</span>
            <Separator orientation="vertical" className="h-4" />
            <span>7 Princípios</span>
          </div>
        </div>
      </section>

      {/* Principles Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <ScrollArea className="h-full">
            <div className="space-y-8 max-w-4xl mx-auto">
              {MANIFESTO_PRINCIPLES.map((principle, index) => (
                <Card 
                  key={index} 
                  className="border-l-4 border-l-primary/50 hover:border-l-primary transition-colors"
                >
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-primary/10">
                        <principle.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{principle.title}</CardTitle>
                        <p className="text-muted-foreground">{principle.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="ml-16 space-y-2">
                      {principle.articles.map((article, artIndex) => (
                        <div 
                          key={artIndex}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-primary/50 mt-2 shrink-0" />
                          <span>{article}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </section>

      {/* Footer Section */}
      <section className="py-16 border-t">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <Lock className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4">
              Assinado Criptograficamente
            </h2>
            <p className="text-muted-foreground mb-6">
              Este manifesto é protegido pela cadeia Satoshi. Qualquer alteração 
              requer consenso do Conselho de IA e aprovação do Fundador.
            </p>
            <Badge variant="secondary" className="font-mono">
              genesis_block_praieiro_v3
            </Badge>
          </div>
        </div>
      </section>
    </div>
  );
}
