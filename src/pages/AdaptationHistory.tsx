import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Clock, Filter, ChevronRight, EyeOff, FileText, Wand2,
  MessageCircle, BookOpen, Search, Target, User
} from "lucide-react";
import { motion } from "framer-motion";
import { BARRIER_DIMENSIONS } from "@/lib/barriers";
import { toast } from "sonner";

type ActivityItem = {
  id: string;
  type: "adaptation_wizard" | "adaptation_legacy" | "chat" | "extraction";
  title: string;
  subtitle: string;
  created_at: string;
  icon: typeof FileText;
  raw: any;
};

const TYPE_LABELS: Record<string, string> = {
  adaptation_wizard: "Adaptação (ISA)",
  adaptation_legacy: "Adaptação",
  chat: "Conversa IA",
  extraction: "Extração de Questões",
};

const TYPE_ICONS: Record<string, typeof FileText> = {
  adaptation_wizard: Wand2,
  adaptation_legacy: FileText,
  chat: MessageCircle,
  extraction: BookOpen,
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
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [hideTarget, setHideTarget] = useState<ActivityItem | null>(null);
  const [selected, setSelected] = useState<ActivityItem | null>(null);

  // Fetch hidden activities
  const { data: hiddenItems = [] } = useQuery({
    queryKey: ["hidden-activities", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("hidden_activities")
        .select("activity_type, activity_id")
        .eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const hiddenSet = new Set(hiddenItems.map((h: any) => `${h.activity_type}:${h.activity_id}`));

  // Wizard adaptations
  const { data: wizardAdapts = [] } = useQuery({
    queryKey: ["hist-wizard", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("adaptations_history")
        .select("*, class_students(name), classes(name)")
        .eq("teacher_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Legacy adaptations
  const { data: legacyAdapts = [] } = useQuery({
    queryKey: ["hist-legacy", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("adaptations")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Chat conversations
  const { data: chats = [] } = useQuery({
    queryKey: ["hist-chats", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // PDF extractions
  const { data: extractions = [] } = useQuery({
    queryKey: ["hist-extractions", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("pdf_uploads")
        .select("*")
        .eq("user_id", user!.id)
        .order("uploaded_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Merge all into timeline
  const allItems: ActivityItem[] = [
    ...wizardAdapts.map((a: any): ActivityItem => ({
      id: a.id,
      type: "adaptation_wizard",
      title: a.original_activity?.slice(0, 80) || "Adaptação",
      subtitle: (a as any).class_students?.name
        ? `${(a as any).classes?.name || "Turma"} · ${(a as any).class_students?.name}`
        : "Sem aluno vinculado",
      created_at: a.created_at,
      icon: Wand2,
      raw: a,
    })),
    ...legacyAdapts.map((a): ActivityItem => ({
      id: a.id,
      type: "adaptation_legacy",
      title: `${a.topic} — ${a.grade}`,
      subtitle: `${a.subject} · ${a.type}`,
      created_at: a.created_at,
      icon: FileText,
      raw: a,
    })),
    ...chats.map((c): ActivityItem => ({
      id: c.id,
      type: "chat",
      title: c.title || "Conversa sem título",
      subtitle: `Atualizado em ${new Date(c.updated_at).toLocaleDateString("pt-BR")}`,
      created_at: c.created_at,
      icon: MessageCircle,
      raw: c,
    })),
    ...extractions.map((e): ActivityItem => ({
      id: e.id,
      type: "extraction",
      title: e.file_name,
      subtitle: `${e.questions_extracted || 0} questões extraídas`,
      created_at: e.uploaded_at || e.id,
      icon: BookOpen,
      raw: e,
    })),
  ]
    .filter((item) => !hiddenSet.has(`${item.type}:${item.id}`))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Period filter
  const periodFiltered = allItems.filter((item) => {
    if (periodFilter === "all") return true;
    const now = new Date();
    let start: Date;
    if (periodFilter === "week") start = new Date(now.getTime() - 7 * 86400000);
    else if (periodFilter === "month") start = new Date(now.getFullYear(), now.getMonth(), 1);
    else start = new Date(now.getFullYear(), 0, 1);
    return new Date(item.created_at) >= start;
  });

  // Type + search filter
  const filtered = periodFiltered.filter((item) => {
    const matchType = typeFilter === "all" || item.type === typeFilter;
    const matchSearch = !search || item.title.toLowerCase().includes(search.toLowerCase()) || item.subtitle.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  // Group by date
  const grouped = filtered.reduce<Record<string, ActivityItem[]>>((acc, item) => {
    const dateKey = new Date(item.created_at).toLocaleDateString("pt-BR");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {});

  const handleHide = async () => {
    if (!hideTarget || !user) return;
    const { error } = await supabase.from("hidden_activities").insert({
      user_id: user.id,
      activity_type: hideTarget.type,
      activity_id: hideTarget.id,
    });
    if (error) {
      toast.error("Erro ao ocultar item.");
    } else {
      toast.success("Item ocultado do histórico.");
      queryClient.invalidateQueries({ queryKey: ["hidden-activities"] });
    }
    setHideTarget(null);
  };

  const renderDetail = () => {
    if (!selected) return null;
    const { type, raw } = selected;

    if (type === "adaptation_wizard") {
      const result = raw.adaptation_result as any;
      const barriers = Array.isArray(raw.barriers_used) ? raw.barriers_used : [];
      return (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-1">Atividade Original</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted rounded-lg p-3">{raw.original_activity}</p>
          </div>
          {barriers.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">Barreiras</h4>
              <div className="flex flex-wrap gap-1">
                {barriers.map((b: any, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">{barrierLabel(b.barrier_key || b)}</Badge>
                ))}
              </div>
            </div>
          )}
          {result && (
            <>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1">
                  <BookOpen className="w-4 h-4 text-primary" /> Versão Universal
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/50 rounded-lg p-3">{result.version_universal}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1">
                  <Target className="w-4 h-4 text-primary" /> Versão Direcionada
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/50 rounded-lg p-3">{result.version_directed}</p>
              </div>
              {result.pedagogical_justification && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">Justificativa</h4>
                  <p className="text-sm text-muted-foreground">{result.pedagogical_justification}</p>
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    if (type === "adaptation_legacy") {
      return (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-1">Atividade Adaptada</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted rounded-lg p-3">{raw.adapted_text || "—"}</p>
          </div>
          {raw.teacher_guidance && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">Orientações</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{raw.teacher_guidance}</p>
            </div>
          )}
          {raw.justification && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">Justificativa</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{raw.justification}</p>
            </div>
          )}
        </div>
      );
    }

    if (type === "chat") {
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Conversa iniciada em {new Date(raw.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.href = "/chat"}>
            <MessageCircle className="w-4 h-4 mr-1" /> Ir para o Chat
          </Button>
        </div>
      );
    }

    if (type === "extraction") {
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Arquivo: <strong>{raw.file_name}</strong></p>
          <p className="text-sm text-muted-foreground">Questões extraídas: <strong>{raw.questions_extracted || 0}</strong></p>
          {raw.description && <p className="text-sm text-muted-foreground">{raw.description}</p>}
          <Button variant="outline" size="sm" onClick={() => window.location.href = "/dashboard/banco-questoes"}>
            <BookOpen className="w-4 h-4 mr-1" /> Ver Banco de Questões
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">Histórico de Atividades</h1>
          <p className="text-muted-foreground text-sm">Timeline de tudo que você fez na plataforma.</p>
        </motion.div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-foreground">
              <Filter className="w-4 h-4" /> Filtros
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="adaptation_wizard">Adaptação (ISA)</SelectItem>
                  <SelectItem value="adaptation_legacy">Adaptação</SelectItem>
                  <SelectItem value="chat">Conversa IA</SelectItem>
                  <SelectItem value="extraction">Extração de Questões</SelectItem>
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

        {/* Timeline */}
        {Object.keys(grouped).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-muted-foreground">{date}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-2 pl-2 border-l-2 border-border ml-[7px]">
                  {items.map((item, i) => {
                    const Icon = TYPE_ICONS[item.type] || FileText;
                    return (
                      <motion.div key={`${item.type}-${item.id}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                        <Card
                          className="ml-4 hover:shadow-md transition-shadow cursor-pointer border-border"
                          onClick={() => setSelected(item)}
                        >
                          <CardContent className="p-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                                <Icon className="w-4 h-4 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-[10px]">{TYPE_LABELS[item.type]}</Badge>
                                  <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] text-muted-foreground hidden sm:block">
                                {new Date(item.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Ocultar do histórico"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHideTarget(item);
                                }}
                              >
                                <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma atividade encontrada.</p>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected && (() => {
                const Icon = TYPE_ICONS[selected.type] || FileText;
                return <Icon className="w-5 h-5 text-primary" />;
              })()}
              {selected?.title}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selected && TYPE_LABELS[selected.type]} · {selected && new Date(selected.created_at).toLocaleDateString("pt-BR")}
            </p>
          </DialogHeader>
          {renderDetail()}
        </DialogContent>
      </Dialog>

      {/* Hide Confirmation */}
      <Dialog open={!!hideTarget} onOpenChange={() => setHideTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ocultar do histórico?</DialogTitle>
            <DialogDescription>
              Este item será ocultado da timeline, mas os dados originais (adaptação, conversa, questões) continuarão salvos normalmente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHideTarget(null)}>Cancelar</Button>
            <Button onClick={handleHide}>Ocultar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
