import type { StructuredActivity } from "@/types/adaptation";
import type { AdaptationResult, WizardData } from "@/components/adaptation/AdaptationWizard";
import {
  markdownDslToStructured,
  structuredToMarkdownDsl,
} from "@/lib/activityDslConverter";

/** Partial WizardData patch that wipes every field derived from a generation:
 *  the result, AI/manual editor drafts, layout state, history, and registries.
 *  Used wherever a fresh adaptation must invalidate previous downstream state
 *  (regenerate, restart, "descartar resultado"). User inputs (activityType,
 *  barriers, etc.) are intentionally left untouched. */
export function resetGeneratedState(): Partial<WizardData> {
  return {
    result: null,
    contextPillars: null,
    questionImages: { version_universal: {}, version_directed: {} },
    editableActivity: undefined,
    editableActivityDirected: undefined,
    pdfHistoryUniversal: undefined,
    pdfHistoryDirected: undefined,
    aiEditorUniversalDsl: undefined,
    aiEditorDirectedDsl: undefined,
    manualEditorDsl: undefined,
    editorImageRegistry: undefined,
  };
}

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
  if (universalChanged) {
    patch.editableActivity = undefined;
    patch.pdfHistoryUniversal = undefined;
  }
  if (directedChanged) {
    patch.editableActivityDirected = undefined;
    patch.pdfHistoryDirected = undefined;
  }
  return patch;
}

/** Re-resolve the wizard step index when the user switches mode. Tries to
 *  keep the same step key; if the new mode lacks that key, falls back to
 *  `choice` so the user re-enters a known state. Last resort: index 0. */
export function resyncStepForNewMode(
  currentStepKey: string,
  newSteps: readonly string[],
): number {
  const directIdx = newSteps.indexOf(currentStepKey);
  if (directIdx !== -1) return directIdx;
  const choiceIdx = newSteps.indexOf("choice");
  return choiceIdx !== -1 ? choiceIdx : 0;
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
 *  from the previous result. Preserves `version_directed` when the editor text
 *  is unchanged — the manual editor only edits the universal text, so any
 *  customization the teacher did on the directed tab in the preview step must
 *  survive round-trips through the editor. */
export function buildManualEditorAdvancePatch(
  updated: StructuredActivity,
  prevData: WizardData,
): Partial<WizardData> {
  const prevResult = prevData.result;
  const prevUniversal = prevResult?.version_universal;
  const prevDirected = prevResult?.version_directed;
  const dsl = structuredToMarkdownDsl(updated);
  const changed = textChangedFromResult(dsl, prevUniversal);

  const result: AdaptationResult = {
    strategies_applied: prevResult?.strategies_applied ?? [],
    pedagogical_justification:
      prevResult?.pedagogical_justification ??
      "Atividade editada manualmente pelo professor.",
    implementation_tips: prevResult?.implementation_tips ?? [],
    version_universal: updated,
    version_directed:
      !changed && prevDirected !== undefined
        ? prevDirected
        : structuredClone(updated),
  };

  const patch: Partial<WizardData> = { result };
  if (changed) {
    patch.editableActivity = undefined;
    patch.editableActivityDirected = undefined;
    patch.pdfHistoryUniversal = undefined;
    patch.pdfHistoryDirected = undefined;
  }
  return patch;
}
