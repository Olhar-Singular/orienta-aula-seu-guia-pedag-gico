import { describe, it, expect } from "vitest";
import {
  markdownDslToStructured,
  structuredToMarkdownDsl,
} from "@/lib/activityDslConverter";

describe("markdownDslToStructured — q.content fidelity", () => {
  it("produces one text block per paragraph (blank-line separated)", () => {
    const dsl = [
      "2) Esta atividade tem duas partes.",
      "",
      "Parte A: Encontre as palavras com tritongo.",
      "Circle, na lista abaixo, apenas as palavras que possuem tritongo.",
      "",
      "Parte B: Use as palavras que você circulou.",
      "Complete as frases abaixo.",
    ].join("\n");

    const result = markdownDslToStructured(dsl);
    const q = result.sections[0].questions[0];

    expect(q.content).toBeDefined();
    const textBlocks = q.content!.filter((b) => b.type === "text");
    expect(textBlocks).toHaveLength(3);

    const texts = textBlocks.map((b) => (b.type === "text" ? b.content : ""));
    expect(texts[0]).toContain("Esta atividade tem duas partes");
    expect(texts[1]).toContain("Parte A");
    expect(texts[1]).toContain("Circle, na lista abaixo");
    expect(texts[2]).toContain("Parte B");
    expect(texts[2]).toContain("Complete as frases");
  });

  it("places inline images at their DSL position (not all at the end)", () => {
    const dsl = [
      "1) Observe a figura abaixo.",
      "",
      "[img:https://example.com/figA.png]",
      "",
      "Agora descreva o que vê.",
      "",
      "[img:https://example.com/figB.png]",
    ].join("\n");

    const result = markdownDslToStructured(dsl);
    const q = result.sections[0].questions[0];

    expect(q.content).toBeDefined();
    const types = q.content!.map((b) => b.type);
    expect(types.indexOf("image")).toBeLessThan(types.lastIndexOf("text"));

    const images = q.content!.filter((b) => b.type === "image");
    expect(images).toHaveLength(2);
    expect(images[0].type === "image" && images[0].src).toBe("https://example.com/figA.png");
    expect(images[1].type === "image" && images[1].src).toBe("https://example.com/figB.png");
  });

  it("keeps the legacy q.images list in sync for back-compat", () => {
    const dsl = [
      "1) Pergunta.",
      "[img:https://example.com/x.png]",
    ].join("\n");
    const result = markdownDslToStructured(dsl);
    const q = result.sections[0].questions[0];
    expect(q.images).toEqual(["https://example.com/x.png"]);
  });

  it("preserves paragraph order with images between paragraphs", () => {
    const dsl = [
      "1) Parte inicial.",
      "",
      "[img:https://example.com/p.png]",
      "",
      "Parte final.",
    ].join("\n");
    const result = markdownDslToStructured(dsl);
    const q = result.sections[0].questions[0];

    const kinds = q.content!.map((b) =>
      b.type === "text" ? "text" : b.type === "image" ? "image" : b.type,
    );
    expect(kinds).toEqual(["text", "image", "text"]);

    const first = q.content![0];
    const last = q.content![q.content!.length - 1];
    expect(first.type === "text" && first.content).toContain("Parte inicial");
    expect(last.type === "text" && last.content).toContain("Parte final");
  });

  it("keeps statement as a derived convenience (first text block)", () => {
    const dsl = [
      "1) Primeiro parágrafo.",
      "",
      "Segundo parágrafo.",
    ].join("\n");
    const result = markdownDslToStructured(dsl);
    const q = result.sections[0].questions[0];

    expect(q.statement).toContain("Primeiro parágrafo");
    // The second paragraph should NOT be flattened into statement
    expect(q.statement).not.toContain("Segundo parágrafo");
  });

  it("treats Apoio lines as scaffolding (not content blocks) for V1", () => {
    const dsl = [
      "1) Pergunta.",
      "> Apoio: Lembre-se da regra X.",
    ].join("\n");
    const result = markdownDslToStructured(dsl);
    const q = result.sections[0].questions[0];
    expect(q.scaffolding).toEqual(["Lembre-se da regra X."]);
  });

  it("does not emit content for questions with no body text (only alternatives)", () => {
    const dsl = [
      "1) Qual a cor do céu?",
      "a) Azul",
      "b) Vermelho",
    ].join("\n");
    const result = markdownDslToStructured(dsl);
    const q = result.sections[0].questions[0];
    // Statement should be in content[0] as one text block
    expect(q.content).toBeDefined();
    const textBlocks = q.content!.filter((b) => b.type === "text");
    expect(textBlocks).toHaveLength(1);
    expect(textBlocks[0].type === "text" && textBlocks[0].content).toBe("Qual a cor do céu?");
    expect(q.alternatives).toHaveLength(2);
  });
});

describe("DSL round-trip preserves paragraphs and image positions", () => {
  it("preserves multi-paragraph structure across DSL → Structured → DSL", () => {
    const dsl = [
      "1) Primeiro parágrafo.",
      "",
      "Segundo parágrafo.",
      "",
      "Terceiro parágrafo.",
    ].join("\n");

    const structured = markdownDslToStructured(dsl);
    const back = structuredToMarkdownDsl(structured);
    const structured2 = markdownDslToStructured(back);

    const q1 = structured.sections[0].questions[0];
    const q2 = structured2.sections[0].questions[0];

    const paras1 = q1.content!.filter((b) => b.type === "text").map((b) =>
      b.type === "text" ? b.content : "",
    );
    const paras2 = q2.content!.filter((b) => b.type === "text").map((b) =>
      b.type === "text" ? b.content : "",
    );

    expect(paras2).toEqual(paras1);
    expect(paras2).toHaveLength(3);
  });

  it("preserves inline image position across DSL → Structured → DSL", () => {
    const dsl = [
      "1) Antes.",
      "",
      "[img:https://example.com/a.png]",
      "",
      "Depois.",
    ].join("\n");

    const structured = markdownDslToStructured(dsl);
    const back = structuredToMarkdownDsl(structured);
    const structured2 = markdownDslToStructured(back);

    const kinds = structured2.sections[0].questions[0].content!.map((b) =>
      b.type === "text" ? "text" : b.type,
    );
    expect(kinds).toEqual(["text", "image", "text"]);
  });
});
