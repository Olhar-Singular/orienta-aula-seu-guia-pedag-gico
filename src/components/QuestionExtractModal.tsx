import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { detectFileType } from "@/lib/fileValidation";
import { parsePdf } from "@/lib/pdf-utils";
import { extractDocxText } from "@/lib/docx-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { detectFileType } from "@/lib/fileValidation";
import {
  validateExtractedQuestions,
  type ExtractedQuestion,
} from "@/lib/questionParser";
import { FileUp, Loader2, Check, X } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export default function QuestionExtractModal({
  open,
  onOpenChange,
  onSaved,
}: Props) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [sourceFileName, setSourceFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"upload" | "preview">("upload");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const bytes = new Uint8Array(await f.slice(0, 4).arrayBuffer());
    const type = detectFileType(bytes);
    if (type !== "pdf" && type !== "docx") {
      toast({
        title: "Arquivo inválido",
        description: "Apenas PDF e DOCX são suportados.",
        variant: "destructive",
      });
      return;
    }
    setFile(f);
  };

  const handleExtract = async () => {
    if (!file) return;
    setExtracting(true);
    try {
      // Parse file client-side first
      const bytes = new Uint8Array(await file.slice(0, 4).arrayBuffer());
      const type = detectFileType(bytes);
      let pdfText = "";
      let pageImages: string[] = [];

      if (type === "pdf") {
        const result = await parsePdf(file);
        pdfText = result.text;
        pageImages = result.pageImages;
      } else if (type === "docx") {
        pdfText = await extractDocxText(file);
      }

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
          body: JSON.stringify({ pdfText, pdfFileName: file.name, pageImages }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Falha na extração");
      }

      const data = await resp.json();
      const validated = validateExtractedQuestions(data.questions);
      setQuestions(validated);
      setSourceFileName(data.source_file_name || file.name);
      setStep("preview");

      if (validated.length === 0) {
        toast({
          title: "Nenhuma questão encontrada",
          description: "O documento não contém questões identificáveis.",
          variant: "destructive",
        });
      } else {
        toast({ title: `${validated.length} questão(ões) encontrada(s)!` });
      }
    } catch (e: any) {
      toast({
        title: "Erro na extração",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleSaveAll = async () => {
    if (!user || questions.length === 0) return;
    setSaving(true);
    const sourceType = file?.name.toLowerCase().endsWith(".pdf")
      ? "pdf_extract"
      : "docx_extract";
    const rows = questions.map((q) => ({
      text: q.text,
      subject: q.subject,
      topic: q.topic || null,
      options: q.options || null,
      correct_answer: q.correct_answer ?? null,
      difficulty: "medio",
      source: sourceType,
      source_file_name: sourceFileName,
      created_by: user.id,
    }));

    const { error } = await (supabase.from as any)("question_bank").insert(rows);
    setSaving(false);
    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: `${questions.length} questão(ões) salva(s)!` });
    resetState();
    onOpenChange(false);
    onSaved();
  };

  const removeQuestion = (index: number) =>
    setQuestions(questions.filter((_, i) => i !== index));

  const updateQuestion = (
    index: number,
    field: keyof ExtractedQuestion,
    value: any
  ) =>
    setQuestions(
      questions.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );

  const resetState = () => {
    setStep("upload");
    setFile(null);
    setQuestions([]);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetState();
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Extrair Questões de Arquivo</DialogTitle>
        </DialogHeader>

        {step === "upload" ? (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) {
                  const dt = new DataTransfer();
                  dt.items.add(f);
                  if (fileRef.current) {
                    fileRef.current.files = dt.files;
                    handleFileChange({ target: fileRef.current } as any);
                  }
                }
              }}
            >
              <FileUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {file
                  ? file.name
                  : "Arraste um arquivo PDF ou Word aqui, ou clique para selecionar"}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <Button
              onClick={handleExtract}
              disabled={!file || extracting}
              className="w-full"
            >
              {extracting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Extraindo...
                </>
              ) : (
                "Extrair Questões"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {questions.length} questão(ões) extraída(s) de {sourceFileName}
            </p>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {questions.map((q, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="secondary" className="text-xs">
                      {i + 1}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeQuestion(i)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  <Textarea
                    value={q.text}
                    onChange={(e) => updateQuestion(i, "text", e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Input
                      value={q.subject}
                      onChange={(e) =>
                        updateQuestion(i, "subject", e.target.value)
                      }
                      placeholder="Matéria"
                      className="text-sm"
                    />
                    <Input
                      value={q.topic || ""}
                      onChange={(e) =>
                        updateQuestion(i, "topic", e.target.value)
                      }
                      placeholder="Tópico"
                      className="text-sm"
                    />
                  </div>
                  {q.options && q.options.length > 0 && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      {q.options.map((opt, j) => (
                        <p
                          key={j}
                          className={
                            j === q.correct_answer
                              ? "font-semibold text-primary"
                              : ""
                          }
                        >
                          {String.fromCharCode(65 + j)}) {opt}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("upload")}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                onClick={handleSaveAll}
                disabled={saving || questions.length === 0}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" /> Salvar{" "}
                    {questions.length} questão(ões)
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
