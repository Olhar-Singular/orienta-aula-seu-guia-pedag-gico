import { describe, it, expect } from "vitest";
import { normalizeAIText } from "@/lib/normalizeAIText";

describe("normalizeAIText", () => {
  it("removes zero-width characters", () => {
    const input = "Hello\u200BWorld\u200C!\u200D\uFEFF";
    expect(normalizeAIText(input)).toBe("HelloWorld!");
  });

  it("removes form-feed characters", () => {
    expect(normalizeAIText("\\frac\x0C{1}{2}")).toBe("\\frac{1}{2}");
  });

  it("converts CRLF to LF", () => {
    expect(normalizeAIText("line1\r\nline2\r\nline3")).toBe("line1\nline2\nline3");
  });

  it("converts lone CR to LF", () => {
    expect(normalizeAIText("line1\rline2")).toBe("line1\nline2");
  });

  it("leaves clean text untouched", () => {
    const clean = "1) Quanto e 2+3?\na) 4\nb*) 5\nc) 6";
    expect(normalizeAIText(clean)).toBe(clean);
  });

  it("preserves LaTeX commands (no double-unescape)", () => {
    const latex = "Use $\\frac{1}{2}$ e $\\text{area}$ e $\\theta$";
    expect(normalizeAIText(latex)).toBe(latex);
  });
});
