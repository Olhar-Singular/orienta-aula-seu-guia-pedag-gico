import { useState, useEffect, useRef, useCallback } from "react";
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
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import QuestionForm from "@/components/QuestionForm";
import ImageCropperModal from "@/components/ImageCropperModal";
import PdfPreviewModal from "@/components/PdfPreviewModal";
import ImagePreviewDialog from "@/components/ImagePreviewDialog";
import { detectFileType } from "@/lib/fileValidation";
import { parsePdf, type PdfParseResult } from "@/lib/pdf-utils";
import { extractDocxText } from "@/lib/docx-utils";
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
};

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

export default function QuestionBank() {
  const { user } = useAuth();
  const { schoolId } = useUserSchool();

  const [activeTab, setActiveTab] = useState("provas");

  // Main list state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // PDF uploads history
  const [pdfUploads, setPdfUploads] = useState<PdfUpload[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(true);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
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
  const [previewDocxHtml, setPreviewDocxHtml] = useState<string>("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Fetch existing questions ───
  const fetchQuestions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = (supabase.from as any)("question_bank")
      .select("*")
      .order("created_at", { ascending: false });

    if (filterSubject !== "all") query = query.eq("subject", filterSubject);
    if (filterDifficulty !== "all") query = query.eq("difficulty", filterDifficulty);
    if (filterSource !== "all") query = query.eq("source", filterSource);

    const { data, error } = await query;
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else setQuestions(data || []);
    setLoading(false);
  }, [user, filterSubject, filterDifficulty, filterSource]);

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

  useEffect(() => { fetchQuestions(); fetchUploads(); }, [fetchQuestions, fetchUploads]);

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

    // Check for duplicate exam name
    const existingExam = pdfUploads.find((u) => u.file_name === file.name);
    if (existingExam) {
      toast({ title: "Prova já enviada", description: `O arquivo "${file.name}" já foi enviado anteriormente. Use a opção de reextrair no histórico.`, variant: "destructive" });
      return;
    }

    setUploadFile(file);

    // Upload to storage + register in history immediately
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
        pdfText = await extractDocxText(uploadFile);
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

      const { error } = await (supabase.from as any)("question_bank").insert([row]);
      if (error) throw error;

      updateExtracted(index, "saved", true);
      updateExtracted(index, "saving", false);
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

      if (isDocx) {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.default.convertToHtml({ arrayBuffer });
        setPreviewDocxHtml(result.value);
        setPreviewMode("docx");
      } else {
        setPreviewUploadFile(file);
        setPreviewMode("pdf");
      }
    } catch (e: any) {
      toast({ title: "Erro ao visualizar", description: e.message, variant: "destructive" });
    } finally {
      setLoadingPreview(false);
    }
  };

  const updateExtracted = (i: number, field: keyof ExtractedQuestion, value: any) => {
    setExtractedQuestions((prev) => prev.map((q, idx) => idx === i ? { ...q, [field]: value } : q));
  };

  const filteredQuestions = questions.filter((q) => {
    if (searchQuery) {
      const norm = searchQuery.toLowerCase();
      return q.text.toLowerCase().includes(norm) || q.subject.toLowerCase().includes(norm);
    }
    return true;
  });

  const selectedCount = extractedQuestions.filter((q) => q.selected && !q.saved).length;
  const savedCount = extractedQuestions.filter((q) => q.saved).length;

  const handleFinishReview = () => {
    setShowReview(false);
    setExtractedQuestions([]);
    if (savedCount > 0) {
      setActiveTab("questoes");
    }
  };

  // ─── REVIEW MODE ───
  if (showReview) {
    return (
      <>
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-2xl font-bold text-foreground">Revisão de Questões Extraídas</h1>
            <div className="flex gap-2">
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
                            <Pencil className="w-3 h-3 mr-1" /> Editar
                          </Button>
                        )}
                        {q.saved && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateExtracted(i, "saved", false)}
                          >
                            <Pencil className="w-3 h-3 mr-1" /> Editar
                          </Button>
                        )}
                      </div>

                      {/* Enunciado */}
                      <div>
                        <Label className="text-xs">Enunciado</Label>
                        <Textarea
                          value={q.text}
                          onChange={(e) => updateExtracted(i, "text", e.target.value)}
                          rows={3}
                          className="text-sm"
                          disabled={q.saved || q.isDuplicate}
                        />
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
                          <div className="flex gap-1 flex-wrap">
                            {!q.saved && !q.isDuplicate && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => updateExtracted(i, "imageUrl", undefined)}>
                                  <X className="w-3 h-3 mr-1" /> Remover imagem
                                </Button>
                                {uploadFile && uploadFile.name.toLowerCase().endsWith(".pdf") && (
                                  <Button size="sm" variant="outline" onClick={() => setCropperForQuestion(i)}>
                                    <Crop className="w-3 h-3 mr-1" /> Trocar recorte
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ) : !q.saved && !q.isDuplicate && (
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
                          <Select value={q.subject} onValueChange={(v) => updateExtracted(i, "subject", v)} disabled={q.saved}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Tópico</Label>
                          <Input
                            value={q.topic || ""}
                            onChange={(e) => updateExtracted(i, "topic", e.target.value)}
                            className="h-8 text-sm"
                            disabled={q.saved}
                          />
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
                                  onClick={() => !q.saved && updateExtracted(i, "correct_answer", q.correct_answer === j ? -1 : j)}
                                  disabled={q.saved}
                                >
                                  {String.fromCharCode(65 + j)}
                                </Button>
                                <span className={`text-sm ${q.correct_answer === j ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                                  {opt}
                                </span>
                              </div>
                            ))}
                          </div>
                          {!q.saved && (q.correct_answer == null || q.correct_answer === -1) && q.options.length > 0 && (
                            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Sem gabarito definido — clique na letra correta
                            </p>
                          )}
                        </div>
                      )}

                      {/* Resolution */}
                      <div>
                        <Label className="text-xs">Resolução</Label>
                        <Textarea
                          value={q.resolution || ""}
                          onChange={(e) => updateExtracted(i, "resolution", e.target.value)}
                          rows={2}
                          className="text-sm"
                          placeholder="Explicação da resposta..."
                          disabled={q.saved}
                        />
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
                  <div className="flex gap-2">
                    <Button onClick={handleExtract} disabled={extracting} className="flex-1">
                      {extracting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Extraindo... <Clock className="w-3 h-3 ml-2" /> ⏱ {formatTime(extractionTime)}
                        </>
                      ) : (
                        <>Extrair com IA</>
                      )}
                    </Button>
                    {uploadFile.name.toLowerCase().endsWith(".pdf") && (
                      <Button variant="outline" onClick={() => setShowPdfPreview(true)}>
                        <Eye className="w-4 h-4 mr-1" /> Visualizar
                      </Button>
                    )}
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
            <div className="flex justify-end">
              <Button onClick={() => { setEditingQuestion(null); setShowForm(true); }} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Adicionar Questão
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar questão..."
                  className="pl-9"
                />
              </div>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Matéria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Dificuldade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {difficulties.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Fonte" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="pdf_extract">PDF</SelectItem>
                  <SelectItem value="docx_extract">Word</SelectItem>
                  <SelectItem value="image_crop">Imagem</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Question list */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredQuestions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {searchQuery ? "Nenhuma questão encontrada para esta busca." : "Nenhuma questão encontrada. Envie uma prova na aba Provas ou adicione manualmente!"}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredQuestions.map((q) => (
                  <Card key={q.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground line-clamp-3">{q.text}</p>
                          {q.image_url && (
                            <div
                              className="mt-2 relative inline-block cursor-zoom-in group"
                              onClick={() => setPreviewImageUrl(q.image_url)}
                            >
                              <img src={q.image_url} alt="Imagem da questão" className="max-h-32 rounded border" loading="lazy" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors rounded">
                                <Search className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                              </div>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="secondary">{q.subject}</Badge>
                            {q.topic && <Badge variant="outline">{q.topic}</Badge>}
                            <Badge variant="outline">
                              {difficulties.find((d) => d.value === q.difficulty)?.label || q.difficulty}
                            </Badge>
                            {q.source && (
                              <Badge variant="outline" className="text-xs">
                                {sourceLabels[q.source] || q.source}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" onClick={() => { setEditingQuestion(q); setShowForm(true); }} aria-label="Editar questão">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(q.id)} disabled={deletingId === q.id} aria-label="Excluir questão">
                            {deletingId === q.id ? <Loader2 className="w-4 h-4 animate-spin text-destructive" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      {q.options && Array.isArray(q.options) && (
                        <div className="mt-3 space-y-1">
                          {(q.options as string[]).map((opt, i) => (
                            <p key={i} className={`text-sm pl-2 ${i === q.correct_answer ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                              {String.fromCharCode(65 + i)}) {opt}
                            </p>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <QuestionForm open={showForm} onOpenChange={setShowForm} question={editingQuestion} onSaved={fetchQuestions} />
      <ImageCropperModal open={showCropper} onOpenChange={setShowCropper} onSaved={fetchQuestions} />
      <PdfPreviewModal open={showPdfPreview} onOpenChange={setShowPdfPreview} file={uploadFile} />
      <ImagePreviewDialog
        open={!!previewImageUrl}
        onOpenChange={(open) => { if (!open) setPreviewImageUrl(null); }}
        imageUrl={previewImageUrl}
        title="Prévia da imagem da questão"
      />
    </>
  );
}
