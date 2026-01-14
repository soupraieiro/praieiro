/**
 * 🏛️ AUTH PAGE — FLUXO CANÔNICO
 * 
 * ESTRUTURA:
 * - LOGIN: email/nickname + senha, Google, link "Não tem conta? Cadastre-se"
 * - CADASTRO: nome social + email + senha, Google, link "Já tem conta? Faça login"
 * 
 * REGRAS:
 * - Não existe fluxo especial para admin
 * - OAuth e Email sempre redirecionam para /auth/callback
 * - Profile é criado pelo backend trigger
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { TermsConsentDialog } from "@/components/TermsConsentDialog";
import { supabase } from "@/integrations/supabase/client";
import logoPraieiro from "@/assets/logo-praieiro-circle.png";

// Validações
const emailSchema = z.string().email("E-mail inválido");
const passwordSchema = z.string().min(6, "Senha deve ter pelo menos 6 caracteres");
const displayNameSchema = z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(50, "Nome muito longo");

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp, signInWithGoogle, user, loading } = useAuth();

  // Determina o modo inicial pela URL
  const initialMode = searchParams.get('modo') === 'cadastro' ? 'signup' : 'login';
  
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // Se já está logado, redireciona para o feed
  useEffect(() => {
    if (!loading && user) {
      navigate("/feed", { replace: true });
    }
  }, [user, loading, navigate]);

  // Validação do formulário
  const validateForm = (): boolean => {
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast({ title: "E-mail inválido", description: emailResult.error.errors[0].message, variant: "destructive" });
      return false;
    }

    if (mode !== 'forgot') {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        toast({ title: "Senha inválida", description: passwordResult.error.errors[0].message, variant: "destructive" });
        return false;
      }
    }

    if (mode === 'signup') {
      const nameResult = displayNameSchema.safeParse(displayName.trim());
      if (!nameResult.success) {
        toast({ title: "Nome inválido", description: nameResult.error.errors[0].message, variant: "destructive" });
        return false;
      }
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (mode === 'forgot') {
      await handleForgotPassword();
      return;
    }

    if (mode === 'signup') {
      // Mostra termos antes do cadastro
      setShowTerms(true);
      return;
    }

    // Login
    await handleLogin();
  };

  // Login
  const handleLogin = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        const message = error.message.includes("Invalid login credentials")
          ? "E-mail ou senha incorretos."
          : "Erro ao fazer login.";
        toast({ title: "Erro", description: message, variant: "destructive" });
      } else {
        toast({ title: "Bem-vindo!", description: "Login realizado com sucesso." });
        navigate("/feed", { replace: true });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Signup após aceitar termos
  const handleAcceptTerms = async () => {
    setShowTerms(false);
    setIsSubmitting(true);

    try {
      const { error } = await signUp(email, password, displayName.trim());
      
      if (error) {
        let message = "Erro ao criar conta.";
        if (error.message.includes("User already registered")) {
          message = "Este e-mail já está cadastrado. Faça login.";
        } else if (error.message.includes("Password should be at least")) {
          message = "A senha deve ter pelo menos 6 caracteres.";
        }
        toast({ title: "Erro no cadastro", description: message, variant: "destructive" });
        return;
      }

      toast({
        title: "Conta criada!",
        description: "Verifique seu e-mail para confirmar o cadastro.",
      });
      
      // Muda para modo login após cadastro
      setMode('login');
      setPassword("");
      
    } finally {
      setIsSubmitting(false);
    }
  };

  // Esqueci senha
  const handleForgotPassword = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      
      if (error) {
        toast({ title: "Erro", description: "Não foi possível enviar o e-mail.", variant: "destructive" });
      } else {
        toast({ title: "E-mail enviado!", description: "Verifique sua caixa de entrada." });
        setMode('login');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google login
  const handleGoogleLogin = async () => {
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);
    
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast({
          title: "Erro ao entrar com Google",
          description: error.message.includes("provider_not_enabled")
            ? "Login com Google não está habilitado."
            : error.message,
          variant: "destructive",
        });
        setIsGoogleLoading(false);
      }
      // Não reseta loading - o redirect vai acontecer
    } catch {
      toast({ title: "Erro", description: "Não foi possível conectar ao Google.", variant: "destructive" });
      setIsGoogleLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-md mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>

          <div className="bg-card rounded-2xl shadow-xl p-6 sm:p-8 border">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg bg-white flex items-center justify-center">
                <img src={logoPraieiro} alt="Praieiro" className="w-16 h-16 object-contain" />
              </div>
              <h1 className="text-xl font-bold text-primary">
                {mode === 'forgot' ? "Recuperar Senha" : mode === 'login' ? "Fazer Login" : "Criar Conta"}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {mode === 'forgot'
                  ? "Digite seu e-mail para recuperar sua senha"
                  : mode === 'login'
                    ? "Acesse sua conta Praieiro"
                    : "Cadastre-se para encontrar seu Praieiro"}
              </p>
            </div>

            {/* Google Button (não mostra em "esqueci senha") */}
            {mode !== 'forgot' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full py-5 rounded-full text-base font-medium border-2 hover:bg-muted/50 min-h-[48px] flex items-center justify-center gap-3"
                  onClick={handleGoogleLogin}
                  disabled={isGoogleLoading || isSubmitting}
                >
                  {isGoogleLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                      <span>Conectando...</span>
                    </div>
                  ) : (
                    <>
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      {mode === 'login' ? "Entrar com Google" : "Cadastrar com Google"}
                    </>
                  )}
                </Button>

                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">ou</span>
                  </div>
                </div>
              </>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome social - apenas no cadastro */}
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="displayName">Nome social</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="Como você quer ser chamado?"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-10"
                      maxLength={50}
                    />
                  </div>
                </div>
              )}

              {/* E-mail */}
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Senha - não mostra em "esqueci senha" */}
              {mode !== 'forgot' && (
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Esqueci senha - apenas no login */}
              {mode === 'login' && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-5 rounded-full text-base min-h-[48px]"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Aguarde..."
                  : mode === 'forgot'
                    ? "Enviar link"
                    : mode === 'login'
                      ? "Entrar"
                      : "Criar conta"}
              </Button>
            </form>

            {/* Links de alternância */}
            <div className="mt-6 text-center">
              {mode === 'forgot' ? (
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Voltar ao login
                </button>
              ) : mode === 'login' ? (
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Não tem conta? <span className="text-primary font-medium">Cadastre-se</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Já tem conta? <span className="text-primary font-medium">Faça login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Terms Dialog */}
      <TermsConsentDialog
        open={showTerms}
        onAccept={handleAcceptTerms}
        onDecline={() => {
          setShowTerms(false);
          toast({ title: "Termos não aceitos", description: "É necessário aceitar os termos.", variant: "destructive" });
        }}
        type="client"
      />
    </div>
  );
}
