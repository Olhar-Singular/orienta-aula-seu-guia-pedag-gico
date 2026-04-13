import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, FileEdit } from "lucide-react";
import ActivityEditor from "@/components/editor/ActivityEditor";
import {
  structuredToMarkdownDsl,
  markdownDslToStructured,
} from "@/lib/activityDslConverter";
import type { StructuredActivity } from "@/types/adaptation";

type StepEditorProps = {
  structuredActivity: StructuredActivity;
  dslDraft?: string;
  onDslDraftChange: (dsl: string) => void;
  onNext: (activity: StructuredActivity) => void;
  onPrev: () => void;
};

export function StepEditor({
  structuredActivity,
  dslDraft,
  onDslDraftChange,
  onNext,
  onPrev,
}: StepEditorProps) {
  const initialDsl = useMemo(
    () => structuredToMarkdownDsl(structuredActivity),
    // Computed once on mount; dslDraft is the source of truth after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // On first mount without a saved draft, seed the parent store with the
  // DSL derived from the current StructuredActivity. Runs exactly once.
  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current && dslDraft === undefined) {
      seeded.current = true;
      onDslDraftChange(initialDsl);
    }
  }, [dslDraft, initialDsl, onDslDraftChange]);

  const value = dslDraft ?? initialDsl;

  const totalQuestions = structuredActivity.sections.reduce(
    (sum, s) => sum + s.questions.length,
    0,
  );

  const handleNext = () => {
    onNext(markdownDslToStructured(value));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <FileEdit className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-xl font-semibold">Editar Atividade</h2>
          <p className="text-sm text-muted-foreground">
            {totalQuestions} questões identificadas. Edite e revise antes de avançar para o layout.
          </p>
        </div>
      </div>

      {/* Editor full-bleed — same negative-margin pattern as StepAIEditor.
          Cancels Layout padding (px-3/sm:px-4/lg:px-6) + wizard px-1. */}
      <div className="-mx-4 sm:-mx-5 lg:-mx-7">
        <ActivityEditor value={value} onChange={onDslDraftChange} />
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev} aria-label="Voltar">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={handleNext} aria-label="Avançar para layout do PDF">
          Avançar
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
