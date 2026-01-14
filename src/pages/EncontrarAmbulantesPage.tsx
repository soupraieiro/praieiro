import { useState } from "react";
import { Header } from "@/components/Header";
import { BeachSelector } from "@/components/BeachSelector";
import { VendorList } from "@/components/VendorList";
import { VendorMap } from "@/components/VendorMap";
import { PraieiroWallet } from "@/components/PraieiroWallet";
import { ArrowLeft, MapPin, Waves, Map, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import heroBeach from "@/assets/hero-beach.jpg";
import logo from "@/assets/logo-praieiro-circle.png";

interface Beach {
  id: string;
  beach_name: string;
  city: string;
  is_active: boolean;
}

export default function EncontrarAmbulantesPage() {
  const [selectedBeach, setSelectedBeach] = useState<Beach | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero com imagem de praia */}
      <section className="relative pt-20 pb-12 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBeach})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-background" />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 py-8 text-center">
          {/* Logo */}
          <img 
            src={logo} 
            alt="Praieiro" 
            className="h-20 md:h-28 mx-auto mb-4 drop-shadow-lg"
          />
          
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white mb-4">
            <Waves className="h-4 w-4" />
            Fase Piloto • Salvador, Bahia, Brasil
          </div>
          <h1 className="text-3xl font-extrabold text-white md:text-5xl drop-shadow-lg">
            O jeito mais fácil de<br />
            <span className="text-accent">pedir direto na sua toalha!</span>
          </h1>
          <p className="mt-4 text-white/90 text-lg max-w-xl mx-auto">
            Encontre vendedores da praia de forma fácil, rápida e segura. Conecte-se direto pelo nosso chat!
          </p>
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

      <main className="container mx-auto px-4 py-8">
        {/* Carteira Digital */}
        <div className="mb-8">
          <PraieiroWallet />
        </div>

        {!selectedBeach ? (
          <>
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-primary">
              <MapPin className="h-6 w-6 text-accent" />
              Selecione sua praia
            </h2>
            <BeachSelector
              onSelectBeach={setSelectedBeach}
              selectedBeachId={selectedBeach?.id}
            />
          </>
        ) : (
          <>
            <div className="mb-6 flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedBeach(null)}
                className="gap-2 rounded-full border-primary text-primary hover:bg-primary hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-primary">
                    Praia {selectedBeach.beach_name}
                  </h2>
                  <p className="text-sm text-muted-foreground">{selectedBeach.city}</p>
                </div>
              </div>
            </div>

            <Tabs defaultValue="map" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                <TabsTrigger value="map" className="gap-2">
                  <Map className="h-4 w-4" />
                  Mapa
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-2">
                  <List className="h-4 w-4" />
                  Lista
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="map">
                <VendorMap beachId={selectedBeach.id} beachName={selectedBeach.beach_name} />
              </TabsContent>
              
              <TabsContent value="list">
                <VendorList
                  beachId={selectedBeach.id}
                  beachName={selectedBeach.beach_name}
                  isActive={selectedBeach.is_active}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

    </div>
  );
}
