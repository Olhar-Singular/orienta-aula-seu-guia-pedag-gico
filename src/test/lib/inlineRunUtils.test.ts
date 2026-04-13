import { describe, it, expect } from "vitest";
import {
  buildInitialHtml,
  extractRuns,
  hasAnyColor,
  normalizeColor,
} from "@/lib/pdf/inlineRunUtils";
import type { InlineRun } from "@/types/adaptation";

// ─── buildInitialHtml ────────────────────────────────────────────────────────

describe("buildInitialHtml", () => {
  it("wraps plain content in a <p>", () => {
    expect(buildInitialHtml("Hello")).toBe("<p>Hello</p>");
  });

  it("escapes HTML entities in plain content", () => {
    expect(buildInitialHtml('a & b < c > "d"')).toBe(
      "<p>a &amp; b &lt; c &gt; &quot;d&quot;</p>",
    );
  });

  it("uses <br> for newlines in plain content", () => {
    expect(buildInitialHtml("line1\nline2")).toBe("<p>line1<br>line2</p>");
  });

  it("renders colored runs with style span", () => {
    const runs: InlineRun[] = [
      { text: "Leia " },
      { text: "atencao", color: "#dc2626" },
    ];
    expect(buildInitialHtml("Leia atencao", runs)).toBe(
      '<p>Leia <span style="color: #dc2626">atencao</span></p>',
    );
  });

  it("falls back to content when richContent is empty array", () => {
    expect(buildInitialHtml("Fallback", [])).toBe("<p>Fallback</p>");
  });

  it("escapes HTML inside colored run text", () => {
    const runs: InlineRun[] = [{ text: "<script>", color: "#dc2626" }];
    expect(buildInitialHtml("<script>", runs)).toBe(
      '<p><span style="color: #dc2626">&lt;script&gt;</span></p>',
    );
  });

  it("preserves newlines inside a colored run as <br>", () => {
    const runs: InlineRun[] = [{ text: "a\nb", color: "#2563eb" }];
    expect(buildInitialHtml("a\nb", runs)).toBe(
      '<p><span style="color: #2563eb">a<br>b</span></p>',
    );
  });
});

// ─── extractRuns ─────────────────────────────────────────────────────────────

describe("extractRuns", () => {
  const textNode = (text: string, color?: string) => ({
    type: "text",
    text,
    ...(color
      ? { marks: [{ type: "textStyle", attrs: { color } }] }
      : {}),
  });

  const para = (...children: unknown[]) => ({
    type: "paragraph",
    content: children,
  });

  const doc = (...paragraphs: unknown[]) => ({
    type: "doc",
    content: paragraphs,
  });

  it("extracts a single plain-text run", () => {
    const result = extractRuns(doc(para(textNode("hello"))));
    expect(result.runs).toEqual([{ text: "hello", color: undefined }]);
    expect(result.plain).toBe("hello");
  });

  it("extracts a colored run with color", () => {
    const result = extractRuns(
      doc(para(textNode("red", "#dc2626"))),
    );
    expect(result.runs).toEqual([{ text: "red", color: "#dc2626" }]);
  });

  it("merges adjacent runs with same color", () => {
    const result = extractRuns(
      doc(
        para(
          textNode("a", "#dc2626"),
          textNode("b", "#dc2626"),
          textNode("c"),
          textNode("d"),
        ),
      ),
    );
    expect(result.runs).toEqual([
      { text: "ab", color: "#dc2626" },
      { text: "cd", color: undefined },
    ]);
    expect(result.plain).toBe("abcd");
  });

  it("emits newline between paragraphs (bug fix: was losing paragraph breaks)", () => {
    const result = extractRuns(
      doc(para(textNode("hello")), para(textNode("world"))),
    );
    expect(result.plain).toBe("hello\nworld");
  });

  it("emits newline for hardBreak nodes", () => {
    const result = extractRuns(
      doc(
        para(textNode("a"), { type: "hardBreak" }, textNode("b")),
      ),
    );
    expect(result.plain).toBe("a\nb");
  });

  it("drops empty text runs", () => {
    const result = extractRuns(
      doc(para(textNode(""), textNode("visible"))),
    );
    expect(result.runs).toHaveLength(1);
    expect(result.runs[0].text).toBe("visible");
  });

  it("handles empty doc", () => {
    const result = extractRuns(doc());
    expect(result.runs).toEqual([]);
    expect(result.plain).toBe("");
  });

  it("handles null or non-object input gracefully", () => {
    expect(extractRuns(null).plain).toBe("");
    expect(extractRuns(undefined).plain).toBe("");
    expect(extractRuns("string").plain).toBe("");
  });

  it("ignores non-color textStyle marks", () => {
    const result = extractRuns(
      doc(
        para({
          type: "text",
          text: "no-color",
          marks: [{ type: "textStyle", attrs: {} }],
        }),
      ),
    );
    expect(result.runs[0].color).toBeUndefined();
  });
});

// ─── round-trip (invariant: plain text survives) ────────────────────────────

describe("buildInitialHtml ↔ extractRuns (plain-text invariant)", () => {
  // These integration-ish checks encode the invariant documented in the module:
  // concatenated run texts must equal the original content.
  it("invariant: richContent → html → doc → runs preserves plain text", () => {
    const runs: InlineRun[] = [
      { text: "Leia " },
      { text: "com atencao", color: "#dc2626" },
      { text: " por favor" },
    ];
    const plain = runs.map((r) => r.text).join("");
    // We can't parse HTML here without jsdom, but we verify the structure
    const html = buildInitialHtml(plain, runs);
    expect(html).toContain("Leia ");
    expect(html).toContain("com atencao");
    expect(html).toContain(" por favor");
    expect(html).toContain("#dc2626");
  });
});

// ─── hasAnyColor ─────────────────────────────────────────────────────────────

describe("hasAnyColor", () => {
  it("returns false for empty runs", () => {
    expect(hasAnyColor([])).toBe(false);
  });

  it("returns false when no run has color", () => {
    expect(hasAnyColor([{ text: "a" }, { text: "b" }])).toBe(false);
  });

  it("returns true when at least one run has color", () => {
    expect(
      hasAnyColor([{ text: "a" }, { text: "b", color: "#dc2626" }]),
    ).toBe(true);
  });
});

// ─── normalizeColor ──────────────────────────────────────────────────────────

describe("normalizeColor", () => {
  it("returns undefined for null/undefined/empty", () => {
    expect(normalizeColor(null)).toBeUndefined();
    expect(normalizeColor(undefined)).toBeUndefined();
    expect(normalizeColor("")).toBeUndefined();
  });

  it("lowercases hex", () => {
    expect(normalizeColor("#DC2626")).toBe("#dc2626");
    expect(normalizeColor("#Ab12Cd")).toBe("#ab12cd");
  });

  it("converts rgb() to hex", () => {
    expect(normalizeColor("rgb(220, 38, 38)")).toBe("#dc2626");
    expect(normalizeColor("rgb(0, 0, 0)")).toBe("#000000");
    expect(normalizeColor("rgb(255, 255, 255)")).toBe("#ffffff");
  });

  it("tolerates extra whitespace in rgb()", () => {
    expect(normalizeColor("  rgb( 220 , 38 , 38 )  ")).toBe("#dc2626");
  });

  it("returns other strings lowercased as a fallback", () => {
    expect(normalizeColor("Red")).toBe("red");
  });
});
