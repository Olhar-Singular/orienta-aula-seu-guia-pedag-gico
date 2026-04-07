import { useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  ImageIcon,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Search,
  Loader2,
  Clipboard,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserSchool } from "@/hooks/useUserSchool";
import type { ImageItem, ImageAlign } from "./imageManagerUtils";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (images: ImageItem[]) => void;
};

type BankImage = {
  id: string;
  image_url: string;
  text: string;
  subject: string;
};

const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.85;

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ImageManagerModal({ open, onClose, onConfirm }: Props) {
  const { user } = useAuth();
  const { schoolId } = useUserSchool();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [tab, setTab] = useState("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  // Question bank state
  const [bankImages, setBankImages] = useState<BankImage[]>([]);
  const [bankSearch, setBankSearch] = useState("");
  const [bankLoading, setBankLoading] = useState(false);
  const [bankLoaded, setBankLoaded] = useState(false);

  const fetchBankImages = useCallback(async () => {
    if (!user) return;
    setBankLoading(true);
    try {
      let query = (supabase.from as any)("question_bank")
        .select("id, image_url, text, subject")
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(100);

      if (schoolId) {
        query = query.or(`created_by.eq.${user.id},school_id.eq.${schoolId}`);
      } else {
        query = query.eq("created_by", user.id);
      }

      const { data } = await query;
      setBankImages((data || []).filter((q: BankImage) => q.image_url));
      setBankLoaded(true);
    } catch {
      setBankImages([]);
    } finally {
      setBankLoading(false);
    }
  }, [user, schoolId]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setImages([]);
      setTab("upload");
      setBankSearch("");
      setBankLoaded(false);
    }
  }, [open]);

  // Fetch bank images when switching to bank tab
  useEffect(() => {
    if (tab !== "bank" || bankLoaded || !user) return;
    fetchBankImages();
  }, [tab, bankLoaded, user, fetchBankImages]);

  const addImageFiles = useCallback(async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (validFiles.length === 0) return;

    const newImages: ImageItem[] = [];
    for (const file of validFiles) {
      try {
        const src = await resizeImage(file);
        newImages.push({ id: generateId(), src, align: "center" });
      } catch {
        // skip invalid files
      }
    }
    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      if (e.dataTransfer.files.length > 0) {
        addImageFiles(e.dataTransfer.files);
      }
    },
    [addImageFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addImageFiles(e.target.files);
        e.target.value = "";
      }
    },
    [addImageFiles]
  );

  const handlePaste = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], "clipboard.png", { type: imageType });
          await addImageFiles([file]);
          return;
        }
      }
    } catch {
      // Clipboard API not available or denied — ignore
    }
  }, [addImageFiles]);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const setAlign = useCallback((id: string, align: ImageAlign) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, align } : img))
    );
  }, []);

  const addFromBank = useCallback((url: string) => {
    setImages((prev) => [
      ...prev,
      { id: generateId(), src: url, align: "center" },
    ]);
    setTab("upload");
  }, []);

  const filteredBank = bankSearch
    ? bankImages.filter(
        (q) =>
          q.text.toLowerCase().includes(bankSearch.toLowerCase()) ||
          q.subject.toLowerCase().includes(bankSearch.toLowerCase())
      )
    : bankImages;

  const handleConfirm = useCallback(() => {
    if (images.length > 0) {
      onConfirm(images);
    }
    onClose();
  }, [images, onConfirm, onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-violet-600" />
            Adicionar Imagens
          </DialogTitle>
          <DialogDescription>
            Envie imagens do computador, cole da area de transferencia ou escolha do banco de questoes.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 min-h-0 flex flex-col">
          <TabsList className="w-full">
            <TabsTrigger value="upload" className="flex-1 gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              Enviar
            </TabsTrigger>
            <TabsTrigger value="bank" className="flex-1 gap-1.5">
              <Search className="w-3.5 h-3.5" />
              Banco de Questoes
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="flex-1 min-h-0 flex flex-col gap-3">
            {/* Drop zone */}
            <div
              ref={dropZoneRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                dragging
                  ? "border-violet-400 bg-violet-50"
                  : "border-zinc-300 hover:border-violet-300 hover:bg-violet-50/50"
              }`}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
              <p className="text-sm text-zinc-600 font-medium">
                Arraste imagens aqui ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG ou GIF
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileInput}
                className="hidden"
              />
            </div>

            {/* Paste button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePaste}
              className="self-start gap-1.5"
            >
              <Clipboard className="w-3.5 h-3.5" />
              Colar da area de transferencia
            </Button>

            {/* Image list */}
            {images.length > 0 && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {images.length} {images.length === 1 ? "imagem" : "imagens"} adicionada{images.length > 1 ? "s" : ""}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className="border border-zinc-200 rounded-lg p-2 bg-zinc-50 group"
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-white rounded overflow-hidden mb-2 flex items-center justify-center">
                        <img
                          src={img.src}
                          alt="Preview"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>

                      {/* Controls */}
                      <div className="flex items-center justify-between">
                        {/* Alignment */}
                        <div className="flex gap-0.5">
                          <button
                            type="button"
                            onClick={() => setAlign(img.id, "left")}
                            className={`p-1 rounded transition-colors ${
                              img.align === "left"
                                ? "bg-violet-100 text-violet-700"
                                : "text-zinc-400 hover:text-zinc-600"
                            }`}
                            title="Alinhar a esquerda"
                          >
                            <AlignLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setAlign(img.id, "center")}
                            className={`p-1 rounded transition-colors ${
                              img.align === "center"
                                ? "bg-violet-100 text-violet-700"
                                : "text-zinc-400 hover:text-zinc-600"
                            }`}
                            title="Centralizar"
                          >
                            <AlignCenter className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setAlign(img.id, "right")}
                            className={`p-1 rounded transition-colors ${
                              img.align === "right"
                                ? "bg-violet-100 text-violet-700"
                                : "text-zinc-400 hover:text-zinc-600"
                            }`}
                            title="Alinhar a direita"
                          >
                            <AlignRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          className="p-1 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Question Bank Tab */}
          <TabsContent value="bank" className="flex-1 min-h-0 flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por texto ou disciplina..."
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {bankLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando imagens...
                </div>
              ) : filteredBank.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
                  <ImageIcon className="w-8 h-8 text-zinc-300 mb-2" />
                  {bankSearch
                    ? "Nenhuma imagem encontrada para essa busca"
                    : "Nenhuma questao com imagem no banco"}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {filteredBank.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => addFromBank(q.image_url)}
                      className="border border-zinc-200 rounded-lg p-1.5 bg-white hover:border-violet-300 hover:bg-violet-50/50 transition-colors text-left group"
                    >
                      <div className="aspect-video bg-zinc-50 rounded overflow-hidden mb-1 flex items-center justify-center">
                        <img
                          src={q.image_url}
                          alt="Imagem da questao"
                          className="max-w-full max-h-full object-contain"
                          loading="lazy"
                        />
                      </div>
                      <p className="text-[0.6rem] text-muted-foreground truncate px-0.5">
                        {q.subject}
                      </p>
                      <p className="text-[0.6rem] text-zinc-600 truncate px-0.5 leading-tight">
                        {q.text.slice(0, 60)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={images.length === 0}
            className="gap-1.5"
          >
            <ImageIcon className="w-4 h-4" />
            Inserir {images.length > 0 && `(${images.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
