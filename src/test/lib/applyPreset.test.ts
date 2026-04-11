import { describe, it, expect } from "vitest";
import { applyPreset } from "@/lib/pdf/applyPreset";
import type { EditableActivity } from "@/lib/pdf/editableActivity";
import { STYLE_PRESETS } from "@/types/adaptation";

const MOCK_ACTIVITY: EditableActivity = {
  header: {
    schoolName: "Escola",
    subject: "Matematica",
    teacherName: "Prof.",
    className: "5A",
    date: "10/04/2026",
    showStudentLine: true,
  },
  globalShowSeparators: false,
  questions: [
    {
      id: "q1",
      number: 1,
      content: [
        { id: "b1", type: "text", content: "Texto da questao 1" },
        { id: "b2", type: "image", src: "data:image/png;base64,abc", width: 0.5, alignment: "center" },
      ],
      alternatives: ["a) Opcao A", "b) Opcao B"],
      spacingAfter: 20,
      alternativeIndent: 12,
    },
    {
      id: "q2",
      number: 2,
      content: [
        { id: "b3", type: "text", content: "Texto da questao 2", style: { fontSize: 16, bold: true } },
      ],
    },
  ],
};

describe("applyPreset", () => {
  it("applies formal preset text style to all text blocks", () => {
    const formal = STYLE_PRESETS.find((p) => p.id === "formal")!;
    const result = applyPreset(MOCK_ACTIVITY, formal);

    // Text blocks get the preset style
    const textBlocks = result.questions.flatMap((q) =>
      q.content.filter((b) => b.type === "text"),
    );
    for (const block of textBlocks) {
      if (block.type === "text") {
        expect(block.style).toEqual(formal.textStyle);
      }
    }
  });

  it("does not modify image blocks", () => {
    const formal = STYLE_PRESETS.find((p) => p.id === "formal")!;
    const result = applyPreset(MOCK_ACTIVITY, formal);

    const imgBlock = result.questions[0].content.find((b) => b.type === "image");
    expect(imgBlock).toMatchObject({
      type: "image",
      src: "data:image/png;base64,abc",
      width: 0.5,
      alignment: "center",
    });
  });

  it("applies spacing and indent from preset", () => {
    const highContrast = STYLE_PRESETS.find((p) => p.id === "high-contrast")!;
    const result = applyPreset(MOCK_ACTIVITY, highContrast);

    for (const q of result.questions) {
      expect(q.spacingAfter).toBe(highContrast.questionSpacing);
      expect(q.alternativeIndent).toBe(highContrast.alternativeIndent);
    }
  });

  it("preserves header and globalShowSeparators", () => {
    const formal = STYLE_PRESETS.find((p) => p.id === "formal")!;
    const result = applyPreset(MOCK_ACTIVITY, formal);

    expect(result.header).toEqual(MOCK_ACTIVITY.header);
    expect(result.globalShowSeparators).toBe(MOCK_ACTIVITY.globalShowSeparators);
  });

  it("overrides existing text styles", () => {
    const light = STYLE_PRESETS.find((p) => p.id === "light")!;
    const result = applyPreset(MOCK_ACTIVITY, light);

    // Q2 had bold:true, fontSize:16 - should be overridden
    const q2Text = result.questions[1].content[0];
    if (q2Text.type === "text") {
      expect(q2Text.style?.bold).toBe(false);
      expect(q2Text.style?.fontSize).toBe(11);
    }
  });
});
