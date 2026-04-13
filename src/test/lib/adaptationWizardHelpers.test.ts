import { describe, it, expect } from "vitest";
import {
  buildManualResult,
  textChangedFromResult,
  buildAIEditorAdvancePatch,
  buildManualEditorAdvancePatch,
  shouldConfirmDiscard,
} from "@/lib/adaptationWizardHelpers";
import { structuredToMarkdownDsl } from "@/lib/activityDslConverter";
import type { StructuredActivity } from "@/types/adaptation";
import type { WizardData } from "@/components/adaptation/AdaptationWizard";
import type { EditableActivity } from "@/lib/pdf/editableActivity";

const sampleActivity = (): StructuredActivity => ({
  sections: [
    {
      questions: [
        {
          number: 1,
          type: "open_ended",
          statement: "Explique fotossintese",
          images: ["https://example.com/img.png"],
        },
      ],
    },
  ],
});

describe("buildManualResult", () => {
  it("returns version_universal and version_directed with equal content", () => {
    const activity = sampleActivity();
    const result = buildManualResult(activity);
    expect(result.version_universal).toEqual(result.version_directed);
  });

  it("uses different object references for universal and directed (no shared mutation)", () => {
    const activity = sampleActivity();
    const result = buildManualResult(activity);
    expect(result.version_universal).not.toBe(result.version_directed);
  });

  it("directed is a deep clone — mutating it does not affect universal", () => {
    const activity = sampleActivity();
    const result = buildManualResult(activity);
    const directed = result.version_directed as StructuredActivity;
    directed.sections[0].questions[0].statement = "mutated";
    const universal = result.version_universal as StructuredActivity;
    expect(universal.sections[0].questions[0].statement).toBe("Explique fotossintese");
  });

  it("preserves images on both versions", () => {
    const result = buildManualResult(sampleActivity());
    const universal = result.version_universal as StructuredActivity;
    const directed = result.version_directed as StructuredActivity;
    expect(universal.sections[0].questions[0].images).toEqual(["https://example.com/img.png"]);
    expect(directed.sections[0].questions[0].images).toEqual(["https://example.com/img.png"]);
  });

  it("fills manual-mode metadata fields", () => {
    const result = buildManualResult(sampleActivity());
    expect(result.strategies_applied).toEqual([]);
    expect(result.pedagogical_justification).toContain("manualmente");
    expect(result.implementation_tips).toEqual([]);
  });
});

describe("textChangedFromResult", () => {
  it("returns true when current version is undefined", () => {
    expect(textChangedFromResult("anything", undefined)).toBe(true);
  });

  it("returns false when DSL matches serialized structured version", () => {
    const activity = sampleActivity();
    const dsl = structuredToMarkdownDsl(activity);
    expect(textChangedFromResult(dsl, activity)).toBe(false);
  });

  it("returns true when DSL differs from current version (content change)", () => {
    const activity = sampleActivity();
    const dsl = structuredToMarkdownDsl(activity) + "\n\n99) pergunta nova";
    expect(textChangedFromResult(dsl, activity)).toBe(true);
  });

  it("returns false when DSL is a string version equal to itself (round-trip stable)", () => {
    const dsl = "1) Quanto é 2 + 2?\na) 3\nb*) 4\nc) 5";
    expect(textChangedFromResult(dsl, dsl)).toBe(false);
  });

  it("ignores trailing whitespace differences", () => {
    const activity = sampleActivity();
    const dsl = structuredToMarkdownDsl(activity) + "\n\n   \n";
    expect(textChangedFromResult(dsl, activity)).toBe(false);
  });
});

describe("buildAIEditorAdvancePatch", () => {
  const baseResult = {
    version_universal: sampleActivity(),
    version_directed: sampleActivity(),
    strategies_applied: [],
    pedagogical_justification: "",
    implementation_tips: [],
  };
  const editable = { questions: [], header: {}, globalShowSeparators: true } as unknown as EditableActivity;
  const baseData = {
    result: baseResult,
    editableActivity: editable,
    editableActivityDirected: editable,
    pdfLayout: { header: {}, globalShowSeparators: true, questionLayouts: {}, contentOverrides: {} },
  } as unknown as WizardData;

  it("preserves editableActivity and editableActivityDirected when neither DSL changed", () => {
    const universalDsl = structuredToMarkdownDsl(baseResult.version_universal);
    const directedDsl = structuredToMarkdownDsl(baseResult.version_directed);
    const patch = buildAIEditorAdvancePatch(baseData, universalDsl, directedDsl);
    expect(patch.result).toBeDefined();
    expect("editableActivity" in patch).toBe(false);
    expect("editableActivityDirected" in patch).toBe(false);
    expect("pdfLayout" in patch).toBe(false);
  });

  it("invalidates only editableActivity when universal DSL changed", () => {
    const universalDsl = structuredToMarkdownDsl(baseResult.version_universal) + "\n99) nova";
    const directedDsl = structuredToMarkdownDsl(baseResult.version_directed);
    const patch = buildAIEditorAdvancePatch(baseData, universalDsl, directedDsl);
    expect(patch.editableActivity).toBeUndefined();
    expect("editableActivity" in patch).toBe(true);
    expect("editableActivityDirected" in patch).toBe(false);
  });

  it("invalidates only editableActivityDirected when directed DSL changed", () => {
    const universalDsl = structuredToMarkdownDsl(baseResult.version_universal);
    const directedDsl = structuredToMarkdownDsl(baseResult.version_directed) + "\n99) nova";
    const patch = buildAIEditorAdvancePatch(baseData, universalDsl, directedDsl);
    expect("editableActivityDirected" in patch).toBe(true);
    expect(patch.editableActivityDirected).toBeUndefined();
    expect("editableActivity" in patch).toBe(false);
  });

  it("invalidates pdfLayout when any version changed", () => {
    const universalDsl = structuredToMarkdownDsl(baseResult.version_universal) + "\n99) nova";
    const directedDsl = structuredToMarkdownDsl(baseResult.version_directed);
    const patch = buildAIEditorAdvancePatch(baseData, universalDsl, directedDsl);
    expect("pdfLayout" in patch).toBe(true);
    expect(patch.pdfLayout).toBeUndefined();
  });

  it("result.version_universal/directed reflect parsed DSL", () => {
    const universalDsl = "1) nova pergunta universal";
    const directedDsl = "1) nova pergunta direcionada";
    const patch = buildAIEditorAdvancePatch(baseData, universalDsl, directedDsl);
    const universal = patch.result!.version_universal as StructuredActivity;
    const directed = patch.result!.version_directed as StructuredActivity;
    expect(universal.sections[0].questions[0].statement).toContain("nova pergunta universal");
    expect(directed.sections[0].questions[0].statement).toContain("nova pergunta direcionada");
  });
});

