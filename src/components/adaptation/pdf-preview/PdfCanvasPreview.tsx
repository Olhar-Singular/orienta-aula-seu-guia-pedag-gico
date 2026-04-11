import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

type Props = {
  blob: Blob | null;
  isGenerating: boolean;
  zoom: number;
};

export default function PdfCanvasPreview({ blob, isGenerating, zoom }: Props) {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    if (!blob) return;

    let cancelled = false;
    const canvasContainer = canvasContainerRef.current;
    if (!canvasContainer) return;

    (async () => {
      try {
        setError(null);
        const arrayBuffer = await blob.arrayBuffer();
        if (cancelled) return;

        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer })
          .promise;
        if (cancelled) return;

        setPageCount(pdfDoc.numPages);
        canvasContainer.innerHTML = "";

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          if (cancelled) return;

          const dpr = window.devicePixelRatio || 1;
          const baseViewport = page.getViewport({ scale: 1 });
          const targetWidth = 520;
          const baseScale = targetWidth / baseViewport.width;
          const renderScale = baseScale * zoom * dpr;
          const displayScale = baseScale * zoom;

          const viewport = page.getViewport({ scale: renderScale });
          const displayViewport = page.getViewport({ scale: displayScale });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${displayViewport.width}px`;
          canvas.style.height = `${displayViewport.height}px`;
          canvas.style.display = "block";
          canvas.style.margin = "0 auto 16px";
          canvas.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
          canvas.style.borderRadius = "4px";
          canvas.style.backgroundColor = "white";

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          await page.render({ canvasContext: ctx, viewport }).promise;
          if (cancelled) return;
          canvasContainer.appendChild(canvas);

          const label = document.createElement("div");
          label.textContent = `Pagina ${pageNum} de ${pdfDoc.numPages}`;
          label.style.textAlign = "center";
          label.style.fontSize = "11px";
          label.style.color = "#6b7280";
          label.style.marginBottom = "24px";
          canvasContainer.appendChild(label);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[PdfCanvasPreview] Error:", err);
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [blob, zoom]);

  return (
    <div className="relative h-full w-full overflow-auto bg-gray-100 p-4">
      {isGenerating && (
        <div className="absolute right-4 top-4 z-10 rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm backdrop-blur">
          Atualizando...
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          Erro ao renderizar PDF: {error}
        </div>
      )}
      <div ref={canvasContainerRef} />
      {!blob && !error && (
        <div className="flex h-full items-center justify-center text-sm text-gray-500">
          Gerando preview...
        </div>
      )}
      {blob && pageCount > 0 && (
        <div className="sr-only" data-testid="page-count">
          {pageCount} paginas
        </div>
      )}
    </div>
  );
}
