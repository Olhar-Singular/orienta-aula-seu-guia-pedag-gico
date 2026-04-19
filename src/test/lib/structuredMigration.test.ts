import { describe, it, expect } from "vitest";
import {
  migrateStringToStructured,
  structuredToText,
  ensureStructured,
  getVersionText,
} from "@/lib/structuredMigration";
import type { StructuredActivity } from "@/types/adaptation";

describe("migrateStringToStructured", () => {
  it("wraps plain text with no detected questions as a single open-ended question", () => {
    const result = migrateStringToStructured("Apenas um texto simples.");
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].questions).toHaveLength(1);
    const q = result.sections[0].questions[0];
    expect(q.number).toBe(1);
    expect(q.type).toBe("open_ended");
    expect(q.statement).toBe("Apenas um texto simples.");
  });

  it("trims wrapper fallback content", () => {
    const result = migrateStringToStructured("   texto com espaço   ");
    expect(result.sections[0].questions[0].statement).toBe("texto com espaço");
  });

  it("converts parsed questions without options to open_ended", () => {
    const text = "1. Pergunta aberta\n2. Outra pergunta aberta";
    const result = migrateStringToStructured(text);
    const qs = result.sections[0].questions;
    expect(qs).toHaveLength(2);
    expect(qs.every((q) => q.type === "open_ended")).toBe(true);
    expect(qs[0].alternatives).toBeUndefined();
  });

  it("converts parsed questions with options to multiple_choice with letter alternatives", () => {
    const text = "1. Escolha:\na) Opção A\nb) Opção B\nc) Opção C";
    const result = migrateStringToStructured(text);
    const q = result.sections[0].questions[0];
    expect(q.type).toBe("multiple_choice");
    expect(q.alternatives).toHaveLength(3);
    expect(q.alternatives?.[0].letter).toBe("a");
    expect(q.alternatives?.[2].letter).toBe("c");
  });
});

describe("structuredToText", () => {
  it("renders general_instructions followed by questions", () => {
    const activity: StructuredActivity = {
      general_instructions: "Leia com atenção.",
      sections: [
        { questions: [{ number: 1, type: "open_ended", statement: "Pergunta um" }] },
      ],
    };
    const text = structuredToText(activity);
    expect(text.startsWith("Leia com atenção.")).toBe(true);
    expect(text).toContain("1. Pergunta um");
  });

  it("uppercases section titles and renders introduction", () => {
    const activity: StructuredActivity = {
      sections: [
        {
          title: "Parte 1",
          introduction: "Introdução da seção.",
          questions: [{ number: 1, type: "open_ended", statement: "Q" }],
        },
      ],
    };
    const text = structuredToText(activity);
    expect(text).toContain("PARTE 1");
    expect(text).toContain("Introdução da seção.");
  });

  it("renders alternatives with 'letter) text' format", () => {
    const activity: StructuredActivity = {
      sections: [
        {
          questions: [
            {
              number: 1,
              type: "multiple_choice",
              statement: "Escolha:",
              alternatives: [
                { letter: "a", text: "Alt A" },
                { letter: "b", text: "Alt B" },
              ],
            },
          ],
        },
      ],
    };
    const text = structuredToText(activity);
    expect(text).toContain("a) Alt A");
    expect(text).toContain("b) Alt B");
  });

  it("renders scaffolding block with 'Apoio:' heading and numbered steps", () => {
    const activity: StructuredActivity = {
      sections: [
        {
          questions: [
            {
              number: 1,
              type: "open_ended",
              statement: "Resolva",
              scaffolding: ["Passo 1", "Passo 2"],
            },
          ],
        },
      ],
    };
    const text = structuredToText(activity);
    expect(text).toContain("Apoio:");
    expect(text).toContain("1. Passo 1");
    expect(text).toContain("2. Passo 2");
  });

  it("renders instruction line before the question number when provided", () => {
    const activity: StructuredActivity = {
      sections: [
        {
          questions: [
            {
              number: 1,
              type: "open_ended",
              statement: "Q1",
              instruction: "Leia o enunciado abaixo.",
            },
          ],
        },
      ],
    };
    const text = structuredToText(activity);
    const lines = text.split("\n");
    const instrIdx = lines.findIndex((l) => l.includes("Leia o enunciado"));
    const qIdx = lines.findIndex((l) => l.includes("1. Q1"));
    expect(instrIdx).toBeGreaterThanOrEqual(0);
    expect(qIdx).toBeGreaterThan(instrIdx);
  });

  it("collapses three-or-more consecutive newlines into two", () => {
    const activity: StructuredActivity = {
      sections: [
        {
          questions: [
            { number: 1, type: "open_ended", statement: "A" },
            { number: 2, type: "open_ended", statement: "B" },
          ],
        },
      ],
    };
    const text = structuredToText(activity);
    expect(text).not.toMatch(/\n{3,}/);
  });

  it("returns trimmed output (no leading/trailing newlines)", () => {
    const activity: StructuredActivity = {
      sections: [{ questions: [{ number: 1, type: "open_ended", statement: "Q" }] }],
    };
    const text = structuredToText(activity);
    expect(text).toBe(text.trim());
  });
});

describe("ensureStructured", () => {
  it("migrates plain string input via migrateStringToStructured", () => {
    const result = ensureStructured("Apenas texto");
    expect(result.sections[0].questions[0].statement).toBe("Apenas texto");
  });

  it("returns a valid StructuredActivity unchanged", () => {
    const activity: StructuredActivity = {
      sections: [{ questions: [{ number: 1, type: "open_ended", statement: "X" }] }],
    };
    expect(ensureStructured(activity)).toBe(activity);
  });

  it("falls back to string coercion when input is not valid structured", () => {
    // @ts-expect-error deliberate invalid input
    const result = ensureStructured({ unexpected: "shape" });
    expect(result.sections[0].questions[0].type).toBe("open_ended");
  });
});

describe("getVersionText", () => {
  it("returns string input verbatim", () => {
    expect(getVersionText("linha original")).toBe("linha original");
  });

  it("delegates to structuredToText for structured input", () => {
    const activity: StructuredActivity = {
      sections: [{ questions: [{ number: 1, type: "open_ended", statement: "Q" }] }],
    };
    const text = getVersionText(activity);
    expect(text).toContain("1. Q");
  });

  it("coerces unknown shapes to string", () => {
    // @ts-expect-error deliberate invalid input
    const result = getVersionText({ random: true });
    expect(typeof result).toBe("string");
  });
});
