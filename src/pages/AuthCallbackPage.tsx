/**
 * 🏛️ AUTH CALLBACK PAGE — CORAÇÃO DO SISTEMA
 * 
 * FLUXO CANÔNICO OBRIGATÓRIO:
 * 
 * Cadastro (email ou Google)
 *         ↓
 * Confirmação de e-mail (Supabase)
 *         ↓
 * /auth/callback  ← ESTA PÁGINA (OBRIGATÓRIA)
 *         ↓
 * Verificar sessão auth
 *         ↓
 * Verificar se profile existe
 *         ├── NÃO → AGUARDAR criação pelo trigger
 *         └── SIM → CONTINUAR
 *         ↓
 * Redirecionar para destino final
 * 
 * ⚠️ REGRA DE OURO:
 * - SE não tem sessão → /auth
 * - SE tem sessão MAS não tem profile → AGUARDAR trigger
 * - SE tem sessão E profile → /complete-profile ou /feed
 */

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

// Delays para retry exponencial (ms)
const RETRY_DELAYS = [300, 500, 800, 1200, 1500, 2000, 3000, 4000, 5000];

type CallbackState = 
  | "checking_session"
  | "waiting_for_profile"
  | "profile_ready"
  | "no_session"
  | "error";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>("checking_session");
  const [message, setMessage] = useState("Verificando autenticação...");
  const [retryCount, setRetryCount] = useState(0);

  // Verifica se profile existe (profiles.id = auth.users.id)
  const checkProfileExists = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, cpf, data_nascimento')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[AuthCallback] Error checking profile:', error);
        return false;
      }

      return !!data;
    } catch (err) {
      console.error('[AuthCallback] Unexpected error:', err);
      return false;
    }
  }, []);

  // Verifica se profile está completo
  const isProfileComplete = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, cpf, data_nascimento')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) return false;

      // Profile é completo se tem nome, CPF e data de nascimento
      return !!(data.full_name && data.cpf && data.data_nascimento);
    } catch {
      return false;
    }
  }, []);

  // Aguarda profile com retry exponencial
  const waitForProfile = useCallback(async (userId: string): Promise<boolean> => {
    setState("waiting_for_profile");
    
    for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
      setRetryCount(attempt + 1);
      setMessage(`Preparando seu perfil... (${attempt + 1}/${RETRY_DELAYS.length})`);
      
      const delay = RETRY_DELAYS[attempt];
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const exists = await checkProfileExists(userId);
      if (exists) {
        setState("profile_ready");
        setMessage("Perfil encontrado!");
        return true;
      }
      
      console.log(`[AuthCallback] Profile not ready, attempt ${attempt + 1}/${RETRY_DELAYS.length}`);
    }
    
    return false;
  }, [checkProfileExists]);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // PASSO 1: Verificar sessão
        setState("checking_session");
        setMessage("Verificando autenticação...");
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[AuthCallback] Session error:', sessionError);
          setState("error");
          setMessage("Erro ao verificar sessão.");
          setTimeout(() => navigate('/auth', { replace: true }), 2000);
          return;
        }

        // DECISÃO 1: SE não tem sessão → /auth
        if (!session?.user) {
          setState("no_session");
          setMessage("Sessão não encontrada. Redirecionando...");
          setTimeout(() => navigate('/auth', { replace: true }), 1500);
          return;
        }

        const userId = session.user.id;
        console.log('[AuthCallback] User authenticated:', userId);

        // PASSO 2: Verificar se profile já existe
        const profileExists = await checkProfileExists(userId);
        
        if (!profileExists) {
          // PASSO 3: Aguardar trigger criar o profile
          console.log('[AuthCallback] Profile not found, waiting for backend trigger...');
          const created = await waitForProfile(userId);
          
          if (!created) {
            // Profile não foi criado após todas as tentativas
            console.warn('[AuthCallback] Profile not created after all retries');
            setState("error");
            setMessage("Seu perfil está sendo preparado. Por favor, tente novamente.");
            setTimeout(() => navigate('/auth', { replace: true }), 3000);
            return;
          }
        }

        // PASSO 4: Profile existe - verificar se está completo
        setState("profile_ready");
        const complete = await isProfileComplete(userId);

        if (complete) {
          // Profile completo → /feed
          setMessage("Tudo pronto! Redirecionando...");
          setTimeout(() => navigate('/feed', { replace: true }), 1000);
        } else {
          // Profile incompleto → /complete-profile
          setMessage("Complete seu cadastro...");
          setTimeout(() => navigate('/complete-profile', { replace: true }), 1000);
        }

      } catch (err) {
        console.error('[AuthCallback] Unexpected error:', err);
        setState("error");
        setMessage("Erro inesperado. Redirecionando...");
        setTimeout(() => navigate('/auth', { replace: true }), 2000);
      }
    };

    processCallback();
  }, [navigate, checkProfileExists, waitForProfile, isProfileComplete]);

  // Renderização baseada no estado
  const getIcon = () => {
    switch (state) {
      case "profile_ready":
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case "error":
      case "no_session":
        return <AlertCircle className="h-12 w-12 text-destructive" />;
      default:
        return <Loader2 className="h-12 w-12 animate-spin text-primary" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="text-center space-y-6">
        {getIcon()}
        
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            {state === "waiting_for_profile" ? "Preparando seu perfil" : "Autenticação"}
          </h1>
          <p className="text-muted-foreground">{message}</p>
        </div>

        {state === "waiting_for_profile" && (
          <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden mx-auto">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${(retryCount / RETRY_DELAYS.length) * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
