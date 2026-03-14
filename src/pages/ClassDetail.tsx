import { useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, ArrowLeft, Upload, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { parseCsv } from "@/lib/csvParser";

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentCode, setStudentCode] = useState("");

  const { data: cls } = useQuery({
    queryKey: ["class", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: students, isLoading } = useQuery({
    queryKey: ["class-students", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_students")
        .select("*")
        .eq("class_id", id!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const addStudent = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("class_students").insert({
        class_id: id!,
        name: studentName.trim().slice(0, 100),
        registration_code: studentCode.trim().slice(0, 30) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-students", id] });
      toast.success("Aluno adicionado!");
      setAddOpen(false);
      setStudentName("");
      setStudentCode("");
    },
    onError: () => toast.error("Erro ao adicionar aluno."),
  });

  const deleteStudent = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase.from("class_students").delete().eq("id", studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-students", id] });
      toast.success("Aluno removido.");
    },
    onError: () => toast.error("Erro ao remover aluno."),
  });

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const result = parseCsv(text);

    if (result.errors.length > 0) {
      result.errors.forEach((err) => toast.error(err));
    }

    if (result.students.length === 0) return;

    const rows = result.students.map((s) => ({
      class_id: id!,
      name: s.nome,
      registration_code: s.matricula || null,
    }));

    const { error } = await supabase.from("class_students").insert(rows);
    if (error) {
      toast.error("Erro ao importar alunos.");
    } else {
      toast.success(`${result.students.length} aluno(s) importado(s)!`);
      queryClient.invalidateQueries({ queryKey: ["class-students", id] });
    }

    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/dashboard/turmas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" /> Voltar para turmas
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{cls?.name || "Turma"}</h1>
              {cls?.description && <p className="text-muted-foreground text-sm">{cls.description}</p>}
            </div>
            <div className="flex gap-2">
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" /> Importar Lista
              </Button>
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" /> Adicionar Aluno</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Aluno</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nome *</Label>
                      <Input value={studentName} onChange={(e) => setStudentName(e.target.value.slice(0, 100))} placeholder="Nome do aluno" maxLength={100} />
                    </div>
                    <div>
                      <Label>Matrícula</Label>
                      <Input value={studentCode} onChange={(e) => setStudentCode(e.target.value.slice(0, 30))} placeholder="Código de matrícula" maxLength={30} />
                    </div>
                    <Button onClick={() => addStudent.mutate()} disabled={!studentName.trim() || addStudent.isPending} className="w-full">
                      {addStudent.isPending ? "Adicionando..." : "Adicionar"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-10">Carregando...</p>
        ) : students && students.length > 0 ? (
          <div className="space-y-2">
            {students.map((student, i) => (
              <motion.div key={student.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="hover:shadow-card transition-shadow border-border group">
                  <CardContent className="p-4 flex items-center justify-between">
                    <Link to={`/dashboard/turmas/${id}/aluno/${student.id}`} className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{student.name}</p>
                        {student.registration_code && (
                          <p className="text-xs text-muted-foreground">Matrícula: {student.registration_code}</p>
                        )}
                      </div>
                    </Link>
                    <button
                      onClick={() => deleteStudent.mutate(student.id)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <User className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum aluno nesta turma.</p>
            <p className="text-xs text-muted-foreground mt-1">Adicione manualmente ou importe um CSV.</p>
          </div>
        )}
      </div>
    </>
  );
}
