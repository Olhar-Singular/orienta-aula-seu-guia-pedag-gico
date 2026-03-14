import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="text-8xl font-extrabold text-primary/20 mb-4" aria-hidden="true">404</div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Página não encontrada</h1>
        <p className="text-muted-foreground mb-6">
          A página <code className="bg-muted px-1.5 py-0.5 rounded text-sm">{location.pathname}</code> não existe ou foi removida.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/">
            <Button className="gap-2 w-full sm:w-auto">
              <Home className="w-4 h-4" aria-hidden="true" /> Página inicial
            </Button>
          </Link>
          <Button variant="outline" onClick={() => window.history.back()} className="gap-2 w-full sm:w-auto">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Voltar
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
