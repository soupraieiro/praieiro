import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { ProfileForm } from "@/components/ProfileForm";
import { TransactionsDashboard } from "@/components/TransactionsDashboard";
import { PraieiroWallet } from "@/components/PraieiroWallet";
import { AssetSecurityPanel } from "@/components/AssetSecurityPanel";
import { DayOffToggle } from "@/components/profile/DayOffToggle";
import { VoiceActivationToggle } from "@/components/praerobot/VoiceActivationToggle";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, LogOut, User, Receipt, Wallet, Shield, Settings } from "lucide-react";
import { Navigate } from "react-router-dom";

export default function PerfilPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading, hasProfile } = useProfile();
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    return localStorage.getItem("praieiro_voice_enabled") === "true";
  });

  const handleVoiceChange = (enabled: boolean) => {
    setVoiceEnabled(enabled);
    localStorage.setItem("praieiro_voice_enabled", String(enabled));
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Se não tem perfil, mostra formulário de cadastro
  if (!hasProfile) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-lg mx-auto py-8">
          <h1 className="text-2xl font-bold text-center mb-6">
            Complete seu Cadastro
          </h1>
          <ProfileForm />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Olá, {profile?.full_name?.split(" ")[0]}</h1>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="wallet" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-5 mx-auto mb-6">
            <TabsTrigger value="wallet">
              <Wallet className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Carteira</span>
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Segurança</span>
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <Receipt className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Transações</span>
            </TabsTrigger>
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Config</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wallet">
            <PraieiroWallet />
          </TabsContent>

          <TabsContent value="security">
            <div className="max-w-md mx-auto">
              <AssetSecurityPanel />
            </div>
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionsDashboard />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileForm />
          </TabsContent>

          <TabsContent value="settings">
            <div className="max-w-md mx-auto space-y-4">
              <h2 className="text-lg font-semibold mb-4">Configurações</h2>
              
              {/* Day Off Toggle - sempre disponível para todos (praieiros podem usar) */}
              <DayOffToggle />
              
              {/* Voice Activation Toggle */}
              <VoiceActivationToggle 
                voiceEnabled={voiceEnabled} 
                onVoiceChange={handleVoiceChange} 
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
