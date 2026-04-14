export type WizardMode = "ai" | "manual";

export const STEP_SEQUENCES: Readonly<Record<WizardMode, readonly string[]>> = {
  ai: ["type", "content", "barriers", "choice", "ai_editor", "pdf_preview", "export"],
  manual: ["type", "content", "barriers", "choice", "editor", "pdf_preview", "export"],
} as const;

export function getStepsForMode(mode: WizardMode): readonly string[] {
  return STEP_SEQUENCES[mode];
}

export function getNextStep(currentStep: string, mode: WizardMode): string {
  const steps = STEP_SEQUENCES[mode];
  const currentIndex = steps.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex >= steps.length - 1) {
    return steps[steps.length - 1];
  }
  return steps[currentIndex + 1];
}
