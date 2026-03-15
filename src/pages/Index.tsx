import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, CheckCircle2, ShieldAlert, Clock, BookOpen, Brain, HeartHandshake, AlertTriangle, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/logo-olhar-singular-sm.png";
import heroImg from "@/assets/hero-classroom.png";

const painPoints = [
  { icon: ShieldAlert, title: "Insegurança ao adaptar atividades sem orientação clara" },
  { icon: AlertTriangle, title: "Improviso diário para atender alunos com dificuldades" },
  { icon: Clock, title: "Falta de tempo para pesquisar e planejar adaptações" },
  { icon: Brain, title: "Medo de errar e prejudicar o aprendizado" },
  { icon: HeartHandshake, title: "Pressão constante por inclusão sem suporte adequado" },
];

const howItWorks = [
  {
    number: "01",
    title: "Selecione as barreiras",
    description: "Escolha as barreiras observáveis usando nosso checklist de 5 dimensões pedagógicas.",
  },
  {
    number: "02",
    title: "Cole ou envie sua atividade",
    description: "Insira o texto da prova, exercício ou trabalho. Aceita PDF, Word e imagem.",
  },
  {
    number: "03",
    title: "Receba a adaptação",
    description: "A IA gera versões adaptadas com justificativa pedagógica completa e orientações.",
  },
];

const benefits = [
  "Primeiro uso em menos de 5 minutos",
  "Rigor conceitual em Matemática e Ciências",
  "Respeita a autonomia do profissional",
  "Linguagem pedagógica, nunca clínica",
  "Exportação em PDF e Word",
  "Compartilhamento por link temporário",
];

const faq = [
  {
    q: "O Orienta Aula faz diagnóstico?",
    a: "Não. A ferramenta trabalha exclusivamente com barreiras pedagógicas observáveis, sem qualquer tipo de diagnóstico clínico.",
  },
  {
    q: "Preciso de laudo para usar?",
    a: "Não. Você observa as dificuldades em sala e seleciona as barreiras. Nenhum documento clínico é necessário.",
  },
  {
    q: "A adaptação substitui o professor?",
    a: "Nunca. Você é sempre o decisor final. Pode ajustar, ignorar ou complementar qualquer sugestão.",
  },
  {
    q: "Quanto custa?",
    a: "Há um plano gratuito para começar. Sem necessidade de cartão de crédito.",
  },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImg} alt="Orienta Aula" className="h-9 w-auto" loading="eager" />
          </Link>
          <nav className="hidden sm:flex items-center gap-6" aria-label="Navegação principal">
            <a href="#como-funciona" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Como funciona</a>
            <a href="#para-quem" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Para quem</a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold">Entrar</Button>
            </Link>
            <Link to="/cadastro">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                Testar agora
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-24 pb-0 lg:pt-28 relative overflow-hidden">
        <div className="gradient-hero">
          <div className="max-w-6xl mx-auto px-4 py-16 lg:py-24 relative z-10">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold text-primary-foreground leading-tight mb-5">
                  Adaptação pedagógica segura para educação inclusiva
                </h1>
                <p className="text-lg text-primary-foreground/80 leading-relaxed mb-8 max-w-lg">
                  Um aplicativo prático para transformar dificuldades observadas em sala de aula em estratégias de ensino adequadas.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link to="/cadastro">
                    <Button size="lg" className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-base px-8 shadow-glow">
                      Testar agora <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <button className="h-11 px-8 rounded-md border-2 border-white text-white font-semibold hover:bg-white/20 transition-colors">
                      Entrar
                    </button>
                  </Link>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="hidden lg:block"
              >
                <img
                  src={heroImg}
                  alt="Ilustração de uma sala de aula inclusiva"
                  className="w-full max-w-lg mx-auto rounded-2xl shadow-2xl"
                  loading="eager"
                />
              </motion.div>
            </div>
          </div>
          {/* Curved bottom */}
          <svg className="w-full block" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,40 C360,100 1080,0 1440,40 L1440,80 L0,80 Z" fill="hsl(var(--background))" />
          </svg>
        </div>
      </section>

      {/* Pain Points */}
      <section id="para-quem" className="py-16 lg:py-24 bg-background">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-foreground mb-3">A realidade de quem adapta sem apoio</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Sabemos como é difícil. Você quer fazer o melhor, mas nem sempre tem as ferramentas certas.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {painPoints.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-3 bg-card rounded-xl p-5 border border-border shadow-card"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <p.icon className="w-4.5 h-4.5 text-primary" aria-hidden="true" />
                </div>
                <span className="text-sm text-foreground font-medium leading-snug">{p.title}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-16 lg:py-24 bg-secondary/30">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl font-bold text-foreground mb-3">Como funciona</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Três passos simples para adaptar qualquer atividade.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative"
              >
                <div className="bg-card rounded-xl p-8 border border-border text-center h-full shadow-card hover:shadow-card-hover transition-shadow">
                  <span className="text-5xl font-extrabold text-primary/15 absolute top-4 right-6" aria-hidden="true">
                    {step.number}
                  </span>
                  <div className="w-14 h-14 rounded-xl gradient-hero flex items-center justify-center mx-auto mb-5">
                    <Target className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
                  </div>
                  <h3 className="font-bold text-foreground text-lg mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
                {i < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 text-primary" aria-hidden="true">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits + Disclaimer */}
      <section className="py-16 lg:py-24 bg-background">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">Feito para quem está na sala de aula</h2>
              <div className="space-y-3">
                {benefits.map((b) => (
                  <div key={b} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                    <span className="text-foreground">{b}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card rounded-xl p-8 border border-border shadow-card">
              <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p className="font-semibold text-foreground text-base">⚠️ O Orienta Aula NÃO:</p>
                <ul className="space-y-2" role="list">
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

      {/* FAQ */}
      <section id="faq" className="py-16 lg:py-24 bg-secondary/30">
        <div className="max-w-3xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-foreground mb-3">Perguntas frequentes</h2>
          </motion.div>
          <div className="space-y-4">
            {faq.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-card rounded-xl p-6 border border-border shadow-card"
              >
                <h3 className="font-semibold text-foreground mb-2">{item.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-20 bg-background">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="gradient-hero rounded-2xl p-10 lg:p-14 relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-primary-foreground mb-4">Pronto para começar?</h2>
              <p className="text-primary-foreground/75 mb-8 max-w-md mx-auto">
                Crie sua primeira adaptação em menos de 5 minutos. Gratuito para começar, sem cartão de crédito.
              </p>
              <Link to="/cadastro">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold gap-2 text-base px-8 shadow-glow">
                  Começar Gratuitamente <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="gradient-hero border-t border-primary/20 py-10" role="contentinfo">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="Orienta Aula" className="h-8 w-auto" loading="lazy" />
              <span className="text-sm text-primary-foreground/60">© 2026 Orienta Aula</span>
            </div>
            <nav className="flex items-center gap-6 text-sm text-primary-foreground/60" aria-label="Links do rodapé">
              <Link to="/login" className="hover:text-primary-foreground transition-colors">Entrar</Link>
              <Link to="/cadastro" className="hover:text-primary-foreground transition-colors">Cadastrar</Link>
            </nav>
          </div>
          <p className="text-xs text-primary-foreground/40 text-center mt-6">
            Ferramenta pedagógica. Não realiza diagnóstico. A decisão final é sempre do profissional.
          </p>
        </div>
      </footer>
    </div>
  );
}
