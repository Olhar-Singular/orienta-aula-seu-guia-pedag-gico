import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, PenTool, Shield, Sparkles, CheckCircle2, Layers, ScanSearch, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const steps = [
  {
    number: "01",
    icon: Layers,
    title: "Selecione as barreiras",
    description: "Escolha as barreiras observáveis do aluno usando nosso checklist de 5 dimensões pedagógicas.",
  },
  {
    number: "02",
    icon: ScanSearch,
    title: "Cole sua atividade",
    description: "Insira o texto da prova, exercício ou trabalho. Também aceita PDF, Word e imagem.",
  },
  {
    number: "03",
    icon: FileText,
    title: "Receba a adaptação",
    description: "A IA gera duas versões (universal e direcionada) com justificativa pedagógica completa.",
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

export default function Index() {
  return (
    <div className="min-h-screen bg-[hsl(220,40%,97%)]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[hsl(220,50%,12%)]/95 backdrop-blur-md border-b border-[hsl(220,30%,20%)]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImg} alt="Orienta Aula - Página inicial" className="h-9 w-auto" loading="eager" />
          </Link>
          <nav className="hidden sm:flex items-center gap-6" aria-label="Navegação principal">
            <a href="#problema" className="text-sm text-[hsl(43,72%,60%)] hover:text-[hsl(43,72%,75%)] transition-colors">O Problema</a>
            <a href="#como-funciona" className="text-sm text-[hsl(43,72%,60%)] hover:text-[hsl(43,72%,75%)] transition-colors">Como Funciona</a>
            <a href="#solucao" className="text-sm text-[hsl(43,72%,60%)] hover:text-[hsl(43,72%,75%)] transition-colors">Solução</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-[hsl(43,72%,70%)] hover:text-[hsl(43,72%,85%)] hover:bg-[hsl(220,30%,20%)]">Entrar</Button>
            </Link>
            <Link to="/cadastro">
              <Button size="sm" className="bg-[hsl(43,72%,45%)] text-[hsl(220,50%,10%)] hover:bg-[hsl(43,72%,55%)] font-semibold">
                Começar Gratuitamente
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-28 pb-16 lg:pt-36 lg:pb-24 bg-[hsl(220,50%,12%)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(43,72%,45%,0.08),transparent_60%)]" aria-hidden="true" />
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[hsl(43,72%,45%,0.15)] text-[hsl(43,72%,65%)] text-xs font-semibold mb-6 border border-[hsl(43,72%,45%,0.25)]">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                Ferramenta pedagógica com IA
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
                Transforme barreiras em{" "}
                <span className="text-[hsl(43,72%,55%)]">estratégias de ensino</span>
              </h1>
              <p className="text-lg text-[hsl(220,20%,70%)] leading-relaxed mb-8 max-w-2xl mx-auto">
                Adapte atividades escolares com IA pedagógica. Sem diagnóstico, sem linguagem clínica —
                apenas decisões práticas para sua sala de aula inclusiva.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/cadastro">
                  <Button size="lg" className="w-full sm:w-auto gap-2 bg-[hsl(43,72%,45%)] text-[hsl(220,50%,10%)] hover:bg-[hsl(43,72%,55%)] font-semibold text-base px-8">
                    Começar Gratuitamente <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto border-[hsl(220,30%,30%)] text-[hsl(220,15%,75%)] hover:bg-[hsl(220,30%,18%)] hover:text-white"
                  onClick={() => document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Como funciona
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-[hsl(220,40%,97%)]" style={{ clipPath: "ellipse(55% 100% at 50% 100%)" }} aria-hidden="true" />
      </section>

      {/* Problema */}
      <section id="problema" className="py-16 lg:py-24 bg-[hsl(220,40%,97%)]">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-[hsl(220,50%,15%)] mb-4">O desafio da sala de aula inclusiva</h2>
            <p className="text-[hsl(220,15%,45%)] text-lg leading-relaxed">
              Professores precisam adaptar atividades para alunos com necessidades específicas, 
              mas falta tempo, formação e ferramentas adequadas. O resultado: adaptações genéricas 
              que não atendem ninguém de verdade.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { emoji: "⏱️", title: "Falta de tempo", desc: "Adaptar uma única atividade pode levar horas de pesquisa e reformulação." },
              { emoji: "📚", title: "Formação insuficiente", desc: "Muitos professores não recebem formação específica em adaptação curricular." },
              { emoji: "🔄", title: "Adaptações genéricas", desc: "Reduzir conteúdo não é adaptar. É preciso considerar barreiras específicas." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-[hsl(220,20%,90%)]"
              >
                <span className="text-3xl mb-3 block" aria-hidden="true">{item.emoji}</span>
                <h3 className="font-semibold text-[hsl(220,50%,15%)] mb-2">{item.title}</h3>
                <p className="text-sm text-[hsl(220,15%,45%)] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Solução / Features */}
      <section id="solucao" className="py-16 lg:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-[hsl(220,50%,15%)] mb-3">A solução: Orienta Aula</h2>
            <p className="text-[hsl(220,15%,45%)] max-w-xl mx-auto">
              IA pedagógica que entende barreiras observáveis e gera adaptações com rigor e ética.
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
                className="bg-[hsl(220,40%,97%)] rounded-xl p-6 border border-[hsl(220,20%,90%)] hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 rounded-lg bg-[hsl(220,50%,12%)] flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-[hsl(43,72%,55%)]" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-[hsl(220,50%,15%)] mb-2">{f.title}</h3>
                <p className="text-sm text-[hsl(220,15%,45%)] leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="py-16 lg:py-24 bg-[hsl(220,40%,97%)]">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl font-bold text-[hsl(220,50%,15%)] mb-3">Como funciona</h2>
            <p className="text-[hsl(220,15%,45%)] max-w-lg mx-auto">
              Três passos simples para adaptar qualquer atividade.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative"
              >
                <div className="bg-white rounded-xl p-8 border border-[hsl(220,20%,90%)] text-center h-full">
                  <span className="text-5xl font-extrabold text-[hsl(43,72%,45%,0.2)] absolute top-4 right-6" aria-hidden="true">
                    {step.number}
                  </span>
                  <div className="w-14 h-14 rounded-xl bg-[hsl(220,50%,12%)] flex items-center justify-center mx-auto mb-5">
                    <step.icon className="w-7 h-7 text-[hsl(43,72%,55%)]" aria-hidden="true" />
                  </div>
                  <h3 className="font-bold text-[hsl(220,50%,15%)] text-lg mb-2">{step.title}</h3>
                  <p className="text-sm text-[hsl(220,15%,45%)] leading-relaxed">{step.description}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 text-[hsl(43,72%,45%)]" aria-hidden="true">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits + Disclaimer */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-[hsl(220,50%,15%)] mb-6">Feito para quem está na sala de aula</h2>
              <div className="space-y-3">
                {benefits.map((b) => (
                  <div key={b} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[hsl(43,72%,50%)] mt-0.5 shrink-0" aria-hidden="true" />
                    <span className="text-[hsl(220,50%,15%)]">{b}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[hsl(220,40%,97%)] rounded-xl p-8 border border-[hsl(220,20%,90%)]">
              <div className="space-y-4 text-sm text-[hsl(220,15%,45%)] leading-relaxed">
                <p className="font-semibold text-[hsl(220,50%,15%)] text-base">⚠️ O Orienta Aula NÃO:</p>
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

      {/* CTA */}
      <section className="py-16 lg:py-20 bg-[hsl(220,40%,97%)]">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="bg-[hsl(220,50%,12%)] rounded-2xl p-10 lg:p-14 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(43,72%,45%,0.1),transparent_60%)]" aria-hidden="true" />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-4">Pronto para começar?</h2>
              <p className="text-[hsl(220,20%,70%)] mb-8 max-w-md mx-auto">
                Crie sua primeira adaptação em menos de 5 minutos. Gratuito para começar, sem cartão de crédito.
              </p>
              <Link to="/cadastro">
                <Button size="lg" className="bg-[hsl(43,72%,45%)] text-[hsl(220,50%,10%)] hover:bg-[hsl(43,72%,55%)] font-semibold gap-2 text-base px-8">
                  Começar Gratuitamente <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[hsl(220,50%,10%)] border-t border-[hsl(220,30%,18%)] py-10" role="contentinfo">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="Orienta Aula" className="h-8 w-auto" loading="lazy" />
              <span className="text-sm text-[hsl(220,15%,50%)]">© 2026 Orienta Aula</span>
            </div>
            <nav className="flex items-center gap-6 text-sm text-[hsl(220,15%,50%)]" aria-label="Links do rodapé">
              <Link to="/login" className="hover:text-[hsl(43,72%,60%)] transition-colors">Entrar</Link>
              <Link to="/cadastro" className="hover:text-[hsl(43,72%,60%)] transition-colors">Cadastrar</Link>
            </nav>
          </div>
          <p className="text-xs text-[hsl(220,15%,40%)] text-center mt-6">
            Ferramenta pedagógica. Não realiza diagnóstico. A decisão final é sempre do profissional.
          </p>
        </div>
      </footer>
    </div>
  );
}
