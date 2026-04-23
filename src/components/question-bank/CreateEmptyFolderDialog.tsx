import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string | null;
  userId: string | null;
  onCreated: () => void;
}

export default function CreateEmptyFolderDialog({
  open,
  onOpenChange,
  schoolId,
  userId,
  onCreated,
}: Props) {
  const [grade, setGrade] = useState<string | null>(null);
  const [subject, setSubject] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!userId) return;
    if (!grade && !subject) {
      toast({ title: "Informe ao menos uma série ou matéria.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase.from as any)("question_empty_folders").insert({
        school_id: schoolId,
        created_by: userId,
        grade: grade || null,
        subject: subject || null,
      });
      if (error) {
        if (error.code === "23505") {
          toast({ title: "Pasta já existe", variant: "destructive" });
        } else throw error;
        return;
      }
      toast({ title: "Pasta criada" });
      setGrade(null);
      setSubject("");
      onCreated();
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
          <DialogTitle>Nova pasta</DialogTitle>
          <DialogDescription>
            Crie uma pasta vazia de série e/ou matéria para organizar antes de adicionar questões.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <GradeSelect value={grade} onChange={setGrade} />
          <div>
            <Label>Matéria (opcional)</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Sem matéria específica" />
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
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Criar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
