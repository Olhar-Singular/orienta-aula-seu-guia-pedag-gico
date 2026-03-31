import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-classroom.png";

export default function HeroSection() {
  return (
    <section className="pt-24 pb-0 lg:pt-28 relative overflow-hidden">
      <div className="gradient-hero">
        <div className="max-w-6xl mx-auto px-4 py-16 lg:py-24 relative z-10">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-base text-primary-foreground/90 leading-relaxed mb-6 italic font-medium max-w-xl">
                A IA faz o trabalho operacional para que o professor possa focar no que é insubstituível: o olhar humano sobre cada aluno. A Olhar Singular é sobre dar ao professor uma ferramenta poderosa para que nenhum aluno precise enfrentar uma barreira que poderia ser removida.
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold text-primary-foreground leading-tight mb-5">
                Crie adaptações pedagógicas para PEI com inteligência artificial
              </h1>
              <p className="text-lg text-primary-foreground/80 leading-relaxed mb-8 max-w-lg">
                Transforme atividades escolares em versões adaptadas para alunos com autismo, deficiência e outras necessidades especiais. Sem diagnóstico clínico, foco em barreiras observáveis.
              </p>
              <a href="#como-funciona">
                <button className="h-11 px-8 rounded-md border-2 border-white text-white font-semibold hover:bg-white/20 transition-colors">
                  Ver como funciona
                </button>
              </a>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="hidden lg:block"
            >
              <img
                src={heroImg}
                alt="Ilustração de uma sala de aula inclusiva com adaptação pedagógica"
                className="w-full max-w-lg mx-auto rounded-2xl shadow-2xl"
                loading="eager"
                fetchPriority="high"
                width="1024"
                height="1024"
              />
            </motion.div>
          </div>
        </div>
        <svg className="w-full block" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,40 C360,100 1080,0 1440,40 L1440,80 L0,80 Z" fill="hsl(var(--background))" />
        </svg>
      </div>
    </section>
  );
}
