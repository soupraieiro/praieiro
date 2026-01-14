import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Store,
  ChevronRight,
  Sparkles,
  MapPin,
  MessageCircle,
  Shield,
  Phone,
  Wallet,
  Thermometer,
  Loader2,
  Bitcoin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOpenWeather } from "@/hooks/useOpenWeather";
import { LocationTimeWidget } from "@/components/LocationTimeWidget";
import logoPraieiro from "@/assets/logo-praieiro-circle.png";
import heroFarol from "@/assets/hero-farol-barra.jpg";

interface LocationData {
  city: string;
  state: string;
  country: string;
  temp: number | null;
  loading: boolean;
}

type UserIdentity = "cliente" | "praieiro" | null;

const STATE_CODES: Record<string, string> = {
  Acre: "AC",
  Alagoas: "AL",
  Amapá: "AP",
  Amazonas: "AM",
  Bahia: "BA",
  Ceará: "CE",
  "Distrito Federal": "DF",
  "Espírito Santo": "ES",
  Goiás: "GO",
  Maranhão: "MA",
  "Mato Grosso": "MT",
  "Mato Grosso do Sul": "MS",
  "Minas Gerais": "MG",
  Pará: "PA",
  Paraíba: "PB",
  Paraná: "PR",
  Pernambuco: "PE",
  Piauí: "PI",
  "Rio de Janeiro": "RJ",
  "Rio Grande do Norte": "RN",
  "Rio Grande do Sul": "RS",
  Rondônia: "RO",
  Roraima: "RR",
  "Santa Catarina": "SC",
  "São Paulo": "SP",
  Sergipe: "SE",
  Tocantins: "TO",
};

