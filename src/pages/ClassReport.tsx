import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, BarChart3, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";
import { BARRIER_DIMENSIONS } from "@/lib/barriers";

function barrierLabel(key: string): string {
  for (const dim of BARRIER_DIMENSIONS) {
    const b = dim.barriers.find((b) => b.key === key);
    if (b) return b.label;
  }
  return key;
}

const DIM_COLORS: Record<string, string> = {
  processamento: "bg-primary",
  atencao: "bg-accent",
  ritmo: "bg-destructive",
  engajamento: "bg-secondary-foreground",
  expressao: "bg-primary/60",
};

export default function ClassReport() {
  const { id: classId } = useParams();
  const { user } = useAuth();

  const { data: classInfo } = useQuery({
    queryKey: ["class-info", classId],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("*").eq("id", classId!).single();
      return data;
    },
    enabled: !!classId,
  });

  const { data: students } = useQuery({
    queryKey: ["class-students", classId],
    queryFn: async () => {
      const { data } = await supabase.from("class_students").select("id, name").eq("class_id", classId!);
      return data || [];
    },
    enabled: !!classId,
  });

  const { data: allBarriers } = useQuery({
    queryKey: ["class-barriers", classId, students],
    queryFn: async () => {
      if (!students?.length) return [];
      const ids = students.map((s) => s.id);
      const { data } = await supabase
        .from("student_barriers")
        .select("*")
        .in("student_id", ids)
        .eq("is_active", true);
      return data || [];
    },
    enabled: !!students && students.length > 0,
  });

  const { data: history } = useQuery({
    queryKey: ["class-history", classId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("adaptations_history")
        .select("*")
        .eq("class_id", classId!)
        .eq("teacher_id", user!.id);
      return data || [];
    },
    enabled: !!classId && !!user,
  });

  // Build heatmap: dimension × student
  const studentMap = new Map((students || []).map((s) => [s.id, s.name]));
  const heatmapData: { dimension: string; studentId: string; studentName: string; count: number }[] = [];

  BARRIER_DIMENSIONS.forEach((dim) => {
    (students || []).forEach((student) => {
      const count = (allBarriers || []).filter(
        (b) => b.student_id === student.id && b.dimension === dim.key
      ).length;
      heatmapData.push({ dimension: dim.key, studentId: student.id, studentName: student.name, count });
    });
  });

  // Aggregate barrier freq across class
  const barrierFreq = new Map<string, number>();
  (allBarriers || []).forEach((b) => {
    barrierFreq.set(b.barrier_key, (barrierFreq.get(b.barrier_key) || 0) + 1);
  });
  const topBarriers = [...barrierFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Dimension totals
  const dimTotals = BARRIER_DIMENSIONS.map((dim) => ({
    ...dim,
    count: (allBarriers || []).filter((b) => b.dimension === dim.key).length,
  }));
  const maxDim = Math.max(...dimTotals.map((d) => d.count), 1);

  // General suggestions
  const suggestions: string[] = [];
  const topDims = dimTotals.sort((a, b) => b.count - a.count);
  if (topDims[0]?.count > 0) {
    const dimSuggestions: Record<string, string> = {
      processamento: "Priorize enunciados curtos e fragmentados, com apoio visual e exemplos concretos.",
      atencao: "Use timers visíveis, atividades mais curtas com pausas planejadas e feedback frequente.",
      ritmo: "Ofereça atividades com níveis de complexidade e permita entregas flexíveis.",
      engajamento: "Incorpore elementos visuais, manipulativos e conexão com interesses dos alunos.",
      expressao: "Permita múltiplas formas de resposta (oral, desenho, esquemas) e apoie a organização.",
    };
    topDims.slice(0, 3).forEach((d) => {
      if (d.count > 0 && dimSuggestions[d.key]) {
        suggestions.push(`**${d.label}**: ${dimSuggestions[d.key]}`);
      }
    });
  }

  return (
    <Layout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Link to={`/dashboard/turmas/${classId}`}>
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar à turma
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            Relatório — {classInfo?.name || "Turma"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {(students || []).length} alunos · {(history || []).length} adaptações
          </p>
        </motion.div>

        {/* Summary */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 text-center">
              <Users className="w-8 h-8 mx-auto text-primary mb-2" />
              <p className="text-3xl font-bold text-foreground">{(students || []).length}</p>
              <p className="text-xs text-muted-foreground">Alunos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 text-center">
              <BarChart3 className="w-8 h-8 mx-auto text-primary mb-2" />
              <p className="text-3xl font-bold text-foreground">{(history || []).length}</p>
              <p className="text-xs text-muted-foreground">Adaptações</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 text-center">
              <Lightbulb className="w-8 h-8 mx-auto text-accent mb-2" />
              <p className="text-3xl font-bold text-foreground">{(allBarriers || []).length}</p>
              <p className="text-xs text-muted-foreground">Barreiras ativas</p>
            </CardContent>
          </Card>
        </div>

        {/* Dimension bars */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Barreiras por dimensão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dimTotals.map((dim) => (
                <div key={dim.key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground font-medium">{dim.label}</span>
                    <span className="text-muted-foreground">{dim.count} ocorrências</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${DIM_COLORS[dim.key] || "bg-primary"} transition-all`}
                      style={{ width: `${(dim.count / maxDim) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Heatmap */}
        {(students || []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mapa de barreiras por aluno</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left p-2 text-foreground font-medium">Aluno</th>
                    {BARRIER_DIMENSIONS.map((d) => (
                      <th key={d.key} className="p-2 text-center text-foreground font-medium">{d.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(students || []).map((student) => (
                    <tr key={student.id} className="border-t border-border">
                      <td className="p-2 text-foreground">{student.name}</td>
                      {BARRIER_DIMENSIONS.map((dim) => {
                        const count = heatmapData.find(
                          (h) => h.studentId === student.id && h.dimension === dim.key
                        )?.count || 0;
                        const intensity = count === 0 ? "bg-muted" : count <= 1 ? "bg-primary/20" : count <= 2 ? "bg-primary/50" : "bg-primary/80";
                        return (
                          <td key={dim.key} className="p-2 text-center">
                            <div className={`w-8 h-8 rounded-md ${intensity} mx-auto flex items-center justify-center text-foreground font-medium`}>
                              {count}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Top barriers */}
        {topBarriers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Barreiras mais frequentes na turma</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {topBarriers.map(([key, count]) => (
                  <li key={key} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{barrierLabel(key)}</span>
                    <Badge variant="secondary">{count} alunos</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <Card className="border-accent/30 bg-accent/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-accent" />
                Sugestões para a turma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-foreground">
                {suggestions.map((s, i) => (
                  <li key={i} dangerouslySetInnerHTML={{ __html: s.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
