import { motion } from "framer-motion";
import { Layers, Heart, Eye, Hand } from "lucide-react";

const principles = [
  {
    icon: Heart,
    title: "Engajamento",
    description: "O \"porquê\": múltiplas formas de motivar e engajar o aluno na aprendizagem",
  },
  {
    icon: Eye,
    title: "Representação",
    description: "O \"quê\": apresentar informação de várias formas para diferentes estilos de aprendizagem",
  },
  {
    icon: Hand,
    title: "Ação e Expressão",
    description: "O \"como\": permitir diferentes formas de demonstrar o que foi aprendido",
  },
];

export default function DuaSection() {
  return (
    <section id="o-que-e-dua" className="py-16 lg:py-24 bg-background">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Layers className="w-4 h-4" aria-hidden="true" />
            Princípio pedagógico
          </span>
          <h2 className="text-3xl font-bold text-foreground mb-4">
            O que é o DUA (Desenho Universal para Aprendizagem)?
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-8 lg:p-10 border border-border shadow-card"
        >
          <p className="text-foreground leading-relaxed text-lg mb-6">
            O <strong>DUA (Desenho Universal para Aprendizagem)</strong> é uma abordagem pedagógica que propõe criar currículos flexíveis desde o início, eliminando barreiras de aprendizagem ao oferecer <strong>múltiplos meios de engajamento, representação e expressão</strong>.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Em vez de adaptar depois que a barreira aparece, o DUA propõe que o planejamento já considere a diversidade da sala de aula. O Olhar Singular aplica esses princípios com IA: a partir das barreiras que o professor observa, gera adaptações com caminhos alternativos para cada aluno acessar o conteúdo e mostrar o que aprendeu.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            {principles.map((principle, i) => (
              <motion.div
                key={principle.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-3 p-4 rounded-xl bg-primary/5"
              >
                <principle.icon className="w-5 h-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-foreground text-sm">{principle.title}</p>
                  <p className="text-xs text-muted-foreground">{principle.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
