import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { renderMathToHtml } from "@/lib/latexRenderer";
import type { StructuredQuestion, Alternative, QuestionType } from "@/types/adaptation";
import { QUESTION_TYPE_LABELS } from "@/types/adaptation";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: StructuredQuestion;
  onSave: (updated: StructuredQuestion) => void;
}

export default function QuestionEditor({ open, onOpenChange, question, onSave }: Props) {
  const [type, setType] = useState<QuestionType>(question.type);
  const [statement, setStatement] = useState(question.statement);
  const [instruction, setInstruction] = useState(question.instruction || "");
  const [alternatives, setAlternatives] = useState<Alternative[]>(
    question.alternatives || []
  );
  const [scaffolding, setScaffolding] = useState<string[]>(
    question.scaffolding || []
  );

  const handleSave = () => {
    const updated: StructuredQuestion = {
      ...question,
      type,
      statement: statement.trim(),
      instruction: instruction.trim() || undefined,
      alternatives: type === "multiple_choice" ? alternatives.filter((a) => a.text.trim()) : undefined,
      scaffolding: scaffolding.filter((s) => s.trim()).length > 0
        ? scaffolding.filter((s) => s.trim())
        : undefined,
    };
    onSave(updated);
    onOpenChange(false);
  };

  const addAlternative = () => {
    const nextLetter = String.fromCharCode(97 + alternatives.length);
    setAlternatives([...alternatives, { letter: nextLetter, text: "" }]);
  };

  const removeAlternative = (index: number) => {
    const updated = alternatives.filter((_, i) => i !== index);
    // Re-letter
    setAlternatives(updated.map((a, i) => ({ ...a, letter: String.fromCharCode(97 + i) })));
  };

  const updateAlternative = (index: number, text: string) => {
    setAlternatives(alternatives.map((a, i) => (i === index ? { ...a, text } : a)));
  };

  const addScaffolding = () => {
    setScaffolding([...scaffolding, ""]);
  };

  const removeScaffolding = (index: number) => {
    setScaffolding(scaffolding.filter((_, i) => i !== index));
  };

  const updateScaffolding = (index: number, text: string) => {
    setScaffolding(scaffolding.map((s, i) => (i === index ? text : s)));
  };

  // When switching type, handle alternatives
  const handleTypeChange = (newType: QuestionType) => {
    if (newType === "multiple_choice" && alternatives.length === 0) {
      setAlternatives([
        { letter: "a", text: "" },
        { letter: "b", text: "" },
        { letter: "c", text: "" },
        { letter: "d", text: "" },
      ]);
    } else if (newType !== "multiple_choice" && alternatives.length > 0) {
      // Merge alternatives into statement to avoid data loss
      const altText = alternatives
        .filter((a) => a.text.trim())
        .map((a) => `${a.letter}) ${a.text}`)
        .join("\n");
      if (altText) {
        setStatement((prev) => prev + "\n" + altText);
      }
      setAlternatives([]);
    }
    setType(newType);
  };

  const renderPreview = (text: string) => {
    try {
      const html = renderMathToHtml(text);
      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    } catch {
      return <span>{text}</span>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Questão {question.number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type selector */}
          <div className="space-y-2">
            <Label>Tipo da questão</Label>
            <Select value={type} onValueChange={(v) => handleTypeChange(v as QuestionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Instruction */}
          <div className="space-y-2">
            <Label>Instrução (opcional)</Label>
            <Input
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Ex: Observe a figura e responda"
            />
          </div>

          {/* Statement */}
          <div className="space-y-2">
            <Label>Enunciado</Label>
            <Textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              rows={4}
              placeholder="Texto da questão (suporta LaTeX com $...$)"
            />
            {statement.includes("$") && (
              <div className="text-sm p-2 bg-muted rounded-md">
                <span className="text-xs text-muted-foreground block mb-1">Preview:</span>
                {renderPreview(statement)}
              </div>
            )}
          </div>

          {/* Alternatives (multiple_choice only) */}
          {type === "multiple_choice" && (
            <div className="space-y-2">
              <Label>Alternativas</Label>
              <div className="space-y-2">
                {alternatives.map((alt, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-sm font-medium mt-2.5 w-6 shrink-0">
                      {alt.letter})
                    </span>
                    <div className="flex-1 space-y-1">
                      <Input
                        value={alt.text}
                        onChange={(e) => updateAlternative(index, e.target.value)}
                        placeholder={`Alternativa ${alt.letter}`}
                      />
                      {alt.text.includes("$") && (
                        <div className="text-xs p-1.5 bg-muted rounded">
                          {renderPreview(alt.text)}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => removeAlternative(index)}
                      disabled={alternatives.length <= 2}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              {alternatives.length < 5 && (
                <Button type="button" variant="outline" size="sm" onClick={addAlternative}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar alternativa
                </Button>
              )}
            </div>
          )}

          {/* Scaffolding */}
          <div className="space-y-2">
            <Label>Scaffolding / Passos de apoio (opcional)</Label>
            <div className="space-y-2">
              {scaffolding.map((step, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-sm text-muted-foreground mt-2.5 w-6 shrink-0">
                    {index + 1}.
                  </span>
                  <Input
                    value={step}
                    onChange={(e) => updateScaffolding(index, e.target.value)}
                    placeholder="Passo de apoio"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => removeScaffolding(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addScaffolding}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar passo
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!statement.trim()}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
