import { useEffect, useRef, useState } from "react";
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
import {
  Upload,
  X,
  Loader2,
  Sparkles,
  ImageIcon,
  Plus,
  Scissors,
} from "lucide-react";

const subjects = [
  "Física",
  "Matemática",
  "Química",
  "Biologia",
  "Português",
  "História",
  "Geografia",
  "Inglês",
  "Ciências",
  "Arte",
  "Ed. Física",
  "Geral",
];

type CropAspect = "free" | "1:1" | "4:3" | "16:9";

const CROP_ASPECTS: Record<Exclude<CropAspect, "free">, number> = {
  "1:1": 1,
  "4:3": 4 / 3,
  "16:9": 16 / 9,
};

export type AdaptationQuestionEditPayload = {
  text: string;
  images: string[];
  questionType: "objetiva" | "dissertativa";
  options: string[];
  correctAnswer: number | null;
  subject: string;
  topic: string;
  difficulty: string;
  resolution: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  content: string;
  images: string[];
  initialOptions?: string[];
  activityContext?: string;
  onSave: (payload: AdaptationQuestionEditPayload) => void;
};

export default function AdaptationEditModal({
  open,
  onOpenChange,
  title,
  content,
  images: initialImages,
  initialOptions,
  activityContext,
  onSave,
}: Props) {
  const [text, setText] = useState(content);
  const [subject, setSubject] = useState("Geral");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medio");
  const [questionType, setQuestionType] = useState<"objetiva" | "dissertativa">("dissertativa");
  const [options, setOptions] = useState<string[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [resolution, setResolution] = useState("");
  const [questionImages, setQuestionImages] = useState<string[]>([]);
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageIndex, setCropImageIndex] = useState<number | null>(null);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropLoading, setCropLoading] = useState(false);
  const [applyingCrop, setApplyingCrop] = useState(false);
  const [cropAspect, setCropAspect] = useState<CropAspect>("free");
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const cropImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!open) return;

    setText(content);
    setQuestionImages(initialImages || []);

    const parsedOptions = (initialOptions || []).filter((option) => option.trim() !== "");
    setOptions(parsedOptions);
    setQuestionType(parsedOptions.length > 0 ? "objetiva" : "dissertativa");
    setCorrectAnswer(null);

    setImagePrompt("");
    setResolution("");
    setTopic("");
    setSubject("Geral");
    setDifficulty("medio");

    setCropOpen(false);
    setCropSource(null);
    setCropImageIndex(null);
    setCropStart(null);
    setCropEnd(null);
    setCropAspect("free");
  }, [open, content, initialImages, initialOptions]);

  const uploadBlobToStorage = async (blob: Blob, extension = "png") => {
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user?.id;

    if (!userId) {
      throw new Error("Faça login novamente para enviar imagens.");
    }

    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${extension}`;
    const { error } = await supabase.storage
      .from("question-images")
      .upload(fileName, blob, { contentType: `image/${extension}` });

    if (error) throw error;

    const { data: urlData } = supabase.storage.from("question-images").getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const uploadFileToStorage = async (file: File) => {
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user?.id;

    if (!userId) {
      throw new Error("Faça login novamente para enviar imagens.");
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${extension}`;

    const { error } = await supabase.storage
      .from("question-images")
      .upload(fileName, file, { contentType: file.type || "image/png" });

    if (error) throw error;

    const { data: urlData } = supabase.storage.from("question-images").getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const handleImageUpload = (replaceIndex?: number) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp,image/gif";
    input.onchange = async (ev) => {
      const file = (ev.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Imagem muito grande",
          description: "Máximo 5 MB.",
          variant: "destructive",
        });
        return;
      }

      setUploadingImage(true);
      try {
        const publicUrl = await uploadFileToStorage(file);

        setQuestionImages((prev) => {
          if (typeof replaceIndex === "number") {
            return prev.map((image, index) => (index === replaceIndex ? publicUrl : image));
          }
          return [...prev, publicUrl];
        });

        toast({ title: "Imagem adicionada!" });
      } catch (e: any) {
        toast({
          title: "Erro ao fazer upload",
          description: e.message,
          variant: "destructive",
        });
      } finally {
        setUploadingImage(false);
      }
    };
    input.click();
  };

  const generateImage = async () => {
    if (!imagePrompt.trim()) {
      toast({
        title: "Descreva a imagem que deseja gerar.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingImage(true);
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      if (!accessToken) throw new Error("Sessão inválida. Faça login novamente.");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-question-image`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: imagePrompt,
            context: activityContext || "",
          }),
        }
      );

      if (!response.ok) {
        const errorPayload = await response.json();
        throw new Error(errorPayload.error || "Falha na geração da imagem");
      }

      const result = await response.json();
      if (!result.image_url) throw new Error("Não foi possível gerar a imagem.");

      setQuestionImages((prev) => [...prev, result.image_url]);
      setImagePrompt("");
      toast({ title: "Imagem gerada com sucesso!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingImage(false);
    }
  };

  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Falha ao carregar imagem."));
      reader.readAsDataURL(blob);
    });

  const handleOpenCrop = async (index: number) => {
    const imageUrl = questionImages[index];
    if (!imageUrl) return;

    setCropOpen(true);
    setCropImageIndex(index);
    setCropAspect("free");
    setCropStart(null);
    setCropEnd(null);
    setCropLoading(true);

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const dataUrl = await blobToDataUrl(blob);
      setCropSource(dataUrl);
    } catch {
      setCropSource(imageUrl);
    } finally {
      setCropLoading(false);
    }
  };

  const getRelativeCoords = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  };

  const constrainToAspect = (
    start: { x: number; y: number },
    current: { x: number; y: number },
    aspect: number
  ) => {
    const dx = current.x - start.x;
    const dy = current.y - start.y;

    const signX = dx >= 0 ? 1 : -1;
    const signY = dy >= 0 ? 1 : -1;

    let width = Math.abs(dx);
    let height = Math.abs(dy);

    if (height === 0) {
      height = width / aspect;
    }

    if (width / height > aspect) {
      height = width / aspect;
    } else {
      width = height * aspect;
    }

    const maxWidth = signX > 0 ? 1 - start.x : start.x;
    const maxHeight = signY > 0 ? 1 - start.y : start.y;

    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspect;
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspect;
    }

    return {
      x: start.x + signX * width,
      y: start.y + signY * height,
    };
  };

  const handleCropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const coords = getRelativeCoords(e);
    setCropStart(coords);
    setCropEnd(coords);
    setIsDragging(true);
  };

  const handleCropMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !cropStart) return;

    const coords = getRelativeCoords(e);

    if (cropAspect === "free") {
      setCropEnd(coords);
      return;
    }

    const constrained = constrainToAspect(cropStart, coords, CROP_ASPECTS[cropAspect]);
    setCropEnd({
      x: Math.max(0, Math.min(1, constrained.x)),
      y: Math.max(0, Math.min(1, constrained.y)),
    });
  };

  const handleCropMouseUp = () => setIsDragging(false);

  const getCropRect = () => {
    if (!cropStart || !cropEnd) return null;

    const x = Math.min(cropStart.x, cropEnd.x);
    const y = Math.min(cropStart.y, cropEnd.y);
    const width = Math.abs(cropEnd.x - cropStart.x);
    const height = Math.abs(cropEnd.y - cropStart.y);

    if (width < 0.01 || height < 0.01) return null;
    return { x, y, width, height };
  };

  const getCroppedBlob = async () => {
    const img = cropImgRef.current;
    const cropRect = getCropRect();

    if (!img || !cropRect) return null;

    return new Promise<Blob | null>((resolve) => {
      const canvas = document.createElement("canvas");

      const pixelX = cropRect.x * img.naturalWidth;
      const pixelY = cropRect.y * img.naturalHeight;
      const pixelWidth = cropRect.width * img.naturalWidth;
      const pixelHeight = cropRect.height * img.naturalHeight;

      canvas.width = pixelWidth;
      canvas.height = pixelHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, pixelWidth, pixelHeight);
      ctx.drawImage(
        img,
        pixelX,
        pixelY,
        pixelWidth,
        pixelHeight,
        0,
        0,
        pixelWidth,
        pixelHeight
      );

      canvas.toBlob((blob) => resolve(blob), "image/png", 0.92);
    });
  };

  const handleApplyCrop = async () => {
    if (cropImageIndex === null) return;

    setApplyingCrop(true);
    try {
      const croppedBlob = await getCroppedBlob();
      if (!croppedBlob) throw new Error("Selecione uma área para recortar.");

      const publicUrl = await uploadBlobToStorage(croppedBlob, "png");

      setQuestionImages((prev) =>
        prev.map((imageUrl, index) => (index === cropImageIndex ? publicUrl : imageUrl))
      );

      setCropOpen(false);
      setCropSource(null);
      setCropImageIndex(null);
      setCropStart(null);
      setCropEnd(null);

      toast({ title: "Imagem recortada com sucesso!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setApplyingCrop(false);
    }
  };

  const handleSave = () => {
    if (!text.trim()) {
      toast({
        title: "Preencha o enunciado da questão.",
        variant: "destructive",
      });
      return;
    }

    const sanitizedOptions = options.map((opt) => opt.trim()).filter(Boolean);

    onSave({
      text: text.trim(),
      images: questionImages,
      questionType,
      options: questionType === "objetiva" ? sanitizedOptions : [],
      correctAnswer: questionType === "objetiva" ? correctAnswer : null,
      subject,
      topic,
      difficulty,
      resolution,
    });

    onOpenChange(false);
  };

  const cropRect = getCropRect();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Enunciado *</Label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder="Digite o enunciado da questão..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <Label>Imagens (opcional)</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleImageUpload()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Upload className="w-3 h-3 mr-1" />
                  )}
                  Adicionar imagem
                </Button>
              </div>

              {questionImages.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-2">
                  Nenhuma imagem adicionada para esta questão.
                </p>
              ) : (
                <div className="space-y-3 mt-2">
                  {questionImages.map((imageUrl, index) => (
                    <div key={`${imageUrl}-${index}`} className="rounded-md border border-border/60 p-2">
                      <img
                        src={imageUrl}
                        alt={`Imagem da questão ${index + 1}`}
                        className="max-h-48 rounded border border-border object-contain"
                        loading="lazy"
                      />
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleImageUpload(index)}
                          disabled={uploadingImage}
                        >
                          <Upload className="w-3 h-3 mr-1" /> Trocar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenCrop(index)}
                        >
                          <Scissors className="w-3 h-3 mr-1" /> Recortar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setQuestionImages((prev) => prev.filter((_, imageIndex) => imageIndex !== index))
                          }
                        >
                          <X className="w-3 h-3 mr-1" /> Remover
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                <Button
                  size="sm"
                  onClick={generateImage}
                  disabled={generatingImage || !imagePrompt.trim()}
                  className="shrink-0"
                >
                  {generatingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4 mr-1" /> Gerar
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Matéria</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tópico</Label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ex: Termometria"
                />
              </div>
              <div>
                <Label>Dificuldade</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facil">Fácil</SelectItem>
                    <SelectItem value="medio">Médio</SelectItem>
                    <SelectItem value="dificil">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Tipo de Questão</Label>
              <Select
                value={questionType}
                onValueChange={(value) => setQuestionType(value as "objetiva" | "dissertativa")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dissertativa">Dissertativa</SelectItem>
                  <SelectItem value="objetiva">Objetiva (múltipla escolha)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {questionType === "objetiva" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Alternativas</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setOptions((prev) => [...prev, ""]) }
                  >
                    <Plus className="w-3 h-3 mr-1" /> Adicionar
                  </Button>
                </div>

                {options.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Clique em "Adicionar" para criar alternativas.
                  </p>
                )}

                {options.map((option, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      value={option}
                      onChange={(e) => {
                        const next = [...options];
                        next[index] = e.target.value;
                        setOptions(next);
                      }}
                      placeholder={`Alternativa ${String.fromCharCode(65 + index)}`}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant={correctAnswer === index ? "default" : "outline"}
                      onClick={() => setCorrectAnswer(correctAnswer === index ? null : index)}
                      className="shrink-0"
                    >
                      {correctAnswer === index ? "✓" : String.fromCharCode(65 + index)}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setOptions((prev) => prev.filter((_, optionIndex) => optionIndex !== index));
                        if (correctAnswer === index) setCorrectAnswer(null);
                        else if (correctAnswer !== null && correctAnswer > index) {
                          setCorrectAnswer(correctAnswer - 1);
                        }
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

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

      <Dialog
        open={cropOpen}
        onOpenChange={(nextOpen) => {
          setCropOpen(nextOpen);
          if (!nextOpen) {
            setCropSource(null);
            setCropImageIndex(null);
            setCropStart(null);
            setCropEnd(null);
            setCropAspect("free");
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Recortar imagem</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Modo de recorte</Label>
              <Select
                value={cropAspect}
                onValueChange={(value) => setCropAspect(value as CropAspect)}
              >
                <SelectTrigger className="w-full sm:w-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Livre</SelectItem>
                  <SelectItem value="1:1">1:1</SelectItem>
                  <SelectItem value="4:3">4:3</SelectItem>
                  <SelectItem value="16:9">16:9</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {cropLoading ? (
              <div className="h-64 flex items-center justify-center border border-border rounded-md">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : cropSource ? (
              <div
                className="relative max-h-[55vh] overflow-auto rounded-md border border-border cursor-crosshair select-none"
                onMouseDown={handleCropMouseDown}
                onMouseMove={handleCropMouseMove}
                onMouseUp={handleCropMouseUp}
                onMouseLeave={handleCropMouseUp}
              >
                <img
                  ref={cropImgRef}
                  src={cropSource}
                  alt="Recorte"
                  className="max-w-full"
                  draggable={false}
                />

                {cropRect && (
                  <>
                    <div
                      className="absolute left-0 right-0 top-0 bg-foreground/60 pointer-events-none"
                      style={{ height: `${cropRect.y * 100}%` }}
                    />
                    <div
                      className="absolute left-0 right-0 bottom-0 bg-foreground/60 pointer-events-none"
                      style={{ height: `${(1 - cropRect.y - cropRect.height) * 100}%` }}
                    />
                    <div
                      className="absolute left-0 bg-foreground/60 pointer-events-none"
                      style={{
                        top: `${cropRect.y * 100}%`,
                        width: `${cropRect.x * 100}%`,
                        height: `${cropRect.height * 100}%`,
                      }}
                    />
                    <div
                      className="absolute right-0 bg-foreground/60 pointer-events-none"
                      style={{
                        top: `${cropRect.y * 100}%`,
                        width: `${(1 - cropRect.x - cropRect.width) * 100}%`,
                        height: `${cropRect.height * 100}%`,
                      }}
                    />
                    <div
                      className="absolute border-2 border-primary pointer-events-none"
                      style={{
                        left: `${cropRect.x * 100}%`,
                        top: `${cropRect.y * 100}%`,
                        width: `${cropRect.width * 100}%`,
                        height: `${cropRect.height * 100}%`,
                      }}
                    />
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Não foi possível carregar a imagem.</p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="w-full" onClick={() => setCropOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="w-full"
                onClick={handleApplyCrop}
                disabled={applyingCrop || !cropRect}
              >
                {applyingCrop ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando recorte...
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4 mr-2" /> Aplicar recorte
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
