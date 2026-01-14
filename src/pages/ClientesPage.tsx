import { Header } from "@/components/Header";
import { StepCard } from "@/components/StepCard";
import { FeatureCard } from "@/components/FeatureCard";
import { CategoryBadge } from "@/components/CategoryBadge";
import { BuyButton } from "@/components/BuyButton";
import heroBeach from "@/assets/hero-beach.jpg";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Shield,
  Wallet,
  Search,
  Coffee,
  Droplets,
  Sandwich,
  Umbrella,
  ShoppingBag,
  Waves,
  UserPlus,
} from "lucide-react";

export default function ClientesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-16">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBeach})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-primary/80" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white mb-6">
            <Waves className="h-4 w-4" />
            Salvador, Bahia, Brasil, América do Sul
          </div>

          <h1 className="mb-6 text-4xl font-extrabold text-white md:text-5xl lg:text-6xl leading-tight drop-shadow-lg">
            O jeito mais fácil de
            <span className="block text-accent mt-2">
              pedir direto na sua toalha!
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-white/90 md:text-xl">
            Encontre vendedores da praia de forma fácil, rápida e segura.
            Conecte-se direto no nosso chat!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-white font-bold text-lg px-8 py-6 rounded-full shadow-lg">
              <Link to="/autenticacao?modo=cadastro">
                <UserPlus className="h-5 w-5 mr-2" />
                Cadastre-se Grátis
              </Link>
            </Button>
          </div>
        </div>

        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" className="w-full h-auto">
            <path
              fill="hsl(var(--background))"
              d="M0,96L48,90.7C96,85,192,75,288,74.7C384,75,480,85,576,90.7C672,96,768,96,864,90.7C960,85,1056,75,1152,69.3C1248,64,1344,64,1392,64L1440,64L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
            />
          </svg>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="section-padding">
        <div className="container mx-auto">
          <h2 className="mb-4 text-center text-3xl font-bold text-primary md:text-4xl">
            Como Funciona
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            Três passos simples para encontrar o que você precisa na praia
          </p>

          <div className="grid gap-8 md:grid-cols-3">
            <StepCard
              step={1}
              title="Cadastre-se"
              description="Crie sua conta grátis em segundos para acessar a plataforma"
            />
            <StepCard
              step={2}
              title="Escolha a praia"
              description="Selecione a praia e veja os Praieiros disponíveis"
            />
            <StepCard
              step={3}
              title="Converse direto"
              description="Fale com o Herói pelo chat nativo"
            />
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="section-padding sand-gradient">
        <div className="container mx-auto">
          <h2 className="mb-12 text-center text-3xl font-bold text-primary md:text-4xl">
            Benefícios para você
          </h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={Search}
              title="Mais opções"
              description="Diversidade de produtos e serviços na palma da sua mão"
            />
            <FeatureCard
              icon={Wallet}
              title="Transparência"
              description="Saiba o que esperar antes mesmo de chamar o Praieiro"
            />
            <FeatureCard
              icon={Shield}
              title="Segurança"
              description="Praieiros verificados para sua tranquilidade"
            />
            <FeatureCard
              icon={MapPin}
              title="Conveniência"
              description="Evite caminhar longas distâncias na areia quente"
            />
          </div>
        </div>
      </section>

      {/* Tipos de Ambulantes */}
      <section className="section-padding">
        <div className="container mx-auto text-center">
          <h2 className="mb-8 text-3xl font-bold text-primary md:text-4xl">
            O que você encontra no Praieiro
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-muted-foreground">
            Diversos tipos de Praieiros prontos para atender você na praia
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <CategoryBadge icon={Coffee} label="Bebidas" />
            <CategoryBadge icon={Droplets} label="Água de Coco" />
            <CategoryBadge icon={Sandwich} label="Comidas & Lanches" />
            <CategoryBadge icon={Umbrella} label="Cadeiras & Guarda-sol" />
            <CategoryBadge icon={ShoppingBag} label="Itens de Praia" />
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="section-padding ocean-gradient">
        <div className="container mx-auto text-center">
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            Pronto para curtir a praia?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-white/90">
            Cadastre-se agora e tenha acesso aos melhores Praieiros da sua região!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-white font-bold text-lg px-8 py-6 rounded-full shadow-lg">
              <Link to="/autenticacao">
                <UserPlus className="h-5 w-5 mr-2" />
                Criar Conta Grátis
              </Link>
            </Button>
            <BuyButton 
              amount={10} 
              productName="Teste Praieiro"
              productDescription="Pagamento de teste"
              className="bg-white hover:bg-white/90 text-primary font-bold text-lg px-8 py-6 rounded-full shadow-lg"
            >
              Testar Pagamento R$ 10,00
            </BuyButton>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary py-8 text-center text-white/70 text-sm">
        <p>© 2026 Praieiro — O jeito mais fácil de pedir direto na sua toalha!</p>
      </footer>
    </div>
  );
}
