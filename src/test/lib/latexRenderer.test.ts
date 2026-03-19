import { describe, it, expect, vi } from "vitest";

// Mock katex to avoid full rendering
vi.mock("katex", () => ({
  default: {
    renderToString: vi.fn((latex: string) => `<katex>${latex}</katex>`),
  },
}));

import { renderMathToHtml, hasMathContent } from "@/lib/latexRenderer";

describe("renderMathToHtml", () => {
  it("returns empty string for falsy input", () => {
    expect(renderMathToHtml("")).toBe("");
    expect(renderMathToHtml(null as any)).toBe("");
    expect(renderMathToHtml(undefined as any)).toBe("");
  });

  it("renders explicit LaTeX blocks ($...$)", () => {
    const result = renderMathToHtml("The answer is $x^2$");
    expect(result).toContain("<katex>");
  });

  it("renders \\frac{a}{b}", () => {
    const result = renderMathToHtml("\\frac{1}{2}");
    expect(result).toContain("<katex>");
  });

  it("renders \\sqrt{x}", () => {
    const result = renderMathToHtml("\\sqrt{16}");
    expect(result).toContain("<katex>");
  });

  it("renders superscripts with braces: x^{3}", () => {
    const result = renderMathToHtml("x^{3}");
    expect(result).toContain("<katex>");
  });

  it("renders superscripts with parens: 10^(24)", () => {
    const result = renderMathToHtml("10^(24)");
    expect(result).toContain("<katex>");
  });

  it("renders simple superscripts: 10^5", () => {
    const result = renderMathToHtml("10^5");
    expect(result).toContain("<katex>");
  });

  it("renders plain fractions like 3/4", () => {
    const result = renderMathToHtml("3/4");
    expect(result).toContain("<katex>");
  });

  it("does not render non-math fractions like km/h", () => {
    const result = renderMathToHtml("km/h");
    expect(result).toBe("km/h");
  });

  it("renders subscripts: x_{12}", () => {
    const result = renderMathToHtml("x_{12}");
    expect(result).toContain("<katex>");
  });

  it("converts newlines to <br/>", () => {
    const result = renderMathToHtml("line1\nline2");
    expect(result).toContain("<br/>");
  });

  it("preserves plain text without math", () => {
    const result = renderMathToHtml("Hello world");
    expect(result).toBe("Hello world");
  });
});

describe("hasMathContent", () => {
  it("returns false for empty/falsy", () => {
    expect(hasMathContent("")).toBe(false);
    expect(hasMathContent(null as any)).toBe(false);
  });

  it("detects \\frac", () => {
    expect(hasMathContent("\\frac{1}{2}")).toBe(true);
  });

  it("detects \\sqrt", () => {
    expect(hasMathContent("\\sqrt{4}")).toBe(true);
  });

  it("detects $...$", () => {
    expect(hasMathContent("$x+1$")).toBe(true);
  });

  it("detects numeric fractions", () => {
    expect(hasMathContent("3/4 of the students")).toBe(true);
  });

  it("detects superscripts", () => {
    expect(hasMathContent("10^5")).toBe(true);
  });

  it("detects subscripts", () => {
    expect(hasMathContent("x_1")).toBe(true);
  });

  it("returns false for plain text", () => {
    expect(hasMathContent("Hello world, no math here")).toBe(false);
  });
});
