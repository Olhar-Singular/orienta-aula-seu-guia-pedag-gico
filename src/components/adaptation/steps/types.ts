import type { FC } from "react";
import type { WizardData, WizardMode } from "../AdaptationWizard";
import type { StructuredActivity } from "@/types/adaptation";

/**
 * Shared context passed to every step Component. Each step reads only what it
 * needs from this object. Extending StepContext is an explicit O(steps) change —
 * intentional, so adding a field to one step doesn't silently grow the wizard
 * surface.
 */
export type StepContext = {
  data: WizardData;
  updateData: (partial: Partial<WizardData>) => void;
  setWizardMode: (mode: WizardMode) => void;
  manualActivity: StructuredActivity | null;
  setManualActivity: (a: StructuredActivity | null) => void;
  onNext: () => void;
  onPrev: () => void;
  onRestart: () => void;
  editingId?: string;
  onSaved?: () => void;
};

/**
 * StepContract — a self-contained wizard step. Registering a StepModule in the
 * registry (steps/index.ts) is all that's needed to add a new step; the
 * orchestrator loops the registry and never references a specific step.
 */
export type StepModule = {
  /** Matches the key returned by wizardSteps.ts / getStepsForMode. */
  key: string;
  label: string;
  description: string;
  Component: FC<StepContext>;
};