describe("buildManualEditorAdvancePatch", () => {
  const editable = { questions: [], header: {}, globalShowSeparators: true } as unknown as EditableActivity;

  it("preserves layout state when the updated activity matches the current result", () => {
    const activity = sampleActivity();
    const prev = {
      result: buildManualResult(activity),
      editableActivity: editable,
      editableActivityDirected: editable,
      pdfLayout: { header: {}, globalShowSeparators: true, questionLayouts: {}, contentOverrides: {} },
    } as unknown as WizardData;
    const patch = buildManualEditorAdvancePatch(activity, prev);
    expect(patch.result).toBeDefined();
    expect("editableActivity" in patch).toBe(false);
    expect("editableActivityDirected" in patch).toBe(false);
    expect("pdfLayout" in patch).toBe(false);
  });

  it("invalidates layout state when the updated activity differs", () => {
    const prev = {
      result: buildManualResult(sampleActivity()),
      editableActivity: editable,
      editableActivityDirected: editable,
      pdfLayout: { header: {}, globalShowSeparators: true, questionLayouts: {}, contentOverrides: {} },
    } as unknown as WizardData;
    const changed: StructuredActivity = {
      sections: [
        {
          questions: [
            { number: 1, type: "open_ended", statement: "Pergunta diferente" },
          ],
        },
      ],
    };
    const patch = buildManualEditorAdvancePatch(changed, prev);
    expect("editableActivity" in patch).toBe(true);
    expect(patch.editableActivity).toBeUndefined();
    expect("editableActivityDirected" in patch).toBe(true);
    expect("pdfLayout" in patch).toBe(true);
    expect(patch.pdfLayout).toBeUndefined();
  });

  it("invalidates when previous result is null (first time through)", () => {
    const prev = { result: null } as unknown as WizardData;
    const patch = buildManualEditorAdvancePatch(sampleActivity(), prev);
    expect("editableActivity" in patch).toBe(true);
  });
});

describe("shouldConfirmDiscard", () => {
  const aiSteps = ["type", "content", "barriers", "choice", "ai_editor", "pdf_preview", "export"] as const;
  const manualSteps = ["type", "content", "barriers", "choice", "editor", "pdf_preview", "export"] as const;

  it("returns false when there is no result yet (nothing to discard)", () => {
    const currentStep = aiSteps.indexOf("pdf_preview");
    const target = aiSteps.indexOf("barriers");
    expect(shouldConfirmDiscard(aiSteps, currentStep, target, false)).toBe(false);
  });

  it("returns false when navigating back within the editor/preview range", () => {
    const currentStep = aiSteps.indexOf("pdf_preview");
    const target = aiSteps.indexOf("ai_editor");
    expect(shouldConfirmDiscard(aiSteps, currentStep, target, true)).toBe(false);
  });

  it("returns true when going back from pdf_preview to barriers in AI mode with result", () => {
    const currentStep = aiSteps.indexOf("pdf_preview");
    const target = aiSteps.indexOf("barriers");
    expect(shouldConfirmDiscard(aiSteps, currentStep, target, true)).toBe(true);
  });

  it("returns true when going back from ai_editor to content in AI mode with result", () => {
    const currentStep = aiSteps.indexOf("ai_editor");
    const target = aiSteps.indexOf("content");
    expect(shouldConfirmDiscard(aiSteps, currentStep, target, true)).toBe(true);
  });

  it("returns true when going back from pdf_preview to barriers in MANUAL mode with result (Bug 5)", () => {
    const currentStep = manualSteps.indexOf("pdf_preview");
    const target = manualSteps.indexOf("barriers");
    expect(shouldConfirmDiscard(manualSteps, currentStep, target, true)).toBe(true);
  });

  it("returns true when going back from editor to content in MANUAL mode with result", () => {
    const currentStep = manualSteps.indexOf("editor");
    const target = manualSteps.indexOf("content");
    expect(shouldConfirmDiscard(manualSteps, currentStep, target, true)).toBe(true);
  });

  it("returns false when currently before the editor step (nothing to protect yet)", () => {
    const currentStep = aiSteps.indexOf("barriers");
    const target = aiSteps.indexOf("content");
    expect(shouldConfirmDiscard(aiSteps, currentStep, target, true)).toBe(false);
  });

  it("returns false when both current and target are inside the editor/preview range", () => {
    const currentStep = manualSteps.indexOf("pdf_preview");
    const target = manualSteps.indexOf("editor");
    expect(shouldConfirmDiscard(manualSteps, currentStep, target, true)).toBe(false);
  });
});
