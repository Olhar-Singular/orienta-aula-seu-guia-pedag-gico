import { describe, it, expect } from "vitest";
import { parseMarkdownInline } from "@/lib/parseMarkdownInline";

describe("parseMarkdownInline", () => {
  it("returns undefined for plain text (no asterisks)", () => {
    expect(parseMarkdownInline("Hello world")).toBeUndefined();
  });

  it("returns undefined when text has no actual formatting markers", () => {
    expect(parseMarkdownInline("No formatting here")).toBeUndefined();
  });

  it("parses **bold** into a bold run", () => {
    const runs = parseMarkdownInline("Hello **world**");
    expect(runs).toEqual([
      { text: "Hello " },
      { text: "world", bold: true },
    ]);
  });

  it("parses *italic* into an italic run", () => {
    const runs = parseMarkdownInline("Say *hello* there");
    expect(runs).toEqual([
      { text: "Say " },
      { text: "hello", italic: true },
      { text: " there" },
    ]);
  });

  it("parses ***bold italic*** into a bold+italic run", () => {
    const runs = parseMarkdownInline("***important***");
    expect(runs).toEqual([{ text: "important", bold: true, italic: true }]);
  });

  it("handles bold at start without leading text", () => {
    const runs = parseMarkdownInline("**Selecione** todas");
    expect(runs).toEqual([
      { text: "Selecione", bold: true },
      { text: " todas" },
    ]);
  });

  it("handles bold at end without trailing text", () => {
    const runs = parseMarkdownInline("Selecione **todas**");
    expect(runs).toEqual([
      { text: "Selecione " },
      { text: "todas", bold: true },
    ]);
  });

  it("handles multiple bold spans in same string", () => {
    const runs = parseMarkdownInline("**A** e **B**");
    expect(runs).toEqual([
      { text: "A", bold: true },
      { text: " e " },
      { text: "B", bold: true },
    ]);
  });

  it("handles mixed bold and italic in same string", () => {
    const runs = parseMarkdownInline("**negrito** e *italico*");
    expect(runs).toEqual([
      { text: "negrito", bold: true },
      { text: " e " },
      { text: "italico", italic: true },
    ]);
  });

  it("returns undefined when string consists entirely of one plain span", () => {
    // A single non-formatted segment means nothing was parsed
    expect(parseMarkdownInline("just text")).toBeUndefined();
  });

  it("does not include empty text runs", () => {
    // "**bold**" with nothing before or after
    const runs = parseMarkdownInline("**bold**");
    expect(runs).toEqual([{ text: "bold", bold: true }]);
  });
});
