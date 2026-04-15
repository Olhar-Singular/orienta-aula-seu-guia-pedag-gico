import { StepChoice } from "./StepChoice";
import type { StepModule } from "../types";

export const choiceStep: StepModule = {
  key: "choice",
  label: "Modo",
  description: "Escolher modo",
  Component: ({ setWizardMode, updateData, onNext }) => (
    <StepChoice
      onSelect={(mode) => {
        setWizardMode(mode);
        updateData({ wizardMode: mode });
        onNext();
      }}
    />
  ),
};
