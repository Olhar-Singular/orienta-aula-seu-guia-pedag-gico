import { motion } from "framer-motion";

const faq = [
  {
    q: "O Olhar Singular faz diagnóstico?",
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
    q: "A plataforma gera PEI automaticamente?",
    a: "Sim. O Olhar Singular gera o PEI (Plano Educacional Individualizado) com metas, estratégias e adaptações baseadas nas barreiras observadas em sala de aula.",
  },
];

export default function FaqSection() {
  return (
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
  );
}
