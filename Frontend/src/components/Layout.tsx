import { ReactNode } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { LogOut, Users, Wallet, History as HistoryIcon, BarChart3, LayoutDashboard } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export const Layout = ({ children }: { children: ReactNode }) => {
  const { family, activeMember, logout, selectMember } = useApp();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 glass-strong border-b border-white/30">
        <div className="container flex h-16 items-center justify-between gap-4">
          {/* Lado Izquierdo: Logo y Navegación Familiar */}
          <div className="flex items-center gap-6">
            <Link to="/profiles" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero shadow-glow">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div className="leading-tight hidden md:block">
                <p className="font-bold text-lg">Guardián de Gastos</p>
                {family && <p className="text-xs text-muted-foreground">Familia {family.familyName}</p>}
              </div>
            </Link>

            {activeMember && (
              <div className="flex items-center gap-1 border-l border-white/20 pl-6">
                <Button variant="ghost" size="sm" onClick={() => navigate("/family-overview")}>
                  <BarChart3 className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Vista familiar</span>
                </Button>
              </div>
            )}
          </div>

          {/* Lado Derecho: Navegación Personal, Perfil y Salir */}
          <div className="flex items-center gap-2">
            {activeMember && (
              <div className="flex items-center gap-1 border-r border-white/20 pr-4 mr-2">
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                  <LayoutDashboard className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Dashboard Personal</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/history")}>
                  <HistoryIcon className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Historial</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    selectMember(null);
                    navigate("/profiles");
                  }}
                >
                  <Users className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Cambiar</span>
                </Button>
              </div>
            )}
            
            {activeMember && (
              <div className="hidden sm:flex items-center gap-2 rounded-full glass px-3 py-1.5">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: activeMember.color }}
                >
                  {activeMember.name[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-medium">{activeMember.name}</span>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={() => { logout(); navigate("/login"); }} title="Salir">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
};
