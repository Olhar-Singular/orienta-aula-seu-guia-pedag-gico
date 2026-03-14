import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { renderPdfPage, getPdfPageCount } from "@/lib/pdf-utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
};

export default function PdfPreviewModal({ open, onOpenChange, file }: Props) {
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageImage, setPageImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !file) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const count = await getPdfPageCount(file);
        if (cancelled) return;
        setPageCount(count);
        const img = await renderPdfPage(file, 1, 1.5);
        if (cancelled) return;
        setPageImage(img);
        setCurrentPage(1);
      } catch (e) {
        console.error("Error loading PDF:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [open, file]);

  const loadPage = async (page: number) => {
    if (!file) return;
    setLoading(true);
    try {
      const img = await renderPdfPage(file, page, 1.5);
      setPageImage(img);
      setCurrentPage(page);
    } catch (e) {
      console.error("Error rendering page:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setPageImage(null);
      setCurrentPage(1);
      setPageCount(0);
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
      <DialogContent className="max-w-4xl max-h-[95vh]">
        <DialogHeader>
          <DialogTitle className="truncate">{file?.name || "Preview PDF"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {loading ? (
            <div className="flex items-center justify-center h-[60vh]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : pageImage ? (
            <div className="overflow-auto max-h-[65vh] w-full flex justify-center">
              <img
                src={pageImage}
                alt={`Página ${currentPage}`}
                className="max-w-full border rounded shadow-sm"
              />
            </div>
          ) : (
            <p className="text-muted-foreground py-12">Nenhum PDF carregado</p>
          )}

          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="outline"
              disabled={currentPage <= 1 || loading}
              onClick={() => loadPage(currentPage - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[120px] text-center">
              Página {currentPage} / {pageCount}
            </span>
            <Button
              size="icon"
              variant="outline"
              disabled={currentPage >= pageCount || loading}
              onClick={() => loadPage(currentPage + 1)}
              aria-label="Próxima página"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-1" /> Baixar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
