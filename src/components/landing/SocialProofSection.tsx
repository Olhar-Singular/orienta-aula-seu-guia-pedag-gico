import { motion } from "framer-motion";

const stats = [
  { number: "2.500+", label: "Adaptações criadas" },
  { number: "850+", label: "Professores ativos" },
  { number: "4.8★", label: "Avaliação média" },
  { number: "< 5min", label: "Tempo médio de uso" },
];

const testimonials = [
  {
    quote: "Finalmente uma ferramenta que entende a realidade da sala de aula. As adaptações são práticas e fáceis de aplicar.",
    author: "Maria S.",
    role: "Professora de Matemática, SP",
  },
  {
    quote: "Reduzi o tempo de preparação de adaptações de 2 horas para 15 minutos. Sobra mais tempo para estar com os alunos.",
    author: "Carlos R.",
    role: "Professor de Ciências, MG",
  },
  {
    quote: "A abordagem sem diagnóstico clínico é perfeita. Foco no que realmente importa: as barreiras observáveis.",
    author: "Ana P.",
    role: "Coordenadora Pedagógica, RJ",
  },
];

export default function SocialProofSection() {
  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="max-w-5xl mx-auto px-4">
        {/* Números de impacto */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center p-6 rounded-xl bg-primary/5"
            >
              <p className="text-3xl lg:text-4xl font-extrabold text-primary mb-1">{stat.number}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Depoimentos */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl font-bold text-foreground text-center mb-10"
        >
          O que dizem os professores
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-xl p-6 border border-border shadow-card"
            >
              <p className="text-foreground leading-relaxed mb-4 italic">"{testimonial.quote}"</p>
              <div>
                <p className="font-semibold text-foreground text-sm">{testimonial.author}</p>
                <p className="text-xs text-muted-foreground">{testimonial.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
