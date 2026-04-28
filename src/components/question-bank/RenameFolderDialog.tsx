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
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { resolveUnclassifiedLabel } from "@/lib/questionFolders";

interface Props {
  target:
    | null
    | { level: "grade"; current: string | null }
    | { level: "subject"; current: string | null; grade: string | null };
  onOpenChange: (open: boolean) => void;
  onRenamed: () => void;
}

export default function RenameFolderDialog({ target, onOpenChange, onRenamed }: Props) {
  const open = !!target;
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!target) {
      setValue("");
      setCount(null);
      return;
    }
    setValue(target.current ?? "");
    // fetch affected count
    (async () => {
      let q: any = (supabase.from as any)("question_bank").select("id", { count: "exact", head: true });
      if (target.level === "grade") {
        q = target.current === null ? q.is("grade", null) : q.eq("grade", target.current);
      } else {
        q = target.current === null ? q.is("subject", null) : q.eq("subject", target.current);
        q = target.grade === null ? q.is("grade", null) : q.eq("grade", target.grade);
      }
      const { count: c } = await q;
      setCount(c ?? 0);
    })();
  }, [target]);

  const handleRename = async () => {
    if (!target) return;
    const newValue = value.trim();
    if (!newValue) {
      toast({ title: "Nome inválido", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let q: any = (supabase.from as any)("question_bank");
      if (target.level === "grade") {
        q = q.update({ grade: newValue });
        q = target.current === null ? q.is("grade", null) : q.eq("grade", target.current);
      } else {
        q = q.update({ subject: newValue });
        q = target.current === null ? q.is("subject", null) : q.eq("subject", target.current);
        q = target.grade === null ? q.is("grade", null) : q.eq("grade", target.grade);
      }
      const { error } = await q;
      if (error) throw error;
      toast({ title: "Pasta renomeada", description: `${count ?? 0} questões atualizadas.` });
      onRenamed();
    } catch (e: any) {
      toast({ title: "Erro ao renomear", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const currentLabel = target?.current ?? resolveUnclassifiedLabel(target?.level ?? "grade");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Renomear {target?.level === "grade" ? "série" : "matéria"}
          </DialogTitle>
          <DialogDescription>
            Atualiza <strong>{count ?? "..."}</strong> questão(ões) atualmente em{" "}
            <strong>{currentLabel}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Novo nome</Label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Digite o novo nome"
              autoFocus
            />
          </div>
          {count && count > 1 && (
            <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 rounded p-2 border border-amber-200">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Todas as {count} questões da sua escola serão renomeadas. Esta ação afeta colegas
                professores.
              </span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleRename} disabled={saving || !value.trim()}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Renomear
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
