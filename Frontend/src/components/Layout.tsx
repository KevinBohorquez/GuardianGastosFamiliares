import { ReactNode } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { LogOut, Wallet, History as HistoryIcon, BarChart3, LayoutDashboard, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { NotificationsCenter } from "./NotificationsCenter";

export const Layout = ({ children }: { children: ReactNode }) => {
  const { family, profile, logout } = useApp();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50">
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="container flex h-16 items-center justify-between gap-4">
          {/* Lado Izquierdo: Logo y Navegación Familiar */}
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero shadow-glow">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div className="leading-tight hidden md:block">
                <p className="font-bold text-lg text-gray-900">Guardián de Gastos</p>
                {family && <p className="text-xs text-muted-foreground">Familia {family.family_name}</p>}
              </div>
            </Link>

            {profile && (
              <div className="flex items-center gap-1 border-l border-gray-200 pl-6">
                <Button variant="ghost" size="sm" onClick={() => navigate("/family")}>
                  <BarChart3 className="h-4 w-4 mr-1 text-gray-500" /> <span className="hidden sm:inline text-gray-700">Mi Familia</span>
                </Button>
              </div>
            )}
          </div>

          {/* Lado Derecho: Navegación Personal, Perfil y Salir */}
          <div className="flex items-center gap-2">
            {profile && (
              <div className="flex items-center gap-1 border-r border-gray-200 pr-4 mr-2">
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                  <LayoutDashboard className="h-4 w-4 mr-1 text-gray-500" /> <span className="hidden sm:inline text-gray-700">Dashboard</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/history")}>
                  <HistoryIcon className="h-4 w-4 mr-1 text-gray-500" /> <span className="hidden sm:inline text-gray-700">Historial</span>
                </Button>
                <NotificationsCenter />
              </div>
            )}
            
            {profile && (
              <div className="hidden sm:flex items-center gap-2 rounded-full bg-gray-50 border border-gray-100 px-3 py-1.5 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => navigate("/dashboard")}>
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
                  style={{ background: profile.color }}
                >
                  {profile.name[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-700">{profile.name}</span>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={() => { logout(); navigate("/login"); }} title="Salir" className="text-gray-500 hover:text-red-600 hover:bg-red-50">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
};
