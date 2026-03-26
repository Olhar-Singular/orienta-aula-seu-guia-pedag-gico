import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, FileEdit } from "lucide-react";
import type { StructuredActivity } from "@/types/adaptation";
import { QUESTION_TYPE_LABELS } from "@/types/adaptation";

type StepEditorProps = {
  activityText: string;
  structuredActivity: StructuredActivity;
  onStructuredActivityChange: (activity: StructuredActivity) => void;
  onNext: () => void;
  onPrev: () => void;
};

export function StepEditor({
  structuredActivity,
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
            {totalQuestions} questões identificadas. Revise antes de exportar.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {structuredActivity.sections.map((section, si) => (
          <div key={si} className="space-y-3">
            {section.title && (
              <h3 className="font-medium text-lg">{section.title}</h3>
            )}
            {section.questions.map((q) => (
              <Card key={`${si}-${q.number}`}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">
                      {q.number}) {q.statement}
                    </p>
                    <Badge variant="secondary" className="shrink-0">
                      {QUESTION_TYPE_LABELS[q.type] ?? q.type}
                    </Badge>
                  </div>
                  {q.alternatives && (
                    <ul className="ml-6 space-y-1 text-sm text-muted-foreground">
                      {q.alternatives.map((alt) => (
                        <li key={alt.letter}>
                          {alt.letter}) {alt.text}
                        </li>
                      ))}
                    </ul>
                  )}
                  {q.images && q.images.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {q.images.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`Imagem da questão ${q.number}`}
                          className="max-h-32 rounded border"
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>

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
