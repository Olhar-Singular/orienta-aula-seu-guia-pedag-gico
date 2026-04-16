import type { StructuredActivity } from "@/types/adaptation";
import type {
  AdaptationResult,
  BarrierItem,
  WizardData,
} from "@/components/adaptation/AdaptationWizard";

function extractQuestionImages(
  activity: StructuredActivity,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const section of activity.sections) {
    for (const q of section.questions) {
      if (q.images && q.images.length > 0) {
        out[String(q.number)] = [...q.images];
      }
    }
  }
  return out;
}
import {
  markdownDslToStructured,
  structuredToMarkdownDsl,
} from "@/lib/activityDslConverter";
import { BARRIER_DIMENSIONS } from "@/lib/barriers";
import {
  ensureQuestionIds,
  reconcileQuestionIds,
} from "@/lib/questionIdentity";
import {
  emptySidecar,
  reconcileSidecar,
  type LayoutSidecar,
} from "@/lib/pdf/layoutSidecar";
import { migrateLegacyEditableActivity } from "@/lib/pdf/editableActivity";

function asStructured(
  v: string | StructuredActivity | undefined,
): StructuredActivity | undefined {
  if (v === undefined) return undefined;
  if (typeof v === "string") return markdownDslToStructured(v);
  return v;
}

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
    editorContentUniversal: undefined,
    editorContentDirected: undefined,
    editorContentManual: undefined,
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
/** Normalize a StructuredActivity through the parser round-trip so its shape
 *  matches freshly parsed DSL (with `content` blocks), while preserving any
 *  existing `q.id`s by positional re-attachment. */
function canonicalizeWithIds(a: StructuredActivity): StructuredActivity {
  const parsed = markdownDslToStructured(structuredToMarkdownDsl(a));
  const origs = a.sections.flatMap((s) => s.questions);
  let i = 0;
  for (const s of parsed.sections) {
    for (const q of s.questions) {
      const o = origs[i++];
      if (o?.id) q.id = o.id;
    }
  }
  return parsed;
}

/** After id+hash-based reconciliation, any `next` question that received a
 *  freshly generated id is given a chance to inherit the id of the prev
 *  question with the same `q.number`, as long as that prev id has not been
 *  claimed by an earlier match. Handles the common in-place edit case where
 *  the user simply rewrote the text of Q3 without restructuring. */
function inheritIdsByNumber(
  prev: StructuredActivity,
  next: StructuredActivity,
): StructuredActivity {
  const prevIds = new Set<string>();
  const prevByNumber = new Map<number, string>();
  for (const s of prev.sections) {
    for (const q of s.questions) {
      if (q.id) {
        prevIds.add(q.id);
        if (!prevByNumber.has(q.number)) prevByNumber.set(q.number, q.id);
      }
    }
  }

  const claimed = new Set<string>();
  for (const s of next.sections) {
    for (const q of s.questions) {
      if (q.id && prevIds.has(q.id)) claimed.add(q.id);
    }
  }

  return {
    ...next,
    sections: next.sections.map((s) => ({
      ...s,
      questions: s.questions.map((q) => {
        if (q.id && prevIds.has(q.id)) return q;
        const candidate = prevByNumber.get(q.number);
        if (candidate && !claimed.has(candidate)) {
          claimed.add(candidate);
          return { ...q, id: candidate };
        }
        return q;
      }),
    })),
  };
}

/** Given the previous (possibly id-less) activity and a freshly parsed new
 *  activity, produce versions of both with stable `q.id` filled in and the
 *  sidecar reconciled (entries for missing questions dropped, wordColors
 *  reconciled against new text). */
function reconcileActivityAndSidecar(
  prevRaw: StructuredActivity | undefined,
  nextParsed: StructuredActivity,
  prevSidecar: LayoutSidecar,
): { next: StructuredActivity; sidecar: LayoutSidecar } {
  if (!prevRaw) {
    return { next: ensureQuestionIds(nextParsed), sidecar: emptySidecar() };
  }
  const prevWithIds = ensureQuestionIds(canonicalizeWithIds(prevRaw));
  const byHash = reconcileQuestionIds(prevWithIds, nextParsed);
  const byNumber = inheritIdsByNumber(prevWithIds, byHash);
  const next = ensureQuestionIds(byNumber);
  const sidecar = reconcileSidecar(prevSidecar, prevWithIds, next);
  return { next, sidecar };
}

