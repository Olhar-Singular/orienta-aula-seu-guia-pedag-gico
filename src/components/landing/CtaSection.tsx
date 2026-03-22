import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CtaSection() {
  return (
    <section className="py-16 lg:py-20 bg-background">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <div className="gradient-hero rounded-2xl p-10 lg:p-14 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-primary-foreground mb-4">Comece a adaptar em menos de 5 minutos</h2>
            <p className="text-primary-foreground/75 mb-8 max-w-md mx-auto">
              Crie sua primeira adaptação gratuitamente. Sem cartão de crédito, sem compromisso.
            </p>
            <Link to="/login">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold gap-2 text-base px-8 shadow-glow">
                Criar adaptação gratuita <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
