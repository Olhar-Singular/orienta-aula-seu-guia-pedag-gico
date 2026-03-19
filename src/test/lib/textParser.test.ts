import { describe, it, expect } from "vitest";
import { parseActivityText, normalizeMathText } from "@/lib/pdf/textParser";

describe("normalizeMathText", () => {
  it("converts superscript chars to ^notation", () => {
    expect(normalizeMathText("10²")).toBe("10^2");
    expect(normalizeMathText("x³")).toBe("x^3");
  });

  it("converts subscript chars to _notation", () => {
    expect(normalizeMathText("H₂O")).toBe("H_2O");
  });

  it("replaces unicode math symbols", () => {
    expect(normalizeMathText("5 × 3")).toBe("5  x  3");
    expect(normalizeMathText("10 ÷ 2")).toBe("10  ÷  2");
    expect(normalizeMathText("±5")).toBe("+/-5");
    expect(normalizeMathText("a ≠ b")).toBe("a != b");
    expect(normalizeMathText("x ≤ 10")).toBe("x <= 10");
    expect(normalizeMathText("x ≥ 0")).toBe("x >= 0");
    expect(normalizeMathText("3·4")).toBe("3.4");
  });

  it("handles plain text without changes", () => {
    expect(normalizeMathText("Hello world")).toBe("Hello world");
  });

  it("handles multiple superscripts", () => {
    expect(normalizeMathText("10⁻²")).toBe("10^-2");
  });
});

describe("parseActivityText", () => {
  it("returns empty array for empty/null input", () => {
    expect(parseActivityText("")).toEqual([]);
    expect(parseActivityText(null as any)).toEqual([]);
    expect(parseActivityText(undefined as any)).toEqual([]);
  });

  it("detects titles (all uppercase, > 5 chars)", () => {
    const result = parseActivityText("PROVA DE MATEMÁTICA");
    expect(result[0].type).toBe("title");
    expect(result[0].content).toBe("PROVA DE MATEMÁTICA");
  });

  it("does not treat short uppercase as title", () => {
    const result = parseActivityText("OK");
    expect(result[0].type).toBe("paragraph");
  });

  it("detects question numbers", () => {
    const result = parseActivityText("1. Qual é a resposta correta?");
    expect(result[0].type).toBe("question-number");
    expect(result[0].metadata?.number).toBe("1");
  });

  it("detects alternatives (a-e)", () => {
    const result = parseActivityText("a) Opção A\nb) Opção B\nc) Opção C");
    expect(result.filter((e) => e.type === "alternative")).toHaveLength(3);
  });

  it("detects bullet items", () => {
    const result = parseActivityText("- Item um\n- Item dois");
    expect(result.filter((e) => e.type === "bullet-item")).toHaveLength(2);
  });

  it("detects steps", () => {
    const result = parseActivityText("Passo 1: Faça isso");
    expect(result[0].type).toBe("step");
  });

  it("detects instructions", () => {
    const result = parseActivityText("ATENÇÃO: Leia com cuidado");
    expect(result[0].type).toBe("instruction");
  });

  it("detects headers", () => {
    const result = parseActivityText("BLOCO I: Introdução");
    expect(result[0].type).toBe("header");
  });

  it("detects formulas with math symbols", () => {
    const result = parseActivityText("x² + y² = z²");
    expect(result[0].type).toBe("formula");
  });

  it("handles separators (empty lines)", () => {
    const result = parseActivityText("Parágrafo 1\n\nParágrafo 2");
    expect(result.some((e) => e.type === "separator")).toBe(true);
  });

  it("handles horizontal rules", () => {
    const result = parseActivityText("Antes\n---\nDepois");
    expect(result.some((e) => e.type === "separator")).toBe(true);
  });

  it("removes leading/trailing separators", () => {
    const result = parseActivityText("\n\nTexto\n\n");
    expect(result[0].type).not.toBe("separator");
    expect(result[result.length - 1].type).not.toBe("separator");
  });

  it("removes consecutive separators", () => {
    const result = parseActivityText("A\n\n\n\n\nB");
    const separators = result.filter((e) => e.type === "separator");
    expect(separators.length).toBeLessThanOrEqual(1);
  });

  it("handles mixed content", () => {
    const text = "PROVA DE CIÊNCIAS\n\n1. O que é fotossíntese?\na) Um processo químico\nb) Um tipo de luz\n\nATENÇÃO: Responda com cuidado";
    const result = parseActivityText(text);
    const types = result.map((e) => e.type);
    expect(types).toContain("title");
    expect(types).toContain("question-number");
    expect(types).toContain("alternative");
    expect(types).toContain("instruction");
  });
});
