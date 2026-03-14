import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Filter, User, Clock, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { BARRIER_DIMENSIONS } from "@/lib/barriers";

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

export default function AdaptationHistory() {
  const { user } = useAuth();
  const [classFilter, setClassFilter] = useState<string>("all");
  const [studentFilter, setStudentFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [selected, setSelected] = useState<any | null>(null);

  const { data: classes } = useQuery({
    queryKey: ["classes", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("id, name").eq("teacher_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: students } = useQuery({
    queryKey: ["students-for-filter", classFilter],
    queryFn: async () => {
      let q = supabase.from("class_students").select("id, name, class_id");
      if (classFilter !== "all") q = q.eq("class_id", classFilter);
      const { data } = await q;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: history, isLoading } = useQuery({
    queryKey: ["adaptations-history", user?.id, classFilter, studentFilter, typeFilter, periodFilter],
    queryFn: async () => {
      let q = supabase
        .from("adaptations_history")
        .select("*")
        .eq("teacher_id", user!.id)
        .order("created_at", { ascending: false });

      if (classFilter !== "all") q = q.eq("class_id", classFilter);
      if (studentFilter !== "all") q = q.eq("student_id", studentFilter);
      if (typeFilter !== "all") q = q.eq("activity_type", typeFilter);

      if (periodFilter !== "all") {
        const now = new Date();
        let start: Date;
        if (periodFilter === "week") {
          start = new Date(now.getTime() - 7 * 86400000);
        } else if (periodFilter === "month") {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
        } else {
          start = new Date(now.getFullYear(), 0, 1);
        }
        q = q.gte("created_at", start.toISOString());
      }

      const { data } = await q;
      return data || [];
    },
    enabled: !!user,
  });

  const studentMap = new Map((students || []).map((s) => [s.id, s.name]));
  const classMap = new Map((classes || []).map((c) => [c.id, c.name]));

  const result = selected?.adaptation_result as any;
  const barriers = (selected?.barriers_used as any[]) || [];

  return (
    <Layout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">Histórico de Adaptações</h1>
          <p className="text-muted-foreground text-sm">Todas as adaptações realizadas com a ISA.</p>
        </motion.div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-foreground">
              <Filter className="w-4 h-4" /> Filtros
            </div>
            <div className="grid sm:grid-cols-4 gap-3">
              <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setStudentFilter("all"); }}>
                <SelectTrigger><SelectValue placeholder="Turma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as turmas</SelectItem>
                  {(classes || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={studentFilter} onValueChange={setStudentFilter}>
                <SelectTrigger><SelectValue placeholder="Aluno" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os alunos</SelectItem>
                  {(students || []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {Object.entries(ACTIVITY_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger><SelectValue placeholder="Período" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo o período</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Este mês</SelectItem>
                  <SelectItem value="year">Este ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : history && history.length > 0 ? (
          <div className="space-y-3">
            {history.map((item, i) => {
              const barriersArr = (item.barriers_used as any[]) || [];
              return (
                <motion.div key={item.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card
                    className="hover:shadow-md transition-shadow cursor-pointer border-border"
                    onClick={() => setSelected(item)}
                  >
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">
                            {ACTIVITY_TYPES[item.activity_type || ""] || "Atividade"}
                          </Badge>
                          {item.student_id && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {studentMap.get(item.student_id) || "Aluno"}
                            </span>
                          )}
                          {item.class_id && (
                            <span className="text-xs text-muted-foreground">
                              {classMap.get(item.class_id) || ""}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-foreground truncate">{item.original_activity.slice(0, 120)}...</p>
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {barriersArr.slice(0, 3).map((b: any) => (
                            <Badge key={b.barrier_key || b} variant="outline" className="text-[10px] py-0">
                              {barrierLabel(b.barrier_key || b)}
                            </Badge>
                          ))}
                          {barriersArr.length > 3 && (
                            <Badge variant="outline" className="text-[10px] py-0">+{barriersArr.length - 3}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(item.created_at!).toLocaleDateString("pt-BR")}
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma adaptação encontrada.</p>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Adaptação</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Badge>{ACTIVITY_TYPES[selected.activity_type || ""] || "Atividade"}</Badge>
                <Badge variant="outline">{new Date(selected.created_at).toLocaleDateString("pt-BR")}</Badge>
                {selected.student_id && (
                  <Badge variant="secondary">
                    <User className="w-3 h-3 mr-1" />
                    {studentMap.get(selected.student_id) || "Aluno"}
                  </Badge>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-1">Atividade Original</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted rounded-lg p-3">{selected.original_activity}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-1">Barreiras Consideradas</h4>
                <div className="flex flex-wrap gap-1">
                  {barriers.map((b: any, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {barrierLabel(b.barrier_key || b)}
                    </Badge>
                  ))}
                </div>
              </div>

              {result && (
                <>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1">Versão Universal</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/50 rounded-lg p-3">{result.version_universal}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1">Versão Direcionada</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/50 rounded-lg p-3">{result.version_directed}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1">Justificativa Pedagógica</h4>
                    <p className="text-sm text-muted-foreground">{result.pedagogical_justification}</p>
                  </div>
                  {result.implementation_tips && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Dicas de Implementação</h4>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                        {(result.implementation_tips as string[]).map((tip: string, i: number) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
