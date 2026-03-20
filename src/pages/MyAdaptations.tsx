import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Clock, Copy, Trash2, FileText, Printer, Pencil, User, BookOpen, Target, Loader2, Save, X, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BARRIER_DIMENSIONS } from "@/lib/barriers";
import AdaptedContentRenderer from "@/components/adaptation/AdaptedContentRenderer";
import AdaptationEditModal, { type AdaptationQuestionEditPayload } from "@/components/adaptation/AdaptationEditModal";
import { parseAdaptedQuestions, replaceQuestionInAdaptedContent, type ParsedAdaptedQuestion } from "@/lib/adaptedQuestions";
import { exportToPdf } from "@/lib/exportPdf";
import { exportToDocx } from "@/lib/exportDocx";

const ACTIVITY_TYPES: Record<string, string> = {
  prova: "Prova",
  exercicio: "Exercício",
  atividade_casa: "Atividade de Casa",
  trabalho: "Trabalho",
};

function barrierLabel(key: string): string {
  for (const dim of BARRIER_DIMENSIONS) {
    const b = dim.barriers.find((b) => b.key === key);
    if (b) return b.label;
  }
  return key;
}

/** Escapes HTML entities to prevent XSS in document.write contexts. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Copies text to clipboard with error handling for restrictive contexts. */
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Conteúdo copiado!");
  } catch {
    toast.error("Não foi possível copiar. Tente selecionar o texto manualmente.");
  }
}

type UnifiedAdaptation = {
  id: string;
  source: "legacy" | "wizard";
  title: string;
  subtitle: string;
  created_at: string;
  activity_type: string;
  student_name?: string;
  class_name?: string;
  barriers: any[];
  raw: any;
};

