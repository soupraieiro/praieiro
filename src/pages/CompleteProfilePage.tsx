import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, User, Phone, Calendar, Shield } from "lucide-react";

// Formatação de CPF
const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
};

// Formatação de telefone
const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
};

export default function CompleteProfilePage() {
  const { user, loading, hasProfile, profileLoading, checkProfile } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWaitingForProfile, setIsWaitingForProfile] = useState(false);

  // Aguardar profile ser criado pelo trigger (com retry)
  const waitForProfile = async (maxAttempts = 10, delayMs = 500): Promise<boolean> => {
    setIsWaitingForProfile(true);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const exists = await checkProfile();
      if (exists) {
        setIsWaitingForProfile(false);
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    setIsWaitingForProfile(false);
    return false;
  };

  useEffect(() => {
    // AXIOMA A6 — Anti-Loop Absoluto: decisão explícita de estado
    
    // SE não autenticado → /auth
    if (!loading && !user) {
      navigate('/auth', { replace: true });
      return;
    }

    // Tentar aguardar criação do profile pelo trigger (backend soberano)
    if (user && !hasProfile && !profileLoading && !isWaitingForProfile) {
      waitForProfile();
    }
  }, [user, loading, hasProfile, profileLoading, navigate, isWaitingForProfile]);

  // Preencher nome do Google se disponível
  useEffect(() => {
    if (user?.user_metadata?.full_name && !fullName) {
      setFullName(user.user_metadata.full_name);
    }
  }, [user, fullName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Sessão expirada. Faça login novamente.");
      navigate('/auth');
      return;
    }

    if (!fullName.trim()) {
      toast.error("Nome completo é obrigatório");
      return;
    }

    setIsSubmitting(true);

    try {
      // Verificar se profile existe agora
      const profileExists = await checkProfile();
      
      if (!profileExists) {
        // Profile ainda não foi criado pelo trigger - mostrar mensagem
        toast.error("Seu perfil ainda está sendo criado. Aguarde alguns segundos e tente novamente.");
        setIsSubmitting(false);
        // Tentar aguardar mais um pouco
        await waitForProfile(5, 1000);
        return;
      }

      // CORRECT: profiles.id = auth.users.id (identidade soberana)
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.replace(/\D/g, '') || null,
          cpf: cpf.replace(/\D/g, '') || null,
          data_nascimento: birthDate || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        toast.error("Erro ao salvar perfil. Tente novamente.");
        setIsSubmitting(false);
        return;
      }

      toast.success("Perfil salvo com sucesso!");
      // FLUXO CANÔNICO: após completar profile → /feed
      navigate('/feed', { replace: true });
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error("Erro inesperado. Tente novamente.");
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loading || profileLoading || isWaitingForProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">
          {isWaitingForProfile ? "Preparando seu perfil..." : "Carregando..."}
        </p>
      </div>
    );
  }

  // Se já tem profile completo, redirecionar para feed
  // (verificação adicional para evitar flash de conteúdo)
  if (hasProfile && profile?.full_name && profile?.cpf && profile?.data_nascimento) {
    navigate('/feed', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 pt-20 pb-12">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <User className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Complete seu perfil</CardTitle>
              <CardDescription>
                Precisamos de algumas informações para continuar
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nome completo *
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    CPF
                  </Label>
                  <Input
                    id="cpf"
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data de nascimento
                  </Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting || !fullName.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Continuar"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
