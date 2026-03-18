// Legacy wrapper — delegates to new @react-pdf/renderer system
import { downloadAdaptationPDF, type AdaptationPDFProps } from "@/lib/pdf/index";

export type ExportData = {
  schoolName?: string;
  teacherName?: string;
  studentName?: string;
  activityType?: string;
  date: string;
  versionUniversal: string;
  versionDirected: string;
  strategiesApplied: string[];
  pedagogicalJustification: string;
  implementationTips: string[];
  imagesUniversal?: string[];
  imagesDirected?: string[];
};

export async function exportToPdf(data: ExportData) {
  const props: AdaptationPDFProps = {
    schoolName: data.schoolName,
    teacherName: data.teacherName,
    studentName: data.studentName,
    activityType: data.activityType,
    date: data.date,
    versionUniversal: data.versionUniversal,
    versionDirected: data.versionDirected,
    strategiesApplied: data.strategiesApplied,
    pedagogicalJustification: data.pedagogicalJustification,
    implementationTips: data.implementationTips,
    imagesUniversal: data.imagesUniversal,
    imagesDirected: data.imagesDirected,
  };
  await downloadAdaptationPDF(props);
}
