import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, TrendingUp, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";
import { BARRIER_DIMENSIONS } from "@/lib/barriers";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid } from "recharts";

function barrierLabel(key: string): string {
  for (const dim of BARRIER_DIMENSIONS) {
    const b = dim.barriers.find((b) => b.key === key);
    if (b) return b.label;
  }
  return key;
}

function dimensionLabel(key: string): string {
  return BARRIER_DIMENSIONS.find((d) => d.key === key)?.label || key;
}

const barChartConfig: ChartConfig = {
  count: { label: "Frequência", color: "hsl(var(--primary))" },
};

const lineChartConfig: ChartConfig = {
  adaptations: { label: "Adaptações", color: "hsl(var(--primary))" },
};

export default function StudentReport() {
  const { id: classId, alunoId } = useParams();
  const { user } = useAuth();

  const { data: student } = useQuery({
    queryKey: ["student", alunoId],
    queryFn: async () => {
      const { data } = await supabase.from("class_students").select("*").eq("id", alunoId!).single();
      return data;
    },
    enabled: !!alunoId,
  });

  const { data: className } = useQuery({
    queryKey: ["class-name", classId],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("name").eq("id", classId!).single();
      return data?.name;
    },
    enabled: !!classId,
  });

  const { data: history } = useQuery({
    queryKey: ["student-history", alunoId],
    queryFn: async () => {
      const { data } = await supabase
        .from("adaptations_history")
        .select("*")
        .eq("student_id", alunoId!)
        .eq("teacher_id", user!.id)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!alunoId && !!user,
  });

  // Compute barrier frequency
  const barrierFreq = new Map<string, number>();
  const strategyFreq = new Map<string, number>();
  (history || []).forEach((h) => {
    const barriers = (h.barriers_used as any[]) || [];
    barriers.forEach((b: any) => {
      const key = b.barrier_key || b;
      barrierFreq.set(key, (barrierFreq.get(key) || 0) + 1);
    });
    const result = h.adaptation_result as any;
    if (result?.strategies_applied) {
      (result.strategies_applied as string[]).forEach((s) => {
        strategyFreq.set(s, (strategyFreq.get(s) || 0) + 1);
      });
    }
  });

  const topBarriers = [...barrierFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key, count]) => ({ name: barrierLabel(key).slice(0, 30), count }));

  const topStrategies = [...strategyFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Dimension summary
  const dimFreq = new Map<string, number>();
  (history || []).forEach((h) => {
    const barriers = (h.barriers_used as any[]) || [];
    barriers.forEach((b: any) => {
      const dim = b.dimension || BARRIER_DIMENSIONS.find((d) => d.barriers.some((bb) => bb.key === (b.barrier_key || b)))?.key || "outro";
      dimFreq.set(dim, (dimFreq.get(dim) || 0) + 1);
    });
  });

  // Monthly evolution
  const monthMap = new Map<string, number>();
  (history || []).forEach((h) => {
    const d = new Date(h.created_at!);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, (monthMap.get(key) || 0) + 1);
  });
  const evolutionData = [...monthMap.entries()]
    .sort()
    .map(([month, adaptations]) => ({ month, adaptations }));

  return (
    <Layout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Link to={`/dashboard/turmas/${classId}/aluno/${alunoId}`}>
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao perfil
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            Relatório — {student?.name || "Aluno"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {className || "Turma"} · {(history || []).length} adaptações realizadas
          </p>
        </motion.div>

        {/* Summary cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 text-center">
              <BarChart3 className="w-8 h-8 mx-auto text-primary mb-2" />
              <p className="text-3xl font-bold text-foreground">{(history || []).length}</p>
              <p className="text-xs text-muted-foreground">Adaptações</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 text-center">
              <TrendingUp className="w-8 h-8 mx-auto text-primary mb-2" />
              <p className="text-3xl font-bold text-foreground">{barrierFreq.size}</p>
              <p className="text-xs text-muted-foreground">Barreiras distintas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 text-center">
              <Lightbulb className="w-8 h-8 mx-auto text-accent mb-2" />
              <p className="text-3xl font-bold text-foreground">{strategyFreq.size}</p>
              <p className="text-xs text-muted-foreground">Estratégias utilizadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Barrier frequency chart */}
        {topBarriers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Barreiras mais frequentes</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={barChartConfig} className="h-[260px] w-full">
                <BarChart data={topBarriers} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Temporal evolution */}
        {evolutionData.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução temporal</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={lineChartConfig} className="h-[220px] w-full">
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="adaptations" stroke="var(--color-adaptations)" strokeWidth={2} dot />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Dimension summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Barreiras por dimensão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {BARRIER_DIMENSIONS.map((dim) => {
                const count = dimFreq.get(dim.key) || 0;
                const max = Math.max(...[...dimFreq.values()], 1);
                return (
                  <div key={dim.key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground font-medium">{dim.label}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top strategies */}
        {topStrategies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estratégias mais utilizadas</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {topStrategies.map(([strategy, count]) => (
                  <li key={strategy} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{strategy}</span>
                    <Badge variant="secondary">{count}x</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
