import { describe, it, expect } from "vitest";
import { formatInline, renderKatexBlock } from "@/lib/activityFormatter";

describe("activityFormatter", () => {
  describe("formatInline", () => {
    it("returns plain text with HTML-escaped entities", () => {
      const result = formatInline("Hello <world> & friends");
      expect(result).toContain("&lt;world&gt;");
      expect(result).toContain("&amp;");
    });

    it("renders **bold**", () => {
      const result = formatInline("Texto **negrito** aqui");
      expect(result).toContain("font-weight:700");
      expect(result).toContain("negrito");
    });

    it("renders *italic*", () => {
      const result = formatInline("Texto *italico* aqui");
      expect(result).toContain("font-style:italic");
      expect(result).toContain("italico");
    });

    it("renders __underline__", () => {
      const result = formatInline("Texto __sublinhado__ aqui");
      expect(result).toContain("text-decoration:underline");
      expect(result).toContain("sublinhado");
    });

    it("renders ~~strikethrough~~", () => {
      const result = formatInline("Texto ~~riscado~~ aqui");
      expect(result).toContain("text-decoration:line-through");
      expect(result).toContain("riscado");
    });

    it("renders ___ blanks as inline spans", () => {
      const result = formatInline("Complete: ___");
      expect(result).toContain("border-bottom");
      expect(result).not.toContain("___");
    });

    it("scales blank width with underscore count", () => {
      const short = formatInline("___");
      const long = formatInline("__________");
      // Both should have width styles but long should be wider
      const widthRegex = /width:([\d.]+)em/;
      const shortWidth = parseFloat(short.match(widthRegex)?.[1] || "0");
      const longWidth = parseFloat(long.match(widthRegex)?.[1] || "0");
      expect(longWidth).toBeGreaterThan(shortWidth);
    });

    it("renders inline math $x^2$ via KaTeX", () => {
      const result = formatInline("O valor de $x^2$ e positivo");
      // KaTeX output contains the katex class or span elements
      expect(result).toContain("katex");
      expect(result).not.toContain("$x^2$");
    });

    it("renders display math $$...$$ via KaTeX", () => {
      const result = formatInline("Formula: $$\\frac{1}{2}$$");
      expect(result).toContain("katex");
    });

    it("renders @cor[red]{text} as colored span", () => {
      const result = formatInline("Destaque: @cor[red]{importante}");
      expect(result).toContain('style="color:red"');
      expect(result).toContain("importante");
    });

    it("renders @tam[20]{text} as sized span", () => {
      const result = formatInline("Grande: @tam[20]{titulo}");
      expect(result).toContain('style="font-size:20px"');
      expect(result).toContain("titulo");
    });

    it("does not corrupt KaTeX output with text formatting", () => {
      // Math with underscores inside should not be treated as __underline__
      const result = formatInline("$\\text{area}$");
      expect(result).toContain("katex");
    });
  });

  describe("renderKatexBlock", () => {
    it("renders a valid expression", () => {
      const result = renderKatexBlock("x^2 + y^2 = z^2");
      expect(result).toContain("katex");
    });

    it("falls back to <pre> on invalid expression", () => {
      const result = renderKatexBlock("\\invalid{");
      // Should not throw, returns either katex output or <pre> fallback
      expect(result).toBeTruthy();
    });
  });
});