export default function MyAdaptations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<UnifiedAdaptation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<UnifiedAdaptation | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<{
    field: "version_universal" | "version_directed";
    title: string;
    question: ParsedAdaptedQuestion;
  } | null>(null);
  const [editQuestionImages, setEditQuestionImages] = useState<Record<string, Record<string, string[]>>>({
    version_universal: {},
    version_directed: {},
  });
  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editFields, setEditFields] = useState({
    // Legacy fields
    adapted_text: "",
    teacher_guidance: "",
    justification: "",
    // Wizard fields
    version_universal: "",
    version_directed: "",
    pedagogical_justification: "",
    original_activity: "",
  });

  // Legacy adaptations (old flow)
  const { data: legacyAdaptations = [] } = useQuery({
    queryKey: ["adaptations-legacy", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("adaptations")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // Wizard adaptations (new flow)
  const { data: wizardAdaptations = [] } = useQuery({
    queryKey: ["adaptations-history-all", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("adaptations_history")
        .select("*, class_students(name), classes(name)")
        .eq("teacher_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // Unify into a single list
  const unified: UnifiedAdaptation[] = [
    ...legacyAdaptations.map((a): UnifiedAdaptation => ({
      id: a.id,
      source: "legacy",
      title: `${a.topic} — ${a.grade}`,
      subtitle: `${a.subject} · ${a.type} · ${a.mode === "adaptar" ? "Adaptada" : "Criada do zero"}`,
      created_at: a.created_at,
      activity_type: a.type,
      barriers: [],
      raw: a,
    })),
    ...wizardAdaptations.map((a: any): UnifiedAdaptation => ({
      id: a.id,
      source: "wizard",
      title: a.original_activity?.slice(0, 80) || "Adaptação",
      subtitle: ACTIVITY_TYPES[a.activity_type || ""] || "Atividade",
      created_at: a.created_at,
      activity_type: a.activity_type || "",
      student_name: a.class_students?.name,
      class_name: a.classes?.name,
      barriers: Array.isArray(a.barriers_used) ? a.barriers_used : [],
      raw: a,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filtered = unified.filter((a) => {
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.subtitle.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || a.activity_type === filterType;
    return matchesSearch && matchesType;
  });

  const allTypes = [...new Set(unified.map((a) => a.activity_type).filter(Boolean))];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const table = deleteTarget.source === "legacy" ? "adaptations" : "adaptations_history";
      const { error } = await supabase.from(table).delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("Adaptação excluída!");
      queryClient.invalidateQueries({ queryKey: ["adaptations-legacy"] });
      queryClient.invalidateQueries({ queryKey: ["adaptations-history-all"] });
      queryClient.invalidateQueries({ queryKey: ["adaptations-history"] });
      setDeleteTarget(null);
    } catch {
      toast.error("Erro ao excluir.");
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async (item: UnifiedAdaptation) => {
    setDuplicating(item.id);
    try {
      if (item.source === "legacy") {
        const { id, created_at, ...rest } = item.raw;
        const { error } = await supabase.from("adaptations").insert(rest);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["adaptations-legacy"] });
      } else {
        const { id, created_at, class_students, classes, ...rest } = item.raw;
        const { error } = await supabase.from("adaptations_history").insert(rest);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["adaptations-history-all"] });
      }
      toast.success("Adaptação duplicada!");
    } catch {
      toast.error("Erro ao duplicar.");
    } finally {
      setDuplicating(null);
    }
  };

  const startEditing = (item: UnifiedAdaptation) => {
    if (item.source === "legacy") {
      setEditFields({
        adapted_text: item.raw.adapted_text || "",
        teacher_guidance: item.raw.teacher_guidance || "",
        justification: item.raw.justification || "",
        version_universal: "",
        version_directed: "",
        pedagogical_justification: "",
        original_activity: "",
      });
    } else {
      const result = (item.raw?.adaptation_result as Record<string, any>) ?? {};
      setEditFields({
        adapted_text: "",
        teacher_guidance: "",
        justification: "",
        version_universal: result?.version_universal || "",
        version_directed: result?.version_directed || "",
        pedagogical_justification: result?.pedagogical_justification || "",
        original_activity: item.raw.original_activity || "",
      });
    }
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditQuestionImages({ version_universal: {}, version_directed: {} });
  };

  const handleSaveEdit = async () => {
    const currentViewItem = viewItem; // Capture reference to avoid race condition
    if (!currentViewItem) return;
    setSaving(true);

    try {
      if (currentViewItem.source === "legacy") {
        const { error } = await supabase
          .from("adaptations")
          .update({
            adapted_text: editFields.adapted_text,
            teacher_guidance: editFields.teacher_guidance,
            justification: editFields.justification,
          })
          .eq("id", currentViewItem.id);
        if (error) throw error;
      } else {
        const currentResult = (currentViewItem?.raw?.adaptation_result as Record<string, any>) ?? {};
        const updatedResult = {
          ...currentResult,
          version_universal: editFields.version_universal,
          version_directed: editFields.version_directed,
          pedagogical_justification: editFields.pedagogical_justification,
          question_images_universal: editQuestionImages.version_universal || currentResult.question_images_universal || {},
          question_images_directed: editQuestionImages.version_directed || currentResult.question_images_directed || {},
        };
        const { error } = await supabase
          .from("adaptations_history")
          .update({
            original_activity: editFields.original_activity,
            adaptation_result: updatedResult,
          })
          .eq("id", currentViewItem.id);
        if (error) throw error;
      }

      toast.success("Adaptação atualizada!");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["adaptations-legacy"] });
      queryClient.invalidateQueries({ queryKey: ["adaptations-history-all"] });
      queryClient.invalidateQueries({ queryKey: ["adaptations-history"] });

      // Update the viewItem in-place so the dialog reflects changes
      if (currentViewItem.source === "legacy") {
        setViewItem({
          ...currentViewItem,
          raw: {
            ...currentViewItem.raw,
            adapted_text: editFields.adapted_text,
            teacher_guidance: editFields.teacher_guidance,
            justification: editFields.justification,
          },
        });
      } else {
        const currentResult2 = (currentViewItem?.raw?.adaptation_result as Record<string, any>) ?? {};
        setViewItem({
          ...currentViewItem,
          raw: {
            ...currentViewItem.raw,
            original_activity: editFields.original_activity,
            adaptation_result: {
              ...currentResult2,
              version_universal: editFields.version_universal,
              version_directed: editFields.version_directed,
              pedagogical_justification: editFields.pedagogical_justification,
              question_images_universal: editQuestionImages.version_universal || currentResult2.question_images_universal || {},
              question_images_directed: editQuestionImages.version_directed || currentResult2.question_images_directed || {},
            },
          },
        });
      }
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e.message || "tente novamente"));
    } finally {
      setSaving(false);
    }
  };

  const handleCloseView = () => {
    if (editing) {
      const hasChanges = viewItem?.source === "legacy"
        ? editFields.adapted_text !== (viewItem?.raw?.adapted_text || "") ||
          editFields.teacher_guidance !== (viewItem?.raw?.teacher_guidance || "") ||
          editFields.justification !== (viewItem?.raw?.justification || "")
        : editFields.version_universal !== ((viewItem?.raw?.adaptation_result as any)?.version_universal || "") ||
          editFields.version_directed !== ((viewItem?.raw?.adaptation_result as any)?.version_directed || "");

      if (hasChanges && !confirm("Você tem alterações não salvas. Deseja sair?")) {
        return;
      }
    }
    setViewItem(null);
    setEditing(false);
    setEditQuestionImages({ version_universal: {}, version_directed: {} });
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground mb-1">Minhas Adaptações</h1>
          <p className="text-sm text-muted-foreground">Todas as suas adaptações geradas pela ISA.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar adaptação..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {allTypes.map((t) => (
                <SelectItem key={t} value={t}>{ACTIVITY_TYPES[t] || t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {filtered.map((item, i) => (
            <motion.div key={`${item.source}-${item.id}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="hover:shadow-card-hover transition-shadow border-border cursor-pointer" onClick={() => setViewItem(item)}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">{item.subtitle}</Badge>
                        {item.student_name && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <User className="w-3 h-3" /> {item.student_name}
                          </span>
                        )}
                        {item.class_name && (
                          <span className="text-xs text-muted-foreground">{item.class_name}</span>
                        )}
                      </div>
                      {item.barriers.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {item.barriers.slice(0, 2).map((b: any, j: number) => (
                            <Badge key={j} variant="outline" className="text-[10px] py-0">
                              {barrierLabel(b.barrier_key || b)}
                            </Badge>
                          ))}
                          {item.barriers.length > 2 && (
                            <Badge variant="outline" className="text-[10px] py-0">+{item.barriers.length - 2}</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(item.created_at).toLocaleDateString("pt-BR")}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewItem(item); startEditing(item); }}>
                      <Pencil className="w-4 h-4 text-primary" />
                    </Button>


                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTarget(item)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhuma adaptação encontrada.</p>
            </div>
          )}
        </div>
      </div>

      {/* View / Edit Detail */}
      <Dialog open={!!viewItem} onOpenChange={handleCloseView}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <DialogTitle>
                {viewItem?.source === "legacy"
                  ? `${viewItem?.raw.topic} — ${viewItem?.raw.grade}`
                  : "Detalhes da Adaptação"}
              </DialogTitle>
              {!editing && (
                <Button variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => viewItem && startEditing(viewItem)}>
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </Button>
              )}
            </div>
            {viewItem?.source === "legacy" && !editing && (
              <p className="text-sm text-muted-foreground">{viewItem?.raw.subject} · {viewItem?.raw.type}</p>
            )}
          </DialogHeader>

          {/* EDITING MODE */}
          {editing && viewItem?.source === "legacy" && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold">Atividade Adaptada</Label>
                <Textarea
                  value={editFields.adapted_text}
                  onChange={(e) => setEditFields((f) => ({ ...f, adapted_text: e.target.value }))}
                  rows={10}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">Orientações ao Professor</Label>
                <Textarea
                  value={editFields.teacher_guidance}
                  onChange={(e) => setEditFields((f) => ({ ...f, teacher_guidance: e.target.value }))}
                  rows={6}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">Justificativa Pedagógica</Label>
                <Textarea
                  value={editFields.justification}
                  onChange={(e) => setEditFields((f) => ({ ...f, justification: e.target.value }))}
                  rows={6}
                  className="mt-1 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={handleSaveEdit} disabled={saving} className="gap-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Salvando..." : "Salvar alterações"}
                </Button>
                <Button variant="outline" onClick={cancelEditing} disabled={saving}>
                  <X className="w-4 h-4 mr-1" /> Cancelar
                </Button>
              </div>
            </div>
          )}

          {editing && viewItem?.source === "wizard" && (() => {
            const result = (viewItem?.raw?.adaptation_result as Record<string, any>) ?? {};

            const getEditImageMap = (field: "version_universal" | "version_directed"): Record<string, string[]> => {
              // Use edit-time state if available
              const editMap = editQuestionImages[field];
              if (editMap && Object.keys(editMap).length > 0) return editMap;

              // Try new per-section format
              const key = field === "version_universal" ? "question_images_universal" : "question_images_directed";
              if (result?.[key] && typeof result[key] === "object") return result[key];

              // Fallback: legacy question_images array
              if (!Array.isArray(result?.question_images)) return {};
              const map: Record<string, string[]> = {};
              const parsedQs = parseAdaptedQuestions(result?.[field] || "");
              result.question_images.forEach((qi: any, index: number) => {
                if (!qi.image_url) return;
                const adaptedQ = parsedQs[index];
                if (!adaptedQ) return;
                if (!map[adaptedQ.number]) map[adaptedQ.number] = [];
                map[adaptedQ.number].push(qi.image_url);
              });
              return map;
            };

            const handleQuestionEdit = (field: "version_universal" | "version_directed", title: string) =>
              (question: ParsedAdaptedQuestion) => {
                // Pre-load images for this field if not yet loaded
                const imageMap = getEditImageMap(field);
                setEditQuestionImages(prev => ({
                  ...prev,
                  [field]: { ...imageMap, ...prev[field] },
                }));
                setEditingQuestion({ field, title, question });
              };

            const handleQuestionSave = (payload: AdaptationQuestionEditPayload) => {
              if (!editingQuestion) return;
              const { field, question } = editingQuestion;
              const currentContent = editFields[field] || "";
              const updatedContent = replaceQuestionInAdaptedContent(currentContent, {
                number: question.number,
                text: payload.text,
                options: payload.questionType === "objetiva" ? payload.options : [],
                trailingLines: question.trailingLines,
              });
              // Update images for this question
              setEditQuestionImages(prev => ({
                ...prev,
                [field]: {
                  ...(prev[field] || {}),
                  [question.number]: payload.images,
                },
              }));
              setEditFields((f) => ({ ...f, [field]: updatedContent }));
              setEditingQuestion(null);
            };

            return (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold">Atividade Original</Label>
                  <Textarea
                    value={editFields.original_activity}
                    onChange={(e) => setEditFields((f) => ({ ...f, original_activity: e.target.value }))}
                    rows={4}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-1 mb-2">
                    <BookOpen className="w-4 h-4 text-primary" /> Versão Universal
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">Clique no ícone de edição em cada questão para editar individualmente.</p>
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <AdaptedContentRenderer
                      content={editFields.version_universal}
                      onEditQuestion={handleQuestionEdit("version_universal", "Versão Universal")}
                      onContentChange={(newContent) => setEditFields((f) => ({ ...f, version_universal: newContent }))}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-1 mb-2">
                    <Target className="w-4 h-4 text-primary" /> Versão Direcionada
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">Clique no ícone de edição em cada questão para editar individualmente.</p>
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <AdaptedContentRenderer
                      content={editFields.version_directed}
                      onEditQuestion={handleQuestionEdit("version_directed", "Versão Direcionada")}
                      onContentChange={(newContent) => setEditFields((f) => ({ ...f, version_directed: newContent }))}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Justificativa Pedagógica</Label>
                  <Textarea
                    value={editFields.pedagogical_justification}
                    onChange={(e) => setEditFields((f) => ({ ...f, pedagogical_justification: e.target.value }))}
                    rows={4}
                    className="mt-1 text-sm"
                  />
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <Button onClick={handleSaveEdit} disabled={saving} className="gap-1">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? "Salvando..." : "Salvar alterações"}
                  </Button>
                  <Button variant="outline" onClick={cancelEditing} disabled={saving}>
                    <X className="w-4 h-4 mr-1" /> Cancelar
                  </Button>
                </div>

                {editingQuestion && (
                  <AdaptationEditModal
                    open={!!editingQuestion}
                    onOpenChange={(open) => !open && setEditingQuestion(null)}
                    title={`${editingQuestion.title} • Questão ${editingQuestion.question.number}`}
                    content={editingQuestion.question.text}
                    initialOptions={editingQuestion.question.options}
                    images={editQuestionImages[editingQuestion.field]?.[editingQuestion.question.number] || []}
                    activityContext={editFields.original_activity?.slice(0, 200) || ""}
                    onSave={handleQuestionSave}
                  />
                )}
              </div>
            );
          })()}

          {/* VIEW MODE - Legacy */}
          {!editing && viewItem?.source === "legacy" && (
            <>
              <Tabs defaultValue="adapted">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="adapted">Atividade</TabsTrigger>
                  <TabsTrigger value="guidance">Orientações</TabsTrigger>
                  <TabsTrigger value="justification">Justificativa</TabsTrigger>
                </TabsList>
                <TabsContent value="adapted">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed p-4">{viewItem.raw.adapted_text || "—"}</div>
                </TabsContent>
                <TabsContent value="guidance">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed p-4">{viewItem.raw.teacher_guidance || "—"}</div>
                </TabsContent>
                <TabsContent value="justification">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed p-4">{viewItem.raw.justification || "—"}</div>
                </TabsContent>
              </Tabs>
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button variant="outline" size="sm" onClick={() => {
                  const text = `Atividade: ${viewItem.raw.adapted_text || ""}\nOrientações: ${viewItem.raw.teacher_guidance || ""}\nJustificativa: ${viewItem.raw.justification || ""}`;
                  copyToClipboard(text);
                }}>
                  <Copy className="w-4 h-4 mr-1" /> Copiar
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const w = window.open("", "_blank");
                  if (w) {
                    w.document.write(`<html><head><title>${escapeHtml(viewItem.raw.topic || "")}</title><style>body{font-family:sans-serif;padding:2rem;line-height:1.6}h1{font-size:1.2rem}h2{font-size:1rem;margin-top:1.5rem}pre{white-space:pre-wrap}</style></head><body><h1>${escapeHtml(viewItem.raw.topic || "")} — ${escapeHtml(viewItem.raw.grade || "")}</h1><p>${escapeHtml(viewItem.raw.subject || "")} · ${escapeHtml(viewItem.raw.type || "")}</p><h2>Atividade</h2><pre>${escapeHtml(viewItem.raw.adapted_text || "—")}</pre><h2>Orientações</h2><pre>${escapeHtml(viewItem.raw.teacher_guidance || "—")}</pre><h2>Justificativa</h2><pre>${escapeHtml(viewItem.raw.justification || "—")}</pre></body></html>`);
                    w.document.close();
                    w.print();
                  }
                }}>
                  <Printer className="w-4 h-4 mr-1" /> Imprimir
                </Button>
              </div>
            </>
          )}

          {/* VIEW MODE - Wizard */}
          {!editing && viewItem?.source === "wizard" && (() => {
            const result = (viewItem?.raw?.adaptation_result as Record<string, any>) ?? {};
            const barriers = viewItem.barriers;
            return (
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge>{ACTIVITY_TYPES[viewItem.raw.activity_type || ""] || "Atividade"}</Badge>
                  <Badge variant="outline">{new Date(viewItem.created_at).toLocaleDateString("pt-BR")}</Badge>
                  {viewItem.student_name && (
                    <Badge variant="secondary">
                      <User className="w-3 h-3 mr-1" /> {viewItem.student_name}
                    </Badge>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">Atividade Original</h4>
                  <div className="bg-muted rounded-lg p-3">
                    <AdaptedContentRenderer content={viewItem.raw.original_activity || ""} />
                  </div>
                </div>

                {barriers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1">Barreiras</h4>
                    <div className="flex flex-wrap gap-1">
                      {barriers.map((b: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {barrierLabel(b.barrier_key || b)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {result && (() => {
                  // Build image map: prefer new per-section format, fallback to legacy
                  const getImageMap = (field: "version_universal" | "version_directed"): Record<string, string[]> => {
                    const key = field === "version_universal" ? "question_images_universal" : "question_images_directed";
                    if (result?.[key] && typeof result[key] === "object") return result[key];

                    // Fallback: legacy question_images array
                    if (!Array.isArray(result?.question_images)) return {};
                    const map: Record<string, string[]> = {};
                    const parsedQs = parseAdaptedQuestions(result?.[field] || "");
                    result.question_images.forEach((qi: any, index: number) => {
                      if (!qi.image_url) return;
                      const adaptedQ = parsedQs[index];
                      if (!adaptedQ) return;
                      if (!map[adaptedQ.number]) map[adaptedQ.number] = [];
                      map[adaptedQ.number].push(qi.image_url);
                    });
                    return map;
                  };

                  const imageMapUniversal = getImageMap("version_universal");
                  const imageMapDirected = getImageMap("version_directed");

                  return (
                    <>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1">
                          <BookOpen className="w-4 h-4 text-primary" /> Versão Universal
                        </h4>
                        <div className="bg-secondary/50 rounded-lg p-3">
                          <AdaptedContentRenderer
                            content={result.version_universal || ""}
                            questionImages={imageMapUniversal}
                          />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1">
                          <Target className="w-4 h-4 text-primary" /> Versão Direcionada
                        </h4>
                        <div className="bg-secondary/50 rounded-lg p-3">
                          <AdaptedContentRenderer
                            content={result.version_directed || ""}
                            questionImages={imageMapDirected}
                          />
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-1">Justificativa Pedagógica</h4>
                        <div className="text-sm text-muted-foreground">
                          <AdaptedContentRenderer content={result.pedagogical_justification || ""} />
                        </div>
                      </div>
                      {result.strategies_applied && (
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-1">Estratégias</h4>
                          <div className="flex flex-wrap gap-1">
                            {(result.strategies_applied as string[]).map((s: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {result.implementation_tips && (
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-1">Dicas de Implementação</h4>
                          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                            {(result.implementation_tips as string[]).map((tip: string, i: number) => (
                              <li key={i}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 pt-4 border-t">
                        <Button variant="outline" size="sm" onClick={() => {
                          const text = `Versão Universal:\n${result?.version_universal || ""}\n\nVersão Direcionada:\n${result?.version_directed || ""}\n\nJustificativa:\n${result?.pedagogical_justification || ""}`;
                          copyToClipboard(text);
                        }}>
                          <Copy className="w-4 h-4 mr-1" /> Copiar
                        </Button>
                        <Button variant="outline" size="sm" disabled={exportingPdf} onClick={async () => {
                          setExportingPdf(true);
                          try {
                            await exportToPdf({
                              studentName: viewItem.student_name || undefined,
                              activityType: viewItem.raw.activity_type || undefined,
                              date: new Date(viewItem.created_at).toLocaleDateString("pt-BR"),
                              versionUniversal: result?.version_universal || "",
                              versionDirected: result?.version_directed || "",
                              strategiesApplied: result?.strategies_applied || [],
                              pedagogicalJustification: result?.pedagogical_justification || "",
                              implementationTips: result?.implementation_tips || [],
                              questionImagesUniversal: imageMapUniversal,
                              questionImagesDirected: imageMapDirected,
                            });
                            toast.success("PDF exportado!");
                          } catch {
                            toast.error("Erro ao gerar PDF");
                          }
                          setExportingPdf(false);
                        }}>
                          {exportingPdf ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Printer className="w-4 h-4 mr-1" />}
                          {exportingPdf ? "Gerando PDF..." : "Exportar PDF"}
                        </Button>
                        <Button variant="outline" size="sm" disabled={exportingDocx} onClick={async () => {
                          setExportingDocx(true);
                          try {
                            await exportToDocx({
                              studentName: viewItem.student_name || undefined,
                              activityType: viewItem.raw.activity_type || undefined,
                              date: new Date(viewItem.created_at).toLocaleDateString("pt-BR"),
                              versionUniversal: result?.version_universal || "",
                              versionDirected: result?.version_directed || "",
                              strategiesApplied: result?.strategies_applied || [],
                              pedagogicalJustification: result?.pedagogical_justification || "",
                              implementationTips: result?.implementation_tips || [],
                              questionImagesUniversal: imageMapUniversal,
                              questionImagesDirected: imageMapDirected,
                            });
                            toast.success("Word exportado!");
                          } catch {
                            toast.error("Erro ao gerar Word");
                          }
                          setExportingDocx(false);
                        }}>
                          {exportingDocx ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileDown className="w-4 h-4 mr-1" />}
                          {exportingDocx ? "Gerando Word..." : "Exportar Word"}
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir adaptação?</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita. A adaptação será removida permanentemente.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
