import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, ScanText } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onImageCropped?: (imageUrl: string) => void;
};

export default function ImageCropperModal({
  open,
  onOpenChange,
  onSaved,
  onImageCropped,
}: Props) {
  const { user } = useAuth();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  });
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Selecione uma imagem", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const getCroppedBlob = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const img = imgRef.current;
      if (!img || !crop.width || !crop.height) {
        resolve(null);
        return;
      }
      const canvas = document.createElement("canvas");
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;
      const px = (crop.unit === "%" ? (crop.x / 100) * img.width : crop.x) * scaleX;
      const py = (crop.unit === "%" ? (crop.y / 100) * img.height : crop.y) * scaleY;
      const pw = (crop.unit === "%" ? (crop.width / 100) * img.width : crop.width) * scaleX;
      const ph = (crop.unit === "%" ? (crop.height / 100) * img.height : crop.height) * scaleY;

      canvas.width = pw;
      canvas.height = ph;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, px, py, pw, ph, 0, 0, pw, ph);
      canvas.toBlob(resolve, "image/png");
    });
  }, [crop]);

  const uploadBlob = async (blob: Blob) => {
    const fileName = `${user!.id}/${Date.now()}.png`;
    const { error } = await supabase.storage
      .from("question-images")
      .upload(fileName, blob, { contentType: "image/png" });
    if (error) throw error;
    const {
      data: { publicUrl },
    } = supabase.storage.from("question-images").getPublicUrl(fileName);
    return publicUrl;
  };

  const handleUploadCrop = async () => {
    if (!user) return;
    setUploading(true);
    try {
      const blob = await getCroppedBlob();
      if (!blob) throw new Error("Falha ao recortar imagem.");
      const publicUrl = await uploadBlob(blob);
      toast({ title: "Imagem salva!" });
      onImageCropped?.(publicUrl);
      onOpenChange(false);
      setImageSrc(null);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleOcr = async () => {
    if (!user) return;
    setExtracting(true);
    try {
      const blob = await getCroppedBlob();
      if (!blob) throw new Error("Falha ao recortar imagem.");

      const formData = new FormData();
      formData.append("file", blob, "crop.png");

      const session = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-questions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
          body: formData,
        }
      );

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Falha no OCR");
      }

      const data = await resp.json();
      const questions = data.questions || [];

      if (questions.length > 0) {
        const publicUrl = await uploadBlob(blob);
        const rows = questions.map((q: any) => ({
          text: q.text,
          subject: q.subject || "Geral",
          topic: q.topic || null,
          options: q.options || null,
          correct_answer: q.correct_answer ?? null,
          difficulty: "medio",
          source: "image_crop",
          image_url: publicUrl,
          created_by: user.id,
        }));

        const { error } = await (supabase.from as any)("question_bank").insert(rows);
        if (error) throw error;
        toast({
          title: `${questions.length} questão(ões) extraída(s) e salva(s)!`,
        });
        onSaved();
      } else {
        toast({
          title: "Nenhuma questão identificada na imagem.",
          variant: "destructive",
        });
      }
      onOpenChange(false);
      setImageSrc(null);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) setImageSrc(null);
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Recortar Imagem de Questão</DialogTitle>
        </DialogHeader>

        {!imageSrc ? (
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Clique para selecionar uma imagem (foto de prova, diagrama...)
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="max-h-[50vh] overflow-auto">
              <ReactCrop crop={crop} onChange={(c) => setCrop(c)}>
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Preview"
                  className="max-w-full"
                />
              </ReactCrop>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleUploadCrop}
                disabled={uploading || extracting}
                className="flex-1"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-1" />
                )}
                Salvar Recorte
              </Button>
              <Button
                onClick={handleOcr}
                disabled={extracting || uploading}
                variant="outline"
                className="flex-1"
              >
                {extracting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ScanText className="w-4 h-4 mr-1" />
                )}
                Extrair Texto (OCR)
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
