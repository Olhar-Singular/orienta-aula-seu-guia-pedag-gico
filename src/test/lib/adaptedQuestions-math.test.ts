import { describe, it, expect } from "vitest";
import {
  normalizeAdaptedContent,
  parseAdaptedQuestions,
  replaceQuestionInAdaptedContent,
} from "@/lib/adaptedQuestions";

describe("parseAdaptedQuestions – LaTeX & Math", () => {
  it("parses questions with inline LaTeX ($...$)", () => {
    const content = `1. Calcule: $x^2 + 2x - 3 = 0$
a) x = 1
b) x = -3

2. Simplifique: $\\frac{42}{48}$
a) 7/8
b) 6/7`;
    const result = parseAdaptedQuestions(content);
    expect(result).toHaveLength(2);
    expect(result[0].text).toContain("x^2");
    expect(result[0].options).toHaveLength(2);
    expect(result[1].text).toContain("frac");
    expect(result[1].options).toHaveLength(2);
  });

  it("parses questions with plain fractions (3/4, 42/48)", () => {
    const content = `1. Quanto é 3/4 + 1/2?
a) 5/4
b) 7/4`;
    const result = parseAdaptedQuestions(content);
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain("3/4");
  });

  it("parses questions with exponents (x², 10^2, x^{-1})", () => {
    const content = `1. Calcule 10² + 10³
a) 1100
b) 1000`;
    const result = parseAdaptedQuestions(content);
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain("10²");
  });

  it("parses questions with Unicode Greek letters (Δ, α, β)", () => {
    const content = `1. Se Δs = 100 m e Δt = 5 s, calcule v
a) 20 m/s
b) 25 m/s`;
    const result = parseAdaptedQuestions(content);
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain("Δs");
  });

  it("parses questions with subscripts (v₀, H₂O)", () => {
    const content = `1. A velocidade v₀ é 10 m/s. Calcule v final.
a) 20 m/s
b) 15 m/s`;
    const result = parseAdaptedQuestions(content);
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain("v₀");
  });

  it("handles multiline question text", () => {
    const content = `1. Leia o texto abaixo:
A água é essencial para a vida.
Responda: qual a importância?
a) Hidratação
b) Alimentação`;
    const result = parseAdaptedQuestions(content);
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain("Leia o texto");
    expect(result[0].text).toContain("Responda");
    expect(result[0].options).toHaveLength(2);
  });

  it("does not confuse decimal numbers (1.1, 2.5) with question numbers", () => {
    const content = `1. O valor de π é aproximadamente 3.14
a) Verdadeiro
b) Falso`;
    const result = parseAdaptedQuestions(content);
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain("3.14");
  });

  it("keeps denominator-like lines as math continuation, not a new question", () => {
    const content = `5) \\times (1,2^2 - 3/
4) \\div 0,3$`;
    const result = parseAdaptedQuestions(content);

    expect(result).toHaveLength(1);
    expect(result[0].number).toBe("5");
    expect(result[0].text).toContain("3/");
    expect(result[0].text).toContain("4) \\div 0,3$");
  });
});

describe("normalizeAdaptedContent – LaTeX preservation", () => {
  it("preserves $...$ delimiters", () => {
    const input = "1. Calcule $\\frac{1}{2}$";
    const result = normalizeAdaptedContent(input);
    expect(result).toContain("$\\frac{1}{2}$");
  });

  it("splits inline questions even with math content", () => {
    const input = "1. Calcule x² 2. Calcule x³";
    const result = normalizeAdaptedContent(input);
    expect(result).toContain("\n2.");
  });

  it("does not split fraction-denominator pattern like 3/ 4)", () => {
    const input = "5) \\times (1,2^2 - 3/ 4) \\div 0,3$";
    const result = normalizeAdaptedContent(input);
    expect(result).not.toContain("3/\n4)");
  });
});

describe("replaceQuestionInAdaptedContent – preserves other questions", () => {
  it("replaces one question without corrupting LaTeX in others", () => {
    const content = `1. Calcule $\\frac{1}{2}$
a) 0.5
b) 0.25

2. Quanto é 2 + 2?
a) 3
b) 4`;

    const result = replaceQuestionInAdaptedContent(content, {
      number: "2",
      text: "Quanto é 3 + 3?",
      options: ["5", "6"],
    });

    expect(result).toContain("frac{1}{2}");
    expect(result).toContain("3 + 3?");
    expect(result).toContain("a) 5");
    expect(result).toContain("b) 6");
  });

  it("handles replacement with multiline text", () => {
    const content = `1. Pergunta simples
a) A
b) B`;
    const result = replaceQuestionInAdaptedContent(content, {
      number: "1",
      text: "Leia o texto:\nResponda abaixo:",
      options: ["C", "D"],
    });
    expect(result).toContain("1. Leia o texto:");
    expect(result).toContain("Responda abaixo:");
    expect(result).toContain("a) C");
  });

  it("does not duplicate expression lines on repeated saves", () => {
    const content = `5) \\times (1,2^2 - 3/
4) \\div 0,3$`;

    const once = replaceQuestionInAdaptedContent(content, {
      number: "5",
      text: `\\times (1,2^2 - 3/
4) \\div 0,3$`,
      options: [],
    });

    const twice = replaceQuestionInAdaptedContent(once, {
      number: "5",
      text: `\\times (1,2^2 - 3/
4) \\div 0,3$`,
      options: [],
    });

    const occurrences = (twice.match(/5\. \\times/g) || []).length;
    expect(occurrences).toBe(1);
  });
});
