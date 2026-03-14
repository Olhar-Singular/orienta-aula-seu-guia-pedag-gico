import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Wand2, Users, BookOpen, History, ArrowRight, GraduationCap,
  UserCheck, BarChart3, Lightbulb, TrendingUp, Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BARRIER_DIMENSIONS } from "@/lib/barriers";
import { useMemo } from "react";

const quickActions = [
  { icon: Wand2, title: "Adaptar Atividade", description: "Crie adaptações com IA", link: "/dashboard/adaptar", color: "bg-primary/10 text-primary" },
  { icon: Users, title: "Minhas Turmas", description: "Gerencie turmas e alunos", link: "/dashboard/turmas", color: "bg-accent/10 text-accent" },
  { icon: BookOpen, title: "Banco de Questões", description: "Explore e crie questões", link: "/dashboard/banco-questoes", color: "bg-secondary text-secondary-foreground" },
  { icon: History, title: "Histórico", description: "Veja adaptações anteriores", link: "/dashboard/historico", color: "bg-muted text-muted-foreground" },
];

const pedagogicalTips = [
  { dimension: "Processamento", tip: "Fragmente enunciados longos em frases curtas e diretas. Use marcadores visuais para destacar palavras-chave.", icon: "🧠" },
  { dimension: "Atenção", tip: "Divida atividades longas em blocos menores com pausas. Use timers visuais para ajudar na gestão do tempo.", icon: "🎯" },
  { dimension: "Ritmo", tip: "Ofereça atividades com níveis progressivos de dificuldade. Permita que o aluno avance no seu próprio ritmo.", icon: "⏱️" },
  { dimension: "Engajamento", tip: "Incorpore elementos visuais e manipulativos nas atividades. Conecte o conteúdo aos interesses do aluno.", icon: "💡" },
  { dimension: "Expressão", tip: "Ofereça alternativas à escrita: respostas orais, desenhos ou esquemas. Use organizadores gráficos.", icon: "✍️" },
  { dimension: "Processamento", tip: "Use analogias do cotidiano para explicar conceitos abstratos. Apresente exemplos antes da teoria.", icon: "🔗" },
  { dimension: "Atenção", tip: "Posicione o aluno longe de janelas e portas. Reduza estímulos visuais desnecessários na atividade.", icon: "👁️" },
  { dimension: "Ritmo", tip: "Marque checkpoints na atividade para que o aluno saiba quanto falta. Isso reduz a ansiedade.", icon: "✅" },
  { dimension: "Engajamento", tip: "Comece com o que o aluno já sabe. O sucesso inicial aumenta a motivação para continuar.", icon: "🚀" },
  { dimension: "Expressão", tip: "Permita que o aluno grave áudio como resposta. A expressão oral pode revelar compreensão real.", icon: "🎙️" },
];

