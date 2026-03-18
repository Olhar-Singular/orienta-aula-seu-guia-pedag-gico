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

export async function downloadAdaptationPDF(data: AdaptationPDFProps) {
  const blob = await pdf(<AdaptationPDF {...data} />).toBlob();
  downloadBlob(blob, `adaptacao-${Date.now()}.pdf`);
}

export async function downloadPeiReportPDF(data: PeiReportPDFProps, studentName: string) {
  const blob = await pdf(<PeiReportPDF {...data} />).toBlob();
  downloadBlob(blob, `Relatorio_${studentName.replace(/\s+/g, "_")}.pdf`);
}
