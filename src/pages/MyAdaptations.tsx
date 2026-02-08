import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Clock, Copy, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import Layout from "@/components/Layout";
import { toast } from "sonner";

const mockAdaptations = [
  { id: "1", title: "Prova de Matemática — Frações", subject: "Matemática", grade: "7º ano", type: "Prova/Avaliação", mode: "adaptar", date: "2026-02-08" },
  { id: "2", title: "Exercício de Português — Verbos", subject: "Português", grade: "5º ano", type: "Exercício em sala", mode: "criar_do_zero", date: "2026-02-07" },
  { id: "3", title: "Lista de Ciências — Células", subject: "Ciências", grade: "9º ano", type: "Lista de exercícios", mode: "adaptar", date: "2026-02-05" },
  { id: "4", title: "Exercício de Física — MRU", subject: "Física", grade: "1ª série EM", type: "Exercício em sala", mode: "criar_do_zero", date: "2026-02-04" },
];

export default function MyAdaptations() {
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = mockAdaptations.filter((a) => {
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterSubject === "all" || a.subject === filterSubject;
    return matchesSearch && matchesFilter;
  });

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
            <Input
              placeholder="Buscar adaptação..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Disciplina" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="Matemática">Matemática</SelectItem>
              <SelectItem value="Português">Português</SelectItem>
              <SelectItem value="Ciências">Ciências</SelectItem>
              <SelectItem value="Física">Física</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {filtered.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="hover:shadow-card-hover transition-shadow border-border">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.grade} · {item.type} · {item.mode === "adaptar" ? "Adaptada" : "Criada do zero"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {item.date}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => toast.info("Duplicado!")}>
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
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhuma adaptação encontrada.</p>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir adaptação?</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => { toast.success("Excluída!"); setDeleteId(null); }}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
