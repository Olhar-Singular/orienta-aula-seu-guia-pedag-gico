import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import GradeSelect from "./GradeSelect";
import type { Question } from "./QuestionListView";

const subjects = [
  "Física",
  "Matemática",
  "Química",
  "Biologia",
  "Português",
  "História",
  "Geografia",
  "Inglês",
  "Ciências",
  "Arte",
  "Ed. Física",
  "Geral",
];

interface Props {
  question: Question | null;
  onOpenChange: (open: boolean) => void;
  onMoved: () => void;
}

export default function MoveQuestionDialog({ question, onOpenChange, onMoved }: Props) {
  const open = !!question;
  const [grade, setGrade] = useState<string | null>(null);
  const [subject, setSubject] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!question) return;
    setGrade(question.grade ?? null);
    setSubject(question.subject ?? "");
  }, [question]);

  const handleSave = async () => {
    if (!question || !subject) return;
    setSaving(true);
    try {
      const { error } = await (supabase.from as any)("question_bank")
        .update({ grade: grade || null, subject })
        .eq("id", question.id);
      if (error) throw error;
      toast({ title: "Questão movida" });
      onMoved();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mover questão</DialogTitle>
          <DialogDescription>Escolha a nova série e matéria.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <GradeSelect value={grade} onChange={setGrade} />
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
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !subject}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Mover
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
