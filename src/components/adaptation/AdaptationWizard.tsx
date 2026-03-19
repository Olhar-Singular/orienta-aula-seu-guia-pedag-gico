import { useState, useCallback } from "react";
import { Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
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

export type ContextPillars = {
  hasBarriers: boolean;
  hasPEI: boolean;
  hasDocuments: boolean;
  hasChatHistory: boolean;
  hasActivityContext: boolean;
};

export type SelectedQuestion = {
  id: string;
  text: string;
  image_url: string | null;
  options: string[] | null;
  subject: string;
  topic: string | null;
  difficulty: string | null;
};

export type QuestionImageMap = Record<string, string[]>;
export type SectionQuestionImages = Record<"version_universal" | "version_directed", QuestionImageMap>;

export type WizardData = {
  activityType: ActivityType | null;
  activityText: string;
  selectedQuestions: SelectedQuestion[];
  classId: string | null;
  studentId: string | null;
  studentName: string | null;
  barriers: BarrierItem[];
  adaptForWholeClass: boolean;
  observationNotes: string;
  result: AdaptationResult | null;
  contextPillars: ContextPillars | null;
  questionImages: SectionQuestionImages;
};

const STEPS = [
  { label: "Tipo", description: "Tipo de atividade" },
  { label: "Conteúdo", description: "Inserir atividade" },
  { label: "Barreiras", description: "Aluno e barreiras" },
  { label: "Resultado", description: "Adaptação da IA" },
  { label: "Exportar", description: "Salvar e exportar" },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

function announce(message: string) {
  const el = document.getElementById("live-announcer");
  if (el) el.textContent = message;
}

export default function AdaptationWizard() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<WizardData>({
    activityType: null,
    activityText: "",
    selectedQuestions: [],
    classId: null,
    studentId: null,
    studentName: null,
    barriers: [],
    adaptForWholeClass: false,
    observationNotes: "",
    result: null,
    contextPillars: null,
    questionImages: { version_universal: {}, version_directed: {} },
  });

  const updateData = (partial: Partial<WizardData>) =>
    setData((prev) => ({ ...prev, ...partial }));
  const next = useCallback(() => {
    setDirection(1);
    setStep((s) => {
      const newStep = Math.min(s + 1, STEPS.length - 1);
      announce(`Passo ${newStep + 1} de ${STEPS.length}: ${STEPS[newStep].description}`);
      return newStep;
    });
  }, []);

  const prev = useCallback(() => {
    setDirection(-1);
    setStep((s) => {
      const newStep = Math.max(s - 1, 0);
      announce(`Passo ${newStep + 1} de ${STEPS.length}: ${STEPS[newStep].description}`);
      return newStep;
    });
  }, []);

  const goTo = (s: number) => {
    if (s < step) {
      setDirection(-1);
      setStep(s);
      announce(`Passo ${s + 1} de ${STEPS.length}: ${STEPS[s].description}`);
    }
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
      <nav aria-label="Progresso da adaptação" className="hidden sm:block">
        <ol className="flex items-center gap-2" role="list">
          {STEPS.map((s, i) => {
            const completed = i < step;
            const current = i === step;
            return (
              <li key={i} className="flex items-center gap-2 flex-1" aria-current={current ? "step" : undefined}>
                <button
                  onClick={() => goTo(i)}
                  disabled={i >= step}
                  aria-label={`${s.label}: ${completed ? "concluído" : current ? "passo atual" : "pendente"}`}
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
                    aria-hidden="true"
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
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Mobile step indicator */}
      <p className="sm:hidden text-sm text-muted-foreground" role="status">
        Passo {step + 1} de {STEPS.length}: {STEPS[step].description}
      </p>

      {/* Step Content with slide animation */}
      <div className="min-h-[400px] relative overflow-x-hidden overflow-y-visible px-1">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
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
                selectedQuestions={data.selectedQuestions}
                onSelectedQuestionsChange={(q) => updateData({ selectedQuestions: q })}
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
                setDirection(-1);
                setData({
                  activityType: null,
                  activityText: "",
                  selectedQuestions: [],
                  classId: null,
                  studentId: null,
                  studentName: null,
                  barriers: [],
                  adaptForWholeClass: false,
                  observationNotes: "",
                    result: null,
                    contextPillars: null,
                    questionImages: { version_universal: {}, version_directed: {} },
                });
              }} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
