import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Users, Calendar, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { useAuth } from "@/hooks/useAuth";
import { useUserSchool } from "@/hooks/useUserSchool";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function Classes() {
  const { user } = useAuth();
  const { schoolId } = useUserSchool();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [schoolYear, setSchoolYear] = useState("");

  const { data: classes, isLoading } = useQuery({
    queryKey: ["classes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*, class_students(count)")
        .eq("teacher_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createClass = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("classes").insert({
        teacher_id: user!.id,
        name: name.trim().slice(0, 100),
        description: description.trim().slice(0, 200) || null,
        school_year: schoolYear.trim().slice(0, 10) || null,
        school_id: schoolId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Turma criada!");
      setOpen(false);
      setName("");
      setDescription("");
      setSchoolYear("");
    },
    onError: () => toast.error("Erro ao criar turma."),
  });

  const deleteClass = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("classes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Turma removida.");
    },
    onError: () => toast.error("Erro ao remover turma."),
  });

  return (
    <>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Minhas Turmas</h1>
            <p className="text-muted-foreground text-sm">Organize seus alunos por turma</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Nova Turma</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Turma</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome da turma *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value.slice(0, 100))} placeholder="Ex: 5º Ano A" maxLength={100} />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value.slice(0, 200))} placeholder="Ex: Turma vespertina" maxLength={200} />
                </div>
                <div>
                  <Label>Ano letivo</Label>
                  <Input value={schoolYear} onChange={(e) => setSchoolYear(e.target.value.slice(0, 10))} placeholder="Ex: 2026" maxLength={10} />
                </div>
                <Button onClick={() => createClass.mutate()} disabled={!name.trim() || createClass.isPending} className="w-full">
                  {createClass.isPending ? "Criando..." : "Criar Turma"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-10">Carregando...</p>
        ) : classes && classes.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls, i) => (
              <motion.div key={cls.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="hover:shadow-card-hover transition-shadow border-border group relative">
                  <Link to={`/dashboard/turmas/${cls.id}`}>
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-foreground mb-1">{cls.name}</h3>
                      {cls.description && <p className="text-xs text-muted-foreground mb-3">{cls.description}</p>}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {(cls.class_students as any)?.[0]?.count ?? 0} alunos
                        </span>
                        {cls.school_year && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {cls.school_year}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Link>
                  <button
                    onClick={(e) => { e.preventDefault(); deleteClass.mutate(cls.id); }}
                    className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma turma criada ainda.</p>
            <Button variant="outline" className="mt-4" onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Criar primeira turma
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
