import StepActivityInput from "./StepActivityInput";
import type { StepModule } from "../types";

export const activityInputStep: StepModule = {
  key: "content",
  label: "Conteúdo",
  description: "Inserir atividade",
  Component: ({ data, updateData, onNext, onPrev }) => (
    <StepActivityInput
      value={data.activityText}
      onChange={(t) => updateData({ activityText: t })}
      selectedQuestions={data.selectedQuestions}
      onSelectedQuestionsChange={(q) => updateData({ selectedQuestions: q })}
      onNext={onNext}
      onPrev={onPrev}
    />
  ),
};
