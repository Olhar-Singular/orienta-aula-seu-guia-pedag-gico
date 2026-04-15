import { activityTypeStep } from "./activity-type";
import { activityInputStep } from "./activity-input";
import { choiceStep } from "./choice";
import { barriersStep } from "./barriers";
import { aiEditorStep } from "./ai-editor";
import { editorStep } from "./editor";
import { pdfPreviewStep } from "./pdf-preview-step";
import { exportStep } from "./export";
import type { StepModule } from "./types";

export type { StepContext, StepModule } from "./types";

/**
 * Registry of all wizard steps. The orchestrator is registry-driven — adding
 * a new step means creating `steps/<name>/` with `StepModule` export and
 * adding one line here plus an entry in `wizardSteps.ts` to position it.
 */
export const STEP_REGISTRY: Record<string, StepModule> = {
  [activityTypeStep.key]: activityTypeStep,
  [activityInputStep.key]: activityInputStep,
  [choiceStep.key]: choiceStep,
  [barriersStep.key]: barriersStep,
  [aiEditorStep.key]: aiEditorStep,
  [editorStep.key]: editorStep,
  [pdfPreviewStep.key]: pdfPreviewStep,
  [exportStep.key]: exportStep,
};
