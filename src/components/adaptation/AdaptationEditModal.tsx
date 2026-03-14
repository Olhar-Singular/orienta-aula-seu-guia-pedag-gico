import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Upload, X, Loader2, Sparkles, ImageIcon, Plus } from "lucide-react";

const subjects = [
  "Física", "Matemática", "Química", "Biologia", "Português",
  "História", "Geografia", "Inglês", "Ciências", "Arte", "Ed. Física", "Geral",
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  content: string;
  images: string[];
  activityContext?: string;
  onSave: (content: string, images: string[]) => void;
};

export default function AdaptationEditModal({
  open,
  onOpenChange,
  title,
  content,
  images: initialImages,
  activityContext,
  onSave,
}: Props) {
  const [text, setText] = useState(content);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medio");
  const [questionType, setQuestionType] = useState<"objetiva" | "dissertativa">("dissertativa");
  const [options, setOptions] = useState<string[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [resolution, setResolution] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);

  useEffect(() => {
    if (open) {
      setText(content);
      // Try to detect subject/options from content
      const img = initialImages.length > 0 ? initialImages[0] : null;
      setImageUrl(img);
      setImagePreview(img);
      setImagePrompt("");
    }
  }, [open, content, initialImages]);

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
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const session = await supabase.auth.getSession();
        const userId = session.data.session?.user?.id;
        if (!userId) return;
        try {
          const blob = await fetch(dataUrl).then((r) => r.blob());
          const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.png`;
          const { error } = await supabase.storage.from("question-images").upload(fileName, blob, { contentType: "image/png" });
          if (error) throw error;
          const { data: urlData } = supabase.storage.from("question-images").getPublicUrl(fileName);
          setImageUrl(urlData.publicUrl);
          setImagePreview(urlData.publicUrl);
          toast({ title: "Imagem adicionada!" });
        } catch (e: any) {
          toast({ title: "Erro ao fazer upload", description: e.message, variant: "destructive" });
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const generateImage = async () => {
    if (!imagePrompt.trim()) {
      toast({ title: "Descreva a imagem que deseja gerar.", variant: "destructive" });
      return;
    }
    setGeneratingImage(true);
    try {
      const session = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-question-image`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: imagePrompt, context: activityContext || "" }),
        }
      );
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Falha na geração da imagem");
      }
      const result = await resp.json();
      setImageUrl(result.image_url);
      setImagePreview(result.image_url);
      setImagePrompt("");
      toast({ title: "Imagem gerada com sucesso!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSave = () => {
    const allImages = imageUrl ? [imageUrl] : [];
    onSave(text, allImages);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar: {title}</DialogTitle>
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
          </div>

          {/* Image */}
          <div>
            <Label>Imagem (opcional)</Label>
            {imagePreview ? (
              <div className="mt-1">
                <img src={imagePreview} alt="Imagem da questão" className="max-h-48 rounded border border-border" />
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

          {/* AI Image Generator */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Gerar imagem com IA
            </Label>
            <div className="flex gap-2">
              <Input
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Ex: Gráfico de onda senoidal com amplitude 10cm"
                className="text-sm"
                maxLength={500}
                onKeyDown={(e) => e.key === "Enter" && !generatingImage && generateImage()}
              />
              <Button size="sm" onClick={generateImage} disabled={generatingImage || !imagePrompt.trim()} className="shrink-0">
                {generatingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ImageIcon className="w-4 h-4 mr-1" /> Gerar</>}
              </Button>
            </div>
          </div>

          {/* Subject / Topic / Difficulty */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Matéria</Label>
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
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex: Termometria" />
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

          {/* Question type toggle */}
          <div>
            <Label>Tipo de Questão</Label>
            <Select value={questionType} onValueChange={(v) => setQuestionType(v as "objetiva" | "dissertativa")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dissertativa">Dissertativa</SelectItem>
                <SelectItem value="objetiva">Objetiva (múltipla escolha)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options (only for objetiva) */}
          {questionType === "objetiva" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Alternativas</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => setOptions([...options, ""])}>
                  <Plus className="w-3 h-3 mr-1" /> Adicionar
                </Button>
              </div>
              {options.length === 0 && (
                <p className="text-xs text-muted-foreground">Clique em "Adicionar" para criar alternativas.</p>
              )}
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const n = [...options];
                      n[i] = e.target.value;
                      setOptions(n);
                    }}
                    placeholder={`Alternativa ${String.fromCharCode(65 + i)}`}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant={correctAnswer === i ? "default" : "outline"}
                    onClick={() => setCorrectAnswer(correctAnswer === i ? null : i)}
                    className="shrink-0"
                  >
                    {correctAnswer === i ? "✓" : String.fromCharCode(65 + i)}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setOptions(options.filter((_, j) => j !== i));
                      if (correctAnswer === i) setCorrectAnswer(null);
                      else if (correctAnswer !== null && correctAnswer > i)
                        setCorrectAnswer(correctAnswer - 1);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

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

          <Button onClick={handleSave} className="w-full">
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
