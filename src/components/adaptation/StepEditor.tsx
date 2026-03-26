import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, FileEdit } from "lucide-react";
import type { StructuredActivity } from "@/types/adaptation";
import StructuredContentRenderer from "./StructuredContentRenderer";

type StepEditorProps = {
  structuredActivity: StructuredActivity;
  onStructuredActivityChange: (activity: StructuredActivity) => void;
  onNext: () => void;
  onPrev: () => void;
};

export function StepEditor({
  structuredActivity,
  onStructuredActivityChange,
  onNext,
  onPrev,
}: StepEditorProps) {
  const totalQuestions = structuredActivity.sections.reduce(
    (sum, s) => sum + s.questions.length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileEdit className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-xl font-semibold">Editar Atividade</h2>
          <p className="text-sm text-muted-foreground">
            {totalQuestions} questões identificadas. Edite e revise antes de exportar.
          </p>
        </div>
      </div>

      <StructuredContentRenderer
        activity={structuredActivity}
        onActivityChange={onStructuredActivityChange}
      />

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev} aria-label="Voltar">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={onNext} aria-label="Avançar para exportação">
          Avançar
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
