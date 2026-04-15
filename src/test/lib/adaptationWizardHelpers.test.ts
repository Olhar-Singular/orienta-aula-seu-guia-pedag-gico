import { describe, it, expect } from "vitest";
import {
  buildManualResult,
  textChangedFromResult,
  buildAIEditorAdvancePatch,
  buildManualEditorAdvancePatch,
  shouldConfirmDiscard,
  resyncStepForNewMode,
  resetGeneratedState,
} from "@/lib/adaptationWizardHelpers";
import { getStepsForMode } from "@/lib/wizardSteps";
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
  } as unknown as WizardData;

  it("preserves editableActivity and editableActivityDirected when neither DSL changed", () => {
    const universalDsl = structuredToMarkdownDsl(baseResult.version_universal);
    const directedDsl = structuredToMarkdownDsl(baseResult.version_directed);
    const patch = buildAIEditorAdvancePatch(baseData, universalDsl, directedDsl);
    expect(patch.result).toBeDefined();
    expect("editableActivity" in patch).toBe(false);
    expect("editableActivityDirected" in patch).toBe(false);
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

  it("result.version_universal/directed reflect parsed DSL", () => {
    const universalDsl = "1) nova pergunta universal";
    const directedDsl = "1) nova pergunta direcionada";
    const patch = buildAIEditorAdvancePatch(baseData, universalDsl, directedDsl);
    const universal = patch.result!.version_universal as StructuredActivity;
    const directed = patch.result!.version_directed as StructuredActivity;
    expect(universal.sections[0].questions[0].statement).toContain("nova pergunta universal");
    expect(directed.sections[0].questions[0].statement).toContain("nova pergunta direcionada");
  });

  it("rebuilds questionImages from new DSL when universal DSL changed (image removed)", () => {
    const prev = {
      result: baseResult,
      questionImages: {
        version_universal: { "1": ["https://example.com/img.png"] },
        version_directed: { "1": ["https://example.com/img.png"] },
      },
    } as unknown as WizardData;
    const universalDsl = "1) Explique fotossintese";
    const directedDsl = structuredToMarkdownDsl(baseResult.version_directed);
    const patch = buildAIEditorAdvancePatch(prev, universalDsl, directedDsl);
    expect(patch.questionImages).toBeDefined();
    expect(patch.questionImages!.version_universal).toEqual({});
    expect(patch.questionImages!.version_directed).toEqual({
      "1": ["https://example.com/img.png"],
    });
  });

  it("rebuilds questionImages preserving images still referenced in DSL", () => {
    const prev = {
      result: baseResult,
      questionImages: {
        version_universal: { "1": ["https://example.com/stale.png"] },
        version_directed: {},
      },
    } as unknown as WizardData;
    const universalDsl = "1) Explique fotossintese\n[img:https://example.com/fresh.png]";
    const directedDsl = structuredToMarkdownDsl(baseResult.version_directed);
    const patch = buildAIEditorAdvancePatch(prev, universalDsl, directedDsl);
    expect(patch.questionImages!.version_universal).toEqual({
      "1": ["https://example.com/fresh.png"],
    });
  });

  it("leaves questionImages untouched when DSL did not change", () => {
    const prev = {
      result: baseResult,
      questionImages: {
        version_universal: { "1": ["https://example.com/img.png"] },
        version_directed: { "1": ["https://example.com/img.png"] },
      },
    } as unknown as WizardData;
    const universalDsl = structuredToMarkdownDsl(baseResult.version_universal);
    const directedDsl = structuredToMarkdownDsl(baseResult.version_directed);
    const patch = buildAIEditorAdvancePatch(prev, universalDsl, directedDsl);
    expect("questionImages" in patch).toBe(false);
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
    } as unknown as WizardData;
    const patch = buildManualEditorAdvancePatch(activity, prev);
    expect(patch.result).toBeDefined();
    expect("editableActivity" in patch).toBe(false);
    expect("editableActivityDirected" in patch).toBe(false);
  });

  it("invalidates layout state when the updated activity differs", () => {
    const prev = {
      result: buildManualResult(sampleActivity()),
      editableActivity: editable,
      editableActivityDirected: editable,
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
  });

  it("invalidates when previous result is null (first time through)", () => {
    const prev = { result: null } as unknown as WizardData;
    const patch = buildManualEditorAdvancePatch(sampleActivity(), prev);
    expect("editableActivity" in patch).toBe(true);
  });

  it("preserves prev version_directed when text is unchanged (Bug 4)", () => {
    const universal = sampleActivity();
    const customDirected: StructuredActivity = {
      sections: [
        {
          questions: [
            {
              number: 1,
              type: "open_ended",
              statement: "Versão direcionada customizada pelo professor",
              images: ["https://example.com/custom.png"],
            },
          ],
        },
      ],
    };
    const prev = {
      result: {
        version_universal: universal,
        version_directed: customDirected,
        strategies_applied: [],
        pedagogical_justification: "x",
        implementation_tips: [],
      },
    } as unknown as WizardData;

    const patch = buildManualEditorAdvancePatch(universal, prev);
    const directed = patch.result!.version_directed as StructuredActivity;
    expect(directed.sections[0].questions[0].statement).toBe(
      "Versão direcionada customizada pelo professor",
    );
    expect(directed.sections[0].questions[0].images).toEqual([
      "https://example.com/custom.png",
    ]);
  });

  it("clones new universal to directed when text changed (Bug 4 — fresh diff wins)", () => {
    const prev = {
      result: buildManualResult(sampleActivity()),
    } as unknown as WizardData;
    const changed: StructuredActivity = {
      sections: [
        {
          questions: [
            { number: 1, type: "open_ended", statement: "Texto totalmente novo" },
          ],
        },
      ],
    };
    const patch = buildManualEditorAdvancePatch(changed, prev);
    const directed = patch.result!.version_directed as StructuredActivity;
    expect(directed.sections[0].questions[0].statement).toBe("Texto totalmente novo");
  });

  it("rebuilds questionImages from updated activity when text changed (image removed)", () => {
    const prev = {
      result: buildManualResult(sampleActivity()),
      questionImages: {
        version_universal: { "1": ["https://example.com/img.png"] },
        version_directed: { "1": ["https://example.com/img.png"] },
      },
    } as unknown as WizardData;
    const changed: StructuredActivity = {
      sections: [
        {
          questions: [
            { number: 1, type: "open_ended", statement: "Pergunta sem imagem" },
          ],
        },
      ],
    };
    const patch = buildManualEditorAdvancePatch(changed, prev);
    expect(patch.questionImages).toBeDefined();
    expect(patch.questionImages!.version_universal).toEqual({});
    expect(patch.questionImages!.version_directed).toEqual({});
  });

  it("leaves questionImages untouched when updated activity matches prev result", () => {
    const activity = sampleActivity();
    const prev = {
      result: buildManualResult(activity),
      questionImages: {
        version_universal: { "1": ["https://example.com/img.png"] },
        version_directed: { "1": ["https://example.com/img.png"] },
      },
    } as unknown as WizardData;
    const patch = buildManualEditorAdvancePatch(activity, prev);
    expect("questionImages" in patch).toBe(false);
  });

  it("falls back to clone when no previous directed exists", () => {
    const prev = {
      result: {
        version_universal: sampleActivity(),
        strategies_applied: [],
        pedagogical_justification: "",
        implementation_tips: [],
      },
    } as unknown as WizardData;
    const activity = sampleActivity();
    const patch = buildManualEditorAdvancePatch(activity, prev);
    const directed = patch.result!.version_directed as StructuredActivity;
    expect(directed.sections[0].questions[0].statement).toBe(
      "Explique fotossintese",
    );
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

describe("STEP_SEQUENCES invariant (Bug 6 — landmine prevention)", () => {
  it("AI and manual sequences have the same length", () => {
    const ai = getStepsForMode("ai");
    const manual = getStepsForMode("manual");
    expect(ai.length).toBe(manual.length);
  });

  it("shared step keys appear at the same index in both modes", () => {
    const ai = getStepsForMode("ai");
    const manual = getStepsForMode("manual");
    for (const key of ai) {
      const aiIdx = ai.indexOf(key);
      const manualIdx = manual.indexOf(key);
      if (manualIdx !== -1) {
        expect(manualIdx, `step "${key}" diverges between modes`).toBe(aiIdx);
      }
    }
  });

  it("choice step is at the same index in both modes", () => {
    expect(getStepsForMode("ai").indexOf("choice")).toBe(
      getStepsForMode("manual").indexOf("choice"),
    );
  });
});

describe("resyncStepForNewMode (Bug 6)", () => {
  const ai = ["type", "content", "barriers", "choice", "ai_editor", "pdf_preview", "export"] as const;
  const manual = ["type", "content", "barriers", "choice", "editor", "pdf_preview", "export"] as const;

  it("returns the new index for a step key present in both modes", () => {
    expect(resyncStepForNewMode("pdf_preview", manual)).toBe(
      manual.indexOf("pdf_preview"),
    );
  });

  it("falls back to choice when the current step key does not exist in the new mode", () => {
    expect(resyncStepForNewMode("ai_editor", manual)).toBe(
      manual.indexOf("choice"),
    );
  });

  it("falls back to 0 when neither the current key nor choice exists", () => {
    const weird = ["foo", "bar"] as const;
    expect(resyncStepForNewMode("ai_editor", weird)).toBe(0);
  });

  it("returns the existing index when the key and mode already match (no-op)", () => {
    expect(resyncStepForNewMode("barriers", ai)).toBe(ai.indexOf("barriers"));
  });
});

describe("resetGeneratedState", () => {
  it("clears every field derived from a generation (result, drafts, layout, history, registry)", () => {
    const patch = resetGeneratedState();
    const expectedKeys: Array<keyof WizardData> = [
      "result",
      "contextPillars",
      "questionImages",
      "editableActivity",
      "editableActivityDirected",
      "pdfHistoryUniversal",
      "pdfHistoryDirected",
      "editorContentUniversal",
      "editorContentDirected",
      "editorContentManual",
    ];
    for (const k of expectedKeys) {
      expect(k in patch).toBe(true);
    }
    expect(patch.result).toBeNull();
    expect(patch.contextPillars).toBeNull();
    expect(patch.questionImages).toEqual({ version_universal: {}, version_directed: {} });
    expect(patch.editableActivity).toBeUndefined();
    expect(patch.editableActivityDirected).toBeUndefined();
    expect(patch.pdfHistoryUniversal).toBeUndefined();
    expect(patch.pdfHistoryDirected).toBeUndefined();
    expect(patch.editorContentUniversal).toBeUndefined();
    expect(patch.editorContentDirected).toBeUndefined();
    expect(patch.editorContentManual).toBeUndefined();
  });

  it("does not touch user-provided wizard inputs (activityType, barriers, classId etc.)", () => {
    const patch = resetGeneratedState();
    expect("activityType" in patch).toBe(false);
    expect("activityText" in patch).toBe(false);
    expect("selectedQuestions" in patch).toBe(false);
    expect("classId" in patch).toBe(false);
    expect("studentId" in patch).toBe(false);
    expect("studentName" in patch).toBe(false);
    expect("barriers" in patch).toBe(false);
    expect("adaptForWholeClass" in patch).toBe(false);
    expect("observationNotes" in patch).toBe(false);
    expect("wizardMode" in patch).toBe(false);
  });
});
