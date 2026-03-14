import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, PenTool, MessageCircle, FolderOpen, User, LogOut, Menu, X, CreditCard, Users, BookOpen, Wand2, History, Settings, ScanSearch } from "lucide-react";
import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import logoImg from "@/assets/logo-orienta-aula-eye.png";
import CreditsBadge from "@/components/CreditsBadge";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/dashboard/adaptar", label: "Adaptar Atividade", icon: Wand2 },
  { path: "/my-adaptations", label: "Minhas Adaptações", icon: FolderOpen },
  { path: "/dashboard/turmas", label: "Turmas", icon: Users },
  { path: "/dashboard/historico", label: "Histórico", icon: History },
  { path: "/dashboard/banco-questoes", label: "Banco de Questões", icon: BookOpen },
  { path: "/dashboard/simulador", label: "Simulador", icon: ScanSearch },
  { path: "/chat", label: "Chat IA", icon: MessageCircle },
  { path: "/pricing", label: "Planos", icon: CreditCard },
  { path: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
  { path: "/profile", label: "Perfil", icon: User },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Skip to content */}
      <a
        href="#main-content"
        className="skip-to-content"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Pular para o conteúdo
      </a>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 gradient-hero text-primary-foreground shrink-0" role="navigation" aria-label="Menu principal">
        <div className="p-6 flex justify-center">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src={logoImg} alt="Orienta Aula - Ir para o Dashboard" className="h-14 w-auto" />
          </Link>
        </div>
        <nav className="flex-1 px-3 space-y-1" aria-label="Navegação do dashboard">
          {navItems.map((item) => {
            const active = item.path === "/dashboard"
              ? location.pathname === "/dashboard"
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <item.icon className="w-5 h-5" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 mb-2">
          <button
            onClick={handleLogout}
            aria-label="Sair da conta"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-primary-foreground/70 hover:text-primary-foreground hover:bg-sidebar-accent/50 w-full transition-colors"
          >
            <LogOut className="w-5 h-5" aria-hidden="true" /> Sair
          </button>
        </div>
        <div className="px-5 mb-3">
          <CreditsBadge showProgress />
        </div>
        <div className="p-4 mx-3 mb-4 rounded-lg bg-sidebar-accent/30 text-xs text-primary-foreground/60 leading-relaxed" role="note">
          Ferramenta pedagógica. Não realiza diagnóstico. A decisão final é sempre do profissional.
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 gradient-hero text-primary-foreground px-4 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src={logoImg} alt="Orienta Aula" className="h-8 w-auto" />
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-foreground/50"
            onClick={() => setMobileOpen(false)}
          >
            <motion.nav
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute top-14 left-0 right-0 gradient-hero text-primary-foreground p-4 space-y-1 max-h-[calc(100vh-3.5rem)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              aria-label="Menu de navegação mobile"
            >
              {navItems.map((item) => {
                const active = item.path === "/dashboard"
                  ? location.pathname === "/dashboard"
                  : location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-primary-foreground/70 hover:text-primary-foreground"
                    }`}
                  >
                    <item.icon className="w-5 h-5" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
              <button
                onClick={() => { setMobileOpen(false); handleLogout(); }}
                aria-label="Sair da conta"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-primary-foreground/70 hover:text-primary-foreground w-full"
              >
                <LogOut className="w-5 h-5" aria-hidden="true" /> Sair
              </button>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live region for announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="live-announcer" />

      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        className="flex-1 mt-14 lg:mt-0 overflow-auto outline-none"
        role="main"
      >
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
