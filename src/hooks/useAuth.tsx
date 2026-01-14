import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isNewUser: boolean;
  hasProfile: boolean; // NEW: indica se profile existe
  profileLoading: boolean; // NEW: indica se está verificando profile
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; data: { user: User | null } | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  registerInLedger: () => Promise<boolean>;
  checkProfile: () => Promise<boolean>; // NEW: força verificação de profile
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Verifica se profile existe (profiles.id = auth.users.id)
  const checkProfileExists = useCallback(async (userId: string): Promise<boolean> => {
    try {
      // CORRECT: profiles.id = auth.users.id (identidade soberana)
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[useAuth] Error checking profile:', error);
        return false;
      }

      return !!data;
    } catch (err) {
      console.error('[useAuth] Unexpected error checking profile:', err);
      return false;
    }
  }, []);

  // Verifica se usuário já está no Ledger Satoshi
  const checkLedgerRegistration = useCallback(async (userId: string): Promise<boolean> => {
    const idempotencyKey = `USER:SIGNUP:${userId}`;
    
    const { data } = await supabase
      .from('satoshi_events')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    return !!data;
  }, []);

  // Força verificação de profile (exposto para uso externo)
  const checkProfile = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    setProfileLoading(true);
    const exists = await checkProfileExists(user.id);
    setHasProfile(exists);
    setProfileLoading(false);
    return exists;
  }, [user, checkProfileExists]);

  // Registra usuário no Ledger Satoshi
  const registerInLedger = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      // Verificar se já está registrado
      const isRegistered = await checkLedgerRegistration(user.id);
      if (isRegistered) {
        setIsNewUser(false);
        return true;
      }

      // Buscar próxima sequência
      const { data: lastEvent } = await supabase
        .from('satoshi_events')
        .select('sequence')
        .order('sequence', { ascending: false })
        .limit(1)
        .single();

      const nextSequence = (lastEvent?.sequence || 0) + 1;
      const idempotencyKey = `USER:SIGNUP:${user.id}`;

      // Inserir evento de signup
      const { error: insertError } = await supabase
        .from('satoshi_events')
        .insert({
          sequence: nextSequence,
          idempotency_key: idempotencyKey,
          event_type: 'USER_SIGNUP',
          currency: 'ZIMBU',
          payload: {
            method: user.app_metadata?.provider || 'google',
            welcome_bonus: 1000,
            status: 'active',
            user_email: user.email,
            registered_at: new Date().toISOString(),
          },
          metadata: {
            source: 'praieiro_web',
            version: '1.0.0',
          },
        });

      if (insertError) {
        // Se for race condition de sequência, tentar novamente
        if (insertError.message.includes('SEQUENCE BREAK')) {
          return registerInLedger();
        }
        console.error('Erro ao registrar no Ledger:', insertError);
        return false;
      }

      setIsNewUser(true);
      return true;
    } catch (err) {
      console.error('Erro ao registrar no Ledger:', err);
      return false;
    }
  }, [user, checkLedgerRegistration]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Verificar profile e registro no Ledger após login
        if (event === 'SIGNED_IN' && session?.user) {
          setProfileLoading(true);
          
          // Verificar se profile existe
          const profileExists = await checkProfileExists(session.user.id);
          setHasProfile(profileExists);
          
          // Verificar registro no Ledger
          const isRegistered = await checkLedgerRegistration(session.user.id);
          setIsNewUser(!isRegistered);
          
          setProfileLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setHasProfile(false);
          setIsNewUser(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setProfileLoading(true);
        
        // Verificar se profile existe
        const profileExists = await checkProfileExists(session.user.id);
        setHasProfile(profileExists);
        
        // Verificar registro no Ledger
        const isRegistered = await checkLedgerRegistration(session.user.id);
        setIsNewUser(!isRegistered);
        
        setProfileLoading(false);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [checkLedgerRegistration, checkProfileExists]);

  const signUp = async (email: string, password: string, fullName: string) => {
    // 🏛️ FLUXO CANÔNICO: Email signup SEMPRE redireciona para /auth/callback
    // O callback processa a sessão, aguarda o profile e redireciona corretamente.
    const redirectUrl = `${window.location.origin}/auth/callback`;
    
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    return { error: error as Error | null, data: data?.user ? { user: data.user } : null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    // 🏛️ FLUXO CANÔNICO: OAuth SEMPRE redireciona para /auth/callback
    // O callback processa a sessão, aguarda o profile e redireciona corretamente.
    // NUNCA usar window.location.href - isso causa loops!
    const redirectUrl = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
      },
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsNewUser(false);
    setHasProfile(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      isNewUser, 
      hasProfile,
      profileLoading,
      signUp, 
      signIn, 
      signInWithGoogle, 
      signOut, 
      registerInLedger,
      checkProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
