import { describe, it, expect } from "vitest";
import {
  toEditableActivity,
  type EditableActivity,
} from "@/lib/pdf/editableActivity";
import type {
  StructuredActivity,
  ActivityHeader,
} from "@/types/adaptation";

const HEADER: ActivityHeader = {
  schoolName: "Escola Teste",
  subject: "Matematica",
  teacherName: "Prof. Teste",
  className: "5A",
  date: "10/04/2026",
  showStudentLine: true,
};

describe("toEditableActivity", () => {
  it("converts a StructuredActivity with legacy questions to editable format", () => {
    const structured: StructuredActivity = {
      sections: [
        {
          title: "Parte 1",
          questions: [
            {
              number: 1,
              type: "multiple_choice",
              statement: "Qual e a capital do Brasil?",
              alternatives: [
                { letter: "a", text: "Rio de Janeiro" },
                { letter: "b", text: "Brasilia", is_correct: true },
              ],
            },
            {
              number: 2,
              type: "open_ended",
              statement: "Explique a fotossintese.",
              images: ["https://example.com/foto.png"],
            },
          ],
        },
      ],
    };

    const result = toEditableActivity(structured, HEADER);

    expect(result.header).toEqual(HEADER);
    expect(result.globalShowSeparators).toBe(false);
    expect(result.questions).toHaveLength(2);

    // Question 1: statement converted to text block
    expect(result.questions[0].content).toHaveLength(1);
    expect(result.questions[0].content[0]).toMatchObject({
      type: "text",
      content: "Qual e a capital do Brasil?",
    });
    expect(result.questions[0].alternatives).toEqual([
      "a) Rio de Janeiro",
      "b) Brasilia",
    ]);

    // Question 2: statement + image
    expect(result.questions[1].content).toHaveLength(2);
    expect(result.questions[1].content[0]).toMatchObject({ type: "text" });
    expect(result.questions[1].content[1]).toMatchObject({
      type: "image",
      src: "https://example.com/foto.png",
    });
  });

  it("preserves content blocks when question already has them", () => {
    const structured: StructuredActivity = {
      sections: [
        {
          questions: [
            {
              number: 1,
              type: "open_ended",
              statement: "legacy text",
              content: [
                { id: "b1", type: "text", content: "already migrated" },
              ],
            },
          ],
        },
      ],
    };

    const result = toEditableActivity(structured, HEADER);

    expect(result.questions[0].content).toHaveLength(1);
    expect(result.questions[0].content[0]).toMatchObject({
      id: "b1",
      type: "text",
      content: "already migrated",
    });
  });

  it("flattens multiple sections into a single question list", () => {
    const structured: StructuredActivity = {
      sections: [
        { questions: [{ number: 1, type: "open_ended", statement: "Q1" }] },
        { questions: [{ number: 2, type: "open_ended", statement: "Q2" }] },
      ],
    };

    const result = toEditableActivity(structured, HEADER);

    expect(result.questions).toHaveLength(2);
    expect(result.questions[0].number).toBe(1);
    expect(result.questions[1].number).toBe(2);
  });

  it("merges external questionImages into content blocks", () => {
    const structured: StructuredActivity = {
      sections: [
        {
          questions: [
            {
              number: 1,
              type: "open_ended",
              statement: "Observe a imagem:",
            },
            {
              number: 2,
              type: "open_ended",
              statement: "Outra questao",
            },
          ],
        },
      ],
    };

    const questionImages: Record<string, string[]> = {
      "1": ["https://example.com/img1.png", "https://example.com/img2.png"],
      "2": ["https://example.com/img3.png"],
    };

    const result = toEditableActivity(structured, HEADER, questionImages);

    // Q1: text block + 2 image blocks
    expect(result.questions[0].content).toHaveLength(3);
    expect(result.questions[0].content[1]).toMatchObject({
      type: "image",
      src: "https://example.com/img1.png",
    });
    expect(result.questions[0].content[2]).toMatchObject({
      type: "image",
      src: "https://example.com/img2.png",
    });

    // Q2: text block + 1 image block
    expect(result.questions[1].content).toHaveLength(2);
    expect(result.questions[1].content[1]).toMatchObject({
      type: "image",
      src: "https://example.com/img3.png",
    });
  });

  it("does not duplicate images when question already has them in images field", () => {
    const structured: StructuredActivity = {
      sections: [
        {
          questions: [
            {
              number: 1,
              type: "open_ended",
              statement: "Texto",
              images: ["https://example.com/img1.png"],
            },
          ],
        },
      ],
    };

    // Same image in questionImages - should not duplicate
    const questionImages: Record<string, string[]> = {
      "1": ["https://example.com/img1.png"],
    };

    const result = toEditableActivity(structured, HEADER, questionImages);

    const imageBlocks = result.questions[0].content.filter(
      (b) => b.type === "image",
    );
    expect(imageBlocks).toHaveLength(1);
  });

  it("generates unique ids for questions", () => {
    const structured: StructuredActivity = {
      sections: [
        {
          questions: [
            { number: 1, type: "open_ended", statement: "Q1" },
            { number: 2, type: "open_ended", statement: "Q2" },
          ],
        },
      ],
    };

    const result = toEditableActivity(structured, HEADER);
    const ids = result.questions.map((q) => q.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
