import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserSchool } from "@/hooks/useUserSchool";
import { toast } from "@/hooks/use-toast";
import { X, Upload, Loader2 } from "lucide-react";
import { dataUrlToBlob } from "@/lib/extraction-utils";
import ImagePreviewDialog from "@/components/ImagePreviewDialog";
import GradeSelect from "@/components/question-bank/GradeSelect";
import { renderMathToHtml, hasMathContent } from "@/lib/latexRenderer";
import "katex/dist/katex.min.css";
import TypedQuestionEditor from "@/components/question-bank/TypedQuestionEditor";
import {
  inferLegacyType,
  parsePayload,
  serializePayloadForDb,
  emptyPayloadFor,
  type BankQuestionType,
  type QuestionPayload,
} from "@/lib/questionType";

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

const subjects = [
  "Física", "Matemática", "Química", "Biologia", "Português",
  "História", "Geografia", "Inglês", "Ciências", "Arte", "Ed. Física", "Geral",
];

type QuestionFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: any | null;
  onSaved: () => void;
  defaultGrade?: string | null;
  defaultSubject?: string | null;
};

export default function QuestionForm({
  open,
  onOpenChange,
  question,
  onSaved,
  defaultGrade = null,
  defaultSubject = null,
}: QuestionFormProps) {
  const { user } = useAuth();
  const { schoolId } = useUserSchool();
  const [text, setText] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medio");
  const [bankType, setBankType] = useState<BankQuestionType>("open_ended");
  const [options, setOptions] = useState<string[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [payload, setPayload] = useState<QuestionPayload | null>(null);
  const [resolution, setResolution] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (question) {
      setText(question.text || "");
      setSubject(question.subject || "");
      setGrade(question.grade ?? null);
      setTopic(question.topic || "");
      setDifficulty(question.difficulty || "medio");
      setResolution(question.resolution || "");
      setImageUrl(question.image_url || null);
      setImagePreview(question.image_url || null);

      const resolvedType = inferLegacyType({
        type: question.type ?? null,
        options: question.options,
      });
      setBankType(resolvedType);

      const hasOptions = Array.isArray(question.options) && question.options.length > 0;
      setOptions(hasOptions ? question.options : []);
      setCorrectAnswer(question.correct_answer ?? null);

      if (resolvedType === "multiple_choice" || resolvedType === "open_ended") {
        setPayload(null);
      } else {
        setPayload(parsePayload(resolvedType, question.payload ?? null));
      }
    } else {
      setText("");
      setSubject(defaultSubject || "");
      setGrade(defaultGrade);
      setTopic("");
      setDifficulty("medio");
      setBankType("open_ended");
      setOptions([]);
      setCorrectAnswer(null);
      setPayload(null);
      setResolution("");
      setImageUrl(null);
      setImagePreview(null);
    }
  }, [question, open]);

  const handleImageUpload = () => {
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
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setImagePreview(dataUrl);
        setImageUrl(dataUrl); // will be uploaded on save
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleSave = async () => {
    if (!text.trim() || !subject) {
      toast({ title: "Preencha o enunciado e a matéria.", variant: "destructive" });
      return;
    }
    setSaving(true);

    try {
      // Upload new image if it's a data URL
      let finalImageUrl = imageUrl;
      if (finalImageUrl && finalImageUrl.startsWith("data:")) {
        const blob = dataUrlToBlob(finalImageUrl);
        const fileName = `${user!.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.png`;
        const { error: upErr } = await supabase.storage
          .from("question-images")
          .upload(fileName, blob, { contentType: "image/png" });
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from("question-images").getPublicUrl(fileName);
          finalImageUrl = publicUrl;
        } else {
          finalImageUrl = null;
        }
      }

      const isMultipleChoice = bankType === "multiple_choice";
      const row: any = {
        text: text.trim(),
        subject,
        grade: grade || null,
        topic: topic || null,
        difficulty,
        options: isMultipleChoice && options.length > 0 ? options : null,
        correct_answer: isMultipleChoice ? correctAnswer : null,
        resolution: resolution || null,
        image_url: finalImageUrl,
        source: "manual",
        type: bankType,
        payload: serializePayloadForDb(payload),
      };

      let error;
      if (question?.id) {
        ({ error } = await (supabase.from as any)("question_bank")
          .update(row)
          .eq("id", question.id));
      } else {
        row.created_by = user!.id;
        row.school_id = schoolId;
        ({ error } = await (supabase.from as any)("question_bank").insert(row));
      }

      if (error) throw error;
      toast({ title: question ? "Questão atualizada!" : "Questão adicionada!" });
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {question ? "Editar Questão" : "Adicionar Questão"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Enunciado */}
          <div>
            <Label>Enunciado *</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Digite o enunciado da questão..."
            />
            <MathPreview text={text} />
          </div>

          {/* Image */}
          <div>
            <Label>Imagem (opcional)</Label>
            {imagePreview ? (
              <div className="mt-1">
                <img
                  src={imagePreview}
                  alt="Imagem da questão"
                  className="max-h-48 rounded border cursor-zoom-in hover:opacity-90 transition-opacity"
                  onClick={() => setPreviewOpen(true)}
                />
                <div className="flex gap-1 mt-1">
                  <Button type="button" size="sm" variant="outline" onClick={() => { setImageUrl(null); setImagePreview(null); }}>
                    <X className="w-3 h-3 mr-1" /> Remover
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={handleImageUpload}>
                    <Upload className="w-3 h-3 mr-1" /> Trocar
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" size="sm" variant="outline" className="mt-1" onClick={handleImageUpload}>
                <Upload className="w-3 h-3 mr-1" /> Upload Imagem
              </Button>
            )}
          </div>

          {/* Série */}
          <GradeSelect value={grade} onChange={setGrade} />

          {/* Subject / Topic / Difficulty */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Matéria *</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tópico</Label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex: Frações" />
            </div>
            <div>
              <Label>Dificuldade</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="facil">Fácil</SelectItem>
                  <SelectItem value="medio">Médio</SelectItem>
                  <SelectItem value="dificil">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Type + body (alternativas, V/F, lacunas, matching, ordering, table) */}
          <TypedQuestionEditor
            state={{
              type: bankType,
              options,
              correct_answer: correctAnswer,
              payload,
            }}
            editing
            onChange={(patch) => {
              if (patch.type !== undefined) setBankType(patch.type);
              if (patch.options !== undefined) setOptions(patch.options ?? []);
              if (patch.correct_answer !== undefined) {
                setCorrectAnswer(patch.correct_answer ?? null);
              }
              if (patch.payload !== undefined) setPayload(patch.payload ?? null);
              // Inicializa payload vazio ao trocar pra tipo que precisa de payload
              if (
                patch.type !== undefined &&
                patch.type !== "multiple_choice" &&
                patch.type !== "open_ended" &&
                patch.payload === undefined
              ) {
                setPayload(emptyPayloadFor(patch.type));
              }
            }}
          />

          {/* Resolution */}
          <div>
            <Label>Resolução (opcional)</Label>
            <Textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={2}
              placeholder="Explicação da resposta..."
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : question ? "Atualizar" : "Adicionar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    <ImagePreviewDialog
      open={previewOpen}
      onOpenChange={setPreviewOpen}
      imageUrl={imagePreview || ""}
    />
    </>
  );
}
