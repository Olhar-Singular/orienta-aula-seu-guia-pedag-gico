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
import StepActivityType from "./StepActivityType";
import StepActivityInput from "./StepActivityInput";
import StepBarrierSelection from "./StepBarrierSelection";
import StepExport from "./StepExport";
import { StepChoice } from "./StepChoice";
import { StepEditor } from "./StepEditor";
import StepAIEditor from "./StepAIEditor";
import StepPdfPreview from "./StepPdfPreview";
import { convertToStructuredActivity } from "@/lib/convertToStructuredActivity";
import { parseActivityText } from "@/lib/parseActivityText";
import { isStructuredActivity } from "@/types/adaptation";
import { markdownDslToStructured } from "@/lib/activityDslConverter";
import type { StructuredActivity, SelectedQuestion } from "@/types/adaptation";
import type { EditableActivity } from "@/lib/pdf/editableActivity";
import { buildManualEditorAdvancePatch, shouldConfirmDiscard, resyncStepForNewMode, resetGeneratedState } from "@/lib/adaptationWizardHelpers";
import type { HistoryState } from "@/hooks/useHistory";
import type { ImageRegistry } from "@/components/editor/imageManagerUtils";

export type { SelectedQuestion };

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
  aiEditorUniversalDsl?: string;
  aiEditorDirectedDsl?: string;
  manualEditorDsl?: string;
  pdfHistoryUniversal?: HistoryState<EditableActivity>;
  pdfHistoryDirected?: HistoryState<EditableActivity>;
  editorImageRegistry?: ImageRegistry;
};

export { getStepsForMode, getNextStep } from "@/lib/wizardSteps";
import { getStepsForMode } from "@/lib/wizardSteps";

type StepMeta = { label: string; description: string };

