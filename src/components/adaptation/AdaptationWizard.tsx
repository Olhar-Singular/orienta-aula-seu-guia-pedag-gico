import { useState, useCallback, useMemo, useEffect } from "react";
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
import { WizardStepRenderer } from "./WizardStepRenderer";
import { STEP_REGISTRY } from "./steps";
import type { StructuredActivity, SelectedQuestion } from "@/types/adaptation";
import type { EditableActivity } from "@/lib/pdf/editableActivity";
import {
  shouldConfirmDiscard,
  resyncStepForNewMode,
  resetGeneratedState,
} from "@/lib/adaptationWizardHelpers";
import type { HistoryState } from "@/hooks/useHistory";
import type { ImageRegistry } from "@/components/editor/imageManagerUtils";

/** Single source of truth for one editor instance: text + registry of images
 *  referenced by that text. Bundling them removes the "dsl in slot A, registry
 *  in slot B, kept in sync by useEffect" pattern that caused cursor jumps. */
export type EditorContent = {
  dsl: string;
  registry: ImageRegistry;
};

export type { SelectedQuestion };

export type ActivityType = "prova" | "exercicio" | "atividade_casa" | "trabalho";

export type BarrierItem = {
  dimension: string;
  barrier_key: string;
  label: string;
  is_active: boolean;
  notes?: string;
};

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

export type QuestionImageMap = Record<string, string[]>;
export type SectionQuestionImages = Record<"version_universal" | "version_directed", QuestionImageMap>;

export type { WizardMode } from "@/lib/wizardSteps";
import type { WizardMode } from "@/lib/wizardSteps";

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
  editableActivity?: EditableActivity;
  editableActivityDirected?: EditableActivity;
  /** AI editor — universal tab. */
  editorContentUniversal?: EditorContent;
  /** AI editor — directed tab. */
  editorContentDirected?: EditorContent;
  /** Manual editor (StepEditor). */
  editorContentManual?: EditorContent;
  pdfHistoryUniversal?: HistoryState<EditableActivity>;
  pdfHistoryDirected?: HistoryState<EditableActivity>;
};

export { getStepsForMode, getNextStep } from "@/lib/wizardSteps";
import { getStepsForMode } from "@/lib/wizardSteps";

type StepMeta = { label: string; description: string };

