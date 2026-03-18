import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";


type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
};

export default function DocxPreviewModal({ open, onOpenChange, file }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !file || !containerRef.current) return;

    let cancelled = false;

    const renderDocx = async () => {
      setLoading(true);
      const container = containerRef.current;
      if (!container) return;

      container.innerHTML = "";

      try {
        const { renderAsync } = await import("docx-preview");
        const arrayBuffer = await file.arrayBuffer();

        if (cancelled || !containerRef.current) return;

        await renderAsync(arrayBuffer, containerRef.current, undefined, {
          className: "docx-preview",
          inWrapper: true,
          breakPages: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          useBase64URL: true,
        });
      } catch (error) {
        console.error("Erro ao renderizar DOCX:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    renderDocx();

    return () => {
      cancelled = true;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [open, file]);

  const handleDownload = () => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh]">
        <DialogHeader>
          <DialogTitle className="truncate">{file?.name || "Visualização do Documento"}</DialogTitle>
        </DialogHeader>

        <div className="relative overflow-auto max-h-[72vh] rounded-md border bg-muted/30 p-3">
          {loading && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-background/80">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          <div
            ref={containerRef}
            className="[&_.docx-wrapper]:bg-transparent [&_.docx-wrapper]:p-0 [&_.docx]:mx-auto [&_.docx]:shadow-sm"
          />
        </div>

        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-1" /> Baixar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
