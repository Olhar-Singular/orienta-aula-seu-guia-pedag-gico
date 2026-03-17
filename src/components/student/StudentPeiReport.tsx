import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Save,
  Download,
  Loader2,
  FileText,
  BarChart3,
  TrendingUp,
  Lightbulb,
  User,
  Target,
  BookOpen,
  GraduationCap,
  Heart,
  Calendar,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
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

const barChartConfig: ChartConfig = {
  count: { label: "Frequência", color: "hsl(var(--primary))" },
};
const lineChartConfig: ChartConfig = {
  adaptations: { label: "Adaptações", color: "hsl(var(--primary))" },
};

type PeiGoal = {
  id: string;
  area: string;
  description: string;
  deadline: string;
  status: "pendente" | "em_progresso" | "atingida";
};

type Props = {
  studentId: string;
  studentName: string;
  classId: string;
  onSaved?: () => void;
};

export default function StudentPeiReport({ studentId, studentName, classId, onSaved }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // PEI form state
  const [peiForm, setPeiForm] = useState({
    student_profile: "",
    goals: [] as PeiGoal[],
    curricular_adaptations: "",
    resources_and_support: "",
    pedagogical_strategies: "",
    review_schedule: "",
    additional_notes: "",
  });
  

  // Fetch PEI
  const { data: pei, isLoading: peiLoading } = useQuery({
    queryKey: ["student-pei", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_pei")
        .select("*")
        .eq("student_id", studentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch barriers for context
  const { data: barriers } = useQuery({
    queryKey: ["student-barriers", studentId],
    queryFn: async () => {
      const { data } = await supabase.from("student_barriers").select("*").eq("student_id", studentId);
      return data || [];
    },
  });

  // Fetch student notes
  const { data: student } = useQuery({
    queryKey: ["student", studentId],
    queryFn: async () => {
      const { data } = await supabase.from("class_students").select("*").eq("id", studentId).single();
      return data;
    },
  });

  // Fetch adaptations history for report
  const { data: history } = useQuery({
    queryKey: ["student-history", studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("adaptations_history")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: true });
      return data || [];
    },
  });

  // Fetch class name
  const { data: className } = useQuery({
    queryKey: ["class-name", classId],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("name").eq("id", classId).single();
      return data?.name;
    },
  });

  useEffect(() => {
    if (pei) {
      setPeiForm({
        student_profile: pei.student_profile || "",
        goals: Array.isArray(pei.goals) ? (pei.goals as PeiGoal[]) : [],
        curricular_adaptations: pei.curricular_adaptations || "",
        resources_and_support: pei.resources_and_support || "",
        pedagogical_strategies: pei.pedagogical_strategies || "",
        review_schedule: pei.review_schedule || "",
        additional_notes: pei.additional_notes || "",
      });
    }
  }, [pei]);

  const savePei = useMutation({
    mutationFn: async () => {
      const payload = {
        student_id: studentId,
        teacher_id: user!.id,
        ...peiForm,
        goals: peiForm.goals as any,
      };
      const { error } = await supabase
        .from("student_pei")
        .upsert(payload, { onConflict: "student_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("PEI salvo!");
      queryClient.invalidateQueries({ queryKey: ["student-pei", studentId] });
      onSaved?.();
    },
    onError: () => toast.error("Erro ao salvar PEI."),
  });

  const generateWithISA = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-pei", {
        body: { student_id: studentId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPeiForm((prev) => ({
        ...prev,
        student_profile: data.student_profile || prev.student_profile,
        goals: Array.isArray(data.goals) ? data.goals : prev.goals,
        curricular_adaptations: data.curricular_adaptations || prev.curricular_adaptations,
        resources_and_support: data.resources_and_support || prev.resources_and_support,
        pedagogical_strategies: data.pedagogical_strategies || prev.pedagogical_strategies,
        review_schedule: data.review_schedule || prev.review_schedule,
      }));
      toast.success("PEI gerado pela ISA! Revise e salve.");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar PEI com ISA.");
    } finally {
      setIsGenerating(false);
    }
  };
  const addGoal = () => {
    setPeiForm((prev) => ({
      ...prev,
      goals: [
        ...prev.goals,
        { id: crypto.randomUUID(), area: "", description: "", deadline: "", status: "pendente" as const },
      ],
    }));
  };

  const updateGoal = (id: string, field: keyof PeiGoal, value: string) => {
    setPeiForm((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => (g.id === id ? { ...g, [field]: value } : g)),
    }));
  };

  const removeGoal = (id: string) => {
    setPeiForm((prev) => ({ ...prev, goals: prev.goals.filter((g) => g.id !== id) }));
  };

  // ─── Report Data ───
  const barrierFreq = new Map<string, number>();
  const strategyFreq = new Map<string, number>();
  (history || []).forEach((h) => {
    const b = (h.barriers_used as any[]) || [];
    b.forEach((bb: any) => {
      const key = bb.barrier_key || bb;
      barrierFreq.set(key, (barrierFreq.get(key) || 0) + 1);
    });
    const r = h.adaptation_result as any;
    if (r?.strategies_applied) {
      (r.strategies_applied as string[]).forEach((s) => {
        strategyFreq.set(s, (strategyFreq.get(s) || 0) + 1);
      });
    }
  });

  const topBarriers = [...barrierFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key, count]) => ({ name: barrierLabel(key).slice(0, 30), count }));

  const topStrategies = [...strategyFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const dimFreq = new Map<string, number>();
  (history || []).forEach((h) => {
    const b = (h.barriers_used as any[]) || [];
    b.forEach((bb: any) => {
      const dim = bb.dimension || BARRIER_DIMENSIONS.find((d) => d.barriers.some((bbb) => bbb.key === (bb.barrier_key || bb)))?.key || "outro";
      dimFreq.set(dim, (dimFreq.get(dim) || 0) + 1);
    });
  });

  const monthMap = new Map<string, number>();
  (history || []).forEach((h) => {
    const d = new Date(h.created_at!);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, (monthMap.get(key) || 0) + 1);
  });
  const evolutionData = [...monthMap.entries()].sort().map(([month, adaptations]) => ({ month, adaptations }));

  const handleExportReportPdf = async () => {
    if (!reportRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;

      const canvas = await html2canvas(reportRef.current, { scale: 1.5, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let y = 10;
      if (imgHeight <= pageHeight - 20) {
        pdf.addImage(imgData, "PNG", 10, y, imgWidth, imgHeight);
      } else {
        // Multi-page
        let remainingHeight = canvas.height;
        let srcY = 0;
        const sliceHeight = Math.floor((canvas.width * (pageHeight - 20)) / imgWidth);
        let page = 0;
        while (remainingHeight > 0) {
          if (page > 0) pdf.addPage();
          const h = Math.min(sliceHeight, remainingHeight);
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = h;
          const ctx = sliceCanvas.getContext("2d")!;
          ctx.drawImage(canvas, 0, srcY, canvas.width, h, 0, 0, canvas.width, h);
          const sliceImg = sliceCanvas.toDataURL("image/png");
          const sliceImgH = (h * imgWidth) / canvas.width;
          pdf.addImage(sliceImg, "PNG", 10, 10, imgWidth, sliceImgH);
          srcY += h;
          remainingHeight -= h;
          page++;
        }
      }

      pdf.save(`Relatorio_${studentName.replace(/\s+/g, "_")}.pdf`);
      toast.success("Relatório exportado!");
    } catch {
      toast.error("Erro ao exportar relatório.");
    }
  };

  const GOAL_STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    pendente: { label: "Pendente", variant: "outline" },
    em_progresso: { label: "Em Progresso", variant: "secondary" },
    atingida: { label: "Atingida", variant: "default" },
  };

  return (
    <div className="space-y-8">
      {/* ═══════════ PEI SECTION ═══════════ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Plano Educacional Individualizado (PEI)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Planejamento colaborativo para adequar o percurso educacional do aluno.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={generateWithISA} disabled={isGenerating} className="gap-1.5">
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              Gerar com ISA
            </Button>
            <Button size="sm" onClick={() => savePei.mutate()} disabled={savePei.isPending} className="gap-1.5">
              <Save className="w-4 h-4" /> Salvar PEI
            </Button>
          </div>
        </div>

        {peiLoading ? (
          <Card className="border-border">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />
              Carregando PEI…
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" defaultValue={["profile", "goals", "adaptations", "resources", "strategies", "review"]} className="space-y-3">
            {/* Profile */}
            <AccordionItem value="profile" className="border border-border rounded-lg px-4 bg-card shadow-sm">
              <AccordionTrigger className="text-sm font-semibold">
                <span className="flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Perfil do Aluno</span>
              </AccordionTrigger>
              <AccordionContent>
                <Textarea
                  className="border-border focus-visible:ring-muted-foreground/30"
                  value={peiForm.student_profile}
                  onChange={(e) => setPeiForm((p) => ({ ...p, student_profile: e.target.value }))}
                  placeholder="Descreva habilidades, dificuldades, interesses e estilo de aprendizagem do aluno…"
                  rows={4}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Goals */}
            <AccordionItem value="goals" className="border border-border rounded-lg px-4 bg-card shadow-sm">
              <AccordionTrigger className="text-sm font-semibold">
                <span className="flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Metas e Objetivos ({peiForm.goals.length})</span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                {peiForm.goals.map((goal) => (
                  <Card key={goal.id} className="border-border">
                    <CardContent className="py-3 px-4 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Área (ex: Comunicação)"
                          value={goal.area}
                          onChange={(e) => updateGoal(goal.id, "area", e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Prazo"
                          value={goal.deadline}
                          onChange={(e) => updateGoal(goal.id, "deadline", e.target.value)}
                          className="w-40"
                        />
                        <select
                          value={goal.status}
                          onChange={(e) => updateGoal(goal.id, "status", e.target.value)}
                          className="h-10 text-xs border border-border rounded-md px-2 bg-background text-foreground focus:outline-none focus:ring-0 focus:border-ring/40"
                        >
                          <option value="pendente">Pendente</option>
                          <option value="em_progresso">Em Progresso</option>
                          <option value="atingida">Atingida</option>
                        </select>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeGoal(goal.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Textarea
                        placeholder="Descrição da meta (específica e mensurável)…"
                        value={goal.description}
                        onChange={(e) => updateGoal(goal.id, "description", e.target.value)}
                        rows={2}
                      />
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" size="sm" onClick={addGoal} className="gap-1.5">
                  <Plus className="w-4 h-4" /> Adicionar meta
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* Curricular Adaptations */}
            <AccordionItem value="adaptations" className="border border-border rounded-lg px-4 bg-card shadow-sm">
              <AccordionTrigger className="text-sm font-semibold">
                <span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> Adaptações Curriculares</span>
              </AccordionTrigger>
              <AccordionContent>
                <Textarea
                  className="border-border focus-visible:ring-muted-foreground/30"
                  value={peiForm.curricular_adaptations}
                  onChange={(e) => setPeiForm((p) => ({ ...p, curricular_adaptations: e.target.value }))}
                  placeholder="Modificações no conteúdo, forma de ensinar ou avaliar…"
                  rows={4}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Resources */}
            <AccordionItem value="resources" className="border border-border rounded-lg px-4 bg-card shadow-sm">
              <AccordionTrigger className="text-sm font-semibold">
                <span className="flex items-center gap-2"><Heart className="w-4 h-4 text-primary" /> Recursos e Apoios</span>
              </AccordionTrigger>
              <AccordionContent>
                <Textarea
                  className="border-border focus-visible:ring-muted-foreground/30"
                  value={peiForm.resources_and_support}
                  onChange={(e) => setPeiForm((p) => ({ ...p, resources_and_support: e.target.value }))}
                  placeholder="Profissionais, tecnologias assistivas, participação da família…"
                  rows={4}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Strategies */}
            <AccordionItem value="strategies" className="border border-border rounded-lg px-4 bg-card shadow-sm">
              <AccordionTrigger className="text-sm font-semibold">
                <span className="flex items-center gap-2"><Lightbulb className="w-4 h-4 text-primary" /> Estratégias Pedagógicas</span>
              </AccordionTrigger>
              <AccordionContent>
                <Textarea
                  className="border-border focus-visible:ring-muted-foreground/30"
                  value={peiForm.pedagogical_strategies}
                  onChange={(e) => setPeiForm((p) => ({ ...p, pedagogical_strategies: e.target.value }))}
                  placeholder="Rotinas visuais, pausas programadas, ensino multissensorial…"
                  rows={4}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Review */}
            <AccordionItem value="review" className="border border-border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold">
                <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Acompanhamento e Revisão</span>
              </AccordionTrigger>
              <AccordionContent>
                <Textarea
                  className="border-border focus-visible:ring-muted-foreground/30"
                  value={peiForm.review_schedule}
                  onChange={(e) => setPeiForm((p) => ({ ...p, review_schedule: e.target.value }))}
                  placeholder="Como e quando o plano será avaliado e atualizado…"
                  rows={3}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Additional notes */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Observações adicionais</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              className="border-border focus-visible:ring-muted-foreground/30"
              value={peiForm.additional_notes}
              onChange={(e) => setPeiForm((p) => ({ ...p, additional_notes: e.target.value }))}
              placeholder="Anotações extras do professor sobre o PEI…"
              rows={2}
            />
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* ═══════════ REPORT SECTION ═══════════ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Relatório para Pais
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Relatório completo com PEI, barreiras, evolução e atividades — compartilhe com a família.
            </p>
          </div>
          <Button size="sm" onClick={handleExportReportPdf} className="gap-1.5">
            <Download className="w-4 h-4" /> Baixar Relatório Completo (PDF)
          </Button>
        </div>

        <div ref={reportRef} className="space-y-4">
          {/* Report Header */}
          <Card className="border-border bg-primary/5">
            <CardContent className="py-4 px-5">
              <h3 className="font-bold text-foreground text-base">{studentName}</h3>
              <p className="text-sm text-muted-foreground">{className || "Turma"} · Matrícula: {student?.registration_code || "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Relatório gerado em {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="grid sm:grid-cols-3 gap-3">
            <Card className="border-border">
              <CardContent className="p-4 text-center">
                <BarChart3 className="w-7 h-7 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold text-foreground">{(history || []).length}</p>
                <p className="text-xs text-muted-foreground">Adaptações realizadas</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-7 h-7 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold text-foreground">{barrierFreq.size}</p>
                <p className="text-xs text-muted-foreground">Barreiras identificadas</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 text-center">
                <Lightbulb className="w-7 h-7 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold text-foreground">{strategyFreq.size}</p>
                <p className="text-xs text-muted-foreground">Estratégias utilizadas</p>
              </CardContent>
            </Card>
          </div>

          {/* PEI Goals Summary */}
          {peiForm.goals.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Metas do PEI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {peiForm.goals.map((g) => (
                    <div key={g.id} className="flex items-center justify-between text-sm">
                      <div>
                        <Badge variant="secondary" className="text-[10px] mr-2">{g.area}</Badge>
                        <span className="text-foreground">{g.description.slice(0, 60)}{g.description.length > 60 ? "…" : ""}</span>
                      </div>
                      <Badge variant={GOAL_STATUS_LABELS[g.status]?.variant || "outline"}>
                        {GOAL_STATUS_LABELS[g.status]?.label || g.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* PEI Text Sections */}
          {peiForm.student_profile && (
            <Card className="border-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Perfil do Aluno</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{peiForm.student_profile}</p></CardContent>
            </Card>
          )}
          {peiForm.curricular_adaptations && (
            <Card className="border-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Adaptações Curriculares</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{peiForm.curricular_adaptations}</p></CardContent>
            </Card>
          )}
          {peiForm.resources_and_support && (
            <Card className="border-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Recursos e Apoios</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{peiForm.resources_and_support}</p></CardContent>
            </Card>
          )}
          {peiForm.pedagogical_strategies && (
            <Card className="border-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Estratégias Pedagógicas</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{peiForm.pedagogical_strategies}</p></CardContent>
            </Card>
          )}

          {topBarriers.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Barreiras mais frequentes</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={barChartConfig} className="h-[220px] w-full">
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

          {/* Evolution chart */}
          {evolutionData.length > 1 && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Evolução temporal</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={lineChartConfig} className="h-[180px] w-full">
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

          {/* Dimension bars */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Barreiras por dimensão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {BARRIER_DIMENSIONS.map((dim) => {
                  const count = dimFreq.get(dim.key) || 0;
                  const max = Math.max(...[...dimFreq.values()], 1);
                  return (
                    <div key={dim.key}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-foreground font-medium">{dim.label}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(count / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Strategies */}
          {topStrategies.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Estratégias mais utilizadas</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
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

          {/* Recent adaptations list */}
          {(history || []).length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Atividades adaptadas recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(history || []).slice(-10).reverse().map((h) => (
                    <div key={h.id} className="flex items-center gap-3 text-sm py-1.5 border-b border-border last:border-0">
                      <BookOpen className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-foreground">{h.original_activity.slice(0, 70)}{h.original_activity.length > 70 ? "…" : ""}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {new Date(h.created_at!).toLocaleDateString("pt-BR")}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
