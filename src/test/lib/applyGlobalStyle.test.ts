import { describe, it, expect } from "vitest";
import { applyGlobalStyle, type GlobalStyleInput } from "@/lib/pdf/applyGlobalStyle";
import type { EditableActivity } from "@/lib/pdf/editableActivity";

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
        {
          id: "b1",
          type: "text",
          content: "Texto da questao 1",
          style: { fontSize: 11, bold: false },
        },
        {
          id: "b2",
          type: "image",
          src: "data:image/png;base64,abc",
          width: 0.5,
          alignment: "center",
        },
      ],
      alternatives: ["a) Opcao A", "b) Opcao B"],
      spacingAfter: 20,
      alternativeIndent: 12,
    },
    {
      id: "q2",
      number: 2,
      content: [
        {
          id: "b3",
          type: "text",
          content: "Texto da questao 2",
          style: { fontSize: 16, bold: true, fontFamily: "Times-Roman" },
          richContent: [
            { text: "Texto da ", color: "#dc2626" },
            { text: "questao 2" },
          ],
        },
      ],
      spacingAfter: 30,
      alternativeIndent: 16,
    },
  ],
};

describe("applyGlobalStyle", () => {
  it("aplica somente os campos marcados em include", () => {
    const input: GlobalStyleInput = {
      style: { fontSize: 14 },
      include: { fontSize: true },
    };

    const result = applyGlobalStyle(MOCK_ACTIVITY, input);

    const q1Text = result.questions[0].content[0];
    const q2Text = result.questions[1].content[0];

    if (q1Text.type === "text") {
      expect(q1Text.style?.fontSize).toBe(14);
      // bold/fontFamily preservados
      expect(q1Text.style?.bold).toBe(false);
    }
    if (q2Text.type === "text") {
      expect(q2Text.style?.fontSize).toBe(14);
      expect(q2Text.style?.bold).toBe(true);
      expect(q2Text.style?.fontFamily).toBe("Times-Roman");
    }
  });

  it("preserva blocos não-texto (image, page_break, scaffolding)", () => {
    const input: GlobalStyleInput = {
      style: { fontSize: 20, bold: true },
      include: { fontSize: true, bold: true },
    };

    const result = applyGlobalStyle(MOCK_ACTIVITY, input);
    const imgBlock = result.questions[0].content.find((b) => b.type === "image");
    expect(imgBlock).toMatchObject({
      type: "image",
      src: "data:image/png;base64,abc",
      width: 0.5,
      alignment: "center",
    });
  });

  it("aplicar cor uniforme remove cores per-run e funde runs vizinhos sem formatação", () => {
    const input: GlobalStyleInput = {
      style: { color: "#2563eb" },
      include: { color: true },
    };

    const result = applyGlobalStyle(MOCK_ACTIVITY, input);
    const q2Text = result.questions[1].content[0];
    if (q2Text.type === "text") {
      expect(q2Text.style?.color).toBe("#2563eb");
      // Runs sem formatação são fundidos para não inflar richContent
      expect(q2Text.richContent).toEqual([{ text: "Texto da questao 2" }]);
    }
  });

  it("sem cor marcada, preserva richContent existente", () => {
    const input: GlobalStyleInput = {
      style: { fontSize: 13 },
      include: { fontSize: true },
    };

    const result = applyGlobalStyle(MOCK_ACTIVITY, input);
    const q2Text = result.questions[1].content[0];
    if (q2Text.type === "text") {
      expect(q2Text.richContent).toEqual([
        { text: "Texto da ", color: "#dc2626" },
        { text: "questao 2" },
      ]);
    }
  });

  it("aplica spacing e indent quando flags ativas", () => {
    const input: GlobalStyleInput = {
      style: {},
      include: {},
      questionSpacing: 40,
      alternativeIndent: 24,
      includeQuestionSpacing: true,
      includeAlternativeIndent: true,
    };

    const result = applyGlobalStyle(MOCK_ACTIVITY, input);
    for (const q of result.questions) {
      expect(q.spacingAfter).toBe(40);
      expect(q.alternativeIndent).toBe(24);
    }
  });

  it("não toca spacing/indent quando flags desligadas", () => {
    const input: GlobalStyleInput = {
      style: { bold: true },
      include: { bold: true },
      questionSpacing: 99,
      alternativeIndent: 99,
      includeQuestionSpacing: false,
      includeAlternativeIndent: false,
    };

    const result = applyGlobalStyle(MOCK_ACTIVITY, input);
    expect(result.questions[0].spacingAfter).toBe(20);
    expect(result.questions[0].alternativeIndent).toBe(12);
    expect(result.questions[1].spacingAfter).toBe(30);
    expect(result.questions[1].alternativeIndent).toBe(16);
  });

  it("preserva header e globalShowSeparators", () => {
    const input: GlobalStyleInput = {
      style: { fontSize: 18 },
      include: { fontSize: true },
    };

    const result = applyGlobalStyle(MOCK_ACTIVITY, input);
    expect(result.header).toEqual(MOCK_ACTIVITY.header);
    expect(result.globalShowSeparators).toBe(MOCK_ACTIVITY.globalShowSeparators);
  });

  it("nenhum campo marcado retorna activity equivalente", () => {
    const input: GlobalStyleInput = {
      style: {},
      include: {},
    };

    const result = applyGlobalStyle(MOCK_ACTIVITY, input);
    expect(result.questions[0].spacingAfter).toBe(20);
    const q1Text = result.questions[0].content[0];
    if (q1Text.type === "text") {
      expect(q1Text.style?.fontSize).toBe(11);
    }
  });

  it("retorna a mesma referência quando nada está incluído (no-op)", () => {
    const input: GlobalStyleInput = {
      style: { fontSize: 99 },
      include: {},
    };

    const result = applyGlobalStyle(MOCK_ACTIVITY, input);
    expect(result).toBe(MOCK_ACTIVITY);
  });

  it("retorna a mesma referência quando só os flags de spacing/indent estão off", () => {
    const input: GlobalStyleInput = {
      style: {},
      include: {},
      questionSpacing: 99,
      alternativeIndent: 99,
      includeQuestionSpacing: false,
      includeAlternativeIndent: false,
    };

    const result = applyGlobalStyle(MOCK_ACTIVITY, input);
    expect(result).toBe(MOCK_ACTIVITY);
  });
});