export function buildAIEditorAdvancePatch(
  prevData: WizardData,
  universalDsl: string,
  directedDsl: string,
): Partial<WizardData> {
  const prevResult = prevData.result;
  const prevSidecar = prevData.layoutSidecar ?? {
    version_universal: emptySidecar(),
    version_directed: emptySidecar(),
  };

  const parsedUniversal = markdownDslToStructured(universalDsl);
  const parsedDirected = markdownDslToStructured(directedDsl);

  const reconU = reconcileActivityAndSidecar(
    asStructured(prevResult?.version_universal),
    parsedUniversal,
    prevSidecar.version_universal,
  );
  const reconD = reconcileActivityAndSidecar(
    asStructured(prevResult?.version_directed),
    parsedDirected,
    prevSidecar.version_directed,
  );

  const updatedResult: AdaptationResult = {
    ...(prevResult ?? {
      strategies_applied: [],
      pedagogical_justification: "",
      implementation_tips: [],
    } as AdaptationResult),
    version_universal: reconU.next,
    version_directed: reconD.next,
  };

  const universalChanged = textChangedFromResult(universalDsl, prevResult?.version_universal);
  const directedChanged = textChangedFromResult(directedDsl, prevResult?.version_directed);

  const patch: Partial<WizardData> = {
    result: updatedResult,
    layoutSidecar: {
      version_universal: reconU.sidecar,
      version_directed: reconD.sidecar,
    },
  };
  if (universalChanged) {
    patch.editableActivity = undefined;
    patch.pdfHistoryUniversal = undefined;
  }
  if (directedChanged) {
    patch.editableActivityDirected = undefined;
    patch.pdfHistoryDirected = undefined;
  }
  if (universalChanged || directedChanged) {
    const prevImages = prevData.questionImages ?? { version_universal: {}, version_directed: {} };
    patch.questionImages = {
      version_universal: universalChanged
        ? extractQuestionImages(updatedResult.version_universal as StructuredActivity)
        : prevImages.version_universal,
      version_directed: directedChanged
        ? extractQuestionImages(updatedResult.version_directed as StructuredActivity)
        : prevImages.version_directed,
    };
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
    const nextUniversalImages = extractQuestionImages(updated);
    const nextDirectedImages = extractQuestionImages(
      result.version_directed as StructuredActivity,
    );
    patch.questionImages = {
      version_universal: nextUniversalImages,
      version_directed: nextDirectedImages,
    };
  }
  return patch;
}

function resolveBarrierLabel(dimension: string, barrierKey: string): string {
  const dim = BARRIER_DIMENSIONS.find((d) => d.key === dimension);
  if (!dim) return barrierKey;
  const b = dim.barriers.find((b) => b.key === barrierKey);
  return b?.label ?? barrierKey;
}

/** Build a partial WizardData from a saved `adaptations_history` row, ready to
 *  feed AdaptationWizard in editMode. Hydrates layout state from
 *  `adaptation_result.editable_activity_*` when present so PDF tweaks survive
 *  edit sessions. Legacy rows without those fields fall back to recompute. */
export function buildEditModeInitialData(
  row: Record<string, any>,
): Partial<WizardData> {
  const result = (row?.adaptation_result as Record<string, any>) ?? {};
  const rawBarriers: any[] = Array.isArray(row?.barriers_used) ? row.barriers_used : [];
  const barriers: BarrierItem[] = rawBarriers.map((b) => {
    const dimension = String(b?.dimension ?? "");
    const barrier_key = String(b?.barrier_key ?? "");
    return {
      dimension,
      barrier_key,
      label: typeof b?.label === "string" ? b.label : resolveBarrierLabel(dimension, barrier_key),
      is_active: true,
      notes: typeof b?.notes === "string" ? b.notes : undefined,
    };
  });

  return {
    activityType: row?.activity_type ?? null,
    activityText: row?.original_activity ?? "",
    classId: row?.class_id ?? null,
    studentId: row?.student_id ?? null,
    barriers,
    result: {
      version_universal: result.version_universal,
      version_directed: result.version_directed,
      strategies_applied: Array.isArray(result.strategies_applied) ? result.strategies_applied : [],
      pedagogical_justification: typeof result.pedagogical_justification === "string"
        ? result.pedagogical_justification
        : "",
      implementation_tips: Array.isArray(result.implementation_tips) ? result.implementation_tips : [],
    },
    questionImages: {
      version_universal: (result.question_images_universal && typeof result.question_images_universal === "object")
        ? result.question_images_universal
        : {},
      version_directed: (result.question_images_directed && typeof result.question_images_directed === "object")
        ? result.question_images_directed
        : {},
    },
    editableActivity: result.editable_activity_universal
      ? migrateLegacyEditableActivity(result.editable_activity_universal)
      : undefined,
    editableActivityDirected: result.editable_activity_directed
      ? migrateLegacyEditableActivity(result.editable_activity_directed)
      : undefined,
    wizardMode: "ai",
  };
}