const STEP_META: Record<string, StepMeta> = {
  type: { label: "Tipo", description: "Tipo de atividade" },
  content: { label: "Conteúdo", description: "Inserir atividade" },
  choice: { label: "Modo", description: "Escolher modo" },
  barriers: { label: "Barreiras", description: "Aluno e barreiras" },
  ai_editor: { label: "Editor", description: "Editar atividade adaptada" },
  editor: { label: "Editor", description: "Editar atividade" },
  pdf_preview: { label: "Layout", description: "Preview e layout do PDF" },
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

export type AdaptationWizardProps = {
  /** Run the wizard pre-loaded with a saved adaptation, jumping straight to
   *  the editor steps and saving via UPDATE instead of INSERT. */
  editMode?: boolean;
  /** Row id of the `adaptations_history` record being edited. Required when
   *  `editMode` is true. */
  editingId?: string;
  /** Wizard data preloaded from a saved record (see buildEditModeInitialData). */
  initialData?: Partial<WizardData>;
  /** Mode to start in. Defaults to "ai". Edit mode always uses "ai". */
  initialMode?: WizardMode;
  /** Step key to start on (e.g. "ai_editor" for Step 5). Defaults to "type". */
  initialStepKey?: string;
  /** Called when the user closes the wizard (e.g. after saving an edit). */
  onClose?: () => void;
};

export default function AdaptationWizard({
  editMode = false,
  editingId,
  initialData,
  initialMode,
  initialStepKey,
  onClose,
}: AdaptationWizardProps = {}) {
  const baseData: WizardData = {
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
  const [data, setData] = useState<WizardData>({ ...baseData, ...(initialData ?? {}) });
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

  const steps = getStepsForMode(wizardMode);
  const stepsMeta = getStepsMeta(wizardMode);
  const currentStepKey = steps[step] ?? "type";

  /** In edit mode, prevent navigation back to steps before the editor —
   *  the saved adaptation already exists; going to "barriers" / "choice"
   *  would risk wiping the loaded result via re-generation. */
  const editModeMinStep = useMemo(() => {
    if (!editMode) return 0;
    const idx = steps.indexOf("ai_editor");
    return idx === -1 ? 0 : idx;
  }, [editMode, steps]);

  useEffect(() => {
    const nextIndex = resyncStepForNewMode(currentStepKey, steps);
    if (nextIndex !== step) setStep(nextIndex);
    // Only re-evaluate when the mode (and thus `steps`) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizardMode]);

  const buildManualActivity = useCallback((): StructuredActivity => {
    if (data.selectedQuestions.length > 0) {
      return convertToStructuredActivity(data.selectedQuestions);
    }
    return parseActivityText(data.activityText);
  }, [data.selectedQuestions, data.activityText]);

  const editorActivity = useMemo(() => {
    return manualActivity ?? buildManualActivity();
  }, [manualActivity, buildManualActivity]);

  const [pendingBackTarget, setPendingBackTarget] = useState<number | null>(null);

  const updateData = useCallback((partial: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const clearResult = useCallback(() => {
    setManualActivity(null);
    setData((prev) => ({ ...prev, ...resetGeneratedState() }));
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
    if (target < editModeMinStep) {
      if (editMode && onClose) onClose();
      return;
    }
    if (shouldConfirmDiscard(steps, step, target, Boolean(data.result))) {
      setPendingBackTarget(target);
      return;
    }
    navigateTo(target);
  }, [step, steps, data.result, navigateTo, editModeMinStep, editMode, onClose]);

  const prev = useCallback(() => {
    requestBack(step - 1);
  }, [step, requestBack]);

  const goTo = (s: number) => {
    if (s < editModeMinStep) return;
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

  const defaultHeader = useMemo(
    () => ({
      schoolName: "",
      subject: "",
      teacherName: "",
      className: "",
      date: new Date().toLocaleDateString("pt-BR"),
      showStudentLine: true,
    }),
    [],
  );

  const handleUniversalChange = useCallback(
    (activity: EditableActivity) => updateData({ editableActivity: activity }),
    [updateData],
  );
  const handleDirectedChange = useCallback(
    (activity: EditableActivity) => updateData({ editableActivityDirected: activity }),
    [updateData],
  );
  const handleHistoryUniversalChange = useCallback(
    (state: HistoryState<EditableActivity>) => updateData({ pdfHistoryUniversal: state }),
    [updateData],
  );
  const handleHistoryDirectedChange = useCallback(
    (state: HistoryState<EditableActivity>) => updateData({ pdfHistoryDirected: state }),
    [updateData],
  );

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

      {/* Step Content with slide animation.
          overflow-x-hidden is needed for the slide animation but clips full-width steps.
          We disable it for editor steps and pdf_preview (all use full-bleed / split layouts). */}
      <div className={`min-h-[400px] relative overflow-y-visible px-1 ${currentStepKey === "ai_editor" || currentStepKey === "editor" || currentStepKey === "pdf_preview" ? "" : "overflow-x-hidden"}`}>
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
            {currentStepKey === "ai_editor" && (
              <StepAIEditor
                data={data}
                updateData={updateData}
                onNext={next}
                onPrev={prev}
              />
            )}
            {currentStepKey === "editor" && (
              <StepEditor
                structuredActivity={editorActivity}
                dslDraft={data.manualEditorDsl}
                onDslDraftChange={(dsl) => updateData({ manualEditorDsl: dsl })}
                imageRegistry={data.editorImageRegistry}
                onImageRegistryChange={(registry) => updateData({ editorImageRegistry: registry })}
                onNext={(updated) => {
                  setManualActivity(updated);
                  // Only invalidates layout state when the text actually changed.
                  updateData(buildManualEditorAdvancePatch(updated, data));
                  next();
                }}
                onPrev={prev}
              />
            )}
            {currentStepKey === "pdf_preview" && data.result && (
              <StepPdfPreview
                universalStructured={
                  isStructuredActivity(data.result.version_universal)
                    ? data.result.version_universal
                    : markdownDslToStructured(String(data.result.version_universal))
                }
                directedStructured={
                  isStructuredActivity(data.result.version_directed)
                    ? data.result.version_directed
                    : markdownDslToStructured(String(data.result.version_directed))
                }
                defaultHeader={defaultHeader}
                questionImagesUniversal={data.questionImages.version_universal}
                questionImagesDirected={data.questionImages.version_directed}
                savedUniversal={data.editableActivity}
                savedDirected={data.editableActivityDirected}
                savedHistoryUniversal={data.pdfHistoryUniversal}
                savedHistoryDirected={data.pdfHistoryDirected}
                adaptationResult={data.result}
                onNext={next}
                onBack={prev}
                onUniversalChange={handleUniversalChange}
                onDirectedChange={handleDirectedChange}
                onHistoryUniversalChange={handleHistoryUniversalChange}
                onHistoryDirectedChange={handleHistoryDirectedChange}
              />
            )}
            {currentStepKey === "export" && (
              <StepExport
                data={data}
                onPrev={prev}
                editingId={editMode ? editingId : undefined}
                onSaved={editMode ? onClose : undefined}
                onRestart={() => {
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
                  ...resetGeneratedState(),
                } as WizardData);
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
