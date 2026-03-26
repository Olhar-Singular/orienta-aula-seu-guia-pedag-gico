import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, FileEdit } from "lucide-react";
import type { StructuredActivity } from "@/types/adaptation";
import { QUESTION_TYPE_LABELS } from "@/types/adaptation";

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

  const updateQuestion = useCallback(
    (sectionIndex: number, questionIndex: number, field: string, value: string) => {
      const updated = structuredClone(structuredActivity);
      const question = updated.sections[sectionIndex].questions[questionIndex];
      if (field === "statement") {
        question.statement = value;
      }
      onStructuredActivityChange(updated);
    },
    [structuredActivity, onStructuredActivityChange]
  );

  const updateAlternative = useCallback(
    (sectionIndex: number, questionIndex: number, altIndex: number, value: string) => {
      const updated = structuredClone(structuredActivity);
      const alts = updated.sections[sectionIndex].questions[questionIndex].alternatives;
      if (alts) {
        alts[altIndex].text = value;
      }
      onStructuredActivityChange(updated);
    },
    [structuredActivity, onStructuredActivityChange]
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

      <div className="space-y-4">
        {structuredActivity.sections.map((section, si) => (
          <div key={si} className="space-y-3">
            {section.title && (
              <h3 className="font-medium text-lg">{section.title}</h3>
            )}
            {section.questions.map((q, qi) => (
              <Card key={`${si}-${q.number}`}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground font-medium">
                        Questão {q.number}
                      </label>
                      <Textarea
                        value={q.statement}
                        onChange={(e) => updateQuestion(si, qi, "statement", e.target.value)}
                        className="mt-1 min-h-[60px]"
                        aria-label={`Enunciado da questão ${q.number}`}
                      />
                    </div>
                    <Badge variant="secondary" className="shrink-0 mt-5">
                      {QUESTION_TYPE_LABELS[q.type] ?? q.type}
                    </Badge>
                  </div>
                  {q.alternatives && (
                    <ul className="ml-6 space-y-2 text-sm">
                      {q.alternatives.map((alt, ai) => (
                        <li key={alt.letter} className="flex items-center gap-2">
                          <span className="text-muted-foreground font-medium">{alt.letter})</span>
                          <Input
                            value={alt.text}
                            onChange={(e) => updateAlternative(si, qi, ai, e.target.value)}
                            className="flex-1"
                            aria-label={`Alternativa ${alt.letter} da questão ${q.number}`}
                          />
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