function getStepsMeta(mode: WizardMode): StepMeta[] {
  return getStepsForMode(mode).map((key) => {
    const mod = STEP_REGISTRY[key];
    return { label: mod?.label ?? key, description: mod?.description ?? "" };
  });
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

const EMPTY_DATA: WizardData = {
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
};

export type AdaptationWizardProps = {
  /** Row id of the adaptations_history record being edited, when the wizard
   *  opens in edit mode. StepExport uses this to UPDATE instead of INSERT. */
  editingId?: string;
  /** Wizard data preloaded from a saved record (see buildEditModeInitialData). */
  initialData?: Partial<WizardData>;
  /** Mode to start in. Defaults to "ai". Edit flows always use "ai". */
  initialMode?: WizardMode;
  /** Step key to start on (e.g. "ai_editor" for Step 5). Defaults to "type". */
  initialStepKey?: string;
  /** Locks back-navigation before this step key — used to prevent edit-mode
   *  users from wiping a loaded adaptation by regenerating. When they try to
   *  go behind the lock, `onClose` fires instead. */
  lockedBeforeStep?: string;
  /** Called when the wizard wants to close (StepExport saved, or user tried
   *  to go behind the lock). */
  onClose?: () => void;
};

export default function AdaptationWizard({
  editingId,
  initialData,
  initialMode,
  initialStepKey,
  lockedBeforeStep,
  onClose,
}: AdaptationWizardProps = {}) {
  const [data, setData] = useState<WizardData>({ ...EMPTY_DATA, ...(initialData ?? {}) });
  const [wizardMode, setWizardMode] = useState<WizardMode>(
    initialMode ?? initialData?.wizardMode ?? "ai",
  );
  const initialSteps = getStepsForMode(initialMode ?? initialData?.wizardMode ?? "ai");
  const initialStepIndex = initialStepKey
    ? Math.max(0, initialSteps.indexOf(initialStepKey))
    : 0;
  const [step, setStep] = useState(initialStepIndex);
  const [direction, setDirection] = useState(1);
  const [manualActivity, setManualActivity] = useState<StructuredActivity | null>(null);
  const [pendingBackTarget, setPendingBackTarget] = useState<number | null>(null);

  const steps = getStepsForMode(wizardMode);
  const stepsMeta = getStepsMeta(wizardMode);
  const currentStepKey = steps[step] ?? "type";

  const minStepIndex = useMemo(() => {
    if (!lockedBeforeStep) return 0;
    const idx = steps.indexOf(lockedBeforeStep);
    return idx === -1 ? 0 : idx;
  }, [lockedBeforeStep, steps]);

  useEffect(() => {
    const nextIndex = resyncStepForNewMode(currentStepKey, steps);
    if (nextIndex !== step) setStep(nextIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizardMode]);

  const updateData = useCallback((partial: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const clearResult = useCallback(() => {
    setManualActivity(null);
    setData((prev) => ({ ...prev, ...resetGeneratedState() }));
  }, []);

  const navigateTo = useCallback(
    (target: number) => {
      setDirection(target > step ? 1 : -1);
      setStep(target);
      announce(`Passo ${target + 1} de ${stepsMeta.length}: ${stepsMeta[target]?.description ?? ""}`);
    },
    [step, stepsMeta],
  );

  const next = useCallback(() => {
    setDirection(1);
    setStep((s) => {
      const newStep = Math.min(s + 1, stepsMeta.length - 1);
      announce(`Passo ${newStep + 1} de ${stepsMeta.length}: ${stepsMeta[newStep]?.description ?? ""}`);
      return newStep;
    });
  }, [stepsMeta]);

  const requestBack = useCallback(
    (target: number) => {
      if (target < minStepIndex) {
        if (onClose) onClose();
        return;
      }
      if (shouldConfirmDiscard(steps, step, target, Boolean(data.result))) {
        setPendingBackTarget(target);
        return;
      }
      navigateTo(target);
    },
    [step, steps, data.result, navigateTo, minStepIndex, onClose],
  );

  const prev = useCallback(() => requestBack(step - 1), [step, requestBack]);

  const goTo = (s: number) => {
    if (s < minStepIndex) return;
    if (s < step) requestBack(s);
  };

  const confirmBack = useCallback(() => {
    if (pendingBackTarget === null) return;
    clearResult();
    navigateTo(pendingBackTarget);
    setPendingBackTarget(null);
  }, [pendingBackTarget, clearResult, navigateTo]);

  const handleRestart = useCallback(() => {
    setStep(0);
    setDirection(-1);
    setWizardMode("ai");
    setManualActivity(null);
    setData({ ...EMPTY_DATA });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Adaptar Atividade</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ferramenta pedagógica. Não realiza diagnóstico. A decisão final é sempre do profissional.
        </p>
      </div>

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
                    className={`flex-1 h-0.5 ${completed ? "bg-primary" : "bg-muted"}`}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <p className="sm:hidden text-sm text-muted-foreground" role="status">
        Passo {step + 1} de {stepsMeta.length}: {stepsMeta[step]?.description}
      </p>

      <div
        className={`min-h-[400px] relative overflow-y-visible px-1 ${
          currentStepKey === "ai_editor" || currentStepKey === "editor" || currentStepKey === "pdf_preview"
            ? ""
            : "overflow-x-hidden"
        }`}
      >
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
            <WizardStepRenderer
              currentStepKey={currentStepKey}
              data={data}
              updateData={updateData}
              setWizardMode={setWizardMode}
              manualActivity={manualActivity}
              setManualActivity={setManualActivity}
              onNext={next}
              onPrev={prev}
              onRestart={handleRestart}
              editingId={editingId}
              onSaved={editingId ? onClose : undefined}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <AlertDialog
        open={pendingBackTarget !== null}
        onOpenChange={(open) => {
          if (!open) setPendingBackTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar resultado?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              Ao voltar para uma etapa anterior, o resultado gerado pela IA será descartado e você precisará gerar novamente ao avançar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBack}>Sim, descartar e voltar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
