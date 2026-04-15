import StepBarrierSelection from "./StepBarrierSelection";
import type { StepModule } from "../types";

export const barriersStep: StepModule = {
  key: "barriers",
  label: "Barreiras",
  description: "Aluno e barreiras",
  Component: ({ data, updateData, onNext, onPrev }) => (
    <StepBarrierSelection
      data={data}
      updateData={updateData}
      onNext={onNext}
      onPrev={onPrev}
    />
  ),
};
