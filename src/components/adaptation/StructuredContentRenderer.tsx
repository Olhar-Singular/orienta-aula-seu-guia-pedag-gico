import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Pencil, Trash2, Plus, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";
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
import type {
  StructuredActivity,
  StructuredQuestion,
  ActivitySection,
  QuestionType,
} from "@/types/adaptation";
import { QUESTION_TYPE_LABELS } from "@/types/adaptation";
import QuestionEditor from "./QuestionEditor";

interface Props {
  activity: StructuredActivity;
  className?: string;
  questionImages?: Record<string, string[]>;
  onActivityChange?: (updated: StructuredActivity) => void;
}

function KaTeXInline({ formula }: { formula: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(formula, ref.current, {
        throwOnError: false,
        displayMode: false,
        strict: false,
      });
    } catch {
      if (ref.current) ref.current.textContent = formula;
    }
  }, [formula]);

  return <span ref={ref} className="inline-flex mx-0.5 align-middle whitespace-nowrap text-[115%]" />;
}

function renderInlineContent(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let key = 0;

  // Handle $...$ delimited LaTeX
  const parts = text.split(/\$([^$]+)\$/g);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    if (i % 2 === 1) {
      nodes.push(<KaTeXInline key={key++} formula={part} />);
    } else {
      nodes.push(<span key={key++}>{part}</span>);
    }
  }
  return nodes;
}

const TYPE_COLORS: Record<QuestionType, string> = {
  multiple_choice: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  open_ended: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  fill_blank: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  true_false: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

function QuestionCard({
  question,
  images,
  onEdit,
  onDelete,
  editable,
}: {
  question: StructuredQuestion;
  images?: string[];
  onEdit?: () => void;
  onDelete?: () => void;
  editable?: boolean;
}) {
  const [showScaffolding, setShowScaffolding] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex gap-2.5 items-start bg-muted/40 rounded-lg p-3 border-l-[3px] border-primary/50 group">
        <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
          {question.number}
        </span>
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="secondary"
              className={cn("text-[10px] px-1.5 py-0", TYPE_COLORS[question.type])}
            >
              {QUESTION_TYPE_LABELS[question.type]}
            </Badge>
          </div>

          {question.instruction && (
            <p className="text-xs text-muted-foreground italic">
              {renderInlineContent(question.instruction)}
            </p>
          )}

          <div className="text-[13px] text-foreground leading-relaxed space-y-1">
            {question.statement.split("\n").map((line, li) => (
              <p key={li}>{renderInlineContent(line)}</p>
            ))}
          </div>

          {question.alternatives && question.alternatives.length > 0 && (
            <div className="space-y-0.5 pl-1">
              {question.alternatives.map((alt) => (
                <div key={alt.letter} className="text-[13px] flex gap-1.5">
                  <span className="font-semibold text-primary shrink-0">
                    {alt.letter})
                  </span>
                  <span>{renderInlineContent(alt.text)}</span>
                </div>
              ))}
            </div>
          )}

          {question.scaffolding && question.scaffolding.length > 0 && (
            <div>
              <button
                type="button"
                className="text-xs text-primary flex items-center gap-1 hover:underline"
                onClick={() => setShowScaffolding(!showScaffolding)}
              >
                {showScaffolding ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showScaffolding ? "Ocultar apoio" : `Ver apoio (${question.scaffolding.length} passos)`}
              </button>
              {showScaffolding && (
                <div className="mt-1 pl-2 border-l-2 border-primary/20 space-y-0.5">
                  {question.scaffolding.map((step, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      <span className="font-medium">{i + 1}.</span> {renderInlineContent(step)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {editable && (
          <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={onEdit}
                aria-label={`Editar questão ${question.number}`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={onDelete}
                aria-label={`Excluir questão ${question.number}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {images && images.length > 0 && (
        <div className="pl-8 flex flex-wrap gap-2">
          {images.map((url, idx) => (
            <img
              key={idx}
              src={url}
              alt={`Imagem da questão ${question.number}`}
              className="max-h-40 rounded-lg border border-border/50 object-contain"
              loading="lazy"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function StructuredContentRenderer({
  activity,
  className,
  questionImages,
  onActivityChange,
}: Props) {
  const [editingQuestion, setEditingQuestion] = useState<StructuredQuestion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ sectionIdx: number; questionIdx: number } | null>(null);

  const editable = !!onActivityChange;

  const handleQuestionSave = (updated: StructuredQuestion) => {
    if (!onActivityChange) return;
    const newActivity = {
      ...activity,
      sections: activity.sections.map((section) => ({
        ...section,
        questions: section.questions.map((q) =>
          q.number === updated.number ? updated : q
        ),
      })),
    };
    onActivityChange(newActivity);
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = () => {
    if (!onActivityChange || !deleteTarget) return;
    const { sectionIdx, questionIdx } = deleteTarget;
    const newSections = activity.sections.map((section, si) => {
      if (si !== sectionIdx) return section;
      const newQuestions = section.questions.filter((_, qi) => qi !== questionIdx);
      // Renumber
      return {
        ...section,
        questions: newQuestions.map((q, i) => ({ ...q, number: i + 1 })),
      };
    }).filter((s) => s.questions.length > 0);

    onActivityChange({ ...activity, sections: newSections });
    setDeleteTarget(null);
  };

  if (!activity.sections || activity.sections.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma questão na adaptação.
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {activity.general_instructions && (
        <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border/50">
          {renderInlineContent(activity.general_instructions)}
        </div>
      )}

      {activity.sections.map((section, sectionIdx) => (
        <div key={sectionIdx} className="space-y-3">
          {section.title && (
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-primary/20 pb-1">
              {section.title}
            </h4>
          )}
          {section.introduction && (
            <p className="text-sm text-muted-foreground">
              {renderInlineContent(section.introduction)}
            </p>
          )}
          {section.questions.map((question, questionIdx) => (
            <QuestionCard
              key={`${sectionIdx}-${question.number}`}
              question={question}
              images={questionImages?.[String(question.number)]}
              editable={editable}
              onEdit={() => setEditingQuestion(question)}
              onDelete={() => setDeleteTarget({ sectionIdx, questionIdx })}
            />
          ))}
        </div>
      ))}

      {editingQuestion && (
        <QuestionEditor
          open={!!editingQuestion}
          onOpenChange={(open) => !open && setEditingQuestion(null)}
          question={editingQuestion}
          onSave={handleQuestionSave}
        />
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir questão?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A questão será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuestion}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
