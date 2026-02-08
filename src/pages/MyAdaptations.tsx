import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Clock, Copy, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function MyAdaptations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<any>(null);

  const { data: adaptations = [], isLoading } = useQuery({
    queryKey: ["adaptations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("adaptations")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const filtered = adaptations.filter((a) => {
    const matchesSearch = (a.topic + a.subject + a.type).toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterSubject === "all" || a.subject === filterSubject;
    return matchesSearch && matchesFilter;
  });

  const subjects = [...new Set(adaptations.map((a) => a.subject))];

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("adaptations").delete().eq("id", deleteId);
    if (error) {
      toast.error("Erro ao excluir.");
    } else {
      toast.success("Adaptação excluída!");
      queryClient.invalidateQueries({ queryKey: ["adaptations"] });
    }
    setDeleteId(null);
  };

  const handleDuplicate = async (item: any) => {
    const { id, created_at, ...rest } = item;
    const { error } = await supabase.from("adaptations").insert(rest);
    if (error) {
      toast.error("Erro ao duplicar.");
    } else {
      toast.success("Adaptação duplicada!");
      queryClient.invalidateQueries({ queryKey: ["adaptations"] });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground mb-1">Minhas Adaptações</h1>
          <p className="text-sm text-muted-foreground">Todas as suas adaptações geradas.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar adaptação..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Disciplina" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="hover:shadow-card-hover transition-shadow border-border cursor-pointer" onClick={() => setViewItem(item)}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.topic} — {item.grade}</p>
                        <p className="text-xs text-muted-foreground">{item.subject} · {item.type} · {item.mode === "adaptar" ? "Adaptada" : "Criada do zero"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(item.created_at).toLocaleDateString("pt-BR")}
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => handleDuplicate(item)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma adaptação encontrada.</p>}
          </div>
        )}
      </div>

      {/* View Detail */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewItem?.topic} — {viewItem?.grade}</DialogTitle>
            <DialogDescription>{viewItem?.subject} · {viewItem?.type}</DialogDescription>
          </DialogHeader>
          {viewItem && (
            <Tabs defaultValue="adapted">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="adapted">Atividade</TabsTrigger>
                <TabsTrigger value="guidance">Orientações</TabsTrigger>
                <TabsTrigger value="justification">Justificativa</TabsTrigger>
              </TabsList>
              <TabsContent value="adapted">
                <div className="whitespace-pre-wrap text-sm leading-relaxed p-4">{viewItem.adapted_text || "—"}</div>
              </TabsContent>
              <TabsContent value="guidance">
                <div className="whitespace-pre-wrap text-sm leading-relaxed p-4">{viewItem.teacher_guidance || "—"}</div>
              </TabsContent>
              <TabsContent value="justification">
                <div className="whitespace-pre-wrap text-sm leading-relaxed p-4">{viewItem.justification || "—"}</div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir adaptação?</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
