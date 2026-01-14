import { forwardRef } from 'react';
import { Newspaper } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export const FeedFloatingButton = forwardRef<HTMLButtonElement>(function FeedFloatingButton(_props, ref) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Só mostra se não estiver na home, dashboard ou feed
  // Também esconde no mobile (bottom nav já tem o ícone)
  if (location.pathname === '/' || location.pathname === '/dashboard' || location.pathname === '/feed') {
    return null;
  }

  const handleClick = () => {
    // Navegar para a página de feed dedicada
    navigate('/feed');
  };

  return (
    <Button
      ref={ref}
      onClick={handleClick}
      className="fixed bottom-20 md:bottom-4 left-4 z-40 rounded-full h-12 w-12 p-0 bg-accent text-accent-foreground shadow-lg hover:bg-accent/90 hidden md:flex"
      title="Abrir Feed"
    >
      <Newspaper className="h-5 w-5" />
    </Button>
  );
});