export default function Dashboard() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: classesCount = 0 } = useQuery({
    queryKey: ["dashboard-classes-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("classes").select("*", { count: "exact", head: true }).eq("teacher_id", user!.id);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: studentsCount = 0 } = useQuery({
    queryKey: ["dashboard-students-count", user?.id],
    queryFn: async () => {
      const { data: classes } = await supabase.from("classes").select("id").eq("teacher_id", user!.id);
      if (!classes || classes.length === 0) return 0;
      const { count } = await supabase.from("class_students").select("*", { count: "exact", head: true }).in("class_id", classes.map(c => c.id));
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: adaptationsData } = useQuery({
    queryKey: ["dashboard-adaptations-stats", user?.id],
    queryFn: async () => {
      const { data, count } = await supabase
        .from("adaptations_history")
        .select("created_at", { count: "exact" })
        .eq("teacher_id", user!.id);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const items = data || [];
      return {
        total: count ?? 0,
        week: items.filter(a => new Date(a.created_at!) >= weekAgo).length,
        month: items.filter(a => new Date(a.created_at!) >= monthAgo).length,
      };
    },
    enabled: !!user,
  });

  const { data: topBarriers = [] } = useQuery({
    queryKey: ["dashboard-top-barriers", user?.id],
    queryFn: async () => {
      const { data: classes } = await supabase.from("classes").select("id").eq("teacher_id", user!.id);
      if (!classes || classes.length === 0) return [];
      const { data: students } = await supabase.from("class_students").select("id").in("class_id", classes.map(c => c.id));
      if (!students || students.length === 0) return [];
      const { data: barriers } = await supabase
        .from("student_barriers")
        .select("barrier_key, dimension")
        .in("student_id", students.map(s => s.id))
        .eq("is_active", true);
      if (!barriers || barriers.length === 0) return [];

      const freq: Record<string, { key: string; dimension: string; count: number }> = {};
      barriers.forEach(b => {
        if (!freq[b.barrier_key]) freq[b.barrier_key] = { key: b.barrier_key, dimension: b.dimension, count: 0 };
        freq[b.barrier_key].count++;
      });
      return Object.values(freq).sort((a, b) => b.count - a.count).slice(0, 5);
    },
    enabled: !!user,
  });

  const displayName = profile?.name || user?.user_metadata?.name || "Professor(a)";

  const todayTip = useMemo(() => {
    const dayIndex = new Date().getDate() % pedagogicalTips.length;
    return pedagogicalTips[dayIndex];
  }, []);

  const barrierLabel = (key: string) => {
    for (const dim of BARRIER_DIMENSIONS) {
      const b = dim.barriers.find(b => b.key === key);
      if (b) return b.label;
    }
    return key;
  };

  const stats = adaptationsData ?? { total: 0, week: 0, month: 0 };

  return (
    <>
      <div className="space-y-8">
        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-1">Olá, {displayName}! 👋</h1>
          <p className="text-muted-foreground">Aqui está o resumo da sua atividade pedagógica.</p>
        </motion.div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="metrics-grid">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">Turmas</span>
                </div>
                <p className="text-3xl font-bold text-foreground" data-testid="metric-classes">{classesCount}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-accent" />
                  </div>
                  <span className="text-sm text-muted-foreground">Alunos</span>
                </div>
                <p className="text-3xl font-bold text-foreground" data-testid="metric-students">{studentsCount}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">Adaptações</span>
                </div>
                <p className="text-3xl font-bold text-foreground" data-testid="metric-adaptations">{stats.total}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Semana: {stats.week}</span>
                  <span>Mês: {stats.month}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-destructive" />
                  </div>
                  <span className="text-sm text-muted-foreground">Top Barreiras</span>
                </div>
                {topBarriers.length > 0 ? (
                  <ul className="space-y-1" data-testid="metric-barriers">
                    {topBarriers.slice(0, 3).map(b => (
                      <li key={b.key} className="text-xs text-foreground truncate flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                        {barrierLabel(b.key)} <span className="text-muted-foreground">({b.count})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhuma barreira cadastrada</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Pedagogical Tip */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border-primary/20 bg-primary/5" data-testid="pedagogical-tip">
            <CardContent className="p-5 flex items-start gap-4">
              <span className="text-3xl">{todayTip.icon}</span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-foreground text-sm">Dica Pedagógica do Dia</h3>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{todayTip.dimension}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{todayTip.tip}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="font-semibold text-foreground mb-4">Ações Rápidas</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, i) => (
              <Link key={action.link} to={action.link}>
                <Card className="h-full hover:shadow-[var(--card-shadow-hover)] transition-shadow cursor-pointer border-border group">
                  <CardContent className="p-5">
                    <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center mb-3`}>
                      <action.icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-1 flex items-center gap-1">
                      {action.title}
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                    </h3>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </motion.div>

        <p className="text-xs text-muted-foreground text-center">
          Ferramenta pedagógica. Não realiza diagnóstico. A decisão final é sempre do profissional.
        </p>
      </div>
    </Layout>
  );
}
