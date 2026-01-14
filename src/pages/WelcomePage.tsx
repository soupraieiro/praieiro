import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SovereignWelcome } from "@/components/SovereignWelcome";

export default function WelcomePage() {
  const { user, loading, isNewUser, registerInLedger } = useAuth();
  const navigate = useNavigate();
  const [registrationDone, setRegistrationDone] = useState(false);

  useEffect(() => {
    // Se não estiver logado, redirecionar para auth
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    // Se for novo usuário, registrar no Ledger
    if (user && isNewUser && !registrationDone) {
      registerInLedger().then((success) => {
        if (success) {
          setRegistrationDone(true);
        }
      });
    }
  }, [user, loading, isNewUser, registrationDone, navigate, registerInLedger]);

  const handleContinue = () => {
    navigate('/encontrar');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return <SovereignWelcome onContinue={handleContinue} />;
}
