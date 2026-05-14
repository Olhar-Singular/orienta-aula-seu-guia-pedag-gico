import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserSchool } from "@/hooks/useUserSchool";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  Plus,
  FileUp,
  Crop,
  Trash2,
  Pencil,
  Eye,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  X,
  ImageIcon,
  Upload,
  Clock,
  Search,
  FileText,
  ListChecks,
  SplitSquareHorizontal,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import "katex/dist/katex.min.css";
import { renderMathToHtml, hasMathContent } from "@/lib/latexRenderer";
import QuestionForm from "@/components/QuestionForm";
import ImageCropperModal from "@/components/ImageCropperModal";
import PdfPreviewModal from "@/components/PdfPreviewModal";
import FilePreviewModal from "@/components/FilePreviewModal";
import ImagePreviewDialog from "@/components/ImagePreviewDialog";
import ManualQuestionEditor from "@/components/ManualQuestionEditor";
import QuestionBankFolderView from "@/components/question-bank/QuestionBankFolderView";
import { useQuestions } from "@/hooks/useQuestions";
import { detectFileType } from "@/lib/fileValidation";
import { resolveUniqueFileName } from "@/lib/fileNameUtils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { parsePdf, type PdfParseResult } from "@/lib/pdf-utils";
import { extractDocxText, extractDocxWithImages } from "@/lib/docx-utils";
import { autoCropFromBbox, normalizeTextForDedup, dataUrlToBlob } from "@/lib/extraction-utils";

type Question = {
  id: string;
  text: string;
  subject: string;
  topic: string | null;
  difficulty: string;
  options: any;
  correct_answer: number | null;
  resolution: string | null;
  image_url: string | null;
  source: string | null;
  source_file_name: string | null;
  is_public: boolean;
  created_at: string;
};

type ExtractedQuestion = {
  text: string;
  subject: string;
  topic?: string;
  options?: string[];
  correct_answer?: number;
  resolution?: string;
  has_figure?: boolean;
  figure_description?: string;
  image_page?: number;
  figure_bbox?: { x: number; y: number; width: number; height: number };
  imageUrl?: string;
  selected: boolean;
  isDuplicate?: boolean;
  saved?: boolean;
  saving?: boolean;
  savedId?: string;
  difficulty?: string;
  editing?: boolean;
  /** Fingerprint at time of duplicate detection */
  originalFingerprint?: string;
};

/** Generates a simple fingerprint from question content for dedup comparison */
function questionFingerprint(q: { text: string; options?: string[]; correct_answer?: number }): string {
  const norm = normalizeTextForDedup(q.text);
  const opts = q.options ? q.options.map(o => normalizeTextForDedup(o)).join("|") : "";
  const ans = q.correct_answer != null ? String(q.correct_answer) : "";
  return `${norm}::${opts}::${ans}`;
}

type PdfUpload = {
  id: string;
  file_name: string;
  file_path: string;
  questions_extracted: number | null;
  uploaded_at: string;
};

type PreviewMode = "pdf" | "docx" | null;

const subjects = [
  "Física", "Matemática", "Química", "Biologia", "Português",
  "História", "Geografia", "Inglês", "Ciências", "Arte", "Ed. Física", "Geral",
];

const difficulties = [
  { value: "facil", label: "Fácil" },
  { value: "medio", label: "Médio" },
  { value: "dificil", label: "Difícil" },
];

const sourceLabels: Record<string, string> = {
  manual: "Manual",
  pdf_extract: "PDF",
  docx_extract: "Word",
  image_crop: "Imagem",
};

