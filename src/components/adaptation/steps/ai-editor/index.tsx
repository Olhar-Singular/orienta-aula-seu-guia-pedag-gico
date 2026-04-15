import StepAIEditor from "./StepAIEditor";
import type { StepModule } from "../types";

export const aiEditorStep: StepModule = {
  key: "ai_editor",
  label: "Editor",
  description: "Editar atividade adaptada",
  Component: ({ data, updateData, onNext, onPrev }) => (
    <StepAIEditor data={data} updateData={updateData} onNext={onNext} onPrev={onPrev} />
  ),
};
