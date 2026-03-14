import { useState, useRef, useCallback } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MAX_SIZE = 4 * 1024 * 1024; // 4MB

interface ChatImageInputProps {
  imagePreview: string | null;
  onImageChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resizeIfNeeded(dataUrl: string, maxDim = 1024): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      if (w <= maxDim && h <= maxDim) {
        resolve(dataUrl);
        return;
      }
      const scale = maxDim / Math.max(w, h);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = dataUrl;
  });
}

async function processImage(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) {
    toast.error("Arquivo não é uma imagem");
    return null;
  }
  if (file.size > MAX_SIZE * 2) {
    toast.error("Imagem muito grande (máx 8MB)");
    return null;
  }
  const dataUrl = await fileToDataUrl(file);
  return resizeIfNeeded(dataUrl);
}

export default function ChatImageInput({ imagePreview, onImageChange, disabled }: ChatImageInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await processImage(file);
    if (result) onImageChange(result);
    e.target.value = "";
  }, [onImageChange]);

  return (
    <div className="flex items-center gap-1">
      {/* Camera capture */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
        disabled={disabled}
        key="camera"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={() => cameraRef.current?.click()}
        disabled={disabled}
        title="Tirar foto"
      >
        <Camera className="w-4 h-4" />
      </Button>

      {/* File/gallery upload */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
        disabled={disabled}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={() => fileRef.current?.click()}
        disabled={disabled}
        title="Enviar imagem"
      >
        <ImagePlus className="w-4 h-4" />
      </Button>

      {/* Preview thumbnail */}
      {imagePreview && (
        <div className="relative">
          <img src={imagePreview} className="h-9 w-9 rounded border object-cover" alt="Preview" />
          <button
            type="button"
            onClick={() => onImageChange(null)}
            className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Process a clipboard paste event for images */
export async function handlePasteImage(e: React.ClipboardEvent): Promise<string | null> {
  const items = e.clipboardData?.items;
  if (!items) return null;
  for (const item of Array.from(items)) {
    if (item.type.startsWith("image/")) {
      e.preventDefault();
      const file = item.getAsFile();
      if (!file) return null;
      return processImage(file);
    }
  }
  return null;
}
