import { describe, it, expect } from "vitest";
import {
  structuredToMarkdownDsl,
  markdownDslToStructured,
} from "@/lib/activityDslConverter";
import type { StructuredActivity } from "@/types/adaptation";

describe("activityDslConverter", () => {
  // ── structuredToMarkdownDsl ──

  describe("structuredToMarkdownDsl", () => {
    it("converts a multiple choice question", () => {
      const activity: StructuredActivity = {
        sections: [
          {
            title: "Matematica",
            questions: [
              {
                number: 1,
                type: "multiple_choice",
                statement: "Quanto e 2+3?",
                alternatives: [
                  { letter: "a", text: "4" },
                  { letter: "b", text: "5", is_correct: true },
                  { letter: "c", text: "6" },
                ],
              },
            ],
          },
        ],
      };
      const dsl = structuredToMarkdownDsl(activity);
      expect(dsl).toContain("# Matematica");
      expect(dsl).toContain("1) Quanto e 2+3?");
      expect(dsl).toContain("a) 4");
      expect(dsl).toContain("b*) 5");
      expect(dsl).toContain("c) 6");
    });

    it("converts an open_ended question with [linhas:4]", () => {
      const activity: StructuredActivity = {
        sections: [
          {
            questions: [
              { number: 1, type: "open_ended", statement: "Explique." },
            ],
          },
        ],
      };
      const dsl = structuredToMarkdownDsl(activity);
      expect(dsl).toContain("1) Explique.");
      expect(dsl).toContain("[linhas:4]");
    });

    it("converts a fill_blank question with blank_placeholder", () => {
      const activity: StructuredActivity = {
        sections: [
          {
            questions: [
              {
                number: 1,
                type: "fill_blank",
                statement: "O resultado e ___.",
                blank_placeholder: "3/4, 1/2",
              },
            ],
          },
        ],
      };
      const dsl = structuredToMarkdownDsl(activity);
      expect(dsl).toContain("[banco: 3/4, 1/2]");
    });

    it("converts a true_false question", () => {
      const activity: StructuredActivity = {
        sections: [
          {
            questions: [
              { number: 1, type: "true_false", statement: "Marque V ou F" },
            ],
          },
        ],
      };
      const dsl = structuredToMarkdownDsl(activity);
      expect(dsl).toContain("( ) Verdadeiro");
      expect(dsl).toContain("( ) Falso");
    });

    it("includes general_instructions", () => {
      const activity: StructuredActivity = {
        general_instructions: "Leia com atencao.",
        sections: [
          {
            questions: [
              { number: 1, type: "open_ended", statement: "Q1" },
            ],
          },
        ],
      };
      const dsl = structuredToMarkdownDsl(activity);
      expect(dsl).toContain("> Leia com atencao.");
    });

    it("includes scaffolding as > Apoio:", () => {
      const activity: StructuredActivity = {
        sections: [
          {
            questions: [
              {
                number: 1,
                type: "open_ended",
                statement: "Explique.",
                scaffolding: ["Pense com calma."],
              },
            ],
          },
        ],
      };
      const dsl = structuredToMarkdownDsl(activity);
      expect(dsl).toContain("> Apoio: Pense com calma.");
    });

    it("includes images as [img:url]", () => {
      const activity: StructuredActivity = {
        sections: [
          {
            questions: [
              {
                number: 1,
                type: "open_ended",
                statement: "Observe.",
                images: ["https://example.com/img.png"],
              },
            ],
          },
        ],
      };
      const dsl = structuredToMarkdownDsl(activity);
      expect(dsl).toContain("[img:https://example.com/img.png]");
    });
  });

  // ── markdownDslToStructured ──

  describe("markdownDslToStructured", () => {
    it("parses a simple DSL into StructuredActivity", () => {
      const dsl = "# Secao\n\n1) Quanto e 2+3?\na) 4\nb*) 5\nc) 6";
      const result = markdownDslToStructured(dsl);
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].title).toBe("Secao");
      expect(result.sections[0].questions).toHaveLength(1);

      const q = result.sections[0].questions[0];
      expect(q.number).toBe(1);
      expect(q.type).toBe("multiple_choice");
      expect(q.alternatives).toHaveLength(3);
      expect(q.alternatives![1].is_correct).toBe(true);
    });

    it("extracts general_instructions from leading instruction without title", () => {
      const dsl = "> Instrucao geral.\n\n# Secao\n\n1) Q1";
      const result = markdownDslToStructured(dsl);
      expect(result.general_instructions).toBe("Instrucao geral.");
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].title).toBe("Secao");
    });

    it("maps parser types to StructuredActivity types", () => {
      const dsl = `1) Ligue:\nA -- B\nC -- D\n\n2) Ordene:\n[1] Primeiro\n[2] Segundo`;
      const result = markdownDslToStructured(dsl);
      // matching and ordering map to open_ended
      expect(result.sections[0].questions[0].type).toBe("open_ended");
      expect(result.sections[0].questions[1].type).toBe("open_ended");
    });
  });

  // ── mapQuestionType edge cases ──

  describe("mapQuestionType via markdownDslToStructured", () => {
    it("maps true_false DSL to true_false type", () => {
      const dsl = "1) Marque V ou F:\n( ) Afirmacao A\n( ) Afirmacao B";
      const result = markdownDslToStructured(dsl);
      expect(result.sections[0].questions[0].type).toBe("true_false");
    });

    it("maps fill_blank DSL to fill_blank type", () => {
      const dsl = "1) Complete: O resultado e ___.";
      const result = markdownDslToStructured(dsl);
      expect(result.sections[0].questions[0].type).toBe("fill_blank");
    });

    it("maps table DSL to open_ended type", () => {
      const dsl = "1) Complete a tabela:\n|Col A|Col B|\n|---|---|\n|Val 1|Val 2|";
      const result = markdownDslToStructured(dsl);
      expect(result.sections[0].questions[0].type).toBe("open_ended");
    });
  });

  // ── Images array in conversion ──

  describe("images array conversion", () => {
    it("preserves multiple images in round-trip", () => {
      const activity: StructuredActivity = {
        sections: [{
          questions: [{
            number: 1,
            type: "open_ended",
            statement: "Observe as figuras.",
            images: ["https://example.com/a.png", "https://example.com/b.png"],
          }],
        }],
      };
      const dsl = structuredToMarkdownDsl(activity);
      expect(dsl).toContain("[img:https://example.com/a.png]");
      expect(dsl).toContain("[img:https://example.com/b.png]");

      const roundTripped = markdownDslToStructured(dsl);
      expect(roundTripped.sections[0].questions[0].images).toEqual([
        "https://example.com/a.png",
        "https://example.com/b.png",
      ]);
    });

    it("does not include images key when question has none", () => {
      const dsl = "1) Sem imagem aqui.";
      const result = markdownDslToStructured(dsl);
      expect(result.sections[0].questions[0].images).toBeUndefined();
    });
  });

  // ── Round-trip ──

  describe("round-trip", () => {
    it("structured -> DSL -> structured preserves question data", () => {
      const original: StructuredActivity = {
        sections: [
          {
            title: "Adicao",
            questions: [
              {
                number: 1,
                type: "multiple_choice",
                statement: "Quanto e 2+3?",
                alternatives: [
                  { letter: "a", text: "4" },
                  { letter: "b", text: "5", is_correct: true },
                  { letter: "c", text: "6" },
                ],
              },
              {
                number: 2,
                type: "open_ended",
                statement: "Explique a soma.",
              },
            ],
          },
        ],
      };

      const dsl = structuredToMarkdownDsl(original);
      const roundTripped = markdownDslToStructured(dsl);

      expect(roundTripped.sections).toHaveLength(1);
      expect(roundTripped.sections[0].title).toBe("Adicao");
      expect(roundTripped.sections[0].questions).toHaveLength(2);

      const q1 = roundTripped.sections[0].questions[0];
      expect(q1.number).toBe(1);
      expect(q1.type).toBe("multiple_choice");
      expect(q1.alternatives).toHaveLength(3);
      expect(q1.alternatives![1].is_correct).toBe(true);

      const q2 = roundTripped.sections[0].questions[1];
      expect(q2.number).toBe(2);
      expect(q2.type).toBe("open_ended");
    });
  });

  describe("blank markers", () => {
    it("strips <!--blank--> markers from statement during DSL-to-structured conversion", () => {
      const dsl = `## Secao

1. Leia o poema para responder.

<!--blank-->

O anel de vidro

<!--blank-->

Qual o tema do poema?`;

      const result = markdownDslToStructured(dsl);
      const stmt = result.sections[0].questions[0].statement;

      expect(stmt).not.toContain("<!--blank-->");
      expect(stmt).toContain("Leia o poema para responder.");
    });
  });
});
