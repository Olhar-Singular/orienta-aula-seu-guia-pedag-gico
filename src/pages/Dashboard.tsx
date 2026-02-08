import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { PenTool, Sparkles, Upload, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "@/components/Layout";

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
    link: "/create?mode=upload",
    color: "bg-muted text-muted-foreground",
  },
];

const recentItems = [
  { title: "Prova de Matemática — 7º ano", date: "Há 2 horas", type: "Prova/Avaliação" },
  { title: "Exercício de Português — 5º ano", date: "Ontem", type: "Exercício em sala" },
  { title: "Lista de Ciências — 9º ano", date: "3 dias atrás", type: "Lista de exercícios" },
];

export default function Dashboard() {
  return (
    <Layout>
      <div className="space-y-8">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-1">Olá! 👋</h1>
          <p className="text-muted-foreground">O que deseja fazer hoje?</p>
        </motion.div>

        {/* Main CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
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

        {/* Action Cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          {actionCards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
            >
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

        {/* Recent */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Recentes</h2>
            <Link to="/my-adaptations" className="text-sm text-primary hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="space-y-2">
            {recentItems.map((item) => (
              <Card key={item.title} className="hover:shadow-card transition-shadow cursor-pointer border-border">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.type}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {item.date}
                  </div>
                </CardContent>
              </Card>
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
