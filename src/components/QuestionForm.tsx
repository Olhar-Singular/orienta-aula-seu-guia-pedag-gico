import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Plus, X } from "lucide-react";

const subjects = [
  "Matemática",
  "Português",
  "Ciências",
  "História",
  "Geografia",
  "Inglês",
  "Arte",
  "Ed. Física",
];

type QuestionFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: any | null;
  onSaved: () => void;
};

export default function QuestionForm({
  open,
  onOpenChange,
  question,
  onSaved,
}: QuestionFormProps) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medio");
  const [options, setOptions] = useState<string[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [resolution, setResolution] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (question) {
      setText(question.text || "");
      setSubject(question.subject || "");
      setTopic(question.topic || "");
      setDifficulty(question.difficulty || "medio");
      setOptions(Array.isArray(question.options) ? question.options : []);
      setCorrectAnswer(question.correct_answer ?? null);
      setResolution(question.resolution || "");
    } else {
      setText("");
      setSubject("");
      setTopic("");
      setDifficulty("medio");
      setOptions([]);
      setCorrectAnswer(null);
      setResolution("");
    }
  }, [question, open]);

  const handleSave = async () => {
    if (!text.trim() || !subject) {
      toast({
        title: "Preencha o enunciado e a matéria.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const payload: any = {
      text: text.trim(),
      subject,
      topic: topic || null,
      difficulty,
      options: options.length > 0 ? options : null,
      correct_answer: correctAnswer,
      resolution: resolution || null,
      source: "manual",
    };

    let error;
    if (question?.id) {
      ({ error } = await (supabase.from as any)("question_bank")
        .update(payload)
        .eq("id", question.id));
    } else {
      payload.created_by = user!.id;
      ({ error } = await (supabase.from as any)("question_bank").insert(payload));
    }

    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: question ? "Questão atualizada!" : "Questão adicionada!" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {question ? "Editar Questão" : "Adicionar Questão"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Enunciado *</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Digite o enunciado da questão..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Matéria *</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tópico</Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: Frações"
              />
            </div>
          </div>
          <div>
            <Label>Dificuldade</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="facil">Fácil</SelectItem>
                <SelectItem value="medio">Médio</SelectItem>
                <SelectItem value="dificil">Difícil</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Alternativas (opcional)</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setOptions([...options, ""])}
              >
                <Plus className="w-3 h-3 mr-1" /> Adicionar
              </Button>
            </div>
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <Input
                  value={opt}
                  onChange={(e) => {
                    const n = [...options];
                    n[i] = e.target.value;
                    setOptions(n);
                  }}
                  placeholder={`Alternativa ${String.fromCharCode(65 + i)}`}
                />
                <Button
                  type="button"
                  size="sm"
                  variant={correctAnswer === i ? "default" : "outline"}
                  onClick={() => setCorrectAnswer(correctAnswer === i ? null : i)}
                  className="shrink-0"
                >
                  {correctAnswer === i ? "✓" : String.fromCharCode(65 + i)}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setOptions(options.filter((_, j) => j !== i));
                    if (correctAnswer === i) setCorrectAnswer(null);
                    else if (correctAnswer !== null && correctAnswer > i)
                      setCorrectAnswer(correctAnswer - 1);
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
          <div>
            <Label>Resolução (opcional)</Label>
            <Textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={2}
              placeholder="Explicação da resposta..."
            />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Salvando..." : question ? "Atualizar" : "Adicionar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
