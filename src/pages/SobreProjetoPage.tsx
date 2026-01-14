import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Briefcase, 
  Crown, 
  Star, 
  Sparkles, 
  Gift, 
  Lock,
  ArrowLeft,
  Check,
  Umbrella,
  MapPin,
  Users,
  Shield,
  Smartphone,
  Waves,
  Heart,
  TrendingUp,
  Globe,
  Zap,
  Coffee,
  Sun,
  Target,
  Handshake,
  Leaf,
  CreditCard,
  Wallet,
  Instagram
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoRound from "@/assets/logo-praieiro-circle.png";

export default function SobreProjetoPage() {
  const navigate = useNavigate();

  const openInstagram = () => {
    window.open("https://instagram.com/praieiro.ssa", "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-5xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          {/* Hero Section - Emotivo */}
          <section className="text-center mb-16">
            <div className="mb-6">
              <img 
                src={logoRound} 
                alt="Praieiro" 
                className="w-24 h-24 mx-auto rounded-full object-contain bg-white shadow-lg p-2"
              />
            </div>
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              <Heart className="h-3 w-3 mr-1 fill-current" />
              Conectando Corações na Faixa de Areia
            </Badge>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6">
              O Praieiro Nasceu de Um Sonho
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-4">
              Imagine um dia de sol em Salvador. O mar azul, a brisa suave, o som das ondas. 
              E ali, caminhando pela areia quente, estão os <strong>verdadeiros Praieiros</strong> que fazem 
              desse momento ainda mais especial — os vendedores ambulantes que, com um sorriso no rosto 
              e determinação no coração, levam alegria, sabor e comodidade até a sua toalha.
            </p>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              O Praieiro é a nossa declaração de amor ao litoral baiano e a todos que fazem 
              a economia da praia acontecer. Uma ponte digital entre você e esses trabalhadores 
              incansáveis que transformam um simples dia de praia em uma experiência inesquecível.
            </p>

            {/* Instagram Button */}
            <Button 
              onClick={openInstagram}
              className="mt-6 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-700 hover:via-pink-700 hover:to-orange-600"
            >
              <Instagram className="h-5 w-5 mr-2" />
              Siga @praieiro.ssa
            </Button>
          </section>

          {/* A Essência do Praieiro */}
          <section className="mb-16">
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20 rounded-3xl p-8 md:p-12">
              <div className="text-center mb-8">
                <Waves className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="text-3xl font-display font-bold text-foreground mb-4">
                  Mais do que um App, Uma Revolução na Areia
                </h2>
              </div>
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    O Praieiro nasceu da observação de uma realidade: trabalhadores honestos e dedicados 
                    que caminham quilômetros sob o sol, oferecendo seus produtos, muitas vezes sem o 
                    reconhecimento que merecem. <strong>Eles são os Praieiros.</strong>
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Do outro lado, turistas e banhistas que querem aproveitar o dia sem preocupações, 
                    com a segurança de saber que estão comprando de alguém confiável. 
                    <strong> Eles são os Clientes.</strong>
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Nossa plataforma une esses dois mundos com tecnologia, carinho e respeito, 
                    criando um <strong>ecossistema onde todos ganham</strong> — e a praia se torna 
                    ainda mais especial.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4 text-center bg-white/80 dark:bg-background/80">
                    <MapPin className="h-8 w-8 text-cyan-600 mx-auto mb-2" />
                    <p className="font-semibold text-foreground">Localização</p>
                    <p className="text-xs text-muted-foreground">em tempo real</p>
                  </Card>
                  <Card className="p-4 text-center bg-white/80 dark:bg-background/80">
                    <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="font-semibold text-foreground">Segurança</p>
                    <p className="text-xs text-muted-foreground">garantida</p>
                  </Card>
                  <Card className="p-4 text-center bg-white/80 dark:bg-background/80">
                    <Heart className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <p className="font-semibold text-foreground">Conexão</p>
                    <p className="text-xs text-muted-foreground">humana</p>
                  </Card>
                  <Card className="p-4 text-center bg-white/80 dark:bg-background/80">
                    <Sparkles className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                    <p className="font-semibold text-foreground">Experiência</p>
                    <p className="text-xs text-muted-foreground">única</p>
                  </Card>
                </div>
              </div>
            </div>
          </section>

          {/* Benefícios para Praieiros (Vendedores) */}
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-14 w-14 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Briefcase className="h-7 w-7 text-orange-600" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-foreground">
                  Para os Praieiros
                </h2>
                <p className="text-muted-foreground">
                  Valorizamos cada passo que você dá na areia
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 border-orange-200/50 bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-950/10">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Visibilidade que Transforma</h3>
                    <p className="text-muted-foreground text-sm">
                      Seus clientes te encontram no mapa em tempo real. Não precisa mais gritar ofertas — 
                      a tecnologia faz seu trabalho aparecer para quem está perto de você.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-orange-200/50 bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-950/10">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                    <Wallet className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Carteira Digital</h3>
                    <p className="text-muted-foreground text-sm">
                      Receba pagamentos com segurança, acompanhe seus ganhos e tenha controle total 
                      do seu dinheiro. Tudo na palma da mão, sem burocracia.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-orange-200/50 bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-950/10">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                    <Star className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Reputação que Cresce</h3>
                    <p className="text-muted-foreground text-sm">
                      Cada bom atendimento vira uma avaliação positiva. Construa sua reputação e 
                      conquiste clientes fiéis que vão te procurar toda vez que voltarem à praia.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-orange-200/50 bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-950/10">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                    <Handshake className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Dignidade e Reconhecimento</h3>
                    <p className="text-muted-foreground text-sm">
                      Você não é apenas um vendedor — você é um Praieiro. Nosso ecossistema 
                      reconhece e valoriza seu trabalho como ele merece ser valorizado.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* Benefícios para Clientes */}
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-14 w-14 rounded-full bg-cyan-500/10 flex items-center justify-center">
                <Sun className="h-7 w-7 text-cyan-600" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-foreground">
                  Para os Clientes
                </h2>
                <p className="text-muted-foreground">
                  Seu dia de praia merece ser perfeito
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 border-cyan-200/50 bg-gradient-to-br from-cyan-50/50 to-transparent dark:from-cyan-950/10">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Encontre Sem Sair da Toalha</h3>
                    <p className="text-muted-foreground text-sm">
                      Quer um açaí gelado? Uma água de coco? Veja no mapa quem está perto de você 
                      e faça seu pedido sem levantar. O Praieiro vem até você!
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-cyan-200/50 bg-gradient-to-br from-cyan-50/50 to-transparent dark:from-cyan-950/10">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                    <Shield className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Compre com Confiança</h3>
                    <p className="text-muted-foreground text-sm">
                      Todos os vendedores são verificados e avaliados pela comunidade. Você sabe 
                      exatamente de quem está comprando e pode confiar na qualidade.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-cyan-200/50 bg-gradient-to-br from-cyan-50/50 to-transparent dark:from-cyan-950/10">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Comunidade de Clientes</h3>
                    <p className="text-muted-foreground text-sm">
                      Faça parte de uma rede de pessoas que amam a praia. Compartilhe experiências, 
                      descubra dicas e conecte-se com outros clientes.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-cyan-200/50 bg-gradient-to-br from-cyan-50/50 to-transparent dark:from-cyan-950/10">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                    <Heart className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Impacto Social</h3>
                    <p className="text-muted-foreground text-sm">
                      Cada compra que você faz ajuda uma família. Você não está apenas comprando 
                      um produto — está apoiando o sonho de alguém.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* Facilidades de Pagamento */}
          <section className="mb-16 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-3xl p-8">
            <div className="text-center mb-8">
              <CreditCard className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-3xl font-display font-bold text-foreground mb-4">
                Pagamentos Fáceis e Seguros
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Esqueceu o dinheiro? Sem problema! O Praieiro oferece múltiplas formas de pagamento 
                para que você nunca perca uma oportunidade.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
              <Card className="p-6 text-center bg-white/80 dark:bg-background/80">
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">PIX Instantâneo</h3>
                <p className="text-sm text-muted-foreground">
                  Pagamento cai na hora. Rápido, prático e sem taxas extras para você.
                </p>
              </Card>

              <Card className="p-6 text-center bg-white/80 dark:bg-background/80">
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Cartão de Crédito</h3>
                <p className="text-sm text-muted-foreground">
                  Pague com seu cartão favorito de forma segura, direto pelo app.
                </p>
              </Card>

              <Card className="p-6 text-center bg-white/80 dark:bg-background/80">
                <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                  <Wallet className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Carteira Digital</h3>
                <p className="text-sm text-muted-foreground">
                  Adicione saldo e pague com um toque. Ganhe benefícios exclusivos!
                </p>
              </Card>
            </div>
          </section>

          {/* Nosso Impacto */}
          <section className="mb-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-display font-bold text-foreground mb-4">
                O Impacto que Criamos Juntos
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Cada interação no Praieiro gera ondas de mudança positiva. 
                Veja como estamos transformando a economia praiana de Salvador.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 text-center bg-gradient-to-br from-primary/5 to-transparent">
                <Handshake className="h-8 w-8 text-primary mx-auto mb-3" />
                <h4 className="font-bold text-2xl text-foreground">+500</h4>
                <p className="text-sm text-muted-foreground">Praieiros cadastrados</p>
              </Card>
              <Card className="p-5 text-center bg-gradient-to-br from-green-500/5 to-transparent">
                <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-3" />
                <h4 className="font-bold text-2xl text-foreground">40%</h4>
                <p className="text-sm text-muted-foreground">Aumento em vendas</p>
              </Card>
              <Card className="p-5 text-center bg-gradient-to-br from-red-500/5 to-transparent">
                <Heart className="h-8 w-8 text-red-500 mx-auto mb-3" />
                <h4 className="font-bold text-2xl text-foreground">12</h4>
                <p className="text-sm text-muted-foreground">Praias conectadas</p>
              </Card>
              <Card className="p-5 text-center bg-gradient-to-br from-emerald-500/5 to-transparent">
                <Leaf className="h-8 w-8 text-emerald-600 mx-auto mb-3" />
                <h4 className="font-bold text-2xl text-foreground">100%</h4>
                <p className="text-sm text-muted-foreground">Digital e sustentável</p>
              </Card>
            </div>
          </section>

          {/* Visão de Futuro */}
          <section className="mb-16 text-center">
            <Globe className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-display font-bold text-foreground mb-4">
              Nosso Sonho para o Futuro
            </h2>
            <p className="text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-6">
              Começamos em Salvador, mas nosso sonho é levar o Praieiro para todo o litoral brasileiro. 
              Queremos que cada praia do país tenha seus Praieiros reconhecidos e valorizados. 
              Queremos que cada família que vive da economia praiana tenha acesso às ferramentas que 
              podem transformar suas vidas.
            </p>
            <p className="text-lg font-semibold text-primary mb-8">
              Porque acreditamos que tecnologia com propósito pode mudar o mundo — 
              uma onda de cada vez. 🌊
            </p>

            {/* Instagram CTA Final */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                onClick={openInstagram}
                size="lg"
                className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-700 hover:via-pink-700 hover:to-orange-600"
              >
                <Instagram className="h-5 w-5 mr-2" />
                Siga @praieiro.ssa no Instagram
              </Button>
              <Button 
                variant="outline"
                size="lg"
                onClick={() => navigate("/auth")}
              >
                Comece Agora
              </Button>
            </div>
          </section>

          {/* Footer com créditos */}
          <section className="text-center py-8 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Com 💙 de Salvador, Bahia, Brasil para o mundo
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={openInstagram}
                className="text-muted-foreground hover:text-pink-600"
              >
                <Instagram className="h-4 w-4 mr-1" />
                @praieiro.ssa
              </Button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
