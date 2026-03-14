/**
 * PDF utilities using pdfjs-dist (npm).
 * Extracts text and renders pages as JPEG images.
 */
import * as pdfjsLib from "pdfjs-dist";

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export type PdfParseResult = {
  text: string;
  pageImages: string[]; // base64 data URLs (JPEG)
  pageCount: number;
  pagesProcessed: number[];
};

const MAX_TEXT_CHARS = 8000;
const MAX_IMAGE_PAGES = 8;
const RENDER_SCALE = 2.0;

/**
 * Parse a PDF file: extract text + render pages as images.
 */
export async function parsePdf(
  file: File,
  onProgress?: (page: number, total: number) => void
): Promise<PdfParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageCount = pdf.numPages;
  let fullText = "";
  const pageImages: string[] = [];
  const pagesProcessed: number[] = [];

  for (let i = 1; i <= pageCount; i++) {
    onProgress?.(i, pageCount);
    const page = await pdf.getPage(i);

    // Extract text
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    fullText += `\n--- Página ${i} ---\n${pageText}`;

    // Render as image (limit to MAX_IMAGE_PAGES)
    if (pageImages.length < MAX_IMAGE_PAGES) {
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;

      // White background to avoid transparency
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      pageImages.push(dataUrl);
      pagesProcessed.push(i);
    }

    page.cleanup();
  }

  // Truncate text if too long
  if (fullText.length > MAX_TEXT_CHARS) {
    fullText = fullText.substring(0, MAX_TEXT_CHARS) + "\n\n[... texto truncado]";
  }

  return {
    text: fullText.trim(),
    pageImages,
    pageCount,
    pagesProcessed,
  };
}

/**
 * Render a single PDF page as an image (for preview).
 */
export async function renderPdfPage(
  file: File,
  pageNumber: number,
  scale = 1.5
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  page.cleanup();
  return dataUrl;
}

/**
 * Get the number of pages in a PDF.
 */
export async function getPdfPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  return pdf.numPages;
}
