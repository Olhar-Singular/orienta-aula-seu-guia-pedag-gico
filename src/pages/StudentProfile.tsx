import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BARRIER_DIMENSIONS } from "@/lib/barriers";
import { useState, useEffect } from "react";
import StudentDocuments from "@/components/student/StudentDocuments";
import StudentPeiReport from "@/components/student/StudentPeiReport";
import StudentAdaptations from "@/components/student/StudentAdaptations";

const MAX_NOTES_LENGTH = 1000;

export default function StudentProfile() {
  const { id: classId, alunoId } = useParams<{ id: string; alunoId: string }>();
  const navigate = useNavigate();
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
      const { error } = await supabase
        .from("student_barriers")
        .upsert(
          { student_id: alunoId!, barrier_key: barrierKey, dimension, is_active: isActive },
          { onConflict: "student_id,barrier_key" }
        );
      if (error) throw error;
    },
    onMutate: async ({ barrierKey, dimension, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ["student-barriers", alunoId] });
      const previous = queryClient.getQueryData(["student-barriers", alunoId]);
      queryClient.setQueryData(["student-barriers", alunoId], (old: any[] | undefined) => {
        if (!old) return old;
        const exists = old.find((b) => b.barrier_key === barrierKey);
        if (exists) {
          return old.map((b) => b.barrier_key === barrierKey ? { ...b, is_active: isActive } : b);
        }
        return [...old, { student_id: alunoId, barrier_key: barrierKey, dimension, is_active: isActive, id: `temp-${barrierKey}` }];
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["student-barriers", alunoId], context.previous);
      }
      toast.error("Erro ao atualizar barreira.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["student-barriers", alunoId] });
    },
  });

  const saveNotes = useMutation({
    mutationFn: async () => {
      const trimmed = notes.trim().slice(0, MAX_NOTES_LENGTH);
      const { error } = await supabase
        .from("class_students")
        .update({ notes: trimmed })
        .eq("id", alunoId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Observações salvas!");
      queryClient.invalidateQueries({ queryKey: ["student", alunoId] });
      navigate(`/dashboard/turmas/${classId}`);
    },
    onError: () => toast.error("Erro ao salvar observações."),
  });

  return (
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

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="perfil" className="flex-1 sm:flex-none">Perfil & Barreiras</TabsTrigger>
          <TabsTrigger value="adaptacoes" className="flex-1 sm:flex-none">Adaptações</TabsTrigger>
          <TabsTrigger value="documentos" className="flex-1 sm:flex-none">Documentos</TabsTrigger>
          <TabsTrigger value="pei" className="flex-1 sm:flex-none">PEI</TabsTrigger>
          <TabsTrigger value="relatorio" className="flex-1 sm:flex-none">Relatório</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="space-y-6 mt-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Observações gerais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Textarea
                    className="border-border focus-visible:ring-muted-foreground/30"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTES_LENGTH))}
                    placeholder="Anotações sobre o aluno..."
                    rows={3}
                    maxLength={MAX_NOTES_LENGTH}
                  />
                  <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">
                    {notes.length}/{MAX_NOTES_LENGTH}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h2 className="text-lg font-semibold text-foreground mb-4">Barreiras Observáveis</h2>
            <p className="text-xs text-muted-foreground -mt-3 mb-4">As barreiras são salvas automaticamente ao marcar/desmarcar.</p>
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

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="sticky bottom-4 z-10 flex justify-end"
          >
            <Button
              onClick={() => saveNotes.mutate()}
              disabled={saveNotes.isPending}
              className="shadow-lg"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar perfil do aluno
            </Button>
          </motion.div>
        </TabsContent>

        <TabsContent value="adaptacoes" className="mt-4">
          {alunoId && (
            <StudentAdaptations studentId={alunoId} studentName={student?.name || "Aluno"} />
          )}
        </TabsContent>

        <TabsContent value="documentos" className="mt-4">
          {alunoId && (
            <StudentDocuments studentId={alunoId} studentName={student?.name || "Aluno"} />
          )}
        </TabsContent>

        <TabsContent value="pei" className="mt-4">
          {alunoId && classId && (
            <StudentPeiReport
              studentId={alunoId}
              studentName={student?.name || "Aluno"}
              classId={classId}
              section="pei"
              onSaved={() => navigate(`/dashboard/turmas/${classId}`)}
            />
          )}
        </TabsContent>

        <TabsContent value="relatorio" className="mt-4">
          {alunoId && classId && (
            <StudentPeiReport
              studentId={alunoId}
              studentName={student?.name || "Aluno"}
              classId={classId}
              section="report"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
