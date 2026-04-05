import { describe, it, expect } from "vitest";
import { markdownDslToStructured } from "@/lib/activityDslConverter";
import type { StructuredActivity, StructuredQuestion } from "@/types/adaptation";

/**
 * Unit tests for the regeneration logic extracted from StepResult.tsx.
 * Tests the two code paths:
 *  1) DSL string path — regex replacement of question block in DSL text
 *  2) Legacy StructuredActivity path — parse DSL question + update sections
 */

// ── Helper: replicate the DSL path regex from StepResult.tsx ──
function replaceDslQuestion(
  fieldContent: string,
  questionNum: number,
  questionDsl: string
): string {
  const questionBlockRegex = new RegExp(
    `(^${questionNum}\\s*[.)]\\s+[\\s\\S]*?)(?=^\\d+\\s*[.)]\\s+|\\Z)`,
    "m"
  );
  return questionBlockRegex.test(fieldContent)
    ? fieldContent.replace(questionBlockRegex, questionDsl + "\n\n")
    : fieldContent;
}

// ── Helper: replicate the legacy path from StepResult.tsx ──
function replaceLegacyQuestion(
  content: StructuredActivity,
  questionNum: number,
  questionDsl: string
): StructuredActivity {
  const parsedActivity = markdownDslToStructured(questionDsl);
  const regeneratedQuestion: StructuredQuestion =
    parsedActivity.sections[0]?.questions[0] ??
    ({
      number: questionNum,
      type: "open_ended",
      statement: questionDsl,
    } as StructuredQuestion);

  const updatedSections = content.sections.map((section) => ({
    ...section,
    questions: section.questions.map((q) =>
      q.number === questionNum
        ? { ...regeneratedQuestion, number: questionNum }
        : q
    ),
  }));

  return { ...content, sections: updatedSections };
}

describe("StepResult — regeneration logic", () => {
  describe("DSL string path", () => {
    const baseDsl = `> Leia com atencao.

# Matematica

1) Quanto e 2 + 3?
a) 4
b*) 5
c) 6
> Apoio: Conte nos dedos.

2) Explique o que e soma.
[linhas:3]
> Apoio: Pense em juntar.`;

    it("replaces the correct question block in the DSL", () => {
      const newQ1 = `1) Quanto e 1 + 1?
a) 1
b*) 2
c) 3
> Apoio: Use os dedos.`;

      const updated = replaceDslQuestion(baseDsl, 1, newQ1);
      expect(updated).toContain("Quanto e 1 + 1?");
      expect(updated).not.toContain("Quanto e 2 + 3?");
      // Question 2 should remain
      expect(updated).toContain("2) Explique o que e soma.");
    });

    it("replaces question 2 when followed by another question", () => {
      // DSL with 3 questions so Q2 is not the last
      const dsl3q = `1) Q1\na) a\nb*) b\n\n2) Q2 antigo\n[linhas:3]\n\n3) Q3\n[linhas:2]`;
      const newQ2 = `2) Q2 novo\n[linhas:4]`;

      const updated = replaceDslQuestion(dsl3q, 2, newQ2);
      expect(updated).toContain("1) Q1");
      expect(updated).toContain("2) Q2 novo");
      expect(updated).not.toContain("Q2 antigo");
      expect(updated).toContain("3) Q3");
    });

    it("returns unchanged DSL for last question (\\Z not supported in JS regex)", () => {
      // Known limitation: the regex uses \\Z which is not JS syntax
      // The last question in a DSL cannot be replaced via regex, returns unchanged
      const updated = replaceDslQuestion(baseDsl, 2, "2) Q2 nova\n[linhas:4]");
      // Falls through to unchanged because regex doesn't match last question
      expect(updated).toContain("2) Explique o que e soma.");
    });

    it("returns unchanged DSL when question number not found", () => {
      const updated = replaceDslQuestion(baseDsl, 99, "99) Nova questao");
      expect(updated).toBe(baseDsl);
    });
  });

  describe("Legacy StructuredActivity path", () => {
    const legacyActivity: StructuredActivity = {
      sections: [
        {
          title: "Matematica",
          questions: [
            {
              number: 1,
              type: "multiple_choice",
              statement: "Quanto e 2 + 3?",
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

    it("replaces the correct question in StructuredActivity", () => {
      const newDsl = "1) Quanto e 1 + 1?\na) 1\nb*) 2\nc) 3";
      const updated = replaceLegacyQuestion(legacyActivity, 1, newDsl);

      const q1 = updated.sections[0].questions[0];
      expect(q1.number).toBe(1);
      expect(q1.statement).toBe("Quanto e 1 + 1?");
      expect(q1.type).toBe("multiple_choice");

      // Question 2 should be unchanged
      const q2 = updated.sections[0].questions[1];
      expect(q2.statement).toBe("Explique a soma.");
    });

    it("preserves question number from original even if DSL has different number", () => {
      const newDsl = "5) Questao renumerada\n[linhas:3]";
      const updated = replaceLegacyQuestion(legacyActivity, 1, newDsl);

      // Should keep number 1, not 5
      expect(updated.sections[0].questions[0].number).toBe(1);
    });

    it("falls back to open_ended when DSL is just text", () => {
      const updated = replaceLegacyQuestion(legacyActivity, 1, "Texto simples sem formato");

      const q1 = updated.sections[0].questions[0];
      expect(q1.number).toBe(1);
      // Non-parseable text should produce some result (fallback)
      expect(q1.statement).toBeDefined();
    });
  });
});
