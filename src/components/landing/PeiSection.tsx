import { motion } from "framer-motion";
import { BookOpen, Target, Sparkles, HeartHandshake } from "lucide-react";

export default function PeiSection() {
  return (
    <section id="o-que-e-pei" className="py-16 lg:py-24 bg-secondary/30">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            Entenda o conceito
          </span>
          <h2 className="text-3xl font-bold text-foreground mb-4">
            O que é o PEI (Plano Educacional Individualizado)?
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
            O <strong>PEI (Plano Educacional Individualizado)</strong> é um documento pedagógico e legalmente obrigatório que traça estratégias de ensino personalizadas para estudantes com necessidades especiais, como <strong>deficiência, autismo e altas habilidades</strong>.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Ele define metas, adaptações curriculares e recursos necessários para garantir a <strong>inclusão educacional</strong> e o aprendizado no ritmo de cada aluno. Não é apenas uma simplificação do currículo regular, é um plano estratégico completo.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5">
              <Target className="w-5 h-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold text-foreground text-sm">Metas Claras</p>
                <p className="text-xs text-muted-foreground">Objetivos mensuráveis e alcançáveis</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5">
              <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold text-foreground text-sm">Adaptações</p>
                <p className="text-xs text-muted-foreground">Estratégias personalizadas</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5">
              <HeartHandshake className="w-5 h-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold text-foreground text-sm">Inclusão Real</p>
                <p className="text-xs text-muted-foreground">Participação efetiva do aluno</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
