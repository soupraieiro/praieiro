import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, Lock, LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { OperatingHoursTimer } from "@/components/OperatingHoursTimer";
import { useClickSound } from "@/hooks/useClickSound";
import logo from "@/assets/logo-praieiro-circle.png";

interface NavItem {
  href: string;
  label: string;
  icon?: LucideIcon;
}

// Items de navegação para cada tipo de usuário
const publicNavItems: NavItem[] = [
  { href: "/autenticacao", label: "Área do Cliente" },
  { href: "/login-ambulante", label: "Área do Praieiro" },
  { href: "/sobre", label: "Sobre" },
  { href: "/admin/login", label: "Restrito", icon: Lock },
];

// Para clientes logados - mostra Área do Cliente e Sobre
const clientNavItems: NavItem[] = [
  { href: "/feed", label: "Área do Cliente" },
  { href: "/sobre", label: "Sobre" },
];

// Para vendors logados - mostra Área do Cliente para acesso como cliente + Área do Praieiro
const vendorNavItems: NavItem[] = [
  { href: "/autenticacao", label: "Área do Cliente" },
  { href: "/painel-ambulante", label: "Área do Praieiro" },
  { href: "/sobre", label: "Sobre" },
];

// Para admin - mostra tudo
const adminNavItems: NavItem[] = [
  { href: "/", label: "Área do Cliente" },
  { href: "/ambulantes", label: "Área do Praieiro" },
  { href: "/sobre", label: "Sobre" },
  { href: "/admin/login", label: "Restrito", icon: Lock },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { role: userRole } = useUserRole(user?.id);
  const { playClick } = useClickSound();

  // Determinar quais items mostrar baseado no role do usuário
  const getNavItems = () => {
    if (!user) return publicNavItems;
    
    switch (userRole) {
      case "admin":
        return adminNavItems;
      case "vendor":
        return vendorNavItems;
      default:
        return clientNavItems;
    }
  };

  const navItems = getNavItems();

  const handleSignOut = async () => {
    playClick();
    await signOut();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white shadow-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between md:h-20">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Praieiro" className="h-[56px] w-auto md:h-[64px]" />
          </Link>

          {/* Operating Hours Timer - Desktop */}
          <div className="hidden md:flex items-center">
            <OperatingHoursTimer />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`text-xs font-bold transition-colors flex items-center gap-1 whitespace-nowrap ${
                  location.pathname === item.href
                    ? "text-primary"
                    : "text-foreground/70 hover:text-primary"
                } ${item.icon ? "text-muted-foreground hover:text-primary" : ""}`}
              >
                {item.icon && <item.icon className="h-3 w-3" />}
                {item.label}
              </Link>
            ))}
            
            {user && (
              <div className="flex items-center gap-2">
                <Link
                  to="/encontrar"
                  className={`text-xs font-bold transition-colors whitespace-nowrap ${
                    location.pathname === "/encontrar"
                      ? "text-primary"
                      : "text-foreground/70 hover:text-primary"
                  }`}
                >
                  Encontre o seu Praieiro
                </Link>
                <Link
                  to="/meus-pedidos"
                  className={`text-xs font-bold transition-colors whitespace-nowrap ${
                    location.pathname === "/meus-pedidos"
                      ? "text-primary"
                      : "text-foreground/70 hover:text-primary"
                  }`}
                >
                  Pedidos
                </Link>
                <NotificationBell />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="gap-1 text-muted-foreground hover:text-primary text-xs px-2"
                >
                  <LogOut className="h-3 w-3" />
                  Sair
                </Button>
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-foreground"
            aria-label="Menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <nav className="md:hidden pb-4 border-t border-border">
            <div className="flex flex-col gap-2 pt-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    location.pathname === item.href
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-foreground/80 hover:bg-muted"
                  } ${item.icon ? "text-muted-foreground" : ""}`}
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.label}
                </Link>
              ))}
              
              {user ? (
                <>
                  <Link
                    to="/encontrar"
                    onClick={() => setIsOpen(false)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === "/encontrar"
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-foreground/80 hover:bg-muted"
                    }`}
                  >
                    Encontre o seu Praieiro
                  </Link>
                  <Link
                    to="/meus-pedidos"
                    onClick={() => setIsOpen(false)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === "/meus-pedidos"
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-foreground/80 hover:bg-muted"
                    }`}
                  >
                    Meus Pedidos
                  </Link>
                  <div className="px-4 py-2">
                    <NotificationBell />
                  </div>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setIsOpen(false);
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-left text-muted-foreground hover:bg-muted flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </>
              ) : null}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
