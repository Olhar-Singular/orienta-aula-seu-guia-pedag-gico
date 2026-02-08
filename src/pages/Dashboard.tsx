import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { PenTool, Sparkles, Upload, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const actionCards = [
  {
    icon: PenTool,
    title: "Adaptar atividade existente",
    description: "Cole ou envie uma atividade para receber uma versão adaptada.",
    link: "/create?mode=adapt",
    color: "bg-secondary text-primary",
  },
  {
    icon: Sparkles,
    title: "Criar atividade do zero",
    description: "Gere uma atividade original já adaptada com apoio de IA.",
    link: "/create?mode=create",
    color: "bg-accent/10 text-accent",
  },
  {
    icon: Upload,
    title: "Enviar arquivo",
    description: "Envie um PDF ou Word para adaptação automática.",
    link: "/create?mode=adapt",
    color: "bg-muted text-muted-foreground",
  },
];

export default function Dashboard() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: recentAdaptations } = useQuery({
    queryKey: ["recent-adaptations", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("adaptations")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user,
  });

  const displayName = profile?.name || user?.user_metadata?.name || "Professor(a)";

  return (
    <Layout>
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-1">Olá, {displayName}! 👋</h1>
          <p className="text-muted-foreground">O que deseja fazer hoje?</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Link to="/create">
            <div className="gradient-hero rounded-xl p-6 text-primary-foreground flex items-center justify-between hover:opacity-95 transition-opacity cursor-pointer">
              <div>
                <h2 className="text-xl font-bold mb-1">Criar Adaptação</h2>
                <p className="text-primary-foreground/70 text-sm">Adapte ou crie uma atividade em minutos</p>
              </div>
              <ArrowRight className="w-6 h-6" />
            </div>
          </Link>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-4">
          {actionCards.map((card, i) => (
            <motion.div key={card.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}>
              <Link to={card.link}>
                <Card className="h-full hover:shadow-card-hover transition-shadow cursor-pointer border-border">
                  <CardContent className="p-5">
                    <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
                      <card.icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">{card.title}</h3>
                    <p className="text-xs text-muted-foreground">{card.description}</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Recentes</h2>
            <Link to="/my-adaptations" className="text-sm text-primary hover:underline">Ver todas</Link>
          </div>
          {recentAdaptations && recentAdaptations.length > 0 ? (
            <div className="space-y-2">
              {recentAdaptations.map((item) => (
                <Card key={item.id} className="hover:shadow-card transition-shadow border-border">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.topic} — {item.grade}</p>
                      <p className="text-xs text-muted-foreground">{item.subject} · {item.type}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(item.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma adaptação ainda. Crie sua primeira!
            </p>
          )}
        </motion.div>

        <p className="text-xs text-muted-foreground text-center">
          Ferramenta pedagógica. Não realiza diagnóstico. A decisão final é sempre do profissional.
        </p>
      </div>
    </Layout>
  );
}