const COUNTRY_NAMES: Record<string, string> = {
  BR: "Brasil",
  US: "Estados Unidos",
  AR: "Argentina",
  PT: "Portugal",
  ES: "Espanha",
  UK: "Reino Unido",
};
const speakText = async (text: string) => {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      text,
      voiceId: "JBFqnCBsd6RMkjVDRZzb",
    }),
  });

  // 🔴 Fallback de segurança
  if (!response.ok) {
    console.warn("TTS falhou, fallback para texto");

    toast({
      title: "Praieiro Bot",
      description: text,
    });

    return; // NÃO tenta tocar áudio
  }

  // ✅ Voz OK
  const audioBlob = await response.blob();
  const audio = new Audio(URL.createObjectURL(audioBlob));
  audio.play();
};
export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { getCurrentWeather } = useOpenWeather();

  const [selectedIdentity, setSelectedIdentity] = useState<UserIdentity>(null);
  const [locationData, setLocationData] = useState<LocationData>({
    city: "Salvador",
    state: "BA",
    country: "Brasil",
    temp: null,
    loading: true,
  });
  const [satoshiLastro, setSatoshiLastro] = useState<number>(0);

  // Satoshi lastro
  useEffect(() => {
    const fetchSatoshiPrice = async () => {
      const baseValue = 0.00000042;
      const fluctuation = (Math.random() - 0.5) * 0.00000005;
      setSatoshiLastro(baseValue + fluctuation);
    };
    fetchSatoshiPrice();
    const interval = setInterval(fetchSatoshiPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch location
  useEffect(() => {
    const fetchLocation = async () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              const weather = await getCurrentWeather({ lat: latitude, lon: longitude });
              if (weather) {
                let state = "";
                try {
                  const geoResponse = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=pt-BR`,
                  );
                  const geoData = await geoResponse.json();
                  state = geoData.address?.state || "";
                } catch {
                  /* ignore */
                }
                const stateAbbr = STATE_CODES[state] || state || "";
                const countryName = COUNTRY_NAMES[weather.country] || weather.country;
                setLocationData({
                  city: weather.city,
                  state: stateAbbr,
                  country: countryName,
                  temp: Math.round(weather.temp),
                  loading: false,
                });
              } else {
                setLocationData((prev) => ({ ...prev, loading: false }));
              }
            } catch {
              setLocationData((prev) => ({ ...prev, loading: false }));
            }
          },
          async () => {
            try {
              const weather = await getCurrentWeather({ city: "Salvador" });
              if (weather) {
                setLocationData({
                  city: weather.city,
                  state: "BA",
                  country: "Brasil",
                  temp: Math.round(weather.temp),
                  loading: false,
                });
              } else {
                setLocationData((prev) => ({ ...prev, loading: false }));
              }
            } catch {
              setLocationData((prev) => ({ ...prev, loading: false }));
            }
          },
          { timeout: 5000, maximumAge: 300000 },
        );
      } else {
        setLocationData((prev) => ({ ...prev, loading: false }));
      }
    };
    fetchLocation();
  }, [getCurrentWeather]);

  // Redirect logged-in users
  useEffect(() => {
    if (!loading && user) {
      navigate("/feed");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <img src={logoPraieiro} alt="Praieiro" className="h-16 w-auto opacity-50" />
        </div>
      </div>
    );
  }

  const handleIdentitySelect = (identity: UserIdentity) => {
    setSelectedIdentity(identity);
  };

  const handleBack = () => {
    setSelectedIdentity(null);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroFarol} alt="Farol da Barra" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoPraieiro} alt="Praieiro" className="h-10 w-auto" />
              <span className="text-xl font-display font-bold text-white">Praieiro</span>
            </div>
            <nav className="hidden md:flex items-center gap-4">
              <Link to="/sobre" className="text-white/80 hover:text-white transition-colors text-sm">
                Sobre
              </Link>
              <Link to="/autenticacao">
                <Button variant="secondary" size="sm">
                  Entrar
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center pt-16 pb-8 px-4">
        <AnimatePresence mode="wait">
          {!selectedIdentity ? (
            // IDENTITY SELECTION SCREEN
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="max-w-lg w-full"
            >
              {/* Widget de Localização e Tempo */}
              <div className="flex justify-center mb-6">
                <LocationTimeWidget />
              </div>

              {/* Logo com Sol de Plasma */}
              <div className="text-center mb-8">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  {/* Outer Plasma Aura */}
                  <motion.div
                    className="absolute inset-[-18px] rounded-full"
                    animate={{
                      scale: [1, 1.25, 1.15, 1],
                      rotate: [0, 180, 360],
                      opacity: [0.5, 0.25, 0.4, 0.5],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    style={{
                      background:
                        "conic-gradient(from 0deg, rgba(255,100,0,0.6), rgba(200,60,0,0.4), rgba(255,140,0,0.6), rgba(180,50,0,0.4), rgba(255,100,0,0.6))",
                      filter: "blur(14px)",
                    }}
                  />

                  {/* Middle Plasma Ring - Rotating */}
                  <motion.div
                    className="absolute inset-[-12px] rounded-full"
                    animate={{
                      scale: [1.05, 1.35, 1.2, 1.05],
                      rotate: [360, 180, 0],
                      opacity: [0.55, 0.3, 0.45, 0.55],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      background:
                        "conic-gradient(from 90deg, rgba(255,80,0,0.7), transparent, rgba(255,120,0,0.7), transparent, rgba(255,80,0,0.7))",
                      filter: "blur(10px)",
                    }}
                  />

                  {/* Inner Plasma Ring - Pulsing */}
                  <motion.div
                    className="absolute inset-[-5px] rounded-full"
                    animate={{
                      scale: [1, 1.18, 1.1, 1],
                      opacity: [0.75, 0.45, 0.6, 0.75],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
                    style={{
                      background:
                        "radial-gradient(circle, rgba(255,140,0,0.8) 0%, rgba(220,80,0,0.5) 60%, transparent 80%)",
                      filter: "blur(5px)",
                    }}
                  />

                  {/* Solar Core - The Sun Ball */}
                  <motion.div
                    className="relative w-full h-full rounded-full flex items-center justify-center overflow-hidden"
                    animate={{
                      scale: [1, 1.08, 1.04, 1],
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      background:
                        "radial-gradient(circle at 35% 35%, #ffcc00 0%, #ff8c00 40%, #d85000 70%, #b33d00 100%)",
                      boxShadow: `
                        0 0 30px rgba(255, 140, 0, 0.95),
                        0 0 60px rgba(255, 100, 0, 0.7),
                        0 0 100px rgba(200, 60, 0, 0.5),
                        inset 0 0 25px rgba(255, 200, 0, 0.4)
                      `,
                    }}
                  >
                    {/* Solar Flare Effects */}
                    <motion.div
                      className="absolute inset-2 rounded-full"
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                      style={{
                        background: "radial-gradient(circle at 30% 30%, rgba(255, 220, 100, 0.5) 0%, transparent 60%)",
                      }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      style={{
                        background:
                          "conic-gradient(from 0deg, transparent 0%, rgba(255, 180, 50, 0.15) 10%, transparent 20%, rgba(255, 140, 0, 0.1) 30%, transparent 40%)",
                      }}
                    />

                    {/* Logo on top */}
                    <img src={logoPraieiro} alt="Praieiro" className="h-20 w-20 object-contain relative z-10" />
                  </motion.div>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">Bem-vindo ao Praieiro</h1>
                <p className="text-white/70 text-lg">Quem é você na praia?</p>
              </div>

              {/* Identity Cards */}
              <div className="space-y-4">
                {/* CLIENTE */}
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleIdentitySelect("cliente")}
                  className="w-full p-5 rounded-2xl border-2 border-white/30 hover:border-primary bg-white/10 backdrop-blur-md text-left transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
                      <User className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-white flex items-center gap-2">
                        Sou Cliente
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200">Explorar</span>
                      </h3>
                      <p className="text-sm text-white/70 mt-0.5">
                        Peça direto da sua toalha! Encontre vendedores, comida, bebida e serviços da praia de forma
                        fácil e segura.
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-white/50 shrink-0" />
                  </div>
                </motion.button>

                {/* PRAIEIRO */}
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleIdentitySelect("praieiro")}
                  className="w-full p-5 rounded-2xl border-2 border-white/30 hover:border-primary bg-white/10 backdrop-blur-md text-left transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center shrink-0">
                      <Sparkles className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-white flex items-center gap-2">
                        Sou Praieiro
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/30 text-primary-foreground">
                          🦸 Herói da Praia
                        </span>
                      </h3>
                      <p className="text-sm text-white/70 mt-0.5">
                        Ambulantes, barracas, restaurantes: abra seu marketplace e ganhe dinheiro vendendo na
                        plataforma!
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-white/50 shrink-0" />
                  </div>
                </motion.button>
              </div>

              {/* Already registered links */}
              <div className="text-center mt-6 space-y-3">
                <p className="text-white/50 text-xs uppercase tracking-wide">Já é cadastrado?</p>
                <Link
                  to="/autenticacao"
                  className="inline-block px-6 py-2.5 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all text-sm font-medium"
                >
                  Faça login
                </Link>
              </div>
            </motion.div>
          ) : (
            // HERO SCREEN AFTER SELECTION
            <motion.div
              key="hero"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="max-w-3xl w-full text-center"
            >
              {/* Back Button */}
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={handleBack}
                className="absolute top-20 left-4 md:left-8 text-white/70 hover:text-white flex items-center gap-1 text-sm"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                Voltar
              </motion.button>

              {/* Location Widget */}
              <div className="mb-6">
                <div className="inline-flex flex-col items-center gap-2 px-6 py-4 rounded-2xl bg-black/40 backdrop-blur-md text-white shadow-xl border border-white/20">
                  <div className="flex items-center gap-3 text-lg font-medium">
                    <MapPin className="h-5 w-5 text-primary" />
                    {locationData.loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Localizando...
                      </span>
                    ) : (
                      <span className="font-medium">
                        {locationData.city}, {locationData.state}, {locationData.country}
                        {locationData.temp !== null && (
                          <span className="ml-2 text-primary font-bold">{locationData.temp}°</span>
                        )}
                      </span>
                    )}
                  </div>
                  {!locationData.loading && (
                    <div className="flex items-center gap-4 text-sm">
                      {locationData.temp !== null && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/20 text-orange-300">
                          <Thermometer className="h-4 w-4" />
                          <span className="font-bold">{locationData.temp}°C</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300">
                        <Bitcoin className="h-4 w-4" />
                        <span className="font-bold font-mono">
                          {satoshiLastro > 0 ? `${(satoshiLastro * 100000000).toFixed(0)} sats` : "-- sats"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Logo */}
              <div className="mb-8">
                <div
                  className="w-40 h-40 md:w-52 md:h-52 mx-auto rounded-full bg-white shadow-2xl border-4 border-white flex items-center justify-center overflow-hidden"
                  style={{
                    boxShadow:
                      "0 20px 60px rgba(0,0,0,0.3), 0 0 0 4px rgba(255,255,255,0.9), 0 0 80px rgba(14,165,233,0.3)",
                  }}
                >
                  <img src={logoPraieiro} alt="Praieiro" className="h-32 md:h-44 w-auto object-contain" />
                </div>
              </div>

              {/* Title based on identity */}
              {selectedIdentity === "cliente" ? (
                <>
                  <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-6 leading-tight">
                    O jeito mais fácil de
                    <br />
                    <span className="text-primary">pedir direto DA sua toalha!</span>
                  </h1>
                  <p className="text-lg md:text-xl text-white/80 mb-8 max-w-xl mx-auto">
                    Encontre vendedores da praia de forma fácil, rápida e segura. Conecte-se direto no nosso chat!
                  </p>

                  {/* Benefits for Client */}
                  <div className="flex flex-wrap justify-center gap-3 mb-8 max-w-lg mx-auto">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm">
                      <MessageCircle className="h-4 w-4 text-primary" />
                      Chat direto
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm">
                      <MapPin className="h-4 w-4 text-primary" />
                      Geolocalização
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm">
                      <Shield className="h-4 w-4 text-primary" />
                      Seguro
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-6 leading-tight">
                    🦸 Herói da Praia
                    <br />
                    <span className="text-primary">Abra seu Marketplace!</span>
                  </h1>
                  <p className="text-lg md:text-xl text-white/80 mb-8 max-w-xl mx-auto">
                    Ambulantes, barracas, restaurantes: venda na plataforma e alcance clientes direto na praia!
                  </p>

                  {/* Benefits for Praieiro */}
                  <div className="flex flex-wrap justify-center gap-3 mb-8 max-w-lg mx-auto">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm">
                      <Wallet className="h-4 w-4 text-primary" />
                      Ganhe dinheiro
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm">
                      <Store className="h-4 w-4 text-primary" />
                      Sua loja online
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm">
                      <Phone className="h-4 w-4 text-primary" />
                      Clientes na palma
                    </div>
                  </div>
                </>
              )}

              {/* CTA Button */}
              <Link
                to={
                  selectedIdentity === "cliente"
                    ? "/autenticacao?modo=cadastro&tipo=cliente"
                    : "/autenticacao?modo=cadastro&tipo=praieiro"
                }
              >
                <Button
                  size="lg"
                  className="text-lg px-10 py-7 rounded-full font-bold shadow-2xl bg-primary hover:bg-primary/90"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Cadastre-se Grátis
                </Button>
              </Link>

              {/* Already registered */}
              <div className="text-center mt-6 space-y-2">
                <p className="text-white/50 text-xs uppercase tracking-wide">Já é cadastrado?</p>
                <Link
                  to="/autenticacao"
                  className="inline-block px-6 py-2.5 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all text-sm font-medium"
                >
                  Faça login
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scroll Indicator */}
      {!selectedIdentity && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-1">
            <div className="w-1.5 h-3 bg-white/70 rounded-full animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );
}
