import { describe, it, expect } from "vitest";
import { parseActivity } from "@/lib/activityParser";
import type { ParsedQuestion, ParsedSection } from "@/lib/activityParser";

// Helper: get first question from first section
function firstQ(text: string): ParsedQuestion {
  const result = parseActivity(text);
  const sec = result.sections[0];
  const item = sec.items.find((i) => i.kind === "question");
  if (!item || item.kind !== "question") throw new Error("No question found");
  return item.data;
}

// Helper: get all questions from all sections
function allQuestions(text: string): ParsedQuestion[] {
  const result = parseActivity(text);
  return result.sections.flatMap((s) =>
    s.items.filter((i) => i.kind === "question").map((i) => (i as { kind: "question"; data: ParsedQuestion }).data)
  );
}

describe("activityParser", () => {
  // ── Section headers ──

  describe("sections", () => {
    it("parses # as level 1 section", () => {
      const result = parseActivity("# Matematica\n\n1) Quanto e 2+3?");
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].title).toBe("Matematica");
      expect(result.sections[0].level).toBe(1);
    });

    it("parses ## as level 2 section", () => {
      const result = parseActivity("## Sub-secao\n\n1) Questao aqui");
      expect(result.sections[0].title).toBe("Sub-secao");
      expect(result.sections[0].level).toBe(2);
    });

    it("parses multiple sections", () => {
      const text = `# Secao 1\n\n1) Q1\n\n# Secao 2\n\n2) Q2`;
      const result = parseActivity(text);
      expect(result.sections).toHaveLength(2);
      expect(result.sections[0].title).toBe("Secao 1");
      expect(result.sections[1].title).toBe("Secao 2");
    });
  });

  // ── Instructions ──

  describe("instructions", () => {
    it("parses > instruction outside question", () => {
      const result = parseActivity("> Leia com atencao.\n\n1) Q1");
      const instrItem = result.sections[0].items.find((i) => i.kind === "instruction");
      expect(instrItem).toBeDefined();
      if (instrItem?.kind === "instruction") {
        expect(instrItem.text).toBe("Leia com atencao.");
      }
    });

    it("parses > instruction inside question as continuation", () => {
      const q = firstQ("1) Enunciado\n> Apoio: Dica aqui.");
      expect(q.continuations).toContain("> Apoio: Dica aqui.");
    });
  });

  // ── Separator ──

  describe("separator", () => {
    it("parses --- as separator", () => {
      const result = parseActivity("1) Q1\n\n---\n\n2) Q2");
      const sep = result.sections[0].items.find((i) => i.kind === "separator");
      expect(sep).toBeDefined();
    });
  });

  // ── Math block ──

  describe("math block", () => {
    it("parses $$expr$$ outside question as mathblock", () => {
      const result = parseActivity("$$x^2 + y^2 = z^2$$\n\n1) Q1");
      const math = result.sections[0].items.find((i) => i.kind === "mathblock");
      expect(math).toBeDefined();
      if (math?.kind === "mathblock") {
        expect(math.expr).toBe("x^2 + y^2 = z^2");
      }
    });
  });

  // ── Multiple choice ──

  describe("multiple choice", () => {
    it("parses basic multiple choice question", () => {
      const q = firstQ("1) Quanto e 2+3?\na) 4\nb*) 5\nc) 6");
      expect(q.number).toBe(1);
      expect(q.type).toBe("multiple_choice");
      expect(q.statement).toBe("Quanto e 2+3?");
      expect(q.alternatives).toHaveLength(3);
    });

    it("detects correct alternative with asterisk", () => {
      const q = firstQ("1) Pergunta\na) Errada\nb*) Correta\nc) Errada");
      const correct = q.alternatives.find((a) => a.correct);
      expect(correct?.letter).toBe("b");
      expect(correct?.text).toBe("Correta");
    });

    it("parses parenthesized alternative format (a)", () => {
      const q = firstQ("1) Pergunta\n(a) Opcao A\n(b) Opcao B");
      expect(q.alternatives).toHaveLength(2);
      expect(q.alternatives[0].letter).toBe("a");
    });
  });

  // ── Open ended ──

  describe("open ended", () => {
    it("parses open ended with [linhas:N]", () => {
      const q = firstQ("1) Explique o conceito.\n[linhas:4]");
      expect(q.type).toBe("open_ended");
      expect(q.answerLines).toBe(4);
    });

    it("defaults to open_ended when no special markers", () => {
      const q = firstQ("1) Descreva sua opiniao.");
      expect(q.type).toBe("open_ended");
    });
  });

  // ── Fill blank ──

  describe("fill blank", () => {
    it("detects fill_blank from ___ in statement", () => {
      const q = firstQ("1) Complete: O resultado e ___.");
      expect(q.type).toBe("fill_blank");
    });

    it("parses word bank [banco: x,y,z]", () => {
      const q = firstQ("1) Complete: ___\n[banco: 3/4, 1/2, 1/3]");
      expect(q.type).toBe("fill_blank");
      expect(q.wordbank).toEqual(["3/4", "1/2", "1/3"]);
    });
  });

  // ── True/False ──

  describe("true/false", () => {
    it("parses blank V/F items ( )", () => {
      const q = firstQ("1) Marque V ou F:\n( ) O Sol e uma estrela.\n( ) A Lua e um planeta.");
      expect(q.type).toBe("true_false");
      expect(q.tfItems).toHaveLength(2);
      expect(q.tfItems[0].text).toBe("O Sol e uma estrela.");
      expect(q.tfItems[0].marked).toBeNull();
    });

    it("parses marked V/F items (V) (F)", () => {
      const q = firstQ("1) Marque V ou F:\n(V) Afirmacao verdadeira.\n(F) Afirmacao falsa.");
      expect(q.type).toBe("true_false");
      expect(q.tfItems[0].marked).toBe(true);
      expect(q.tfItems[1].marked).toBe(false);
    });
  });

  // ── Matching ──

  describe("matching", () => {
    it("parses matching pairs with --", () => {
      const q = firstQ("1) Ligue as colunas:\nAnimal -- Cachorro\nFruta -- Banana");
      expect(q.type).toBe("matching");
      expect(q.matchPairs).toHaveLength(2);
      expect(q.matchPairs[0]).toEqual({ left: "Animal", right: "Cachorro" });
    });
  });

  // ── Ordering ──

  describe("ordering", () => {
    it("parses ordering items [n]", () => {
      const q = firstQ("1) Ordene os passos:\n[1] Primeiro\n[2] Segundo\n[3] Terceiro");
      expect(q.type).toBe("ordering");
      expect(q.orderItems).toHaveLength(3);
      expect(q.orderItems[0]).toEqual({ n: 1, text: "Primeiro" });
    });
  });

  // ── Table ──

  describe("table", () => {
    it("parses table rows |...|", () => {
      const q = firstQ("1) Complete a tabela:\n|Col A|Col B|\n|---|---|\n|Val 1|Val 2|");
      expect(q.type).toBe("table");
      expect(q.tableRows).toHaveLength(2); // header + data (separator skipped)
      expect(q.tableRows[0]).toEqual(["Col A", "Col B"]);
    });
  });

  // ── Points & difficulty ──

  describe("metadata", () => {
    it("parses points {2pts}", () => {
      const q = firstQ("1) Questao {2pts}");
      expect(q.points).toBe(2);
      expect(q.statement).not.toContain("{2pts}");
    });

    it("parses difficulty {facil}", () => {
      const q = firstQ("1) Questao {facil}");
      expect(q.difficulty).toBe("fácil");
      expect(q.statement).not.toContain("{facil}");
    });

    it("parses difficulty {medio}", () => {
      const q = firstQ("1) Questao {medio}");
      expect(q.difficulty).toBe("médio");
    });
  });

  // ── Image ──

  describe("image", () => {
    it("parses [img:url] inside question", () => {
      const q = firstQ("1) Observe a figura.\n[img:https://example.com/img.png]");
      expect(q.image).toBe("https://example.com/img.png");
    });
  });

  // ── Scaffolding / Apoio ──

  describe("scaffolding", () => {
    it("captures > Apoio: after alternatives in last alternative's continuations", () => {
      const q = firstQ("1) Resolva.\na) 4\nb*) 5\n> Apoio: Use os dedos.");
      // After alternatives, instructions attach to the last alternative
      const lastAlt = q.alternatives[q.alternatives.length - 1];
      expect(lastAlt.continuations).toContain("> Apoio: Use os dedos.");
    });

    it("captures > Apoio: in question continuations when no alternatives", () => {
      const q = firstQ("1) Explique.\n[linhas:3]\n> Apoio: Pense com calma.");
      expect(q.continuations).toContain("> Apoio: Pense com calma.");
    });
  });

  // ── Multiple questions ──

  describe("multiple questions", () => {
    it("parses multiple questions sequentially", () => {
      const text = "1) Primeira\na) A\nb*) B\n\n2) Segunda\n[linhas:3]";
      const qs = allQuestions(text);
      expect(qs).toHaveLength(2);
      expect(qs[0].number).toBe(1);
      expect(qs[0].type).toBe("multiple_choice");
      expect(qs[1].number).toBe(2);
      expect(qs[1].type).toBe("open_ended");
    });
  });

  // ── Full DSL example (from fixtures) ──

  describe("full DSL example", () => {
    it("parses a complete activity DSL", () => {
      const dsl = `> Leia as questoes com atencao.

# Adicao

1) Quanto e 2 + 3?
a) 4
b*) 5
c) 6
> Apoio: Conte nos dedos.

2) Explique o que e uma soma.
[linhas:3]
> Apoio: Pense em juntar objetos.`;

      const result = parseActivity(dsl);
      // The > instruction before # creates its own section, then # Adicao is another
      expect(result.sections).toHaveLength(2);

      // First section: the instruction before any title
      const instrSec = result.sections[0];
      expect(instrSec.title).toBeNull();
      const instrItems = instrSec.items.filter((i) => i.kind === "instruction");
      expect(instrItems).toHaveLength(1);

      // Second section: the titled section with questions
      const sec = result.sections[1];
      expect(sec.title).toBe("Adicao");

      const qs = sec.items.filter((i) => i.kind === "question").map((i) => (i as any).data as ParsedQuestion);
      expect(qs).toHaveLength(2);

      expect(qs[0].type).toBe("multiple_choice");
      expect(qs[0].alternatives).toHaveLength(3);
      expect(qs[0].alternatives[1].correct).toBe(true);

      expect(qs[1].type).toBe("open_ended");
      expect(qs[1].answerLines).toBe(3);
    });
  });
});
