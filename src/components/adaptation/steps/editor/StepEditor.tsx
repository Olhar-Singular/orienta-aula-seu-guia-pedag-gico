import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, FileEdit } from "lucide-react";
import ActivityEditor from "@/components/editor/ActivityEditor";
import {
  structuredToMarkdownDsl,
  markdownDslToStructured,
} from "@/lib/activityDslConverter";
import { useActivityContent } from "@/hooks/useActivityContent";
import type { StructuredActivity } from "@/types/adaptation";
import type { EditorContent } from "../../AdaptationWizard";

type StepEditorProps = {
  structuredActivity: StructuredActivity;
  content?: EditorContent;
  onContentChange: (next: EditorContent) => void;
  onNext: (activity: StructuredActivity) => void;
  onPrev: () => void;
};

export function StepEditor({
  structuredActivity,
  content: savedContent,
  onContentChange,
  onNext,
  onPrev,
}: StepEditorProps) {
  const initialDsl = useMemo(
    () => structuredToMarkdownDsl(structuredActivity),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const content = useActivityContent({
    initialDsl: savedContent?.dsl ?? initialDsl,
    initialRegistry: savedContent?.registry ?? {},
    onChange: onContentChange,
  });

  const totalQuestions = structuredActivity.sections.reduce(
    (sum, s) => sum + s.questions.length,
    0,
  );

  const handleNext = () => {
    onNext(markdownDslToStructured(content.dslExpanded));
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

      <div className="-mx-4 sm:-mx-5 lg:-mx-7">
        <ActivityEditor
          value={content.dsl}
          onChange={content.setDsl}
          imageRegistry={content.registry}
          onUndo={content.undo}
          onRedo={content.redo}
          canUndo={content.canUndo}
          canRedo={content.canRedo}
        />
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