/** Renders text with LaTeX fractions and formulas via KaTeX */
function MathPreview({ text }: { text: string }) {
  const html = useMemo(() => renderMathToHtml(text), [text]);

  if (!text || !hasMathContent(text)) return null;

  return (
    <div className="mt-1 p-2 rounded border border-border/50 bg-muted/30">
      <p className="text-[10px] text-muted-foreground mb-1">Prévia matemática</p>
      <div
        className="text-sm leading-relaxed [&_.katex]:text-[115%]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

/** Renders text as read-only with inline KaTeX for math content */
function ReadOnlyMathText({ text }: { text: string }) {
  const html = useMemo(() => renderMathToHtml(text), [text]);

  return (
    <div
      className="text-sm p-2 rounded border border-border/50 bg-muted/30 whitespace-pre-wrap min-h-[3rem] leading-relaxed [&_.katex]:text-[115%]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function QuestionBank() {
  const { user } = useAuth();
  const { schoolId } = useUserSchool();

  const [activeTab, setActiveTab] = useState("provas");

  // Lista global de questões via TanStack Query — participa do mesmo cache
  // que QuestionBankFolderView, então o badge atualiza ao deletar/criar.
  const { questions, refetch: refetchQuestions } = useQuestions();

  // PDF uploads history
  const [pdfUploads, setPdfUploads] = useState<PdfUpload[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(true);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Upload + extraction state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractionTime, setExtractionTime] = useState(0);
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestion[]>([]);
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [cropperForQuestion, setCropperForQuestion] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewUploadFile, setPreviewUploadFile] = useState<File | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewStoragePath, setPreviewStoragePath] = useState<string | null>(null);
  const [showManualEdit, setShowManualEdit] = useState(false);
  const [pendingRename, setPendingRename] = useState<{
    originalFile: File;
    originalName: string;
    finalName: string;
  } | null>(null);
  const [showReviewPreview, setShowReviewPreview] = useState(false);
  const [reviewPreviewMode, setReviewPreviewMode] = useState<PreviewMode>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Wrapper para callsites que ainda chamam fetchQuestions (extração, save, etc).
  // Reaproveita o refetch do TanStack Query.
  const fetchQuestions = useCallback(async () => {
    await refetchQuestions();
  }, [refetchQuestions]);

  // ─── Fetch PDF uploads history ───
  const fetchUploads = useCallback(async () => {
    if (!user) return;
    setLoadingUploads(true);
    const { data, error } = await (supabase.from as any)("pdf_uploads")
      .select("*")
      .order("uploaded_at", { ascending: false });
    if (!error) setPdfUploads(data || []);
    setLoadingUploads(false);
  }, [user]);

  useEffect(() => { fetchUploads(); }, [fetchUploads]);

  // Timer for extraction
  useEffect(() => {
    if (extracting) {
      setExtractionTime(0);
      timerRef.current = setInterval(() => setExtractionTime((t) => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [extracting]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec.toString().padStart(2, "0")}s` : `${sec}s`;
  };

  // ─── File upload handler ───
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input value so the same file can be re-selected after removal
    if (e.target) e.target.value = "";
    if (!file || !user) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 10 MB.", variant: "destructive" });
      return;
    }

    const bytes = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    const type = detectFileType(bytes);
    if (type !== "pdf" && type !== "docx") {
      toast({ title: "Formato inválido", description: "Apenas PDF e DOCX.", variant: "destructive" });
      return;
    }

    // Check for duplicate exam name — if collision, ask to rename first
    const { finalName, wasRenamed } = resolveUniqueFileName(
      file.name,
      pdfUploads.map((u) => u.file_name),
    );

    if (wasRenamed) {
      setPendingRename({ originalFile: file, originalName: file.name, finalName });
      return;
    }

    await performUpload(file);
  };

  const performUpload = async (file: File) => {
    if (!user) return;
    setUploadFile(file);

    try {
      const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${user.id}/${Date.now()}_${safeName}`;
      await supabase.storage.from("question-pdfs").upload(filePath, file);
      await (supabase.from as any)("pdf_uploads").insert({
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
      });
      fetchUploads();
      toast({ title: "Arquivo enviado!", description: "Clique em 'Extrair com IA' para extrair as questões." });
    } catch (err: any) {
      toast({ title: "Erro ao enviar arquivo", description: err.message, variant: "destructive" });
    }
  };

  const confirmRenameAndUpload = async () => {
    if (!pendingRename) return;
    const { originalFile, finalName } = pendingRename;
    const renamed = new File([originalFile], finalName, { type: originalFile.type });
    setPendingRename(null);
    await performUpload(renamed);
  };

  const cancelRename = () => {
    setPendingRename(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      if (fileRef.current) {
        fileRef.current.files = dt.files;
        handleFileSelect({ target: fileRef.current } as any);
      }
    }
  };

  // ─── Extract questions ───
  const handleExtract = async () => {
    if (!uploadFile || !user) return;
    setExtracting(true);

    try {
      const bytes = new Uint8Array(await uploadFile.slice(0, 4).arrayBuffer());
      const type = detectFileType(bytes);

      let pdfText = "";
      let images: string[] = [];

      if (type === "pdf") {
        const result: PdfParseResult = await parsePdf(uploadFile);
        pdfText = result.text;
        images = result.pageImages;
        setPageImages(images);
      } else if (type === "docx") {
        const docxResult = await extractDocxWithImages(uploadFile);
        pdfText = docxResult.text;
        images = docxResult.images;
      }

      // File already uploaded to storage in handleFileSelect
      const session = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-questions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            pdfText,
            pdfFileName: uploadFile.name,
            pageImages: images,
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Falha na extração");
      }

      const data = await resp.json();
      const rawQuestions = data.questions || [];

      if (rawQuestions.length === 0) {
        toast({ title: "Nenhuma questão encontrada", description: "Tente cadastro manual.", variant: "destructive" });
        setExtracting(false);
        return;
      }

      // Auto-crop figures
      const processed: ExtractedQuestion[] = [];
      for (const q of rawQuestions) {
        let imageUrl: string | undefined;
        if (q.has_figure && q.figure_bbox && q.image_page && images[q.image_page - 1]) {
          try {
            imageUrl = await autoCropFromBbox(images[q.image_page - 1], q.figure_bbox);
          } catch (e) {
            console.warn("Auto-crop failed:", e);
          }
        }
        processed.push({
          text: q.text || "",
          subject: q.subject || "Geral",
          topic: q.topic || undefined,
          options: q.options || undefined,
          correct_answer: q.correct_answer != null ? q.correct_answer : undefined,
          resolution: q.resolution || undefined,
          has_figure: q.has_figure || false,
          figure_description: q.figure_description || undefined,
          image_page: q.image_page || undefined,
          figure_bbox: q.figure_bbox || undefined,
          imageUrl,
          selected: true,
        });
      }

      // Check duplicates
      const existingNorm = new Set(questions.map((q) => normalizeTextForDedup(q.text)));
      let dupeCount = 0;
      processed.forEach((q) => {
        if (existingNorm.has(normalizeTextForDedup(q.text))) {
          q.isDuplicate = true;
          q.selected = false;
          q.originalFingerprint = questionFingerprint(q);
          dupeCount++;
        }
      });

      setExtractedQuestions(processed);
      setShowReview(true);
      toast({ title: `${processed.length} questão(ões) extraída(s)!${dupeCount > 0 ? ` (${dupeCount} duplicada(s))` : ""}` });
    } catch (e: any) {
      toast({ title: "Erro na extração", description: e.message, variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  // ─── Save individual question ───
  const handleSaveOne = async (index: number) => {
    if (!user) return;
    const q = extractedQuestions[index];
    if (!q || !q.text.trim()) return;

    // Check for duplicate text in DB
    const normText = normalizeTextForDedup(q.text);
    const isDup = questions.some((existing) => normalizeTextForDedup(existing.text) === normText);
    if (isDup) {
      toast({ title: "Questão duplicada", description: "Já existe uma questão com o mesmo enunciado no banco.", variant: "destructive" });
      updateExtracted(index, "isDuplicate", true);
      return;
    }

    updateExtracted(index, "saving", true);
    try {
      let imageUrl = q.imageUrl || null;

      if (imageUrl && imageUrl.startsWith("data:")) {
        const blob = dataUrlToBlob(imageUrl);
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.png`;
        const { error: upErr } = await supabase.storage
          .from("question-images")
          .upload(fileName, blob, { contentType: "image/png" });
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from("question-images").getPublicUrl(fileName);
          imageUrl = publicUrl;
        } else {
          imageUrl = null;
        }
      }

      const row = {
        text: q.text,
        subject: q.subject,
        topic: q.topic || null,
        options: q.options || null,
        correct_answer: q.correct_answer ?? null,
        resolution: q.resolution || null,
        difficulty: "medio",
        source: uploadFile?.name.toLowerCase().endsWith(".pdf") ? "pdf_extract" : "docx_extract",
        source_file_name: uploadFile?.name || null,
        image_url: imageUrl,
        created_by: user.id,
        school_id: schoolId,
      };

      const { data: inserted, error } = await (supabase.from as any)("question_bank").insert([row]).select("id");
      if (error) throw error;

      updateExtracted(index, "saved", true);
      updateExtracted(index, "saving", false);
      if (inserted?.[0]?.id) updateExtracted(index, "savedId", inserted[0].id);
      toast({ title: `Questão ${index + 1} salva com sucesso!` });
      fetchQuestions();
    } catch (e: any) {
      updateExtracted(index, "saving", false);
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  };

  // ─── Save all selected (batch) ───
  const handleSaveExtracted = async () => {
    const unsaved = extractedQuestions
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => q.selected && !q.saved && q.text.trim());
    if (unsaved.length === 0) {
      toast({ title: "Nenhuma questão para salvar", variant: "destructive" });
      return;
    }
    setSaving(true);
    for (const { i } of unsaved) {
      await handleSaveOne(i);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await (supabase.from as any)("question_bank").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Questão removida" }); fetchQuestions(); }
    setDeletingId(null);
  };

  // ─── Delete exam upload ───
  const handleDeleteUpload = async (upload: PdfUpload) => {
    setDeletingId(upload.id);
    try {
      await supabase.storage.from("question-pdfs").remove([upload.file_path]);
      const { error } = await (supabase.from as any)("pdf_uploads").delete().eq("id", upload.id);
      if (error) throw error;
      toast({ title: "Prova excluída" });
      fetchUploads();
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Re-extract from existing upload ───
  const handleReExtract = async (upload: PdfUpload) => {
    try {
      const { data: fileData, error } = await supabase.storage.from("question-pdfs").download(upload.file_path);
      if (error || !fileData) throw new Error("Não foi possível baixar o arquivo");
      const file = new File([fileData], upload.file_name, { type: "application/pdf" });
      setUploadFile(file);
      // Auto-trigger extraction
      toast({ title: "Arquivo carregado", description: "Clique em 'Extrair com IA' para reextrair as questões." });
    } catch (e: any) {
      toast({ title: "Erro ao carregar arquivo", description: e.message, variant: "destructive" });
    }
  };

  const openFilePreview = async (file: File) => {
    const bytes = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    const type = detectFileType(bytes);

    if (type === "pdf") {
      setPreviewUploadFile(file);
      setPreviewMode("pdf");
      return;
    }

    if (type === "docx") {
      setPreviewUploadFile(file);
      setPreviewMode("docx");
      return;
    }

    throw new Error("Formato não suportado para visualização");
  };

  /** Opens QuestionForm modal to edit an extracted question */
  const handleEditExtractedInModal = (index: number) => {
    const eq = extractedQuestions[index];
    if (!eq) return;

    // Build a Question-like object for QuestionForm
    const questionObj: any = {
      id: eq.savedId || undefined,
      text: eq.text,
      subject: eq.subject,
      topic: eq.topic || null,
      difficulty: eq.difficulty || "medio",
      options: eq.options || null,
      correct_answer: eq.correct_answer ?? null,
      resolution: eq.resolution || null,
      image_url: eq.imageUrl || null,
    };

    setEditingQuestion(questionObj);
    setShowForm(true);
  };

  // ─── Preview file from history ───
  const handlePreviewUpload = async (upload: PdfUpload) => {
    setLoadingPreview(true);
    try {
      const { data: fileData, error } = await supabase.storage.from("question-pdfs").download(upload.file_path);
      if (error || !fileData) throw new Error("Não foi possível baixar o arquivo");

      const isDocx = upload.file_name.toLowerCase().endsWith(".docx");
      const mimeType = isDocx
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/pdf";
      const file = new File([fileData], upload.file_name, { type: mimeType });

      setPreviewStoragePath(upload.file_path);
      await openFilePreview(file);
    } catch (e: any) {
      toast({ title: "Erro ao visualizar", description: e.message, variant: "destructive" });
    } finally {
      setLoadingPreview(false);
    }
  };

  const updateExtracted = (i: number, field: keyof ExtractedQuestion, value: any) => {
    setExtractedQuestions((prev) => prev.map((q, idx) => {
      if (idx !== i) return q;
      const updated = { ...q, [field]: value };

      // Auto-clear duplicate status when content changes
      if (updated.isDuplicate && updated.originalFingerprint &&
          (field === "text" || field === "options" || field === "correct_answer")) {
        const newFp = questionFingerprint(updated);
        if (newFp !== updated.originalFingerprint) {
          updated.isDuplicate = false;
          updated.selected = true;
        }
      }

      return updated;
    }));
  };

  const selectedCount = extractedQuestions.filter((q) => q.selected && !q.saved).length;
  const savedCount = extractedQuestions.filter((q) => q.saved).length;

  const handleFinishReview = () => {
    setShowReview(false);
    setExtractedQuestions([]);
    if (savedCount > 0) {
      setActiveTab("questoes");
    }
  };

  // ─── MANUAL EDIT MODE ───
  if (showManualEdit && uploadFile) {
    return (
      <ManualQuestionEditor
        file={uploadFile}
        onFinish={() => {
          setShowManualEdit(false);
          setUploadFile(null);
          fetchQuestions();
        }}
      />
    );
  }

  // ─── REVIEW MODE ───
  if (showReview) {
    return (
      <>
        <div className="space-y-4">
           <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-2xl font-bold text-foreground">Revisão de Questões Extraídas</h1>
            <div className="flex gap-2">
              {uploadFile && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const name = uploadFile.name.toLowerCase();
                    setReviewPreviewMode(name.endsWith(".docx") ? "docx" : "pdf");
                    setShowReviewPreview(true);
                  }}
                >
                  <Eye className="w-4 h-4 mr-1" /> Ver Exercícios
                </Button>
              )}
              <Button variant="outline" onClick={handleFinishReview}>
                {savedCount > 0 ? "Concluir" : "Cancelar"}
              </Button>
              <Button onClick={handleSaveExtracted} disabled={saving || selectedCount === 0}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                Salvar todas ({selectedCount})
              </Button>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              A IA pode errar na classificação, gabarito ou resolução. <strong>Revise cada questão antes de salvar.</strong>
            </AlertDescription>
          </Alert>

          <p className="text-sm text-muted-foreground">
            {extractedQuestions.length} extraída(s) • {savedCount} salva(s) • {selectedCount} pendente(s)
            {extractedQuestions.some((q) => q.isDuplicate) && (
              <span className="text-destructive ml-2">
                • {extractedQuestions.filter((q) => q.isDuplicate).length} duplicada(s)
              </span>
            )}
          </p>

          <div className="space-y-4">
            {extractedQuestions.map((q, i) => (
              <Card key={i} className={`transition-all ${q.saved ? "border-green-400 bg-green-50/50 dark:bg-green-900/10" : ""} ${q.isDuplicate && !q.saved ? "border-destructive/30 bg-destructive/5" : ""} ${!q.selected && !q.saved && !q.isDuplicate ? "opacity-50" : ""}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={q.selected || q.saved}
                      onCheckedChange={(v) => !q.saved && updateExtracted(i, "selected", !!v)}
                      disabled={q.saved}
                      aria-label={`Selecionar questão ${i + 1}`}
                    />
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{i + 1}</Badge>
                          {q.saved && <Badge className="bg-green-600 text-white">✓ Salva</Badge>}
                          {q.isDuplicate && !q.saved && <Badge variant="destructive">Duplicada</Badge>}
                          {q.imageUrl && <Badge variant="outline"><ImageIcon className="w-3 h-3 mr-1" />Imagem</Badge>}
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Toggle inline edit mode */}
                          {!q.saved && (
                            <Button
                              size="sm"
                              variant={q.editing ? "secondary" : "ghost"}
                              onClick={() => updateExtracted(i, "editing", !q.editing)}
                            >
                              <Pencil className="w-3 h-3 mr-1" />
                              {q.editing ? "Fechar edição" : "Editar"}
                            </Button>
                          )}
                          {!q.saved && !q.isDuplicate && (
                            <Button
                              size="sm"
                              onClick={() => handleSaveOne(i)}
                              disabled={q.saving || !q.text.trim()}
                            >
                              {q.saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                              Salvar
                            </Button>
                          )}
                          {q.isDuplicate && !q.saved && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                updateExtracted(i, "isDuplicate", false);
                                updateExtracted(i, "selected", true);
                              }}
                            >
                              Forçar inclusão
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Enunciado */}
                      <div>
                        <Label className="text-xs">Enunciado</Label>
                        {q.editing ? (
                          <>
                            <Textarea
                              value={q.text}
                              onChange={(e) => updateExtracted(i, "text", e.target.value)}
                              rows={3}
                              className="text-sm"
                            />
                            <MathPreview text={q.text} />
                          </>
                        ) : (
                          <ReadOnlyMathText text={q.text} />
                        )}
                      </div>

                      {/* Image after enunciado */}
                      {q.imageUrl ? (
                        <div className="space-y-1">
                          <div
                            className="relative inline-block cursor-zoom-in group"
                            onClick={() => setPreviewImageUrl(q.imageUrl || null)}
                          >
                            <img src={q.imageUrl} alt="Figura da questão" className="max-h-48 rounded border" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors rounded">
                              <Search className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                            </div>
                          </div>
                          {q.editing && (
                            <div className="flex gap-1 flex-wrap">
                              <Button size="sm" variant="outline" onClick={() => updateExtracted(i, "imageUrl", undefined)}>
                                <X className="w-3 h-3 mr-1" /> Remover imagem
                              </Button>
                              {uploadFile && uploadFile.name.toLowerCase().endsWith(".pdf") && (
                                <Button size="sm" variant="outline" onClick={() => setCropperForQuestion(i)}>
                                  <Crop className="w-3 h-3 mr-1" /> Trocar recorte
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ) : q.editing && (
                        <div className="flex gap-1">
                          {uploadFile && uploadFile.name.toLowerCase().endsWith(".pdf") && (
                            <Button size="sm" variant="outline" onClick={() => setCropperForQuestion(i)}>
                              <Crop className="w-3 h-3 mr-1" /> Recortar do PDF
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const input = document.createElement("input");
                              input.type = "file";
                              input.accept = "image/png,image/jpeg,image/webp,image/gif";
                              input.onchange = (ev) => {
                                const file = (ev.target as HTMLInputElement).files?.[0];
                                if (!file) return;
                                if (file.size > 5 * 1024 * 1024) {
                                  toast({ title: "Imagem muito grande", description: "Máximo 5 MB.", variant: "destructive" });
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onload = () => updateExtracted(i, "imageUrl", reader.result as string);
                                reader.readAsDataURL(file);
                              };
                              input.click();
                            }}
                          >
                            <Upload className="w-3 h-3 mr-1" /> Upload Imagem
                          </Button>
                        </div>
                      )}

                      {/* Subject / Topic */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <Label className="text-xs">Matéria</Label>
                          {q.editing ? (
                            <Select value={q.subject} onValueChange={(v) => updateExtracted(i, "subject", v)}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="text-sm p-1 text-muted-foreground">{q.subject}</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs">Tópico</Label>
                          {q.editing ? (
                            <Input
                              value={q.topic || ""}
                              onChange={(e) => updateExtracted(i, "topic", e.target.value)}
                              className="h-8 text-sm"
                            />
                          ) : (
                            <p className="text-sm p-1 text-muted-foreground">{q.topic || "—"}</p>
                          )}
                        </div>
                      </div>

                      {/* Options + answer */}
                      {q.options && q.options.length > 0 && (
                        <div>
                          <Label className="text-xs">Alternativas</Label>
                          <div className="space-y-1 mt-1">
                            {q.options.map((opt: string, j: number) => (
                              <div key={j} className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant={q.correct_answer === j ? "default" : "outline"}
                                  className="w-8 h-7 text-xs shrink-0"
                                  onClick={() => q.editing && updateExtracted(i, "correct_answer", q.correct_answer === j ? -1 : j)}
                                  disabled={!q.editing}
                                >
                                  {String.fromCharCode(65 + j)}
                                </Button>
                                <span className={`text-sm ${q.correct_answer === j ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                                  {opt}
                                </span>
                              </div>
                            ))}
                          </div>
                          {q.editing && (q.correct_answer == null || q.correct_answer === -1) && q.options.length > 0 && (
                            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Sem gabarito definido — clique na letra correta
                            </p>
                          )}
                        </div>
                      )}

                      {/* Resolution */}
                      <div>
                        <Label className="text-xs">Resolução</Label>
                        {q.editing ? (
                          <Textarea
                            value={q.resolution || ""}
                            onChange={(e) => updateExtracted(i, "resolution", e.target.value)}
                            rows={2}
                            className="text-sm"
                            placeholder="Explicação da resposta..."
                          />
                        ) : (
                          q.resolution ? (
                            <ReadOnlyMathText text={q.resolution} />
                          ) : (
                            <p className="text-sm p-2 rounded border border-border/50 bg-muted/30 min-h-[2rem] text-muted-foreground italic">
                              Sem resolução
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-2 sticky bottom-4">
            <Button variant="outline" onClick={handleFinishReview} className="flex-1">
              {savedCount > 0 ? "Concluir" : "Cancelar"}
            </Button>
            <Button onClick={handleSaveExtracted} disabled={saving || selectedCount === 0} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              Salvar todas ({selectedCount})
            </Button>
          </div>
        </div>

        <PdfPreviewModal
          open={cropperForQuestion !== null}
          onOpenChange={(open) => { if (!open) setCropperForQuestion(null); }}
          file={uploadFile}
          initialPage={cropperForQuestion !== null ? extractedQuestions[cropperForQuestion]?.image_page : undefined}
          onCrop={(dataUrl) => {
            if (cropperForQuestion !== null) {
              updateExtracted(cropperForQuestion, "imageUrl", dataUrl);
              setCropperForQuestion(null);
            }
          }}
        />
        <ImagePreviewDialog
          open={!!previewImageUrl}
          onOpenChange={(open) => { if (!open) setPreviewImageUrl(null); }}
          imageUrl={previewImageUrl}
          title="Prévia da imagem da questão"
        />
        <FilePreviewModal
          open={showReviewPreview}
          onOpenChange={setShowReviewPreview}
          file={uploadFile}
          mode={reviewPreviewMode}
        />
      </>
    );
  }

  // ─── MAIN VIEW ───
  return (
    <>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Banco de Questões</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="provas" className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> Provas
            </TabsTrigger>
            <TabsTrigger value="questoes" className="flex items-center gap-1.5">
              <ListChecks className="w-4 h-4" /> Questões
              {questions.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{questions.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ─── PROVAS TAB ─── */}
          <TabsContent value="provas" className="space-y-6">
            {/* Upload + Extract section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileUp className="w-5 h-5" /> Extrair Questões de Arquivo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert className="bg-amber-50 dark:bg-amber-900/10 border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                    A IA funciona melhor com PDFs digitais. PDFs escaneados, fórmulas complexas e imagens de baixa resolução podem gerar resultados imprecisos. Revise sempre o resultado.
                  </AlertDescription>
                </Alert>

                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    uploadFile ? "border-primary bg-primary/5" : "hover:border-primary/50"
                  }`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary"); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary"); }}
                  onDrop={handleDrop}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {uploadFile
                      ? `📄 ${uploadFile.name} (${(uploadFile.size / 1024 / 1024).toFixed(1)} MB)`
                      : "Arraste um PDF ou Word aqui, ou clique para selecionar"}
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>

                {uploadFile && (
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={handleExtract} disabled={extracting} className="flex-1 min-w-[140px]">
                      {extracting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Extraindo... <Clock className="w-3 h-3 ml-2" /> ⏱ {formatTime(extractionTime)}
                        </>
                      ) : (
                        <>Extrair com IA</>
                      )}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setShowManualEdit(true)}
                      disabled={extracting}
                      className="flex-1 min-w-[140px]"
                    >
                      <SplitSquareHorizontal className="w-4 h-4 mr-1" /> Editar Manualmente
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (!uploadFile) return;
                        void openFilePreview(uploadFile).catch((e: any) => {
                          toast({ title: "Erro ao visualizar", description: e.message, variant: "destructive" });
                        });
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" /> Visualizar
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setUploadFile(null)} aria-label="Remover arquivo">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Histórico de Provas */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Histórico de Provas Enviadas</h2>
              {loadingUploads ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : pdfUploads.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhuma prova enviada ainda. Faça o upload de um arquivo acima.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {pdfUploads.map((p) => (
                    <Card key={p.id}>
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{p.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(p.uploaded_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              {p.questions_extracted != null && p.questions_extracted > 0 && (
                                <span className="ml-2">• {p.questions_extracted} questão(ões)</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" onClick={() => handlePreviewUpload(p)} disabled={loadingPreview} aria-label="Visualizar arquivo">
                            {loadingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleReExtract(p)} aria-label="Reextrair questões">
                            <FileUp className="w-4 h-4 mr-1" /> Extrair
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteUpload(p)} disabled={deletingId === p.id} aria-label="Excluir prova">
                            {deletingId === p.id ? <Loader2 className="w-4 h-4 animate-spin text-destructive" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ─── QUESTÕES TAB ─── */}
          <TabsContent value="questoes" className="space-y-4">
            <QuestionBankFolderView />
          </TabsContent>
        </Tabs>
      </div>

      <QuestionForm open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setEditingQuestion(null); }} question={editingQuestion} onSaved={() => { fetchQuestions(); /* Mark as saved in extracted list if applicable */ if (editingQuestion) { const idx = extractedQuestions.findIndex(eq => eq.savedId === editingQuestion.id || (eq.text === editingQuestion.text && !eq.savedId)); if (idx >= 0) { updateExtracted(idx, "saved", true); } } }} />
      <ImageCropperModal open={showCropper} onOpenChange={setShowCropper} onSaved={fetchQuestions} />
      <FilePreviewModal
        open={previewMode !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewMode(null);
            setPreviewUploadFile(null);
            setPreviewStoragePath(null);
          }
        }}
        file={previewUploadFile}
        mode={previewMode}
        storagePath={previewStoragePath}
      />
      <ImagePreviewDialog
        open={!!previewImageUrl}
        onOpenChange={(open) => { if (!open) setPreviewImageUrl(null); }}
        imageUrl={previewImageUrl}
        title="Prévia da imagem da questão"
      />

      <AlertDialog open={!!pendingRename} onOpenChange={(open) => { if (!open) cancelRename(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Já existe uma prova com esse nome</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRename && (
                <>
                  Já existe uma prova chamada <strong>{pendingRename.originalName}</strong> no seu histórico.
                  Para não sobrescrever, vamos enviar como <strong>{pendingRename.finalName}</strong>.
                  Deseja continuar?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelRename}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRenameAndUpload}>Continuar com novo nome</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
