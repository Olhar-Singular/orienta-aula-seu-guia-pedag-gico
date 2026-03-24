import { CheckCircle2 } from "lucide-react";

const benefits = [
  "Primeira adaptação em menos de 5 minutos",
  "Economia de até 2 horas por semana em planejamento",
  "Justificativa pedagógica inclusa em cada adaptação",
  "Exportação em PDF e Word prontos para imprimir",
  "Compartilhamento por link com outros professores",
  "100% alinhado com diretrizes de educação inclusiva",
];

export default function BenefitsSection() {
  return (
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
              <p className="font-semibold text-foreground text-base">⚠️ O Olhar Singular NÃO:</p>
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
  );
}
