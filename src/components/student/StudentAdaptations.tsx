import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Trash2, FileText, Clock } from "lucide-react";
import { toast } from "sonner";
import { BARRIER_DIMENSIONS } from "@/lib/barriers";
import { motion } from "framer-motion";

interface StudentAdaptationsProps {
  studentId: string;
  studentName: string;
}

const ACTIVITY_TYPES: Record<string, string> = {
  prova: "Prova",
  exercicio: "Exercício",
  atividade_casa: "Atividade de Casa",
  trabalho: "Trabalho",
};

function barrierLabel(key: string): string {
  for (const dim of BARRIER_DIMENSIONS) {
    const b = dim.barriers.find((b) => b.key === key);
    if (b) return b.label;
  }
  return key;
}

export default function StudentAdaptations({ studentId, studentName }: StudentAdaptationsProps) {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: adaptations = [], isLoading } = useQuery({
    queryKey: ["student-adaptations", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("adaptations_history")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("adaptations_history")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("Adaptação excluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["student-adaptations", studentId] });
      queryClient.invalidateQueries({ queryKey: ["adaptations-history-all"] });
      queryClient.invalidateQueries({ queryKey: ["adaptations-history"] });
      setDeleteTarget(null);
    } catch {
      toast.error("Erro ao excluir adaptação.");
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (adaptations.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="py-12 text-center">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            Nenhuma adaptação encontrada para {studentName}.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {adaptations.length} adaptação{adaptations.length !== 1 ? "ões" : ""} encontrada{adaptations.length !== 1 ? "s" : ""}
      </p>

      {adaptations.map((adaptation: any, index: number) => {
        const barriers: string[] = Array.isArray(adaptation.barriers_used) ? adaptation.barriers_used : [];
        const title = adaptation.original_activity?.slice(0, 100) || "Adaptação";
        const typeLabel = ACTIVITY_TYPES[adaptation.activity_type || ""] || "Atividade";
        const date = new Date(adaptation.created_at).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

        return (
          <motion.div
            key={adaptation.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <Card className="border-border group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {typeLabel}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {date}
                      </span>
                    </div>
                    {barriers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {barriers.slice(0, 3).map((key: string) => (
                          <Badge key={key} variant="outline" className="text-[10px] px-1.5 py-0">
                            {barrierLabel(key)}
                          </Badge>
                        ))}
                        {barriers.length > 3 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            +{barriers.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setDeleteTarget({ id: adaptation.id, title })}
                    aria-label="Excluir adaptação"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir adaptação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação <strong>não pode ser desfeita</strong>. A adaptação será permanentemente removida do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo…" : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
