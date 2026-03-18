import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserSchool } from "@/hooks/useUserSchool";
import { parsePdf } from "@/lib/pdf-utils";
import { extractDocxText } from "@/lib/docx-utils";
import { detectFileType } from "@/lib/fileValidation";
import { renderMathToHtml, hasMathContent } from "@/lib/latexRenderer";
import { dataUrlToBlob } from "@/lib/extraction-utils";
import "katex/dist/katex.min.css";

const subjects = [
  "Física", "Matemática", "Química", "Biologia", "Português",
  "História", "Geografia", "Inglês", "Ciências", "Arte", "Ed. Física", "Geral",
];

type ManualQuestion = {
  text: string;
  subject: string;
  topic: string;
  options: string[];
  correct_answer: number;
  resolution: string;
  difficulty: string;
  saved: boolean;
  saving: boolean;
};

const emptyQuestion = (): ManualQuestion => ({
  text: "",
  subject: "Geral",
  topic: "",
  options: ["", "", "", "", ""],
  correct_answer: -1,
  resolution: "",
  difficulty: "medio",
  saved: false,
  saving: false,
});

function MathPreview({ text }: { text: string }) {
  const html = useMemo(() => renderMathToHtml(text), [text]);
  if (!text || !hasMathContent(text)) return null;
  return (
    <div className="mt-1 p-2 rounded border border-border/50 bg-muted/30">
      <p className="text-[10px] text-muted-foreground mb-1">Prévia matemática</p>
      <div className="text-sm leading-relaxed [&_.katex]:text-[115%]" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

type Props = {
  file: File;
  onFinish: () => void;
};

export default function ManualQuestionEditor({ file, onFinish }: Props) {
  const { user } = useAuth();
  const { schoolId } = useUserSchool();

  // Document preview state
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [docxText, setDocxText] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(0);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [fileType, setFileType] = useState<"pdf" | "docx" | null>(null);

  // Questions state
  const [questions, setQuestions] = useState<ManualQuestion[]>([emptyQuestion()]);
  const [activeQ, setActiveQ] = useState(0);
  const [savingAll, setSavingAll] = useState(false);

  // Load document
  useEffect(() => {
    (async () => {
      setLoadingDoc(true);
      try {
        const bytes = new Uint8Array(await file.slice(0, 4).arrayBuffer());
        const type = detectFileType(bytes);
        setFileType(type as "pdf" | "docx");

        if (type === "pdf") {
          const result = await parsePdf(file);
          setPageImages(result.pageImages);
        } else if (type === "docx") {
          const text = await extractDocxText(file);
          setDocxText(text);
        }
      } catch (e: any) {
        toast({ title: "Erro ao processar arquivo", description: e.message, variant: "destructive" });
      } finally {
        setLoadingDoc(false);
      }
    })();
  }, [file]);

  const updateQuestion = useCallback((index: number, field: keyof ManualQuestion, value: any) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
  }, []);

  const updateOption = useCallback((qIndex: number, optIndex: number, value: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q;
      const newOpts = [...q.options];
      newOpts[optIndex] = value;
      return { ...q, options: newOpts };
    }));
  }, []);

  const addQuestion = () => {
    setQuestions(prev => [...prev, emptyQuestion()]);
    setActiveQ(questions.length);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(prev => prev.filter((_, i) => i !== index));
    setActiveQ(prev => Math.min(prev, questions.length - 2));
  };

  const handleSaveOne = async (index: number) => {
    if (!user) return;
    const q = questions[index];
    if (!q.text.trim()) {
      toast({ title: "Enunciado vazio", variant: "destructive" });
      return;
    }

    updateQuestion(index, "saving", true);
    try {
      const hasOptions = q.options.some(o => o.trim());
      const source = fileType === "pdf" ? "pdf_extract" : "docx_extract";

      const row = {
        text: q.text,
        subject: q.subject,
        topic: q.topic || null,
        options: hasOptions ? q.options.filter(o => o.trim()) : null,
        correct_answer: hasOptions && q.correct_answer >= 0 ? q.correct_answer : null,
        resolution: q.resolution || null,
        difficulty: q.difficulty,
        source,
        source_file_name: file.name,
        created_by: user.id,
        school_id: schoolId,
      };

      const { error } = await (supabase.from as any)("question_bank").insert([row]);
      if (error) throw error;

      updateQuestion(index, "saved", true);
      updateQuestion(index, "saving", false);
      toast({ title: `Questão ${index + 1} salva!` });
    } catch (e: any) {
      updateQuestion(index, "saving", false);
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  };

  const handleSaveAll = async () => {
    const unsaved = questions.map((q, i) => ({ q, i })).filter(({ q }) => !q.saved && q.text.trim());
    if (unsaved.length === 0) {
      toast({ title: "Nenhuma questão para salvar", variant: "destructive" });
      return;
    }
    setSavingAll(true);
    for (const { i } of unsaved) {
      await handleSaveOne(i);
    }
    setSavingAll(false);
  };

  const savedCount = questions.filter(q => q.saved).length;
  const unsavedCount = questions.filter(q => !q.saved && q.text.trim()).length;
  const q = questions[activeQ];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onFinish}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Edição Manual</h1>
            <p className="text-xs text-muted-foreground">{file.name} • {questions.length} questão(ões) • {savedCount} salva(s)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onFinish}>
            {savedCount > 0 ? "Concluir" : "Cancelar"}
          </Button>
          <Button onClick={handleSaveAll} disabled={savingAll || unsavedCount === 0}>
            {savingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
            Salvar todas ({unsavedCount})
          </Button>
        </div>
      </div>

      {/* Split pane */}
      <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-lg border">
        {/* LEFT: Document Preview */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col bg-muted/30">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-background">
              <span className="text-sm font-medium text-foreground">Documento Original</span>
              {fileType === "pdf" && pageImages.length > 0 && (
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom(z => Math.max(50, z - 25))}>
                    <ZoomOut className="w-3.5 h-3.5" />
                  </Button>
                  <span className="text-xs text-muted-foreground w-10 text-center">{zoom}%</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom(z => Math.min(200, z + 25))}>
                    <ZoomIn className="w-3.5 h-3.5" />
                  </Button>
                  <span className="text-xs text-muted-foreground mx-2">|</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <span className="text-xs text-muted-foreground">{currentPage + 1}/{pageImages.length}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" disabled={currentPage >= pageImages.length - 1} onClick={() => setCurrentPage(p => p + 1)}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              {loadingDoc ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Processando documento...</span>
                </div>
              ) : fileType === "pdf" && pageImages.length > 0 ? (
                <img
                  src={pageImages[currentPage]}
                  alt={`Página ${currentPage + 1}`}
                  className="mx-auto rounded shadow-sm select-text"
                  style={{ width: `${zoom}%`, maxWidth: "none" }}
                  draggable={false}
                />
              ) : fileType === "docx" && docxText ? (
                <div className="bg-background rounded p-4 text-sm whitespace-pre-wrap leading-relaxed text-foreground select-text">
                  {docxText}
                </div>
              ) : (
                <p className="text-center text-muted-foreground">Não foi possível renderizar o documento.</p>
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* RIGHT: Question Editor */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col bg-background">
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <span className="text-sm font-medium text-foreground">Editor de Questões</span>
              <Button size="sm" variant="outline" onClick={addQuestion}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Nova questão
              </Button>
            </div>

            {/* Question tabs */}
            <div className="flex items-center gap-1 px-3 py-2 border-b overflow-x-auto">
              {questions.map((q, i) => (
                <Button
                  key={i}
                  size="sm"
                  variant={activeQ === i ? "default" : "outline"}
                  className={`shrink-0 text-xs h-7 ${q.saved ? "border-green-500" : ""}`}
                  onClick={() => setActiveQ(i)}
                >
                  Q{i + 1}
                  {q.saved && <CheckCircle2 className="w-3 h-3 ml-1 text-green-300" />}
                </Button>
              ))}
            </div>

            {/* Active question editor */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {q && (
                <>
                  {q.saved && (
                    <Badge className="bg-green-600 text-white">✓ Salva</Badge>
                  )}

                  {/* Text */}
                  <div>
                    <Label className="text-xs">Enunciado *</Label>
                    <Textarea
                      value={q.text}
                      onChange={e => updateQuestion(activeQ, "text", e.target.value)}
                      rows={4}
                      className="text-sm"
                      placeholder="Cole ou digite o enunciado da questão..."
                      disabled={q.saved}
                    />
                    <MathPreview text={q.text} />
                  </div>

                  {/* Subject + Topic */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Matéria *</Label>
                      <Select value={q.subject} onValueChange={v => updateQuestion(activeQ, "subject", v)} disabled={q.saved}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Tópico</Label>
                      <Input
                        value={q.topic}
                        onChange={e => updateQuestion(activeQ, "topic", e.target.value)}
                        className="h-8 text-sm"
                        placeholder="Ex: Cinemática"
                        disabled={q.saved}
                      />
                    </div>
                  </div>

                  {/* Options */}
                  <div>
                    <Label className="text-xs">Alternativas (deixe em branco para questão dissertativa)</Label>
                    <div className="space-y-2 mt-1">
                      {q.options.map((opt, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={q.correct_answer === j ? "default" : "outline"}
                            className="w-8 h-7 text-xs shrink-0"
                            onClick={() => !q.saved && updateQuestion(activeQ, "correct_answer", q.correct_answer === j ? -1 : j)}
                            disabled={q.saved}
                          >
                            {String.fromCharCode(65 + j)}
                          </Button>
                          <Input
                            value={opt}
                            onChange={e => updateOption(activeQ, j, e.target.value)}
                            className="h-7 text-sm"
                            placeholder={`Alternativa ${String.fromCharCode(65 + j)}`}
                            disabled={q.saved}
                          />
                        </div>
                      ))}
                    </div>
                    {q.options.some(o => o.trim()) && q.correct_answer < 0 && (
                      <p className="text-xs text-destructive mt-1">Clique na letra correta para definir o gabarito</p>
                    )}
                  </div>

                  {/* Resolution */}
                  <div>
                    <Label className="text-xs">Resolução</Label>
                    <Textarea
                      value={q.resolution}
                      onChange={e => updateQuestion(activeQ, "resolution", e.target.value)}
                      rows={2}
                      className="text-sm"
                      placeholder="Explicação da resposta..."
                      disabled={q.saved}
                    />
                  </div>

                  {/* Difficulty */}
                  <div className="w-40">
                    <Label className="text-xs">Dificuldade</Label>
                    <Select value={q.difficulty} onValueChange={v => updateQuestion(activeQ, "difficulty", v)} disabled={q.saved}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="facil">Fácil</SelectItem>
                        <SelectItem value="medio">Médio</SelectItem>
                        <SelectItem value="dificil">Difícil</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {!q.saved && (
                      <Button onClick={() => handleSaveOne(activeQ)} disabled={q.saving || !q.text.trim()}>
                        {q.saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                        Salvar questão
                      </Button>
                    )}
                    {questions.length > 1 && !q.saved && (
                      <Button variant="ghost" size="sm" onClick={() => removeQuestion(activeQ)}>
                        <Trash2 className="w-4 h-4 mr-1 text-destructive" /> Remover
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
