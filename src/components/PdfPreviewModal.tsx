import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
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
  const loadedRef = useRef(false);

  const loadPage = useCallback(async (page: number) => {
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
  }, [file]);

  const handleOpen = useCallback(async () => {
    if (!file || loadedRef.current) return;
    loadedRef.current = true;
    try {
      const count = await getPdfPageCount(file);
      setPageCount(count);
      await loadPage(1);
    } catch (e) {
      console.error("Error loading PDF:", e);
    }
  }, [file, loadPage]);

  // Load on open
  if (open && file && !loadedRef.current) {
    handleOpen();
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      loadedRef.current = false;
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
          <DialogTitle className="flex items-center justify-between">
            <span className="truncate">{file?.name || "Preview PDF"}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {loading ? (
            <div className="flex items-center justify-center h-[60vh]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
