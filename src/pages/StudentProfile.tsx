import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BARRIER_DIMENSIONS } from "@/lib/barriers";
import { useState, useEffect } from "react";

export default function StudentProfile() {
  const { id: classId, alunoId } = useParams<{ id: string; alunoId: string }>();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");

  const { data: student } = useQuery({
    queryKey: ["student", alunoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("class_students").select("*").eq("id", alunoId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!alunoId,
  });

  const { data: barriers } = useQuery({
    queryKey: ["student-barriers", alunoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_barriers")
        .select("*")
        .eq("student_id", alunoId!);
      if (error) throw error;
      return data;
    },
    enabled: !!alunoId,
  });

  useEffect(() => {
    if (student?.notes) setNotes(student.notes);
  }, [student]);

  const activeBarrierKeys = new Set(barriers?.filter((b) => b.is_active).map((b) => b.barrier_key) || []);

  const toggleBarrier = useMutation({
    mutationFn: async ({ barrierKey, dimension, isActive }: { barrierKey: string; dimension: string; isActive: boolean }) => {
      if (isActive) {
        // Upsert: insert or update to active
        const { error } = await supabase
          .from("student_barriers")
          .upsert(
            { student_id: alunoId!, barrier_key: barrierKey, dimension, is_active: true },
            { onConflict: "student_id,barrier_key" }
          );
        if (error) throw error;
      } else {
        // Set inactive
        const { error } = await supabase
          .from("student_barriers")
          .upsert(
            { student_id: alunoId!, barrier_key: barrierKey, dimension, is_active: false },
            { onConflict: "student_id,barrier_key" }
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-barriers", alunoId] });
    },
    onError: () => toast.error("Erro ao atualizar barreira."),
  });

  const saveNotes = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("class_students")
        .update({ notes })
        .eq("id", alunoId!);
      if (error) throw error;
    },
    onSuccess: () => toast.success("Observações salvas!"),
    onError: () => toast.error("Erro ao salvar observações."),
  });

  return (
    <>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Link to={`/dashboard/turmas/${classId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" /> Voltar para turma
          </Link>
          <h1 className="text-2xl font-bold text-foreground">{student?.name || "Aluno"}</h1>
          {student?.registration_code && (
            <p className="text-muted-foreground text-sm">Matrícula: {student.registration_code}</p>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Observações gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anotações sobre o aluno..."
                rows={3}
              />
              <Button size="sm" onClick={() => saveNotes.mutate()} disabled={saveNotes.isPending}>
                <Save className="w-4 h-4 mr-2" /> Salvar
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h2 className="text-lg font-semibold text-foreground mb-4">Barreiras Observáveis</h2>
          <div className="space-y-4">
            {BARRIER_DIMENSIONS.map((dim) => (
              <Card key={dim.key} className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">{dim.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dim.barriers.map((barrier) => {
                    const checked = activeBarrierKeys.has(barrier.key);
                    return (
                      <label key={barrier.key} className="flex items-start gap-3 cursor-pointer group">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(val) =>
                            toggleBarrier.mutate({
                              barrierKey: barrier.key,
                              dimension: dim.key,
                              isActive: !!val,
                            })
                          }
                        />
                        <span className="text-sm text-foreground group-hover:text-primary transition-colors leading-tight">
                          {barrier.label}
                        </span>
                      </label>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>
    </>
  );
}
