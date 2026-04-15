import { useCallback, useMemo } from "react";
import { StepEditor } from "./StepEditor";
import { convertToStructuredActivity } from "@/lib/convertToStructuredActivity";
import { parseActivityText } from "@/lib/parseActivityText";
import { buildManualEditorAdvancePatch } from "@/lib/adaptationWizardHelpers";
import type { StructuredActivity } from "@/types/adaptation";
import type { StepModule, StepContext } from "../types";

// eslint-disable-next-line react-refresh/only-export-components -- StepModule collocates Component with metadata; Fast Refresh quirk is acceptable
function EditorStepComponent({
  data,
  updateData,
  setManualActivity,
  manualActivity,
  onNext,
  onPrev,
}: StepContext) {
  const buildManualActivity = useCallback((): StructuredActivity => {
    if (data.selectedQuestions.length > 0) {
      return convertToStructuredActivity(data.selectedQuestions);
    }
    return parseActivityText(data.activityText);
  }, [data.selectedQuestions, data.activityText]);

  const editorActivity = useMemo(
    () => manualActivity ?? buildManualActivity(),
    [manualActivity, buildManualActivity],
  );

  return (
    <StepEditor
      structuredActivity={editorActivity}
      content={data.editorContentManual}
      onContentChange={(next) => updateData({ editorContentManual: next })}
      onNext={(updated) => {
        setManualActivity(updated);
        updateData(buildManualEditorAdvancePatch(updated, data));
        onNext();
      }}
      onPrev={onPrev}
    />
  );
}

export const editorStep: StepModule = {
  key: "editor",
  label: "Editor",
  description: "Editar atividade",
  Component: EditorStepComponent,
};
