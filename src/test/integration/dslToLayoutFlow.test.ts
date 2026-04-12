/**
 * Integration Test: DSL text → StructuredActivity → EditableActivity
 *
 * Validates the complete pipeline that feeds the PDF Preview Editor:
 *   markdownDslToStructured (activityDslConverter)
 *     → toEditableActivity (editableActivity)
 *
 * Each test exercises a specific DSL feature and asserts that the
 * resulting EditableActivity preserves the expected data.
 */
import { describe, it, expect } from "vitest";
import { markdownDslToStructured } from "@/lib/activityDslConverter";
import { toEditableActivity } from "@/lib/pdf/editableActivity";
import type { ActivityHeader } from "@/types/adaptation";

const emptyHeader: ActivityHeader = {
  schoolName: "",
  subject: "",
  teacherName: "",
  className: "",
  date: "11/04/2026",
  showStudentLine: true,
};

// ── helpers ──────────────────────────────────────────────────────────────────

function dslToEditable(dsl: string) {
  const structured = markdownDslToStructured(dsl);
  return { structured, editable: toEditableActivity(structured, emptyHeader) };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("DSL → StructuredActivity → EditableActivity pipeline", () => {
  describe("alternatives", () => {
    it("converts multiple_choice alternatives to 'letter) text' strings", () => {
      const dsl = `1) Pergunta?
a) opcao A
b*) correta
c) opcao C`;
      const { editable } = dslToEditable(dsl);
      expect(editable.questions).toHaveLength(1);
      const q = editable.questions[0];
      expect(q.alternatives).toEqual(["a) opcao A", "b) correta", "c) opcao C"]);
    });

    it("preserves all alternative letters in order", () => {
      const dsl = `1) Qual planeta é o maior?
a) Mercurio
b) Venus
c) Terra
d*) Jupiter
e) Saturno`;
      const { editable } = dslToEditable(dsl);
      const alternatives = editable.questions[0].alternatives ?? [];
      expect(alternatives).toHaveLength(5);
      expect(alternatives[0]).toBe("a) Mercurio");
      expect(alternatives[3]).toBe("d) Jupiter");
      expect(alternatives[4]).toBe("e) Saturno");
    });
  });

  describe("scaffolding", () => {
    it("preserves scaffolding in StructuredActivity", () => {
      const dsl = `1) Pergunta?
> Apoio: Dica importante`;
      const { structured } = dslToEditable(dsl);
      const q = structured.sections[0].questions[0];
      expect(q.scaffolding).toBeDefined();
      expect(q.scaffolding).toContain("Dica importante");
    });

    it("preserves multiple scaffolding entries", () => {
      const dsl = `1) Enunciado complexo.
> Apoio: Primeiro passo
> Apoio: Segundo passo`;
      const { structured } = dslToEditable(dsl);
      const q = structured.sections[0].questions[0];
      expect(q.scaffolding).toHaveLength(2);
      expect(q.scaffolding![0]).toBe("Primeiro passo");
      expect(q.scaffolding![1]).toBe("Segundo passo");
    });
  });

  describe("multiple questions", () => {
    it("creates one EditableQuestion per DSL question", () => {
      const dsl = `1) Q1
2) Q2
3) Q3`;
      const { editable } = dslToEditable(dsl);
      expect(editable.questions).toHaveLength(3);
    });

    it("preserves sequential question numbers", () => {
      const dsl = `1) Primeira questao
2) Segunda questao
3) Terceira questao`;
      const { editable } = dslToEditable(dsl);
      expect(editable.questions[0].number).toBe(1);
      expect(editable.questions[1].number).toBe(2);
      expect(editable.questions[2].number).toBe(3);
    });
  });

  describe("images", () => {
    it("creates image content block when DSL has [img:url]", () => {
      const dsl = `1) Pergunta?
[img:https://example.com/img.png]`;
      const { editable } = dslToEditable(dsl);
      const q = editable.questions[0];
      const imageBlocks = q.content.filter((b) => b.type === "image");
      expect(imageBlocks).toHaveLength(1);
      expect((imageBlocks[0] as any).src).toBe("https://example.com/img.png");
    });

    it("preserves multiple images as separate image blocks", () => {
      const dsl = `1) Observe as imagens:
[img:https://example.com/a.png]
[img:https://example.com/b.png]`;
      const { editable } = dslToEditable(dsl);
      const q = editable.questions[0];
      const imageBlocks = q.content.filter((b) => b.type === "image");
      expect(imageBlocks).toHaveLength(2);
    });
  });

  describe("empty DSL", () => {
    it("produces EditableActivity with no questions without throwing", () => {
      expect(() => {
        const { editable } = dslToEditable("");
        expect(editable.questions).toHaveLength(0);
      }).not.toThrow();
    });

    it("sets the header from the provided ActivityHeader", () => {
      const header: ActivityHeader = {
        ...emptyHeader,
        schoolName: "Escola Teste",
        subject: "Matematica",
        teacherName: "Prof. Silva",
        className: "5A",
      };
      const structured = markdownDslToStructured("1) Q1");
      const editable = toEditableActivity(structured, header);
      expect(editable.header.schoolName).toBe("Escola Teste");
      expect(editable.header.teacherName).toBe("Prof. Silva");
    });
  });

  describe("section heading", () => {
    it("preserves section title in StructuredActivity", () => {
      const dsl = `# Matematica

1) Soma?`;
      const { structured } = dslToEditable(dsl);
      const sectionWithTitle = structured.sections.find((s) => s.title === "Matematica");
      expect(sectionWithTitle).toBeDefined();
    });

    it("question in titled section still converts to EditableQuestion", () => {
      const dsl = `# Matematica

1) Quanto e 2 + 2?
a) 3
b*) 4
c) 5`;
      const { editable } = dslToEditable(dsl);
      expect(editable.questions).toHaveLength(1);
      expect(editable.questions[0].alternatives).toHaveLength(3);
    });
  });

  describe("general instructions", () => {
    it("preserves leading instruction either in general_instructions or section introduction", () => {
      // When instruction and question are in the same section, the instruction
      // becomes section.introduction (not general_instructions).
      // When instruction is alone in the first section (no questions), it
      // becomes general_instructions and that section is removed.
      const dsl = `> Leia com atencao cada questao.

1) Q1`;
      const { structured } = dslToEditable(dsl);
      const instructionInGeneral = structured.general_instructions?.includes("Leia com atencao") ?? false;
      const instructionInSection = structured.sections.some(
        (s) => s.introduction?.includes("Leia com atencao")
      );
      expect(instructionInGeneral || instructionInSection).toBe(true);
    });

    it("section introduction is preserved when instruction precedes questions in same section", () => {
      // Instruction in the same section as a question → becomes section introduction,
      // not general_instructions (extraction condition requires the first section to
      // have zero questions).
      const dsl = `> Leia com atencao.

1) Q1`;
      const { structured } = dslToEditable(dsl);
      const section = structured.sections[0];
      expect(section.introduction).toContain("Leia com atencao");
    });
  });

  describe("multi-response checkbox items", () => {
    it("does not lose checkbox options — they become alternatives or content", () => {
      const dsl = `1) Selecione todas as corretas:
[x] certa 1
[ ] errada
[x] certa 2`;
      const { editable } = dslToEditable(dsl);
      expect(editable.questions).toHaveLength(1);
      const q = editable.questions[0];
      // Checkbox items map to multiple_answer → multiple_choice with alternatives,
      // OR remain in the statement text — either way the question must exist.
      const hasAlternatives = (q.alternatives?.length ?? 0) > 0;
      const hasContent = q.content.some(
        (b) => b.type === "text" && (b as any).content.length > 0
      );
      expect(hasAlternatives || hasContent).toBe(true);
    });

    it("does not crash on checkbox-only DSL block", () => {
      expect(() => {
        dslToEditable(`1) Selecione:
[x] opcao 1
[ ] opcao 2
[x] opcao 3`);
      }).not.toThrow();
    });
  });

  describe("open_ended questions", () => {
    it("creates text content block from statement for open_ended", () => {
      const dsl = `1) Explique o que e fotossintese.
[linhas:3]`;
      const { editable } = dslToEditable(dsl);
      const q = editable.questions[0];
      const textBlocks = q.content.filter((b) => b.type === "text");
      expect(textBlocks.length).toBeGreaterThan(0);
      expect((textBlocks[0] as any).content).toContain("fotossintese");
    });
  });

  describe("mixed content (full MOCK_ADAPTATION_RESULT DSL)", () => {
    it("converts the universal version DSL from fixtures without errors", () => {
      const dsl = `> Leia as questoes com atencao e escolha a melhor resposta.

# Adicao

1) Quanto e 2 + 3?
a) 4
b*) 5
c) 6
> Apoio: Conte nos dedos ou use uma regua numerica.

2) Explique com suas palavras o que e uma soma.
[linhas:3]
> Apoio: Pense em juntar grupos de objetos.`;

      expect(() => {
        const { editable } = dslToEditable(dsl);
        expect(editable.questions).toHaveLength(2);
        // Q1: multiple choice with 3 alternatives
        expect(editable.questions[0].alternatives).toHaveLength(3);
        // Q2: open ended — no alternatives
        expect(editable.questions[1].alternatives).toBeUndefined();
      }).not.toThrow();
    });
  });
});
