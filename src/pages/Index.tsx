import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, PenTool, Shield, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-illustration.jpg";
import logoImg from "@/assets/logo-orienta-aula.png";

const features = [
  {
    icon: PenTool,
    title: "Adapte atividades existentes",
    description: "Cole ou envie sua atividade e receba uma versão adaptada com estratégias pedagógicas.",
  },
  {
    icon: Sparkles,
    title: "Crie do zero com IA",
    description: "Gere atividades originais já adaptadas a partir das barreiras observadas em sala.",
  },
  {
    icon: BookOpen,
    title: "Orientações claras",
    description: "Receba justificativas pedagógicas e orientações práticas para aplicar em aula.",
  },
  {
    icon: Shield,
    title: "Ética e segurança",
    description: "Sem diagnóstico. Sem linguagem clínica. Você é sempre o decisor final.",
  },
];

const benefits = [
  "Primeiro uso em menos de 5 minutos",
  "Rigor conceitual em Matemática e Ciências",
  "Respeita a autonomia do profissional",
  "Linguagem pedagógica, nunca clínica",
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="Orienta Aula" className="h-9 w-auto" />
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button size="sm">Começar grátis</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-28 pb-16 lg:pt-36 lg:pb-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                Ferramenta pedagógica com IA
              </span>
              <h1 className="text-4xl lg:text-5xl font-extrabold text-foreground leading-tight mb-6">
                Transforme dificuldades em{" "}
                <span className="text-gradient-hero">estratégias de ensino</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
                Adapte atividades ou crie do zero com apoio de IA. Sem diagnóstico, sem linguagem clínica —
                apenas decisões pedagógicas práticas para sua sala de aula.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/auth?mode=signup">
                  <Button size="lg" className="w-full sm:w-auto gap-2">
                    Começar agora <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Como funciona
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="rounded-2xl overflow-hidden shadow-card-hover">
                <img src={heroImage} alt="Professora usando o Orienta Aula" className="w-full" />
              </div>
              <div className="absolute -bottom-4 -left-4 bg-card rounded-xl p-4 shadow-card-hover animate-float">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Adaptação pronta!
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 lg:py-24 gradient-subtle">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-foreground mb-3">O que o Orienta Aula faz</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Dois caminhos para apoiar sua prática pedagógica com responsabilidade e clareza.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-xl p-6 shadow-card hover:shadow-card-hover transition-shadow"
              >
                <div className="w-11 h-11 rounded-lg bg-secondary flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">Feito para quem está na sala de aula</h2>
              <div className="space-y-4">
                {benefits.map((b) => (
                  <div key={b} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground">{b}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card rounded-xl p-8 shadow-card border border-border">
              <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p className="font-semibold text-foreground text-base">⚠️ O Orienta Aula NÃO:</p>
                <ul className="space-y-2">
                  <li>• Realiza diagnóstico de qualquer tipo</li>
                  <li>• Interpreta laudos clínicos</li>
                  <li>• Atua como ferramenta de saúde</li>
                  <li>• Avalia alunos ou professores</li>
                  <li>• Promete resultados de aprendizagem</li>
                </ul>
                <p className="pt-2 text-xs italic">
                  "A decisão final é sempre do profissional. Você pode ajustar ou ignorar qualquer sugestão."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="gradient-hero rounded-2xl p-10 lg:p-14 text-primary-foreground">
            <h2 className="text-3xl font-bold mb-4">Pronto para começar?</h2>
            <p className="text-primary-foreground/80 mb-8 max-w-md mx-auto">
              Crie sua primeira adaptação em menos de 5 minutos. Grátis para começar.
            </p>
            <Link to="/auth?mode=signup">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
                Criar conta gratuita <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>© 2026 Orienta Aula. Ferramenta pedagógica.</span>
          <span>Não realiza diagnóstico. A decisão final é do profissional.</span>
        </div>
      </footer>
    </div>
  );
}
