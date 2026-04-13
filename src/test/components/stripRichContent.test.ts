import { describe, it, expect } from "vitest";
import { stripRichContent } from "@/lib/pdf/inlineRunUtils";
import type { EditableActivity } from "@/lib/pdf/editableActivity";

const sampleActivity = (): EditableActivity => ({
  header: {
    schoolName: "Escola",
    subject: "Matematica",
    teacherName: "Prof",
    className: "5A",
    date: "11/04/2026",
    showStudentLine: true,
  },
  globalShowSeparators: false,
  questions: [
    {
      id: "q1",
      number: 1,
      content: [
        {
          id: "t1",
          type: "text",
          content: "Leia com atencao",
          richContent: [
            { text: "Leia com " },
            { text: "atencao", color: "#dc2626" },
          ],
        },
        {
          id: "img1",
          type: "image",
          src: "https://example.com/a.png",
          width: 0.5,
          alignment: "center",
        },
      ],
    },
    {
      id: "q2",
      number: 2,
      content: [
        { id: "t2", type: "text", content: "Plain" },
        { id: "t3", type: "text", content: "Colorido", richContent: [{ text: "Colorido", color: "#2563eb" }] },
      ],
    },
  ],
});

describe("stripRichContent", () => {
  it("returns undefined when activity is undefined", () => {
    expect(stripRichContent(undefined)).toBeUndefined();
  });

  it("removes richContent from every text block", () => {
    const result = stripRichContent(sampleActivity())!;
    for (const q of result.questions) {
      for (const block of q.content) {
        if (block.type === "text") {
          expect(block.richContent).toBeUndefined();
        }
      }
    }
  });

  it("preserves plain content on text blocks", () => {
    const result = stripRichContent(sampleActivity())!;
    const texts = result.questions.flatMap((q) =>
      q.content.filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text"),
    );
    expect(texts.map((t) => t.content)).toEqual([
      "Leia com atencao",
      "Plain",
      "Colorido",
    ]);
  });

  it("preserves non-text blocks untouched", () => {
    const result = stripRichContent(sampleActivity())!;
    const image = result.questions[0].content[1];
    expect(image.type).toBe("image");
    if (image.type === "image") {
      expect(image.src).toBe("https://example.com/a.png");
      expect(image.width).toBe(0.5);
      expect(image.alignment).toBe("center");
    }
  });

  it("preserves header and globalShowSeparators", () => {
    const original = sampleActivity();
    const result = stripRichContent(original)!;
    expect(result.header).toEqual(original.header);
    expect(result.globalShowSeparators).toBe(original.globalShowSeparators);
  });

  it("is a pure function — does not mutate input", () => {
    const original = sampleActivity();
    const snapshot = JSON.parse(JSON.stringify(original));
    stripRichContent(original);
    expect(original).toEqual(snapshot);
  });

  it("is idempotent — running twice gives same result as once", () => {
    const once = stripRichContent(sampleActivity());
    const twice = stripRichContent(once);
    expect(twice).toEqual(once);
  });

  it("handles activity with no text blocks", () => {
    const noText: EditableActivity = {
      ...sampleActivity(),
      questions: [
        {
          id: "q1",
          number: 1,
          content: [{ id: "pb1", type: "page_break" }],
        },
      ],
    };
    const result = stripRichContent(noText)!;
    expect(result.questions[0].content[0].type).toBe("page_break");
  });
});
