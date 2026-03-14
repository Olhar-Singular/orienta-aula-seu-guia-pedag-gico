import { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Upload, X, Loader2, Sparkles, ImageIcon } from "lucide-react";

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
  const [images, setImages] = useState<string[]>(initialImages);
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);

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
          setImages((prev) => [...prev, urlData.publicUrl]);
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
      setImages((prev) => [...prev, result.image_url]);
      setImagePrompt("");
      toast({ title: "Imagem gerada com sucesso!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSave = () => {
    onSave(text, images);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar: {title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Content */}
          <div>
            <Label>Conteúdo</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              placeholder="Edite o conteúdo da adaptação..."
            />
          </div>

          {/* Images */}
          <div>
            <Label>Imagens</Label>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {images.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt={`Imagem ${i + 1}`} className="max-h-32 rounded border border-border object-contain" />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <Button type="button" size="sm" variant="outline" onClick={handleImageUpload}>
                <Upload className="w-3 h-3 mr-1" /> Upload Imagem
              </Button>
            </div>
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

          <Button onClick={handleSave} className="w-full">
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
