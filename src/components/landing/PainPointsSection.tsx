import { motion } from "framer-motion";
import { ShieldAlert, AlertTriangle, Clock, Brain, HeartHandshake } from "lucide-react";

const painPoints = [
  { icon: ShieldAlert, title: "Insegurança ao adaptar atividades sem orientação clara" },
  { icon: AlertTriangle, title: "Improviso diário para atender alunos com barreiras de aprendizagem" },
  { icon: Clock, title: "Falta de tempo para pesquisar e planejar adaptações" },
  { icon: Brain, title: "Medo de errar e prejudicar o aprendizado" },
  { icon: HeartHandshake, title: "Pressão constante por inclusão sem suporte adequado" },
];

export default function PainPointsSection() {
  return (
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
  );
}
