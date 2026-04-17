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

    it("preserves matching and ordering types (Fase A)", () => {
      const dsl = `1) Ligue:\nA -- B\nC -- D\n\n2) Ordene:\n[1] Primeiro\n[2] Segundo`;
      const result = markdownDslToStructured(dsl);
      expect(result.sections[0].questions[0].type).toBe("matching");
      expect(result.sections[0].questions[1].type).toBe("ordering");
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

    it("preserves table DSL as table type (Fase A)", () => {
      const dsl = "1) Complete a tabela:\n|Col A|Col B|\n|---|---|\n|Val 1|Val 2|";
      const result = markdownDslToStructured(dsl);
      expect(result.sections[0].questions[0].type).toBe("table");
    });
  });

  // ── Rich types preservation (Fase A) ──

  describe("rich types preservation", () => {
    it("preserves multiple_answer with check_items + checked flag", () => {
      const dsl = `1) Selecione as corretas:\n[x] Certo 1\n[ ] Errado 1\n[x] Certo 2`;
      const q = markdownDslToStructured(dsl).sections[0].questions[0];
      expect(q.type).toBe("multiple_answer");
      expect(q.check_items).toEqual([
        { text: "Certo 1", checked: true },
        { text: "Errado 1", checked: false },
        { text: "Certo 2", checked: true },
      ]);
    });

    it("preserves true_false with tf_items", () => {
      const dsl = `1) V ou F:\n( ) Afirmacao A\n( ) Afirmacao B`;
      const q = markdownDslToStructured(dsl).sections[0].questions[0];
      expect(q.type).toBe("true_false");
      expect(q.tf_items).toEqual([
        { text: "Afirmacao A", marked: null },
        { text: "Afirmacao B", marked: null },
      ]);
    });

    it("preserves matching with match_pairs", () => {
      const dsl = `1) Associe:\nBrasil -- Brasilia\nArgentina -- Buenos Aires`;
      const q = markdownDslToStructured(dsl).sections[0].questions[0];
      expect(q.type).toBe("matching");
      expect(q.match_pairs).toEqual([
        { left: "Brasil", right: "Brasilia" },
        { left: "Argentina", right: "Buenos Aires" },
      ]);
    });

    it("preserves ordering with order_items", () => {
      const dsl = `1) Ordene:\n[1] Celula\n[2] Tecido\n[3] Orgao`;
      const q = markdownDslToStructured(dsl).sections[0].questions[0];
      expect(q.type).toBe("ordering");
      expect(q.order_items).toEqual([
        { n: 1, text: "Celula" },
        { n: 2, text: "Tecido" },
        { n: 3, text: "Orgao" },
      ]);
    });

    it("preserves table with table_rows", () => {
      const dsl = `1) Marque:\n| | Sim | Nao |\n|---|---|---|\n| Item 1 | ( ) | ( ) |\n| Item 2 | ( ) | ( ) |`;
      const q = markdownDslToStructured(dsl).sections[0].questions[0];
      expect(q.type).toBe("table");
      expect(q.table_rows).toEqual([
        ["", "Sim", "Nao"],
        ["Item 1", "( )", "( )"],
        ["Item 2", "( )", "( )"],
      ]);
    });

    it("preserves answerLines from [linhas:N]", () => {
      const dsl = `1) Explique:\n[linhas:5]`;
      const q = markdownDslToStructured(dsl).sections[0].questions[0];
      expect(q.type).toBe("open_ended");
      expect(q.answerLines).toBe(5);
    });
  });

  // ── Round-trip for rich types (Fase B) ──

  describe("round-trip for rich types", () => {
    it("round-trips multiple_answer", () => {
      const original: StructuredActivity = {
        sections: [{
          questions: [{
            number: 1,
            type: "multiple_answer",
            statement: "Selecione as corretas:",
            check_items: [
              { text: "Certo 1", checked: true },
              { text: "Errado", checked: false },
              { text: "Certo 2", checked: true },
            ],
          }],
        }],
      };
      const dsl = structuredToMarkdownDsl(original);
      expect(dsl).toContain("[x] Certo 1");
      expect(dsl).toContain("[ ] Errado");
      const back = markdownDslToStructured(dsl).sections[0].questions[0];
      expect(back.type).toBe("multiple_answer");
      expect(back.check_items).toEqual(original.sections[0].questions[0].check_items);
    });

    it("round-trips true_false with tf_items", () => {
      const original: StructuredActivity = {
        sections: [{
          questions: [{
            number: 1,
            type: "true_false",
            statement: "V ou F:",
            tf_items: [
              { text: "Primeira", marked: null },
              { text: "Segunda", marked: null },
            ],
          }],
        }],
      };
      const dsl = structuredToMarkdownDsl(original);
      expect(dsl).toContain("( ) Primeira");
      expect(dsl).toContain("( ) Segunda");
      const back = markdownDslToStructured(dsl).sections[0].questions[0];
      expect(back.type).toBe("true_false");
      expect(back.tf_items).toEqual(original.sections[0].questions[0].tf_items);
    });

    it("round-trips matching", () => {
      const original: StructuredActivity = {
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
      const dsl = structuredToMarkdownDsl(original);
      expect(dsl).toContain("Brasil -- Brasilia");
      expect(dsl).toContain("Chile -- Santiago");
      const back = markdownDslToStructured(dsl).sections[0].questions[0];
      expect(back.type).toBe("matching");
      expect(back.match_pairs).toEqual(original.sections[0].questions[0].match_pairs);
    });

    it("round-trips ordering", () => {
      const original: StructuredActivity = {
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
      const dsl = structuredToMarkdownDsl(original);
      expect(dsl).toContain("[1] Primeiro");
      expect(dsl).toContain("[2] Segundo");
      const back = markdownDslToStructured(dsl).sections[0].questions[0];
      expect(back.type).toBe("ordering");
      expect(back.order_items).toEqual(original.sections[0].questions[0].order_items);
    });

    it("round-trips table", () => {
      const original: StructuredActivity = {
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
      const dsl = structuredToMarkdownDsl(original);
      expect(dsl).toMatch(/\|\s*\|\s*Sim\s*\|\s*Nao\s*\|/);
      expect(dsl).toMatch(/\|\s*Item 1\s*\|\s*\(\s*\)\s*\|\s*\(\s*\)\s*\|/);
      const back = markdownDslToStructured(dsl).sections[0].questions[0];
      expect(back.type).toBe("table");
      expect(back.table_rows).toEqual(original.sections[0].questions[0].table_rows);
    });

    it("round-trips open_ended with answerLines", () => {
      const original: StructuredActivity = {
        sections: [{
          questions: [{
            number: 1,
            type: "open_ended",
            statement: "Explique:",
            answerLines: 7,
          }],
        }],
      };
      const dsl = structuredToMarkdownDsl(original);
      expect(dsl).toContain("[linhas:7]");
      const back = markdownDslToStructured(dsl).sections[0].questions[0];
      expect(back.answerLines).toBe(7);
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

  // ── parsedQuestionToStructured fixes ──

  describe("parsedQuestionToStructured fixes", () => {
    it("filters out empty alternatives", () => {
      // alternative b) has empty text — it should be removed from output
      const dsl = `1) Qual é a capital do Brasil?
a) Rio de Janeiro
b)
c*) Brasília`;
      const result = markdownDslToStructured(dsl);
      const q = result.sections[0].questions[0];
      expect(q.alternatives).toHaveLength(2);
      expect(q.alternatives!.map((a) => a.letter)).toEqual(["a", "c"]);
    });

    it("collects multiple non-apoio instructions joined with newline", () => {
      const dsl = `1) Leia o trecho e responda.
> Observe bem.
> Pense antes de responder.`;
      const result = markdownDslToStructured(dsl);
      const q = result.sections[0].questions[0];
      expect(q.instruction).toBe("Observe bem.\nPense antes de responder.");
    });

    it("collects multiple Apoio lines as separate scaffolding entries (open-ended question)", () => {
      // For open-ended questions (no alternatives), > Apoio: lines land in pq.continuations
      const dsl = `1) Explique o que é fotossíntese.
[linhas:3]
> Apoio: Conte nos dedos.
> Apoio: Use uma régua numérica.`;
      const result = markdownDslToStructured(dsl);
      const q = result.sections[0].questions[0];
      expect(q.scaffolding).toEqual(["Conte nos dedos.", "Use uma régua numérica."]);
    });

    it("collects multiple Apoio lines via round-trip (multiple choice)", () => {
      // structuredToMarkdownDsl produces > Apoio: after alternatives,
      // and markdownDslToStructured must preserve them across a full round-trip.
      const original: StructuredActivity = {
        sections: [
          {
            questions: [
              {
                number: 1,
                type: "multiple_choice",
                statement: "Calcule 2 + 3.",
                alternatives: [
                  { letter: "a", text: "4" },
                  { letter: "b", text: "5", is_correct: true },
                  { letter: "c", text: "6" },
                ],
                scaffolding: ["Conte nos dedos.", "Use uma régua numérica."],
              },
            ],
          },
        ],
      };
      const dsl = structuredToMarkdownDsl(original);
      // DSL must contain the Apoio lines
      expect(dsl).toContain("> Apoio: Conte nos dedos.");
      expect(dsl).toContain("> Apoio: Use uma régua numérica.");
      // And they must survive the round-trip back to StructuredActivity.
      const roundTripped = markdownDslToStructured(dsl);
      const q = roundTripped.sections[0].questions[0];
      expect(q.scaffolding).toEqual(["Conte nos dedos.", "Use uma régua numérica."]);
    });

    it("recognizes scaffolding written between alternatives (multiple choice)", () => {
      // User writes Apoio anywhere in the question body — must still be extracted.
      const dsl = `1) Calcule 2 + 3.
a) 4
b*) 5
> Apoio: Conte nos dedos.
c) 6
> Apoio: Use uma régua numérica.`;
      const result = markdownDslToStructured(dsl);
      const q = result.sections[0].questions[0];
      expect(q.scaffolding).toEqual(["Conte nos dedos.", "Use uma régua numérica."]);
    });

    it("recognizes scaffolding with lowercase 'apoio' (open-ended question)", () => {
      // open-ended so > apoio: lands in pq.continuations
      const dsl = `1) Qual animal late?
[linhas:2]
> apoio: Pense nos animais domésticos.`;
      const result = markdownDslToStructured(dsl);
      const q = result.sections[0].questions[0];
      expect(q.scaffolding).toEqual(["Pense nos animais domésticos."]);
    });

    it("recognizes scaffolding with space before colon '> Apoio : X' (open-ended question)", () => {
      // open-ended so > Apoio : ... lands in pq.continuations
      const dsl = `1) Qual é a raiz quadrada de 9?
[linhas:2]
> Apoio : Use a tabuada de multiplicação.`;
      const result = markdownDslToStructured(dsl);
      const q = result.sections[0].questions[0];
      expect(q.scaffolding).toEqual(["Use a tabuada de multiplicação."]);
    });

    it("extracts scaffolding text correctly without including the prefix", () => {
      const dsl = `1) Resolva a conta.
> Apoio: Use os dedos`;
      const result = markdownDslToStructured(dsl);
      const q = result.sections[0].questions[0];
      // scaffolding text should be ONLY "Use os dedos", not "> Apoio: Use os dedos"
      expect(q.scaffolding).toEqual(["Use os dedos"]);
      expect(q.scaffolding![0]).not.toMatch(/^>\s*Apoio/i);
    });

    it("does not treat Apoio line as an instruction (open-ended question)", () => {
      // Both > lines land in pq.continuations for open-ended (no alternatives)
      const dsl = `1) O que é fotossíntese?
> Apoio: Lembre-se da aula de ciências.
> Nota importante.`;
      const result = markdownDslToStructured(dsl);
      const q = result.sections[0].questions[0];
      // Apoio goes to scaffolding, the other > line goes to instruction
      expect(q.scaffolding).toEqual(["Lembre-se da aula de ciências."]);
      expect(q.instruction).toBe("Nota importante.");
    });

    it("handles question with mixed empty and non-empty alternatives — filters correctly", () => {
      // DSL where b) is empty: verifies alternatives filtering
      const dsl = `1) Qual é a cor do céu?
a*) Azul
b)
c) Verde`;
      const result = markdownDslToStructured(dsl);
      const q = result.sections[0].questions[0];
      // b) filtered out, only a and c remain
      expect(q.alternatives).toHaveLength(2);
      expect(q.alternatives!.map((a) => a.letter)).toEqual(["a", "c"]);
    });

    it("scaffolding and instruction survive full round-trip for open-ended question", () => {
      // Verify structuredToMarkdownDsl -> markdownDslToStructured preserves scaffolding + instruction
      const original: StructuredActivity = {
        sections: [
          {
            questions: [
              {
                number: 1,
                type: "open_ended",
                statement: "O que é fotossíntese?",
                scaffolding: ["Lembre-se da aula.", "Pense nas plantas."],
              },
            ],
          },
        ],
      };
      const dsl = structuredToMarkdownDsl(original);
      const roundTripped = markdownDslToStructured(dsl);
      const q = roundTripped.sections[0].questions[0];
      expect(q.scaffolding).toEqual(["Lembre-se da aula.", "Pense nas plantas."]);
    });
  });

  // ── Positional scaffolding (ContentBlock) ──

  describe("positional scaffolding blocks", () => {
    it("emits a scaffolding block at the position where > Apoio: appears in the DSL", () => {
      const dsl = `1) Enunciado longo da questão.
> Apoio: Leia com calma.
Continuação do enunciado em outra linha.`;
      const result = markdownDslToStructured(dsl);
      const q = result.sections[0].questions[0];
      // content must contain: text, scaffolding, text — in that order
      const types = (q.content ?? []).map((b) => b.type);
      expect(types).toEqual(["text", "scaffolding", "text"]);
      const sc = (q.content ?? []).find((b) => b.type === "scaffolding");
      expect(sc && sc.type === "scaffolding" && sc.items).toEqual(["Leia com calma."]);
    });

    it("coalesces consecutive > Apoio: lines into a single scaffolding block with multiple items", () => {
      const dsl = `1) Resolva.
> Apoio: Passo um.
> Apoio: Passo dois.
> Apoio: Passo três.`;
      const result = markdownDslToStructured(dsl);
      const q = result.sections[0].questions[0];
      const scaffoldingBlocks = (q.content ?? []).filter((b) => b.type === "scaffolding");
      expect(scaffoldingBlocks).toHaveLength(1);
      const sc = scaffoldingBlocks[0];
      expect(sc.type === "scaffolding" && sc.items).toEqual([
        "Passo um.",
        "Passo dois.",
        "Passo três.",
      ]);
    });

    it("produces separate scaffolding blocks when split by non-Apoio content (image)", () => {
      const dsl = `1) Observe a figura.
> Apoio: Olhe com atenção.
[img:imagem-1]
> Apoio: Compare com o texto.`;
      const result = markdownDslToStructured(dsl);
      const q = result.sections[0].questions[0];
      const types = (q.content ?? []).map((b) => b.type);
      expect(types).toEqual(["text", "scaffolding", "image", "scaffolding"]);
    });

    it("preserves scaffolding position across round-trip (structured -> DSL -> structured)", () => {
      const dsl = `1) Explique o fenômeno.
> Apoio: Comece pela hipótese.
Desenvolva em seguida.
> Apoio: Finalize com conclusão.`;
      const first = markdownDslToStructured(dsl);
      const dsl2 = structuredToMarkdownDsl(first);
      const second = markdownDslToStructured(dsl2);
      const q1 = first.sections[0].questions[0];
      const q2 = second.sections[0].questions[0];
      const types1 = (q1.content ?? []).map((b) => b.type);
      const types2 = (q2.content ?? []).map((b) => b.type);
      expect(types2).toEqual(types1);
    });
  });
});
