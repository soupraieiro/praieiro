import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo-praieiro-circle.png";

export interface DashboardSection {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface DashboardShellProps {
  title: string;
  subtitle?: string;
  roleLabel: string;
  sections: DashboardSection[];
  active: string;
  onSectionChange: (id: string) => void;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Casca única dos dashboards (Ambulante e Cliente).
 * Substitui o menu dropdown por navegação contextual sempre visível:
 * - Desktop: coluna lateral fixa
 * - Mobile: barra de seções com rolagem horizontal
 */
export function DashboardShell({
  title,
  subtitle,
  roleLabel,
  sections,
  active,
  onSectionChange,
  actions,
  children,
}: DashboardShellProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Praieiro" className="h-10 w-auto" />
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-none text-foreground">{title}</p>
              {subtitle && (
                <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {roleLabel}
            </Badge>
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>

        {/* Navegação de seções — mobile */}
        <nav className="md:hidden border-t border-border">
          <div className="flex gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = active === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => onSectionChange(section.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {section.label}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      <div className="container mx-auto flex gap-6 px-4 py-6 pb-24 md:pb-8">
        {/* Navegação de seções — desktop */}
        <aside className="hidden w-60 shrink-0 md:block">
          <nav className="sticky top-24 space-y-1 rounded-xl border border-border bg-card p-2 shadow-sm">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = active === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => onSectionChange(section.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 space-y-6">
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          {children}
        </main>
      </div>
    </div>
  );
}
