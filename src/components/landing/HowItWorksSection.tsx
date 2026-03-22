import { motion } from "framer-motion";
import { ArrowRight, Target } from "lucide-react";

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

export default function HowItWorksSection() {
  return (
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
            Três passos simples para criar uma adaptação pedagógica completa.
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
  );
}
