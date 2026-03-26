import { useState, useCallback } from "react";
import { Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import StepActivityType from "./StepActivityType";
import StepActivityInput from "./StepActivityInput";
import StepBarrierSelection from "./StepBarrierSelection";
import StepResult from "./StepResult";
import StepExport from "./StepExport";
import { StepChoice } from "./StepChoice";
import { StepEditor } from "./StepEditor";
import { convertToStructuredActivity } from "@/lib/convertToStructuredActivity";
import { parseActivityText } from "@/lib/parseActivityText";
import type { StructuredActivity } from "@/types/adaptation";

export type ActivityType = "prova" | "exercicio" | "atividade_casa" | "trabalho";

export type BarrierItem = {
  dimension: string;
  barrier_key: string;
  label: string;
  is_active: boolean;
  notes?: string;
};

// version_universal/directed can be string (legacy) or StructuredActivity (new)
export type AdaptationResult = {
  version_universal: string | StructuredActivity;
  version_directed: string | StructuredActivity;
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

export type WizardMode = "ai" | "manual";

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
  wizardMode?: WizardMode;
};

const STEP_SEQUENCES: Readonly<Record<WizardMode, readonly string[]>> = {
  ai: ["type", "content", "barriers", "result", "export"],
  manual: ["type", "content", "choice", "editor", "export"],
} as const;

export function getStepsForMode(mode: WizardMode): readonly string[] {
  return STEP_SEQUENCES[mode];
}

export function getNextStep(currentStep: string, mode: WizardMode): string {
  const steps = STEP_SEQUENCES[mode];
  const currentIndex = steps.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex >= steps.length - 1) return steps[steps.length - 1];
  return steps[currentIndex + 1];
}

type StepMeta = { label: string; description: string };

const STEP_META: Record<string, StepMeta> = {
  type: { label: "Tipo", description: "Tipo de atividade" },
  content: { label: "Conteúdo", description: "Inserir atividade" },
  choice: { label: "Modo", description: "Escolher modo" },
  barriers: { label: "Barreiras", description: "Aluno e barreiras" },
  result: { label: "Resultado", description: "Adaptação da IA" },
  editor: { label: "Editor", description: "Editar atividade" },
  export: { label: "Exportar", description: "Salvar e exportar" },
};

function getStepsMeta(mode: WizardMode): StepMeta[] {
  return getStepsForMode(mode).map((key) => STEP_META[key]);
}

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
  const [wizardMode, setWizardMode] = useState<WizardMode>("ai");
  const [manualActivity, setManualActivity] = useState<StructuredActivity | null>(null);
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

  const steps = getStepsForMode(wizardMode);
  const stepsMeta = getStepsMeta(wizardMode);
  const currentStepKey = steps[step] ?? "type";

  const buildManualActivity = useCallback((): StructuredActivity => {
    if (data.selectedQuestions.length > 0) {
      return convertToStructuredActivity(data.selectedQuestions);
    }
    return parseActivityText(data.activityText);
  }, [data.selectedQuestions, data.activityText]);

  const [pendingBackTarget, setPendingBackTarget] = useState<number | null>(null);

  const updateData = useCallback((partial: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const clearResult = useCallback(() => {
    setData((prev) => ({
      ...prev,
      result: null,
      contextPillars: null,
      questionImages: { version_universal: {}, version_directed: {} },
    }));
  }, []);

  const navigateTo = useCallback((target: number) => {
    setDirection(target > step ? 1 : -1);
    setStep(target);
    announce(`Passo ${target + 1} de ${stepsMeta.length}: ${stepsMeta[target]?.description ?? ""}`);
  }, [step, stepsMeta]);

  const next = useCallback(() => {
    setDirection(1);
    setStep((s) => {
      const newStep = Math.min(s + 1, stepsMeta.length - 1);
      announce(`Passo ${newStep + 1} de ${stepsMeta.length}: ${stepsMeta[newStep]?.description ?? ""}`);
      return newStep;
    });
  }, [stepsMeta]);

  const requestBack = useCallback((target: number) => {
    // If going backwards and there is a generated result, confirm discard
    const resultStepIndex = steps.indexOf("result");
    const exportStepIndex = steps.indexOf("export");
    const hasResultStep = resultStepIndex !== -1;
    if (hasResultStep && step >= resultStepIndex && target < resultStepIndex && data.result) {
      setPendingBackTarget(target);
      return;
    }
    // For manual mode: if on export and going back, no special handling needed
    navigateTo(target);
  }, [step, steps, data.result, navigateTo]);

  const prev = useCallback(() => {
    requestBack(step - 1);
  }, [step, requestBack]);

  const goTo = (s: number) => {
    if (s < step) {
      requestBack(s);
    }
  };

  const confirmBack = useCallback(() => {
    if (pendingBackTarget === null) return;
    clearResult();
    navigateTo(pendingBackTarget);
    setPendingBackTarget(null);
  }, [pendingBackTarget, clearResult, navigateTo]);

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
          {stepsMeta.map((s, i) => {
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
                {i < stepsMeta.length - 1 && (
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
        Passo {step + 1} de {stepsMeta.length}: {stepsMeta[step]?.description}
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
            {currentStepKey === "type" && (
              <StepActivityType
                value={data.activityType}
                onChange={(t) => updateData({ activityType: t })}
                onNext={next}
              />
            )}
            {currentStepKey === "content" && (
              <StepActivityInput
                value={data.activityText}
                onChange={(t) => updateData({ activityText: t })}
                selectedQuestions={data.selectedQuestions}
                onSelectedQuestionsChange={(q) => updateData({ selectedQuestions: q })}
                onNext={next}
                onPrev={prev}
              />
            )}
            {currentStepKey === "choice" && (
              <StepChoice
                onSelect={(mode) => {
                  setWizardMode(mode);
                  updateData({ wizardMode: mode });
                  // After choosing mode, step index stays the same but steps array changes
                  // So we just advance to next step
                  next();
                }}
              />
            )}
            {currentStepKey === "barriers" && (
              <StepBarrierSelection
                data={data}
                updateData={updateData}
                onNext={next}
                onPrev={prev}
              />
            )}
            {currentStepKey === "result" && (
              <StepResult
                data={data}
                updateData={updateData}
                onNext={next}
                onPrev={prev}
              />
            )}
            {currentStepKey === "editor" && (
              <StepEditor
                activityText={data.activityText}
                structuredActivity={manualActivity ?? buildManualActivity()}
                onStructuredActivityChange={(activity) => setManualActivity(activity)}
                onNext={() => {
                  // Generate manual result and advance to export
                  const activity = manualActivity ?? buildManualActivity();
                  updateData({
                    result: {
                      version_universal: activity,
                      version_directed: activity,
                      strategies_applied: [],
                      pedagogical_justification: "Atividade editada manualmente pelo professor.",
                      implementation_tips: [],
                    },
                  });
                  next();
                }}
                onPrev={prev}
              />
            )}
            {currentStepKey === "export" && (
              <StepExport data={data} onPrev={prev} onRestart={() => {
                setStep(0);
                setDirection(-1);
                setWizardMode("ai");
                setManualActivity(null);
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

      {/* Alert when leaving result step */}
      <AlertDialog open={pendingBackTarget !== null} onOpenChange={(open) => { if (!open) setPendingBackTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar resultado?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              Ao voltar para uma etapa anterior, o resultado gerado pela IA será descartado e você precisará gerar novamente ao avançar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBack}>
              Sim, descartar e voltar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
