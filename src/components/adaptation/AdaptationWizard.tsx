import { useState } from "react";
import { Check } from "lucide-react";
import StepActivityType from "./StepActivityType";
import StepActivityInput from "./StepActivityInput";
import StepBarrierSelection from "./StepBarrierSelection";
import StepResult from "./StepResult";
import StepExport from "./StepExport";

export type ActivityType = "prova" | "exercicio" | "atividade_casa" | "trabalho";

export type BarrierItem = {
  dimension: string;
  barrier_key: string;
  label: string;
  is_active: boolean;
  notes?: string;
};

export type AdaptationResult = {
  version_universal: string;
  version_directed: string;
  strategies_applied: string[];
  pedagogical_justification: string;
  implementation_tips: string[];
};

export type WizardData = {
  activityType: ActivityType | null;
  activityText: string;
  classId: string | null;
  studentId: string | null;
  studentName: string | null;
  barriers: BarrierItem[];
  adaptForWholeClass: boolean;
  result: AdaptationResult | null;
};

const STEPS = [
  { label: "Tipo", description: "Tipo de atividade" },
  { label: "Conteúdo", description: "Inserir atividade" },
  { label: "Barreiras", description: "Aluno e barreiras" },
  { label: "Resultado", description: "Adaptação da IA" },
  { label: "Exportar", description: "Salvar e exportar" },
];

export default function AdaptationWizard() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({
    activityType: null,
    activityText: "",
    classId: null,
    studentId: null,
    studentName: null,
    barriers: [],
    adaptForWholeClass: false,
    result: null,
  });

  const updateData = (partial: Partial<WizardData>) =>
    setData((prev) => ({ ...prev, ...partial }));

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));
  const goTo = (s: number) => {
    if (s < step) setStep(s);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Adaptar Atividade</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ferramenta pedagógica. Não realiza diagnóstico. A decisão final é sempre do profissional.
        </p>
      </div>

      {/* Stepper */}
      <nav aria-label="Progresso" className="hidden sm:block">
        <ol className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const completed = i < step;
            const current = i === step;
            return (
              <li key={i} className="flex items-center gap-2 flex-1">
                <button
                  onClick={() => goTo(i)}
                  disabled={i >= step}
                  className={`flex items-center gap-2 text-left transition-colors ${
                    current
                      ? "text-primary font-semibold"
                      : completed
                      ? "text-primary/70 cursor-pointer"
                      : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0 transition-colors ${
                      completed
                        ? "bg-primary text-primary-foreground"
                        : current
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {completed ? <Check className="w-4 h-4" /> : i + 1}
                  </span>
                  <span className="hidden lg:inline text-sm">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 ${
                      completed ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Mobile step indicator */}
      <p className="sm:hidden text-sm text-muted-foreground">
        Passo {step + 1} de {STEPS.length}: {STEPS[step].description}
      </p>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {step === 0 && (
          <StepActivityType
            value={data.activityType}
            onChange={(t) => updateData({ activityType: t })}
            onNext={next}
          />
        )}
        {step === 1 && (
          <StepActivityInput
            value={data.activityText}
            onChange={(t) => updateData({ activityText: t })}
            onNext={next}
            onPrev={prev}
          />
        )}
        {step === 2 && (
          <StepBarrierSelection
            data={data}
            updateData={updateData}
            onNext={next}
            onPrev={prev}
          />
        )}
        {step === 3 && (
          <StepResult
            data={data}
            updateData={updateData}
            onNext={next}
            onPrev={prev}
          />
        )}
        {step === 4 && (
          <StepExport data={data} onPrev={prev} onRestart={() => {
            setStep(0);
            setData({
              activityType: null,
              activityText: "",
              classId: null,
              studentId: null,
              studentName: null,
              barriers: [],
              adaptForWholeClass: false,
              result: null,
            });
          }} />
        )}
      </div>
    </div>
  );
}
