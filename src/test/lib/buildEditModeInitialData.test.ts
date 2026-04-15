import { describe, it, expect } from "vitest";
import { buildEditModeInitialData } from "@/lib/adaptationWizardHelpers";
import { MOCK_ADAPTATION_HISTORY, MOCK_ADAPTATION_RESULT } from "../fixtures";
import type { EditableActivity } from "@/lib/pdf/editableActivity";

describe("buildEditModeInitialData", () => {
  it("maps top-level row fields into WizardData", () => {
    const data = buildEditModeInitialData(MOCK_ADAPTATION_HISTORY as any);
    expect(data.activityType).toBe(MOCK_ADAPTATION_HISTORY.activity_type);
    expect(data.activityText).toBe(MOCK_ADAPTATION_HISTORY.original_activity);
    expect(data.classId).toBe(MOCK_ADAPTATION_HISTORY.class_id);
    expect(data.studentId).toBe(MOCK_ADAPTATION_HISTORY.student_id);
    expect(data.wizardMode).toBe("ai");
  });

  it("maps adaptation_result into result", () => {
    const data = buildEditModeInitialData(MOCK_ADAPTATION_HISTORY as any);
    expect(data.result).toEqual(
      expect.objectContaining({
        version_universal: MOCK_ADAPTATION_RESULT.version_universal,
        version_directed: MOCK_ADAPTATION_RESULT.version_directed,
        strategies_applied: MOCK_ADAPTATION_RESULT.strategies_applied,
        pedagogical_justification: MOCK_ADAPTATION_RESULT.pedagogical_justification,
        implementation_tips: MOCK_ADAPTATION_RESULT.implementation_tips,
      }),
    );
  });

  it("normalizes barriers_used into BarrierItem[]", () => {
    const data = buildEditModeInitialData(MOCK_ADAPTATION_HISTORY as any);
    expect(data.barriers).toBeDefined();
    expect(Array.isArray(data.barriers)).toBe(true);
    expect(data.barriers!.length).toBe(MOCK_ADAPTATION_HISTORY.barriers_used.length);
    for (const b of data.barriers!) {
      expect(b.is_active).toBe(true);
      expect(typeof b.dimension).toBe("string");
      expect(typeof b.barrier_key).toBe("string");
    }
  });

  it("maps question_images_universal/directed into questionImages", () => {
    const row = {
      ...MOCK_ADAPTATION_HISTORY,
      adaptation_result: {
        ...MOCK_ADAPTATION_RESULT,
        question_images_universal: { "1": ["https://img/u.png"] },
        question_images_directed: { "2": ["https://img/d.png"] },
      },
    };
    const data = buildEditModeInitialData(row as any);
    expect(data.questionImages?.version_universal).toEqual({ "1": ["https://img/u.png"] });
    expect(data.questionImages?.version_directed).toEqual({ "2": ["https://img/d.png"] });
  });

  it("hydrates editableActivity from editable_activity_universal/directed when present", () => {
    const universal = { pages: [{ blocks: [] }] } as unknown as EditableActivity;
    const directed = { pages: [{ blocks: [{}] }] } as unknown as EditableActivity;
    const row = {
      ...MOCK_ADAPTATION_HISTORY,
      adaptation_result: {
        ...MOCK_ADAPTATION_RESULT,
        editable_activity_universal: universal,
        editable_activity_directed: directed,
      },
    };
    const data = buildEditModeInitialData(row as any);
    expect(data.editableActivity).toBe(universal);
    expect(data.editableActivityDirected).toBe(directed);
  });

  it("falls back to undefined editableActivity when row lacks layout fields (legacy row)", () => {
    const data = buildEditModeInitialData(MOCK_ADAPTATION_HISTORY as any);
    expect(data.editableActivity).toBeUndefined();
    expect(data.editableActivityDirected).toBeUndefined();
  });

  it("survives missing optional fields without throwing", () => {
    const minimal = {
      id: "x",
      activity_type: null,
      original_activity: null,
      barriers_used: null,
      class_id: null,
      student_id: null,
      adaptation_result: { version_universal: "u", version_directed: "d" },
    };
    expect(() => buildEditModeInitialData(minimal as any)).not.toThrow();
    const data = buildEditModeInitialData(minimal as any);
    expect(data.barriers).toEqual([]);
    expect(data.questionImages?.version_universal).toEqual({});
    expect(data.questionImages?.version_directed).toEqual({});
  });
});
