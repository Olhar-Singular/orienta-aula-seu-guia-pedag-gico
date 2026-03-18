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
  mode: "pdf" | "docx" | null;
};

export default function FilePreviewModal({ open, onOpenChange, file, mode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const styleContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const clearDocxContainers = () => {
    if (containerRef.current) containerRef.current.innerHTML = "";
    if (styleContainerRef.current) styleContainerRef.current.innerHTML = "";
  };

  // Cleanup PDF blob URL
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  useEffect(() => {
    if (!open || !file) return;

    let cancelled = false;

    if (mode === "pdf") {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      return () => {
        cancelled = true;
        URL.revokeObjectURL(url);
        setPdfUrl(null);
      };
    }

    if (mode !== "docx") return;

    const renderDocx = async () => {
      setLoading(true);
      setError(null);
      clearDocxContainers();

      const renderFallbackHtml = async () => {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();

        if (cancelled || !containerRef.current) return;

        const result = await mammoth.convertToHtml(
          { arrayBuffer },
          {
            convertImage: mammoth.images.imgElement((image: any) => {
              return image.read("base64").then((imageBuffer: string) => ({
                src: `data:${image.contentType};base64,${imageBuffer}`,
              }));
            }),
          }
        );

        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = result.value;
      };

      try {
        const docxPreview = await import("docx-preview");
        const renderAsync = (docxPreview as any).renderAsync ?? (docxPreview as any).default?.renderAsync;

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

        const docxRoot = containerRef.current.querySelector(".docx") as HTMLElement | null;
        const textLength = docxRoot?.textContent?.replace(/\s+/g, "").length ?? 0;
        const hasVisualElements = !!docxRoot?.querySelector("img, table, svg, canvas, object, li, p");

        if (textLength < 20 && !hasVisualElements) {
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
      clearDocxContainers();
      setError(null);
    };
  }, [open, file, mode]);

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      clearDocxContainers();
      setError(null);
    }
    onOpenChange(isOpen);
  };

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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[92vh]">
        <DialogHeader>
          <DialogTitle className="truncate">{file?.name || "Visualização do Documento"}</DialogTitle>
        </DialogHeader>

        <div ref={styleContainerRef} className="hidden" />

        <div className="relative overflow-auto max-h-[75vh] rounded-md border bg-muted/30">
          {mode === "pdf" && pdfUrl && (
            <embed
              src={`${pdfUrl}#toolbar=1&navpanes=0`}
              type="application/pdf"
              className="w-full rounded-md"
              style={{ height: "72vh" }}
            />
          )}

          {mode === "docx" && (
            <>
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
                  className="p-6 prose prose-sm max-w-none dark:prose-invert [&_.docx-wrapper]:bg-transparent [&_.docx-wrapper]:p-0 [&_.docx]:mx-auto [&_.docx]:shadow-sm [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted"
                />
              )}
            </>
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

