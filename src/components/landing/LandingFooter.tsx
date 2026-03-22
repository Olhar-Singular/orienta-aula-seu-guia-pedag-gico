import { Link } from "react-router-dom";
import logoTransparentImg from "@/assets/logo-olho-transparent.png";

export default function LandingFooter() {
  return (
    <footer className="gradient-hero border-t border-primary/20 py-10" role="contentinfo">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={logoTransparentImg} alt="Olhar Singular" className="h-16 w-auto" loading="lazy" width="64" height="64" />
            <span className="text-sm text-primary-foreground/60">© 2026 Olhar Singular</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-primary-foreground/60" aria-label="Links do rodapé">
            <Link to="/login" className="hover:text-primary-foreground transition-colors">Entrar</Link>
            <Link to="/login" className="hover:text-primary-foreground transition-colors">Acessar</Link>
          </nav>
        </div>
        <p className="text-xs text-primary-foreground/40 text-center mt-6">
          Ferramenta pedagógica. Não realiza diagnóstico. A decisão final é sempre do profissional.
        </p>
      </div>
    </footer>
  );
}
