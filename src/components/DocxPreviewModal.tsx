import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Download, Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
};

export default function DocxPreviewModal({ open, onOpenChange, file }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const styleContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !file || !containerRef.current || !styleContainerRef.current) return;

    let cancelled = false;

    const renderDocx = async () => {
      const container = containerRef.current;
      const styleContainer = styleContainerRef.current;
      if (!container || !styleContainer) return;

      setLoading(true);
      setError(null);
      container.innerHTML = "";
      styleContainer.innerHTML = "";

      const renderFallbackHtml = async () => {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();

        if (cancelled || !containerRef.current) return;

        const result = await mammoth.default.convertToHtml({
          arrayBuffer,
          convertImage: mammoth.default.images.imgElement((image: any) => {
            return image.read("base64").then((imageBuffer: string) => {
              return { src: `data:${image.contentType};base64,${imageBuffer}` };
            });
          }),
        });

        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = result.value;

        const hasText = (containerRef.current.textContent?.trim().length ?? 0) > 0;
        const hasVisualElements = !!containerRef.current.querySelector("img, table, p, h1, h2, h3, ul, ol");

        if (!hasText && !hasVisualElements) {
          throw new Error("Documento sem conteúdo visualizável");
        }
      };

      try {
        const docxPreview = await import("docx-preview");
        const renderAsync = docxPreview.renderAsync ?? docxPreview.default?.renderAsync;

        if (typeof renderAsync !== "function") {
          throw new Error("Renderizador DOCX indisponível");
        }

        const arrayBuffer = await file.arrayBuffer();

        if (cancelled || !containerRef.current || !styleContainerRef.current) return;

        await renderAsync(arrayBuffer, containerRef.current, styleContainerRef.current, {
          className: "docx",
          inWrapper: true,
          breakPages: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          ignoreLastRenderedPageBreak: false,
          useBase64URL: true,
        });

        if (cancelled || !containerRef.current) return;

        const hasText = (containerRef.current.textContent?.trim().length ?? 0) > 0;
        const hasVisualElements = !!containerRef.current.querySelector(
          ".docx-wrapper, .docx, .docx p, .docx table, .docx img, img, table, p"
        );

        if (!hasText && !hasVisualElements) {
          await renderFallbackHtml();
        }
      } catch (primaryError) {
        try {
          await renderFallbackHtml();
        } catch (fallbackError) {
          console.error("Erro ao renderizar DOCX:", primaryError);
          console.error("Fallback de DOCX falhou:", fallbackError);
          if (!cancelled) {
            setError("Não foi possível renderizar este arquivo Word. Tente baixar para conferir o conteúdo original.");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void renderDocx();

    return () => {
      cancelled = true;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      if (styleContainerRef.current) {
        styleContainerRef.current.innerHTML = "";
      }
      setError(null);
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

        <div ref={styleContainerRef} className="hidden" />

        <div className="relative overflow-auto max-h-[72vh] rounded-md border bg-muted/30 p-3">
          {loading && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-background/80">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {error ? (
            <div className="py-10 px-4 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <p>{error}</p>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="[&_.docx-wrapper]:bg-transparent [&_.docx-wrapper]:p-0 [&_.docx]:mx-auto [&_.docx]:shadow-sm [&_img]:max-w-full [&_img]:h-auto"
            />
          )}
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
