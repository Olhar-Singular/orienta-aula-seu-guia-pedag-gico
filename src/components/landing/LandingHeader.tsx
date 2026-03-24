import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logoTransparentImg from "@/assets/logo-olho-transparent.png";

export default function LandingHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoTransparentImg} alt="Olhar Singular" className="h-8 w-auto" loading="eager" width="32" height="32" />
          <span className="text-xs font-semibold text-primary tracking-widest uppercase" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Olhar Singular</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-6" aria-label="Navegação principal">
          <a href="#o-que-e-pei" className="text-sm text-muted-foreground hover:text-foreground transition-colors">O que é PEI</a>
          <a href="#como-funciona" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Como funciona</a>
          <a href="#para-quem" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Para quem</a>
          <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
        </nav>
        <Link to="/login">
          <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold">Entrar</Button>
        </Link>
      </div>
    </header>
  );
}
