import StepExport from "./StepExport";
import type { StepModule } from "../types";

export const exportStep: StepModule = {
  key: "export",
  label: "Exportar",
  description: "Salvar e exportar",
  Component: ({ data, onPrev, onRestart, editingId, onSaved }) => (
    <StepExport
      data={data}
      onPrev={onPrev}
      onRestart={onRestart}
      editingId={editingId}
      onSaved={onSaved}
    />
  ),
};
