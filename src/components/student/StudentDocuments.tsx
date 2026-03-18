import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Eye,
  FolderOpen,
  FileSpreadsheet,
  BookOpen,
  ClipboardList,
  Briefcase,
  Target,
  Copy,
  Printer,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BARRIER_DIMENSIONS } from "@/lib/barriers";
import AdaptedContentRenderer from "@/components/adaptation/AdaptedContentRenderer";
import { parseAdaptedQuestions } from "@/lib/adaptedQuestions";
import { exportToPdf } from "@/lib/exportPdf";

const CATEGORIES = [
  { key: "prova", label: "Provas", icon: FileSpreadsheet },
  { key: "exercicio", label: "Exercícios", icon: ClipboardList },
  { key: "atividade_casa", label: "Atividades de Casa", icon: BookOpen },
  { key: "trabalho", label: "Trabalhos", icon: Briefcase },
  { key: "outros", label: "Outros", icon: FileText },
] as const;

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.label])
);

const ACTIVITY_TYPES: Record<string, string> = {
  prova: "Prova",
  exercicio: "Exercício",
  atividade_casa: "Atividade de Casa",
  trabalho: "Trabalho",
};

const ACTIVITY_TYPE_TO_CATEGORY: Record<string, string> = {
  prova: "prova",
  exercicio: "exercicio",
  atividade_casa: "atividade_casa",
  trabalho: "trabalho",
};

function barrierLabel(key: string): string {
  for (const dim of BARRIER_DIMENSIONS) {
    const b = dim.barriers.find((b) => b.key === key);
    if (b) return b.label;
  }
  return key;
}

type Props = {
  studentId: string;
  studentName: string;
};

