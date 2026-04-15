import StepActivityType from "./StepActivityType";
import type { StepModule } from "../types";

export const activityTypeStep: StepModule = {
  key: "type",
  label: "Tipo",
  description: "Tipo de atividade",
  Component: ({ data, updateData, onNext }) => (
    <StepActivityType
      value={data.activityType}
      onChange={(t) => updateData({ activityType: t })}
      onNext={onNext}
    />
  ),
};
