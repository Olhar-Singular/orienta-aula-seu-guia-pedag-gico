import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, Loader2, Crop, Move } from "lucide-react";
import { renderPdfPage, getPdfPageCount } from "@/lib/pdf-utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  /** When provided, enables crop mode with a callback */
  onCrop?: (dataUrl: string) => void;
  /** Initial page to show (1-indexed) */
  initialPage?: number;
};

export default function PdfPreviewModal({ open, onOpenChange, file, onCrop, initialPage }: Props) {
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageImage, setPageImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Crop state
  const [cropping, setCropping] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const imgWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !file) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const count = await getPdfPageCount(file);
        if (cancelled) return;
        setPageCount(count);
        const startPage = initialPage && initialPage >= 1 && initialPage <= count ? initialPage : 1;
        const img = await renderPdfPage(file, startPage, 1.5);
        if (cancelled) return;
        setPageImage(img);
        setCurrentPage(startPage);
      } catch (e) {
        console.error("Error loading PDF:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [open, file, initialPage]);

  const loadPage = async (page: number) => {
    if (!file) return;
    setLoading(true);
    setCropStart(null);
    setCropEnd(null);
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
      setCropping(false);
      setCropStart(null);
      setCropEnd(null);
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

  // ── Crop helpers ──
  const getRelativeCoords = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cropping) return;
    setCropStart(getRelativeCoords(e));
    setCropEnd(getRelativeCoords(e));
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !cropping) return;
    setCropEnd(getRelativeCoords(e));
  };

  const handleMouseUp = () => setIsDragging(false);

  const getCropRect = () => {
    if (!cropStart || !cropEnd) return null;
    const x = Math.min(cropStart.x, cropEnd.x);
    const y = Math.min(cropStart.y, cropEnd.y);
    const w = Math.abs(cropEnd.x - cropStart.x);
    const h = Math.abs(cropEnd.y - cropStart.y);
    if (w < 0.01 || h < 0.01) return null;
    return { x, y, width: w, height: h };
  };

  const handleConfirmCrop = () => {
    const img = imgRef.current;
    const rect = getCropRect();
    if (!img || !rect || !onCrop) return;

    const canvas = document.createElement("canvas");
    const px = rect.x * img.naturalWidth;
    const py = rect.y * img.naturalHeight;
    const pw = rect.width * img.naturalWidth;
    const ph = rect.height * img.naturalHeight;

    canvas.width = pw;
    canvas.height = ph;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, pw, ph);
    ctx.drawImage(img, px, py, pw, ph, 0, 0, pw, ph);

    const dataUrl = canvas.toDataURL("image/png", 0.92);
    onCrop(dataUrl);
    setCropping(false);
    setCropStart(null);
    setCropEnd(null);
    handleClose(false);
  };

  const cropRect = getCropRect();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[95vh]">
        <DialogHeader>
          <DialogTitle className="truncate">{file?.name || "Preview PDF"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {cropping && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Move className="w-3 h-3" /> Clique e arraste sobre a imagem para selecionar a área de recorte
            </p>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-[60vh]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : pageImage ? (
            <div
              className={`overflow-auto max-h-[60vh] w-full flex justify-center relative ${cropping ? "cursor-crosshair select-none" : ""}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div className="relative inline-block">
                <img
                  ref={imgRef}
                  src={pageImage}
                  alt={`Página ${currentPage}`}
                  className="max-w-full border rounded shadow-sm"
                  draggable={false}
                />
                {/* Crop overlays */}
                {cropping && cropRect && (
                  <>
                    <div className="absolute left-0 right-0 top-0 bg-black/50 pointer-events-none" style={{ height: `${cropRect.y * 100}%` }} />
                    <div className="absolute left-0 right-0 bottom-0 bg-black/50 pointer-events-none" style={{ height: `${(1 - cropRect.y - cropRect.height) * 100}%` }} />
                    <div className="absolute left-0 bg-black/50 pointer-events-none" style={{ top: `${cropRect.y * 100}%`, width: `${cropRect.x * 100}%`, height: `${cropRect.height * 100}%` }} />
                    <div className="absolute right-0 bg-black/50 pointer-events-none" style={{ top: `${cropRect.y * 100}%`, width: `${(1 - cropRect.x - cropRect.width) * 100}%`, height: `${cropRect.height * 100}%` }} />
                    <div className="absolute border-2 border-primary pointer-events-none" style={{ left: `${cropRect.x * 100}%`, top: `${cropRect.y * 100}%`, width: `${cropRect.width * 100}%`, height: `${cropRect.height * 100}%` }}>
                      {[{ top: -4, left: -4 }, { top: -4, right: -4 }, { bottom: -4, left: -4 }, { bottom: -4, right: -4 }].map((pos, i) => (
                        <div key={i} className="absolute w-2 h-2 bg-primary rounded-full" style={pos as any} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground py-12">Nenhum PDF carregado</p>
          )}

          <div className="flex items-center gap-3 flex-wrap justify-center">
            <Button size="icon" variant="outline" disabled={currentPage <= 1 || loading} onClick={() => loadPage(currentPage - 1)} aria-label="Página anterior">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[120px] text-center">
              Página {currentPage} / {pageCount}
            </span>
            <Button size="icon" variant="outline" disabled={currentPage >= pageCount || loading} onClick={() => loadPage(currentPage + 1)} aria-label="Próxima página">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-1" /> Baixar
            </Button>

            {onCrop && !cropping && (
              <Button size="sm" variant="secondary" onClick={() => setCropping(true)}>
                <Crop className="w-4 h-4 mr-1" /> Recortar Imagem
              </Button>
            )}

            {cropping && (
              <>
                <Button size="sm" variant="ghost" onClick={() => { setCropping(false); setCropStart(null); setCropEnd(null); }}>
                  Cancelar
                </Button>
                <Button size="sm" disabled={!cropRect} onClick={handleConfirmCrop}>
                  Confirmar Recorte
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
