import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { Search, Upload, ChevronDown, ChevronUp, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type DetectedBarrier = {
  dimension: string;
  barrier_key: string;
  label: string;
  severity: "alta" | "media" | "baixa";
  mitigation: string;
};

export type AnalysisResult = {
  barriers: DetectedBarrier[];
  summary: string;
};

const DIMENSION_META: Record<string, { label: string; color: string }> = {
  processamento: { label: "Processamento", color: "hsl(174, 62%, 34%)" },
  atencao: { label: "Atenção", color: "hsl(35, 92%, 55%)" },
  ritmo: { label: "Ritmo", color: "hsl(200, 60%, 50%)" },
  engajamento: { label: "Engajamento", color: "hsl(340, 65%, 55%)" },
  expressao: { label: "Expressão", color: "hsl(260, 55%, 55%)" },
};

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  alta: { bg: "bg-destructive/10", text: "text-destructive", label: "Alta" },
  media: { bg: "bg-accent/10", text: "text-accent", label: "Média" },
  baixa: { bg: "bg-primary/10", text: "text-primary", label: "Baixa" },
};

export function buildRadarData(barriers: DetectedBarrier[]) {
  const severityWeight: Record<string, number> = { alta: 3, media: 2, baixa: 1 };
  const dims = Object.keys(DIMENSION_META);
  return dims.map((d) => {
    const dimBarriers = barriers.filter((b) => b.dimension === d);
    const score = dimBarriers.reduce((sum, b) => sum + (severityWeight[b.severity] || 0), 0);
    return {
      dimension: DIMENSION_META[d].label,
      score,
      fullMark: 12,
    };
  });
}

export default function BarrierSimulator() {
  const [activityText, setActivityText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [expandedDim, setExpandedDim] = useState<string | null>(null);

  const analyze = async () => {
    if (activityText.trim().length < 10) {
      toast.error("Cole uma atividade com pelo menos 10 caracteres.");
      return;
    }
    setLoading(true);
    setResult(null);

    const { data, error } = await supabase.functions.invoke("analyze-barriers", {
      body: { activity_text: activityText },
    });

    setLoading(false);
    if (error || data?.error) {
      toast.error(data?.error || "Erro ao analisar atividade.");
      return;
    }
    setResult(data as AnalysisResult);
  };

  const radarData = result ? buildRadarData(result.barriers) : [];
  const groupedByDim = result
    ? Object.keys(DIMENSION_META).reduce((acc, dim) => {
        acc[dim] = result.barriers.filter((b) => b.dimension === dim);
        return acc;
      }, {} as Record<string, DetectedBarrier[]>)
    : {};

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Search className="w-6 h-6 text-primary" /> Simulador de Barreiras
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cole uma atividade e descubra quais barreiras ela pode apresentar para alunos com necessidades específicas.
          </p>
        </motion.div>

        {/* Input */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border">
            <CardContent className="p-5 space-y-4">
              <label htmlFor="activity-input" className="text-sm font-medium text-foreground block mb-2">
                Texto da atividade
              </label>
              <Textarea
                id="activity-input"
                placeholder="Cole aqui o texto da atividade que deseja analisar..."
                className="min-h-[140px] resize-y"
                value={activityText}
                onChange={(e) => setActivityText(e.target.value)}
                data-testid="activity-input"
                aria-describedby="activity-char-count"
              />
              <div className="flex items-center gap-3">
                <Button onClick={analyze} disabled={loading || activityText.trim().length < 10} className="gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {loading ? "Analisando..." : "Analisar Barreiras"}
                </Button>
                <span className="text-xs text-muted-foreground" id="activity-char-count">{activityText.length} caracteres</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Summary */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-5">
                  <p className="text-sm text-foreground leading-relaxed">{result.summary}</p>
                  <div className="flex gap-4 mt-3">
                    <Badge variant="outline" className="gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {result.barriers.length} barreiras detectadas
                    </Badge>
                    <Badge variant="outline" className="text-destructive border-destructive/30">
                      {result.barriers.filter((b) => b.severity === "alta").length} severas
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Radar Chart */}
              <Card className="border-border" data-testid="radar-chart">
                <CardHeader>
                  <CardTitle className="text-base">Mapa de Barreiras</CardTitle>
                  <CardDescription>Distribuição por dimensão pedagógica.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis
                          dataKey="dimension"
                          tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                        />
                        <PolarRadiusAxis angle={90} domain={[0, 12]} tick={false} axisLine={false} />
                        <Radar
                          name="Barreiras"
                          dataKey="score"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.25}
                          strokeWidth={2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Barrier details by dimension */}
              <div className="space-y-3" data-testid="barrier-list">
                {Object.entries(groupedByDim).map(([dim, barriers]) => {
                  if (barriers.length === 0) return null;
                  const meta = DIMENSION_META[dim];
                  const isOpen = expandedDim === dim;
                  return (
                    <Card key={dim} className="border-border overflow-hidden">
                      <button
                        onClick={() => setExpandedDim(isOpen ? null : dim)}
                        className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: meta.color }}
                          />
                          <span className="font-medium text-sm text-foreground">{meta.label}</span>
                          <Badge variant="secondary" className="text-xs">
                            {barriers.length} {barriers.length === 1 ? "barreira" : "barreiras"}
                          </Badge>
                        </div>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="px-4 pb-4 space-y-3">
                              {barriers.map((b, i) => {
                                const sev = SEVERITY_STYLES[b.severity] || SEVERITY_STYLES.baixa;
                                return (
                                  <div key={i} className="p-3 rounded-lg bg-muted/50 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="text-sm font-medium text-foreground">{b.label}</p>
                                      <Badge className={`${sev.bg} ${sev.text} border-0 text-xs shrink-0`}>
                                        {sev.label}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                      <strong className="text-foreground">Mitigação:</strong> {b.mitigation}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-xs text-muted-foreground text-center">
          Ferramenta pedagógica. Não realiza diagnóstico. A decisão final é sempre do profissional.
        </p>
      </div>
    </Layout>
  );
}
