import { describe, it, expect } from "vitest";
import { parseActivityText, normalizeMathText } from "@/lib/pdf/textParser";

describe("normalizeMathText – corrupted LaTeX", () => {
  it("restores \\frac corrupted by JSON (form-feed)", () => {
    const corrupted = "\x0Crac{3}{4}";
    const result = normalizeMathText(corrupted);
    expect(result).toContain("3/4");
    expect(result).not.toContain("\x0C");
  });

  it("restores \\tfrac corrupted by JSON (tab)", () => {
    const corrupted = "\x09frac{1}{2}";
    const result = normalizeMathText(corrupted);
    expect(result).toContain("1/2");
  });

  it("restores \\binom corrupted by JSON (backspace)", () => {
    const corrupted = "\x08inom{5}{3}";
    const result = normalizeMathText(corrupted);
    // After restore it becomes \\binom{5}{3}, then generic cleanup removes it
    expect(result).not.toContain("\x08");
  });

  it("converts \\frac{a}{b} to a/b", () => {
    expect(normalizeMathText("\\frac{42}{48}")).toBe("42/48");
  });

  it("converts \\tfrac{a}{b} to a/b", () => {
    expect(normalizeMathText("\\tfrac{7}{8}")).toBe("7/8");
  });

  it("converts \\dfrac{a}{b} to a/b", () => {
    expect(normalizeMathText("\\dfrac{1}{3}")).toBe("1/3");
  });

  it("strips $...$ delimiters", () => {
    expect(normalizeMathText("$x^2 + 1$")).toContain("x");
    expect(normalizeMathText("$x^2 + 1$")).not.toContain("$");
  });

  it("strips $$...$$ delimiters", () => {
    expect(normalizeMathText("$$E = mc^2$$")).not.toContain("$$");
  });

  it("converts LaTeX operators to symbols", () => {
    expect(normalizeMathText("5 \\times 3")).toContain("x");
    expect(normalizeMathText("10 \\div 2")).toContain("÷");
    expect(normalizeMathText("\\pm 5")).toContain("+/-");
    expect(normalizeMathText("\\sqrt{9}")).toContain("√(9)");
  });

  it("converts caret exponents to Unicode superscripts", () => {
    expect(normalizeMathText("x^2")).toBe("x²");
    expect(normalizeMathText("10^{-3}")).toBe("10⁻³");
  });

  it("handles complex formula E = mc²", () => {
    const result = normalizeMathText("$E = mc^2$");
    expect(result).toContain("mc²");
  });
});

describe("parseActivityText – math content", () => {
  it("detects formulas with Greek letters", () => {
    const result = parseActivityText("Δs = v × Δt");
    expect(result[0].type).toBe("formula");
  });

  it("detects formulas with superscripts", () => {
    const result = parseActivityText("a² + b² = c²");
    expect(result[0].type).toBe("formula");
  });

  it("parses questions with math in options", () => {
    const text = `1. Calcule o resultado
a) 3/4
b) 7/8
c) 1/2`;
    const result = parseActivityText(text);
    const types = result.map((e) => e.type);
    expect(types).toContain("question-number");
    expect(types).toContain("alternative");
  });

  it("handles alternatives a through j", () => {
    const text = "f) Opção F\ng) Opção G\nh) Opção H";
    const result = parseActivityText(text);
    expect(result.filter((e) => e.type === "alternative")).toHaveLength(3);
  });
});
