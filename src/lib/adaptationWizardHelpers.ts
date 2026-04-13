import type { StructuredActivity } from "@/types/adaptation";
import type { AdaptationResult, WizardData } from "@/components/adaptation/AdaptationWizard";
import {
  markdownDslToStructured,
  structuredToMarkdownDsl,
} from "@/lib/activityDslConverter";

export function buildManualResult(activity: StructuredActivity): AdaptationResult {
  return {
    version_universal: activity,
    version_directed: structuredClone(activity),
    strategies_applied: [],
    pedagogical_justification: "Atividade editada manualmente pelo professor.",
    implementation_tips: [],
  };
}

/** Normalize a DSL string for structural comparison (trims trailing whitespace,
 *  unifies CRLF). We also re-serialize through the structured form so that
 *  equivalent-but-differently-formatted DSLs compare equal. */
function canonicalizeDsl(dsl: string): string {
  const parsed = markdownDslToStructured(dsl);
  return structuredToMarkdownDsl(parsed).trimEnd();
}

function canonicalizeVersion(version: string | StructuredActivity): string {
  const dsl = typeof version === "string" ? version : structuredToMarkdownDsl(version);
  return canonicalizeDsl(dsl);
}

/** True when `newDsl` differs structurally from `currentVersion`.
 *  Used to avoid wiping layout state when the user returned to the editor
 *  without actually editing. */
export function textChangedFromResult(
  newDsl: string,
  currentVersion: string | StructuredActivity | undefined,
): boolean {
  if (currentVersion === undefined) return true;
  return canonicalizeDsl(newDsl) !== canonicalizeVersion(currentVersion);
}

/** Build the partial WizardData patch written by StepAIEditor.handleNext.
 *  Only invalidates layout state for versions whose DSL actually changed. */
export function buildAIEditorAdvancePatch(
  prevData: WizardData,
  universalDsl: string,
  directedDsl: string,
): Partial<WizardData> {
  const prevResult = prevData.result;
  const updatedResult: AdaptationResult = {
    ...(prevResult ?? {
      strategies_applied: [],
      pedagogical_justification: "",
      implementation_tips: [],
    } as AdaptationResult),
    version_universal: markdownDslToStructured(universalDsl),
    version_directed: markdownDslToStructured(directedDsl),
  };

  const universalChanged = textChangedFromResult(universalDsl, prevResult?.version_universal);
  const directedChanged = textChangedFromResult(directedDsl, prevResult?.version_directed);

  const patch: Partial<WizardData> = { result: updatedResult };
  if (universalChanged) patch.editableActivity = undefined;
  if (directedChanged) patch.editableActivityDirected = undefined;
  if (universalChanged || directedChanged) patch.pdfLayout = undefined;
  return patch;
}

/** True when going back from `currentStep` to `target` should trigger the
 *  "descartar resultado?" confirmation dialog. Covers both AI (ai_editor) and
 *  manual (editor) wizard modes. */
export function shouldConfirmDiscard(
  steps: readonly string[],
  currentStep: number,
  target: number,
  hasResult: boolean,
): boolean {
  if (!hasResult) return false;
  const editorIndex = Math.max(
    steps.indexOf("ai_editor"),
    steps.indexOf("editor"),
  );
  if (editorIndex === -1) return false;
  return currentStep >= editorIndex && target < editorIndex;
}

/** Build the partial WizardData patch written by the manual-mode editor.onNext
 *  handler. Only invalidates layout state when the updated activity differs
 *  from the previous result. */
export function buildManualEditorAdvancePatch(
  updated: StructuredActivity,
  prevData: WizardData,
): Partial<WizardData> {
  const prevUniversal = prevData.result?.version_universal;
  const dsl = structuredToMarkdownDsl(updated);
  const changed = textChangedFromResult(dsl, prevUniversal);

  const patch: Partial<WizardData> = { result: buildManualResult(updated) };
  if (changed) {
    patch.editableActivity = undefined;
    patch.editableActivityDirected = undefined;
    patch.pdfLayout = undefined;
  }
  return patch;
}
