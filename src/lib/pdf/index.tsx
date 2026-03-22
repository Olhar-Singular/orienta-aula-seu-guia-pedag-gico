import { pdf } from "@react-pdf/renderer";
import AdaptationPDF, { type AdaptationPDFProps } from "./templates/AdaptationPDF";
import PeiReportPDF, { type PeiReportPDFProps } from "./templates/PeiReportPDF";

export type { AdaptationPDFProps } from "./templates/AdaptationPDF";
export type {
  PeiReportPDFProps,
  PeiGoalData,
  BarrierFreqData,
  DimensionData,
  StrategyData,
  ActivityData,
} from "./templates/PeiReportPDF";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Validate and filter image URLs to prevent PDF generation errors.
 * Returns only valid URLs that can be loaded.
 */
async function validateImageUrls(urls: string[] | undefined): Promise<string[]> {
  if (!urls || urls.length === 0) return [];

  const validUrls: string[] = [];

  for (const url of urls) {
    // Skip empty or invalid URLs
    if (!url || typeof url !== "string") {
      console.warn("[PDF] Skipping invalid image URL:", url);
      continue;
    }

    // Skip data URLs that are too short (likely broken)
    if (url.startsWith("data:") && url.length < 100) {
      console.warn("[PDF] Skipping broken data URL (too short)");
      continue;
    }

    // For regular URLs, check if they're accessible
    if (url.startsWith("http")) {
      try {
        const response = await fetch(url, { method: "HEAD", mode: "cors" });
        if (response.ok) {
          validUrls.push(url);
        } else {
          console.warn("[PDF] Image URL not accessible:", url, response.status);
        }
      } catch (e) {
        console.warn("[PDF] Failed to validate image URL:", url, e);
      }
    } else {
      // Assume data URLs and relative URLs are valid
      validUrls.push(url);
    }
  }

  return validUrls;
}

/**
 * Sanitize image maps by validating all URLs.
 */
async function sanitizeImageMap(
  imageMap: Record<string, string[]> | undefined
): Promise<Record<string, string[]> | undefined> {
  if (!imageMap) return undefined;

  const sanitized: Record<string, string[]> = {};

  for (const [key, urls] of Object.entries(imageMap)) {
    const validUrls = await validateImageUrls(urls);
    if (validUrls.length > 0) {
      sanitized[key] = validUrls;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

export async function downloadAdaptationPDF(data: AdaptationPDFProps) {
  console.log("[PDF] Starting PDF generation...");
  console.log("[PDF] Data received:", {
    schoolName: data.schoolName,
    teacherName: data.teacherName,
    studentName: data.studentName,
    hasUniversalImages: !!data.questionImagesUniversal,
    hasDirectedImages: !!data.questionImagesDirected,
    universalTextLength: data.versionUniversal?.length,
    directedTextLength: data.versionDirected?.length,
  });

  try {
    // Sanitize image URLs to prevent errors
    const sanitizedData: AdaptationPDFProps = {
      ...data,
      questionImagesUniversal: await sanitizeImageMap(data.questionImagesUniversal),
      questionImagesDirected: await sanitizeImageMap(data.questionImagesDirected),
    };

    console.log("[PDF] Sanitized image maps:", {
      universalImages: sanitizedData.questionImagesUniversal,
      directedImages: sanitizedData.questionImagesDirected,
    });

    console.log("[PDF] Creating PDF document...");
    const pdfDocument = pdf(<AdaptationPDF {...sanitizedData} />);

    console.log("[PDF] Converting to blob...");
    const blob = await pdfDocument.toBlob();

    console.log("[PDF] Download starting...");
    downloadBlob(blob, `adaptacao-${Date.now()}.pdf`);

    console.log("[PDF] PDF generated successfully!");
  } catch (error) {
    console.error("[PDF] Error generating PDF:", error);
    console.error("[PDF] Error stack:", error instanceof Error ? error.stack : "No stack trace");

    // Provide more context about the error
    if (error instanceof Error) {
      if (error.message.includes("Buffer") || error.message.includes("isBuffer")) {
        console.error(
          "[PDF] This error usually occurs when loading images fails. " +
          "Check if all image URLs are valid and accessible."
        );
      }
    }

    throw new Error(
      `Falha ao gerar PDF: ${error instanceof Error ? error.message : "Erro desconhecido"}. ` +
      "Verifique o console para mais detalhes."
    );
  }
}

export async function downloadPeiReportPDF(data: PeiReportPDFProps, studentName: string) {
  console.log("[PDF] Starting PEI Report PDF generation...");

  try {
    const blob = await pdf(<PeiReportPDF {...data} />).toBlob();
    downloadBlob(blob, `Relatorio_${studentName.replace(/\s+/g, "_")}.pdf`);
    console.log("[PDF] PEI Report PDF generated successfully!");
  } catch (error) {
    console.error("[PDF] Error generating PEI Report PDF:", error);
    throw new Error(
      `Falha ao gerar PDF do relatório: ${error instanceof Error ? error.message : "Erro desconhecido"}`
    );
  }
}