export default function StudentDocuments({ studentId, studentName }: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadCategory, setUploadCategory] = useState("outros");
  const [filter, setFilter] = useState<string>("all");
  const [viewAdaptation, setViewAdaptation] = useState<any | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Fetch adaptations linked to this student
  const { data: adaptations } = useQuery({
    queryKey: ["student-adaptations", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("adaptations_history")
        .select("id, activity_type, original_activity, adaptation_result, barriers_used, created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch uploaded files
  const { data: uploadedFiles } = useQuery({
    queryKey: ["student-files", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_files")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split(".").pop();
      const path = `students/${studentId}/${Date.now()}.${ext}`;
      const { error: storageError } = await supabase.storage
        .from("activity-files")
        .upload(path, file);
      if (storageError) throw storageError;

      const { data: { user } } = await supabase.auth.getUser();
      const { error: dbError } = await supabase.from("student_files").insert({
        student_id: studentId,
        teacher_id: user!.id,
        category: uploadCategory,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
      });
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast.success("Arquivo enviado!");
      queryClient.invalidateQueries({ queryKey: ["student-files", studentId] });
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: () => toast.error("Erro ao enviar arquivo."),
  });

  const deleteFile = useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string }) => {
      await supabase.storage.from("activity-files").remove([filePath]);
      const { error } = await supabase.from("student_files").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Arquivo removido.");
      queryClient.invalidateQueries({ queryKey: ["student-files", studentId] });
    },
    onError: () => toast.error("Erro ao remover arquivo."),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 10MB).");
      return;
    }
    uploadFile.mutate(file);
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from("activity-files").download(filePath);
    if (error || !data) { toast.error("Erro ao baixar arquivo."); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  };

  // Merge adaptations + uploads into a unified list
  type DocItem =
    | { type: "adaptation"; id: string; category: string; label: string; date: string; preview: string; raw: any }
    | { type: "file"; id: string; category: string; label: string; date: string; filePath: string; fileSize: number | null };

  const allDocs: DocItem[] = [];

  adaptations?.forEach((a) => {
    const cat = ACTIVITY_TYPE_TO_CATEGORY[a.activity_type || ""] || "outros";
    allDocs.push({
      type: "adaptation",
      id: a.id,
      category: cat,
      label: `Adaptação: ${a.original_activity.slice(0, 60)}${a.original_activity.length > 60 ? "…" : ""}`,
      date: a.created_at || "",
      preview: typeof a.adaptation_result === "object" && a.adaptation_result !== null
        ? ((a.adaptation_result as any).version_universal || "").slice(0, 100)
        : "",
      raw: a,
    });
  });

  uploadedFiles?.forEach((f) => {
    allDocs.push({
      type: "file",
      id: f.id,
      category: f.category,
      label: f.file_name,
      date: f.created_at || "",
      filePath: f.file_path,
      fileSize: f.file_size,
    });
  });

  allDocs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const filtered = filter === "all" ? allDocs : allDocs.filter((d) => d.category === filter);

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "";
  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Detail dialog helpers
  const renderAdaptationDetail = () => {
    if (!viewAdaptation) return null;
    const result = viewAdaptation.adaptation_result as any;
    const barriers = Array.isArray(viewAdaptation.barriers_used) ? viewAdaptation.barriers_used : [];

    const savedImages: string[] = Array.isArray(result?.question_images)
      ? result.question_images.map((qi: any) => qi.image_url).filter(Boolean)
      : [];

    const buildImageMap = (content: string) => {
      if (savedImages.length === 0) return {};
      const questions = parseAdaptedQuestions(content || "");
      if (questions.length === 0) return {};
      const lastQ = questions[questions.length - 1];
      return { [lastQ.number]: savedImages };
    };

    return (
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Badge>{ACTIVITY_TYPES[viewAdaptation.activity_type || ""] || "Atividade"}</Badge>
          <Badge variant="outline">{new Date(viewAdaptation.created_at).toLocaleDateString("pt-BR")}</Badge>
          <Badge variant="secondary">{studentName}</Badge>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-foreground mb-1">Atividade Original</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted rounded-lg p-3">
            {viewAdaptation.original_activity}
          </p>
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

        {result && (
          <>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1">
                <BookOpen className="w-4 h-4 text-primary" /> Versão Universal
              </h4>
              <div className="bg-secondary/50 rounded-lg p-3">
                <AdaptedContentRenderer content={result.version_universal || ""} questionImages={buildImageMap(result.version_universal)} />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1">
                <Target className="w-4 h-4 text-primary" /> Versão Direcionada
              </h4>
              <div className="bg-secondary/50 rounded-lg p-3">
                <AdaptedContentRenderer content={result.version_directed || ""} questionImages={buildImageMap(result.version_directed)} />
              </div>
            </div>

            {savedImages.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1">
                  <ImageIcon className="w-4 h-4 text-primary" /> Imagens da Atividade
                </h4>
                <div className="flex flex-wrap gap-2">
                  {savedImages.map((url: string, i: number) => (
                    <img key={i} src={url} alt={`Imagem ${i + 1}`} className="max-h-40 rounded-lg border border-border object-contain" crossOrigin="anonymous" />
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">Justificativa Pedagógica</h4>
              <p className="text-sm text-muted-foreground">{result.pedagogical_justification}</p>
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
                const text = `Versão Universal:\n${result.version_universal || ""}\n\nVersão Direcionada:\n${result.version_directed || ""}\n\nJustificativa:\n${result.pedagogical_justification || ""}`;
                navigator.clipboard.writeText(text);
                toast.success("Conteúdo copiado!");
              }}>
                <Copy className="w-4 h-4 mr-1" /> Copiar
              </Button>
              <Button variant="outline" size="sm" disabled={exportingPdf} onClick={async () => {
                setExportingPdf(true);
                try {
                  await exportToPdf({
                    studentName,
                    activityType: viewAdaptation.activity_type || undefined,
                    date: new Date(viewAdaptation.created_at).toLocaleDateString("pt-BR"),
                    versionUniversal: result.version_universal || "",
                    versionDirected: result.version_directed || "",
                    strategiesApplied: result.strategies_applied || [],
                    pedagogicalJustification: result.pedagogical_justification || "",
                    implementationTips: result.implementation_tips || [],
                    imagesUniversal: savedImages,
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
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="w-4 h-4" /> Enviar arquivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={uploadCategory} onValueChange={setUploadCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploadFile.isPending}>
              <Upload className="w-4 h-4" />
              {uploadFile.isPending ? "Enviando…" : "Escolher arquivo"}
            </Button>
            <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={handleFileChange} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">PDF, DOC, DOCX ou imagens (máx. 10MB)</p>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
          Todos ({allDocs.length})
        </Button>
        {CATEGORIES.map((c) => {
          const count = allDocs.filter((d) => d.category === c.key).length;
          if (count === 0) return null;
          const Icon = c.icon;
          return (
            <Button key={c.key} variant={filter === c.key ? "default" : "outline"} size="sm" onClick={() => setFilter(c.key)} className="gap-1.5">
              <Icon className="w-3.5 h-3.5" />
              {c.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Documents List */}
      {filtered.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-10 text-center">
            <FolderOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum documento encontrado para {studentName}.</p>
            <p className="text-xs text-muted-foreground mt-1">Adaptações vinculadas e arquivos enviados aparecerão aqui.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <Card key={`${doc.type}-${doc.id}`} className="border-border">
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <div className="shrink-0">
                  {doc.type === "adaptation" ? (
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-primary" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.label}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {CATEGORY_LABELS[doc.category] || doc.category}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">{formatDate(doc.date)}</span>
                    {doc.type === "file" && doc.fileSize && (
                      <span className="text-[11px] text-muted-foreground">{formatSize(doc.fileSize)}</span>
                    )}
                  </div>
                  {doc.type === "adaptation" && doc.preview && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{doc.preview}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {doc.type === "adaptation" ? (
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver detalhes" onClick={() => setViewAdaptation(doc.raw)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  ) : (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Baixar" onClick={() => downloadFile(doc.filePath, doc.label)}>
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Excluir" onClick={() => deleteFile.mutate({ id: doc.id, filePath: doc.filePath })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Adaptation Detail Dialog */}
      <Dialog open={!!viewAdaptation} onOpenChange={() => setViewAdaptation(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Adaptação</DialogTitle>
          </DialogHeader>
          {renderAdaptationDetail()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
