import { Header } from "@/components/Header";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import logo from "@/assets/logo-praieiro-circle.png";
import {
  Target,
  Compass,
  Users,
  MapPin,
  MessageCircle,
  ArrowRight,
  CheckCircle,
  Circle,
  Rocket,
  BarChart3,
} from "lucide-react";

const roadmapItems = [
  {
    phase: "Fase 0",
    title: "Site + Validação",
    description: "Apresentar o conceito e validar interesse de clientes e ambulantes",
    status: "current",
  },
  {
    phase: "Fase 1",
    title: "Cadastro de Ambulantes",
    description: "Sistema de cadastro e listagem por praia",
    status: "upcoming",
  },
  {
    phase: "Fase 2",
    title: "Integração com Localização",
    description: "Encontrar ambulantes próximos em tempo real",
    status: "upcoming",
  },
  {
    phase: "Fase 3",
    title: "Funções Avançadas",
    description: "Avaliações, pedidos online e mais recursos",
    status: "upcoming",
  },
];

const metricsPreview = [
  { icon: Users, label: "Ambulantes interessados", value: "Em breve" },
  { icon: MapPin, label: "Praias mapeadas", value: "Em breve" },
  { icon: MessageCircle, label: "Contatos via WhatsApp", value: "Em breve" },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-12 md:pt-32 md:pb-16 ocean-gradient">
        <div className="container mx-auto px-4 text-center">
          <img
            src={logo}
            alt="Praieiro"
            className="mx-auto mb-8 h-24 w-auto rounded-2xl shadow-xl md:h-32"
          />
          <h1 className="mb-4 text-3xl font-extrabold text-primary-foreground md:text-4xl lg:text-5xl">
            Sobre o Projeto Praieiro
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-primary-foreground/90">
            Visão institucional e roadmap da plataforma
          </p>
        </div>

        {/* Wave decoration */}
        <div className="mt-12">
          <svg viewBox="0 0 1440 80" className="w-full h-auto">
            <path
              fill="hsl(var(--background))"
              d="M0,32L60,37.3C120,43,240,53,360,53.3C480,53,600,43,720,42.7C840,43,960,53,1080,53.3C1200,53,1320,43,1380,37.3L1440,32L1440,80L1380,80C1320,80,1200,80,1080,80C960,80,840,80,720,80C600,80,480,80,360,80C240,80,120,80,60,80L0,80Z"
            />
          </svg>
        </div>
      </section>

      {/* Visão Geral */}
      <section className="section-padding">
        <div className="container mx-auto">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                Visão Geral do Projeto
              </h2>
            </div>

            <div className="space-y-6 text-muted-foreground">
              <p className="text-lg leading-relaxed">
                O <strong className="text-foreground">Praieiro</strong> é uma plataforma digital
                que conecta banhistas a ambulantes de praia de forma simples, organizada e segura.
              </p>

              <p className="leading-relaxed">
                Nossa missão é facilitar a conexão entre quem está curtindo a praia e os
                trabalhadores que fazem o verão mais especial — os vendedores ambulantes, ou como
                gostamos de chamar: os Praieiros.
              </p>

              <p className="leading-relaxed">
                Acreditamos que a tecnologia pode ajudar na inclusão produtiva desses
                trabalhadores, ao mesmo tempo que oferece mais praticidade e confiança para os
                clientes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="section-padding sand-gradient">
        <div className="container mx-auto">
          <div className="mb-12 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Compass className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Roadmap do Projeto
            </h2>
          </div>

          <div className="mx-auto max-w-3xl">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border md:left-1/2 md:-translate-x-1/2" />

              {roadmapItems.map((item, index) => (
                <div
                  key={item.phase}
                  className={`relative mb-8 flex gap-4 md:gap-8 ${
                    index % 2 === 0 ? "md:flex-row-reverse" : ""
                  }`}
                >
                  {/* Icon */}
                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-background shadow-lg md:absolute md:left-1/2 md:-translate-x-1/2">
                    {item.status === "current" ? (
                      <div className="flex h-full w-full items-center justify-center rounded-full ocean-gradient">
                        <Rocket className="h-5 w-5 text-primary-foreground" />
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div
                    className={`flex-1 rounded-xl bg-card p-5 shadow-md border ${
                      item.status === "current"
                        ? "border-primary/30 ring-2 ring-primary/20"
                        : "border-border/50"
                    } ${index % 2 === 0 ? "md:mr-auto md:w-5/12" : "md:ml-auto md:w-5/12"}`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.status === "current"
                            ? "bg-accent/20 text-accent"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.phase}
                      </span>
                      {item.status === "current" && (
                        <CheckCircle className="h-4 w-4 text-whatsapp" />
                      )}
                    </div>
                    <h3 className="mb-1 font-semibold text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Métricas */}
      <section className="section-padding">
        <div className="container mx-auto">
          <div className="mb-12 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Métricas (em breve)
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {metricsPreview.map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl bg-card p-6 text-center shadow-md border border-border/50"
              >
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <metric.icon className="h-7 w-7 text-primary" />
                </div>
                <p className="mb-2 text-2xl font-bold text-foreground">{metric.value}</p>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contato Institucional */}
      <section className="section-padding ocean-gradient">
        <div className="container mx-auto text-center">
          <h2 className="mb-4 text-3xl font-bold text-primary-foreground md:text-4xl">
            Contato Institucional
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-primary-foreground/90">
            Quer saber mais sobre o projeto ou fazer parceria? Entre em contato com nossa equipe.
          </p>

          <WhatsAppButton
            message="Olá, gostaria de saber mais sobre o projeto Praieiro."
            className="text-lg"
          >
            Falar com equipe do projeto
            <ArrowRight className="h-5 w-5" />
          </WhatsAppButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary py-8 text-center text-primary-foreground/70 text-sm">
        <p>© 2026 Praieiro — Conectando você aos Praieiros</p>
      </footer>

      {/* Floating WhatsApp Button */}
      <WhatsAppButton
        message="Olá, gostaria de saber mais sobre o projeto Praieiro."
        variant="floating"
      >
        WhatsApp
      </WhatsAppButton>
    </div>
  );
}
