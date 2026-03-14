import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Sparkles, ImageIcon } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";

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
  const [html, setHtml] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    if (open) {
      // Build initial HTML: convert plain text to basic HTML if needed,
      // and append any section images at the end
      let initialHtml = content;

      // If content looks like plain text (no HTML tags), convert line breaks to paragraphs
      if (!/<[a-z][\s\S]*>/i.test(content)) {
        initialHtml = content
          .split("\n")
          .filter((line) => line.trim())
          .map((line) => `<p>${line}</p>`)
          .join("");
      }

      // Append existing images that aren't already in the HTML
      if (initialImages.length > 0) {
        const existingInHtml = initialImages.filter((url) => initialHtml.includes(url));
        const missingImages = initialImages.filter((url) => !initialHtml.includes(url));
        missingImages.forEach((url) => {
          initialHtml += `<img src="${url}" />`;
        });
      }

      setHtml(initialHtml);
      setImagePrompt("");
      setEditorKey((k) => k + 1);
    }
  }, [open, content, initialImages]);

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
      // Append generated image to the editor content
      setHtml((prev) => prev + `<img src="${result.image_url}" />`);
      setEditorKey((k) => k + 1);
      setImagePrompt("");
      toast({ title: "Imagem gerada com sucesso!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSave = () => {
    // Extract image URLs from the HTML content
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
    const extractedImages: string[] = [];
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      extractedImages.push(match[1]);
    }

    onSave(html, extractedImages);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar: {title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Rich Text Editor with inline images */}
          <div>
            <Label>Conteúdo</Label>
            <div className="mt-1">
              <RichTextEditor
                key={editorKey}
                content={html}
                onChange={setHtml}
                placeholder="Edite o conteúdo da adaptação..."
              />
            </div>
          </div>

          {/* AI Image Generator */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Gerar imagem com IA e inserir no conteúdo
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

          <p className="text-xs text-muted-foreground">
            Use a barra de ferramentas para formatar texto, inserir imagens do computador ou colar prints (Ctrl+V). 
            Clique em uma imagem e use o botão 🗑️ para removê-la.
          </p>

          <Button onClick={handleSave} className="w-full">
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
