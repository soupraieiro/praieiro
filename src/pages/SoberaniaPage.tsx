import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  CheckCircle2, 
  XCircle,
  Hash,
  Clock,
  FileText,
  Lock,
  Eye,
  Users,
  Zap,
  RefreshCw,
  ArrowLeft,
  ExternalLink,
  Fingerprint,
  Database,
  GitBranch
} from "lucide-react";
import { motion } from "framer-motion";
import { useSatoshiState } from "@/contexts/SatoshiStateContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import logoSatoshi from "@/assets/logo-praieiro-transparent.png";

const GENESIS_HASH = "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f";
const GENESIS_DATE = "2024-01-15T00:00:00Z";
const PROTOCOL_VERSION = "1.0.0";

const manifestoPrinciples = [
  {
    icon: Lock,
    title: "Imutabilidade",
    description: "Cada transação é registrada com hash SHA-256 encadeado, impossível de alterar sem invalidar toda a cadeia subsequente."
  },
  {
    icon: Eye,
    title: "Transparência",
    description: "Todo o histórico de transações é auditável em tempo real através do ledger público de eventos."
  },
  {
    icon: Users,
    title: "Descentralização de Confiança",
    description: "Nenhuma entidade única controla o sistema. A validação é distribuída e verificável por qualquer participante."
  },
  {
    icon: Zap,
    title: "Eficiência",
    description: "Transações são processadas instantaneamente com confirmação criptográfica imediata."
  }
];

export default function SoberaniaPage() {
  const { 
    integrityValid, 
    lastIntegrityCheck, 
    verifyIntegrity, 
    currentPhase,
    parameters,
    isLoading 
  } = useSatoshiState();
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [pageHash, setPageHash] = useState<string>("");

  // Gerar hash da página em tempo real
  useEffect(() => {
    const generatePageHash = async () => {
      const pageContent = document.body.innerHTML + new Date().toISOString();
      const encoder = new TextEncoder();
      const data = encoder.encode(pageContent);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      setPageHash(hashHex);
    };
    
    generatePageHash();
    const interval = setInterval(generatePageHash, 30000); // Atualiza a cada 30s
    return () => clearInterval(interval);
  }, []);

  const handleVerifyIntegrity = async () => {
    setIsVerifying(true);
    await verifyIntegrity();
    setIsVerifying(false);
  };

  const truncateHash = (hash: string) => {
    return `${hash.substring(0, 16)}...${hash.substring(hash.length - 16)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Voltar</span>
            </Link>
            <Badge variant="outline" className="bg-primary/5">
              Protocolo Satoshi v{PROTOCOL_VERSION}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-6"
        >
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
            <img src={logoSatoshi} alt="Protocolo Satoshi" className="w-16 h-16 object-contain" />
          </div>
          
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              Declaração de Soberania Digital
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              O Protocolo Satoshi estabelece os princípios fundamentais para uma economia digital 
              transparente, segura e verificável.
            </p>
          </div>
        </motion.div>

        {/* Status de Integridade */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className={`border-2 ${
            integrityValid 
              ? "border-green-500/30 bg-green-50/50 dark:bg-green-950/20" 
              : "border-red-500/30 bg-red-50/50 dark:bg-red-950/20"
          }`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  {integrityValid ? (
                    <div className="p-3 rounded-full bg-green-500/10">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    </div>
                  ) : (
                    <div className="p-3 rounded-full bg-red-500/10">
                      <XCircle className="h-8 w-8 text-red-500" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">
                      {integrityValid ? "Integridade Verificada" : "Verificação Pendente"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {lastIntegrityCheck 
                        ? `Última verificação: ${format(new Date(lastIntegrityCheck), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}`
                        : "Nenhuma verificação realizada"
                      }
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleVerifyIntegrity}
                  disabled={isVerifying || isLoading}
                  variant={integrityValid ? "outline" : "default"}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isVerifying ? "animate-spin" : ""}`} />
                  Verificar Agora
                </Button>
              </div>

              {currentPhase && (
                <div className="mt-4 pt-4 border-t flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-muted-foreground">Fase atual:</span>
                  <Badge variant="secondary">{currentPhase}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Manifesto - Princípios */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Manifesto do Protocolo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <blockquote className="border-l-4 border-amber-500 pl-4 italic text-muted-foreground">
                "Uma economia digital onde cada transação é uma prova criptográfica de verdade, 
                onde a confiança não precisa ser delegada, mas pode ser verificada por qualquer um."
              </blockquote>

              <div className="grid md:grid-cols-2 gap-4">
                {manifestoPrinciples.map((principle, index) => (
                  <motion.div
                    key={principle.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="p-4 rounded-lg bg-muted/50 border"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        <principle.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">{principle.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {principle.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Genesis Block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border-amber-500/20 bg-gradient-to-br from-amber-50/30 to-orange-50/30 dark:from-amber-950/10 dark:to-orange-950/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-amber-600" />
                Bloco Gênese
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/80">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Data de Criação</span>
                  </div>
                  <span className="font-mono text-sm">
                    {format(new Date(GENESIS_DATE), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-background/80">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Hash do Bloco Gênese</span>
                  </div>
                  <code className="block text-xs font-mono break-all text-amber-700 dark:text-amber-400">
                    {GENESIS_HASH}
                  </code>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-background/80">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Versão do Protocolo</span>
                  </div>
                  <Badge variant="outline">{PROTOCOL_VERSION}</Badge>
                </div>
              </div>

              <Separator />

              <div className="text-center text-sm text-muted-foreground">
                <Fingerprint className="h-5 w-5 mx-auto mb-2 opacity-50" />
                <p>Este bloco marca o início imutável do Protocolo Satoshi no ecossistema Praieiro.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Parâmetros do Protocolo */}
        {parameters && parameters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Parâmetros Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {parameters.slice(0, 6).map((param) => (
                    <div 
                      key={param.param_key}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm text-muted-foreground">{param.param_key}</span>
                      <Badge variant="secondary" className="font-mono">
                        {String(param.param_value)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Selo de Autenticidade */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Selo de Autenticidade</h4>
                    <p className="text-xs text-muted-foreground">
                      Esta página é verificada criptograficamente
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <code className="text-xs font-mono text-muted-foreground block">
                    {truncateHash(pageHash || "gerando...")}
                  </code>
                  <span className="text-xs text-muted-foreground">
                    Atualizado em tempo real
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <div className="text-center py-8 text-sm text-muted-foreground">
          <p>
            O Protocolo Satoshi é um sistema de auditoria criptográfica inspirado nos 
            princípios do Bitcoin.
          </p>
          <p className="mt-2 flex items-center justify-center gap-2">
            <Lock className="h-3 w-3" />
            Todas as transações são protegidas por SHA-256
          </p>
        </div>
      </main>
    </div>
  );
}
