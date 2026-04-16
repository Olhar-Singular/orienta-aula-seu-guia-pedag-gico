import { useCallback, useMemo } from "react";
import StepPdfPreview from "./StepPdfPreview";
import { isStructuredActivity } from "@/types/adaptation";
import { markdownDslToStructured } from "@/lib/activityDslConverter";
import type { EditableActivity } from "@/lib/pdf/editableActivity";
import type { HistoryState } from "@/hooks/useHistory";
import { emptySidecar, extractSidecar } from "@/lib/pdf/layoutSidecar";
import type { StepContext, StepModule } from "../types";

// eslint-disable-next-line react-refresh/only-export-components -- StepModule collocates Component with metadata; Fast Refresh quirk is acceptable
function PdfPreviewStepComponent({ data, updateData, onNext, onPrev }: StepContext) {
  const defaultHeader = useMemo(
    () => ({
      schoolName: "",
      subject: "",
      teacherName: "",
      className: "",
      date: new Date().toLocaleDateString("pt-BR"),
      showStudentLine: true,
    }),
    [],
  );

  const handleUniversalChange = useCallback(
    (activity: EditableActivity) => {
      const sidecar = extractSidecar(activity);
      updateData({
        editableActivity: activity,
        layoutSidecar: {
          version_universal: sidecar,
          version_directed: data.layoutSidecar?.version_directed ?? emptySidecar(),
        },
      });
    },
    [updateData, data.layoutSidecar?.version_directed],
  );
  const handleDirectedChange = useCallback(
    (activity: EditableActivity) => {
      const sidecar = extractSidecar(activity);
      updateData({
        editableActivityDirected: activity,
        layoutSidecar: {
          version_universal: data.layoutSidecar?.version_universal ?? emptySidecar(),
          version_directed: sidecar,
        },
      });
    },
    [updateData, data.layoutSidecar?.version_universal],
  );
  const handleHistoryUniversalChange = useCallback(
    (state: HistoryState<EditableActivity>) => updateData({ pdfHistoryUniversal: state }),
    [updateData],
  );
  const handleHistoryDirectedChange = useCallback(
    (state: HistoryState<EditableActivity>) => updateData({ pdfHistoryDirected: state }),
    [updateData],
  );

  if (!data.result) return null;

  return (
    <StepPdfPreview
      universalStructured={
        isStructuredActivity(data.result.version_universal)
          ? data.result.version_universal
          : markdownDslToStructured(String(data.result.version_universal))
      }
      directedStructured={
        isStructuredActivity(data.result.version_directed)
          ? data.result.version_directed
          : markdownDslToStructured(String(data.result.version_directed))
      }
      defaultHeader={defaultHeader}
      questionImagesUniversal={data.questionImages.version_universal}
      questionImagesDirected={data.questionImages.version_directed}
      savedUniversal={data.editableActivity}
      savedDirected={data.editableActivityDirected}
      sidecarUniversal={data.layoutSidecar?.version_universal}
      sidecarDirected={data.layoutSidecar?.version_directed}
      savedHistoryUniversal={data.pdfHistoryUniversal}
      savedHistoryDirected={data.pdfHistoryDirected}
      adaptationResult={data.result}
      onNext={onNext}
      onBack={onPrev}
      onUniversalChange={handleUniversalChange}
      onDirectedChange={handleDirectedChange}
      onHistoryUniversalChange={handleHistoryUniversalChange}
      onHistoryDirectedChange={handleHistoryDirectedChange}
    />
  );
}

export const pdfPreviewStep: StepModule = {
  key: "pdf_preview",
  label: "Layout",
  description: "Preview e layout do PDF",
  Component: PdfPreviewStepComponent,
};
