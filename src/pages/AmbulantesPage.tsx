import { Header } from "@/components/Header";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { StepCard } from "@/components/StepCard";
import { FeatureCard } from "@/components/FeatureCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroBeach from "@/assets/hero-beach.jpg";
import {
  Users,
  TrendingUp,
  MapPin,
  MessageCircle,
  ArrowRight,
  Sparkles,
  Clock,
  CheckCircle2,
} from "lucide-react";

export default function AmbulantesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-16">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBeach})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/85 via-primary/70 to-primary/90" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-20 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent/20 px-4 py-2 text-accent font-medium">
            <Sparkles className="h-4 w-4" />
            Fase de Validação
          </div>

          <h1 className="mb-6 text-4xl font-extrabold text-primary-foreground md:text-5xl lg:text-6xl leading-tight">
            Seja um Herói da Areia
            <span className="block text-accent mt-2 text-2xl md:text-3xl lg:text-4xl font-semibold">
              Seja Praieiro
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-primary-foreground/90 md:text-xl">
            Um novo canal para você ser encontrado pelos clientes na praia.
          </p>

          <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg">
            <Link to="/login-ambulante">
              Quero ser parceiro
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>

        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" className="w-full h-auto">
            <path
              fill="hsl(var(--background))"
              d="M0,64L48,69.3C96,75,192,85,288,90.7C384,96,480,96,576,85.3C672,75,768,53,864,48C960,43,1056,53,1152,64C1248,75,1344,85,1392,90.7L1440,96L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
            />
          </svg>
        </div>
      </section>

      {/* O que é o Praieiro */}
      <section className="section-padding">
        <div className="container mx-auto">
          <h2 className="mb-6 text-center text-3xl font-bold text-foreground md:text-4xl">
            O que é o Praieiro para você
          </h2>
          <p className="mx-auto mb-12 max-w-3xl text-center text-muted-foreground text-lg">
            Uma plataforma de conexão que aumenta sua visibilidade, facilita o contato com
            clientes e oferece ferramentas de gestão para seu negócio na praia.
          </p>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={Users}
              title="Mais clientes"
              description="Seja encontrado por quem está procurando o que você vende"
            />
            <FeatureCard
              icon={MapPin}
              title="Posicionamento"
              description="Apareça para clientes na sua praia de atuação"
            />
            <FeatureCard
              icon={TrendingUp}
              title="Perfil com produtos"
              description="Mostre o que você oferece de forma organizada"
            />
            <FeatureCard
              icon={MessageCircle}
              title="Contato direto"
              description="Receba pedidos diretamente no seu WhatsApp"
            />
          </div>
        </div>
      </section>

      {/* Como vai funcionar */}
      <section className="section-padding sand-gradient">
        <div className="container mx-auto">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground md:text-4xl">
            Como vai funcionar
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            <StepCard
              step={1}
              title="Você se cadastra"
              description="Cria seu perfil com informações sobre o que você vende"
            />
            <StepCard
              step={2}
              title="Seu perfil fica online"
              description="Clientes podem te encontrar na plataforma"
            />
            <StepCard
              step={3}
              title="Você recebe pedidos"
              description="Os clientes entram em contato pelo WhatsApp"
            />
          </div>
        </div>
      </section>

      {/* Status do Projeto */}
      <section className="section-padding">
        <div className="container mx-auto">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary font-medium">
              <Clock className="h-4 w-4" />
              Status atual
            </div>

            <h2 className="mb-6 text-3xl font-bold text-foreground md:text-4xl">
              Estamos na Fase 0
            </h2>

            <p className="mb-8 text-lg text-muted-foreground">
              Estamos estruturando a plataforma e cadastrando os primeiros Heróis da Areia.
              Seja um dos primeiros a fazer parte do Praieiro e ganhe 6 meses de acesso 
              gratuito aos indicadores de gestão!
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 rounded-lg bg-card px-4 py-3 border border-border/50">
                <CheckCircle2 className="h-5 w-5 text-whatsapp" />
                <span className="text-sm font-medium">Site no ar</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-card px-4 py-3 border border-border/50">
                <CheckCircle2 className="h-5 w-5 text-whatsapp" />
                <span className="text-sm font-medium">Validando interesse</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-card px-4 py-3 border border-border/50">
                <Clock className="h-5 w-5 text-accent" />
                <span className="text-sm font-medium">Cadastro em breve</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="section-padding ocean-gradient">
        <div className="container mx-auto text-center">
          <h2 className="mb-4 text-3xl font-bold text-primary-foreground md:text-4xl">
            Pronto para aumentar suas vendas na praia?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-primary-foreground/90">
            Cadastre-se gratuitamente e seja encontrado pelos clientes
          </p>

          <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg">
            <Link to="/login-ambulante">
              Cadastre-se agora
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary py-8 text-center text-primary-foreground/70 text-sm">
        <p>© 2026 Praieiro — Conectando você aos Heróis da Areia</p>
      </footer>

      {/* Floating WhatsApp Button */}
      <WhatsAppButton
        message="Olá, tenho interesse em ser ambulante parceiro do Praieiro."
        variant="floating"
      >
        WhatsApp
      </WhatsAppButton>
    </div>
  );
}
