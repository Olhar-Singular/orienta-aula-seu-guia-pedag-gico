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

  it("preserves scaffolding (apoios DUA) on the editable question", () => {
    const structured: StructuredActivity = {
      sections: [
        {
          questions: [
            {
              number: 1,
              type: "open_ended",
              statement: "Resolva o problema:",
              scaffolding: [
                "Leia o enunciado em voz alta",
                "Identifique os dados numericos",
                "Escolha a operacao correta",
              ],
            },
          ],
        },
      ],
    };

    const result = toEditableActivity(structured, HEADER);
    expect(result.questions[0].scaffolding).toEqual([
      "Leia o enunciado em voz alta",
      "Identifique os dados numericos",
      "Escolha a operacao correta",
    ]);
  });

  it("preserves scaffolding when question already uses content blocks", () => {
    const structured: StructuredActivity = {
      sections: [
        {
          questions: [
            {
              number: 1,
              type: "open_ended",
              statement: "legacy",
              content: [{ id: "b1", type: "text", content: "Qual e?" }],
              scaffolding: ["Passo 1", "Passo 2"],
            },
          ],
        },
      ],
    };

    const result = toEditableActivity(structured, HEADER);
    expect(result.questions[0].scaffolding).toEqual(["Passo 1", "Passo 2"]);
  });

  it("preserves instruction (per-question helper text)", () => {
    const structured: StructuredActivity = {
      sections: [
        {
          questions: [
            {
              number: 1,
              type: "open_ended",
              statement: "Enunciado",
              instruction: "Leia com atencao antes de responder.",
            },
          ],
        },
      ],
    };

    const result = toEditableActivity(structured, HEADER);
    expect(result.questions[0].instruction).toBe(
      "Leia com atencao antes de responder.",
    );
  });

  it("preserves section title on each question so groups survive reordering", () => {
    const structured: StructuredActivity = {
      sections: [
        {
          title: "Parte 1 - Fracoes",
          questions: [
            { number: 1, type: "open_ended", statement: "Q1" },
            { number: 2, type: "open_ended", statement: "Q2" },
          ],
        },
        {
          title: "Parte 2 - Decimais",
          questions: [{ number: 3, type: "open_ended", statement: "Q3" }],
        },
      ],
    };

    const result = toEditableActivity(structured, HEADER);
    expect(result.questions[0].sectionTitle).toBe("Parte 1 - Fracoes");
    expect(result.questions[1].sectionTitle).toBe("Parte 1 - Fracoes");
    expect(result.questions[2].sectionTitle).toBe("Parte 2 - Decimais");
  });

  it("preserves general_instructions at the activity level", () => {
    const structured: StructuredActivity = {
      sections: [
        { questions: [{ number: 1, type: "open_ended", statement: "Q1" }] },
      ],
      general_instructions: "Responda com caneta azul.",
    };

    const result = toEditableActivity(structured, HEADER);
    expect(result.generalInstructions).toBe("Responda com caneta azul.");
  });

  // ── Rich types propagation (Fase A) ──

  describe("rich types propagation", () => {
    it("propagates questionType for multiple_choice", () => {
      const structured: StructuredActivity = {
        sections: [
          {
            questions: [
              {
                number: 1,
                type: "multiple_choice",
                statement: "Qual?",
                alternatives: [{ letter: "a", text: "X" }],
              },
            ],
          },
        ],
      };
      const result = toEditableActivity(structured, HEADER);
      expect(result.questions[0].questionType).toBe("multiple_choice");
    });

    it("propagates check_items for multiple_answer", () => {
      const structured: StructuredActivity = {
        sections: [{
          questions: [{
            number: 1,
            type: "multiple_answer",
            statement: "Selecione:",
            check_items: [
              { text: "Certo", checked: true },
              { text: "Errado", checked: false },
            ],
          }],
        }],
      };
      const result = toEditableActivity(structured, HEADER);
      expect(result.questions[0].questionType).toBe("multiple_answer");
      expect(result.questions[0].checkItems).toEqual([
        { text: "Certo", checked: true },
        { text: "Errado", checked: false },
      ]);
    });

    it("propagates tf_items for true_false", () => {
      const structured: StructuredActivity = {
        sections: [{
          questions: [{
            number: 1,
            type: "true_false",
            statement: "V ou F:",
            tf_items: [
              { text: "Afirmacao A", marked: null },
              { text: "Afirmacao B", marked: null },
            ],
          }],
        }],
      };
      const result = toEditableActivity(structured, HEADER);
      expect(result.questions[0].questionType).toBe("true_false");
      expect(result.questions[0].tfItems).toEqual([
        { text: "Afirmacao A", marked: null },
        { text: "Afirmacao B", marked: null },
      ]);
    });

    it("propagates match_pairs for matching", () => {
      const structured: StructuredActivity = {
        sections: [{
          questions: [{
            number: 1,
            type: "matching",
            statement: "Associe:",
            match_pairs: [
              { left: "Brasil", right: "Brasilia" },
              { left: "Chile", right: "Santiago" },
            ],
          }],
        }],
      };
      const result = toEditableActivity(structured, HEADER);
      expect(result.questions[0].questionType).toBe("matching");
      expect(result.questions[0].matchPairs).toEqual([
        { left: "Brasil", right: "Brasilia" },
        { left: "Chile", right: "Santiago" },
      ]);
    });

    it("propagates order_items for ordering", () => {
      const structured: StructuredActivity = {
        sections: [{
          questions: [{
            number: 1,
            type: "ordering",
            statement: "Ordene:",
            order_items: [
              { n: 1, text: "Primeiro" },
              { n: 2, text: "Segundo" },
            ],
          }],
        }],
      };
      const result = toEditableActivity(structured, HEADER);
      expect(result.questions[0].questionType).toBe("ordering");
      expect(result.questions[0].orderItems).toEqual([
        { n: 1, text: "Primeiro" },
        { n: 2, text: "Segundo" },
      ]);
    });

    it("propagates table_rows for table", () => {
      const structured: StructuredActivity = {
        sections: [{
          questions: [{
            number: 1,
            type: "table",
            statement: "Marque:",
            table_rows: [
              ["", "Sim", "Nao"],
              ["Item 1", "( )", "( )"],
            ],
          }],
        }],
      };
      const result = toEditableActivity(structured, HEADER);
      expect(result.questions[0].questionType).toBe("table");
      expect(result.questions[0].tableRows).toEqual([
        ["", "Sim", "Nao"],
        ["Item 1", "( )", "( )"],
      ]);
    });

    it("propagates answerLines for open_ended with [linhas:N]", () => {
      const structured: StructuredActivity = {
        sections: [{
          questions: [{
            number: 1,
            type: "open_ended",
            statement: "Explique:",
            answerLines: 5,
          }],
        }],
      };
      const result = toEditableActivity(structured, HEADER);
      expect(result.questions[0].answerLines).toBe(5);
    });
  });

  it("strips HTML tags from statement when migrating to content blocks", () => {
    const structured: StructuredActivity = {
      sections: [
        {
          questions: [
            {
              number: 1,
              type: "open_ended",
              statement: "<p>Calcule <strong>2+2</strong></p>",
              statementFormat: "html",
            },
          ],
        },
      ],
    };

    const result = toEditableActivity(structured, HEADER);
    const textBlock = result.questions[0].content.find(
      (b) => b.type === "text",
    );
    expect(textBlock).toBeDefined();
    if (textBlock?.type === "text") {
      expect(textBlock.content).not.toContain("<p>");
      expect(textBlock.content).not.toContain("<strong>");
      expect(textBlock.content).toContain("Calcule");
      expect(textBlock.content).toContain("2+2");
    }
  });
});
