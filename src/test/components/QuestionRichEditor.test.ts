import { describe, it, expect } from "vitest";
import { isHtmlContent, textToHtml, htmlToText } from "@/components/QuestionRichEditor";

describe("isHtmlContent", () => {
  it("returns true for <p> tag", () => {
    expect(isHtmlContent("<p>texto</p>")).toBe(true);
  });

  it("returns true for <strong> tag", () => {
    expect(isHtmlContent("<strong>negrito</strong>")).toBe(true);
  });

  it("returns true for <em> tag", () => {
    expect(isHtmlContent("<em>itálico</em>")).toBe(true);
  });

  it("returns true for <ul> list", () => {
    expect(isHtmlContent("<ul><li>item</li></ul>")).toBe(true);
  });

  it("returns true for <br> tag", () => {
    expect(isHtmlContent("linha1<br>linha2")).toBe(true);
  });

  it("returns true for <span> tag", () => {
    expect(isHtmlContent("<span>texto</span>")).toBe(true);
  });

  it("returns true for <mark> tag", () => {
    expect(isHtmlContent("<mark>realce</mark>")).toBe(true);
  });

  it("returns true for <sub> and <sup> tags", () => {
    expect(isHtmlContent("H<sub>2</sub>O")).toBe(true);
    expect(isHtmlContent("x<sup>2</sup>")).toBe(true);
  });

  it("returns false for plain text", () => {
    expect(isHtmlContent("texto simples sem tags")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isHtmlContent("")).toBe(false);
  });

  it("returns false for text with < but not an HTML tag", () => {
    expect(isHtmlContent("3 < 5")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isHtmlContent("<P>texto</P>")).toBe(true);
    expect(isHtmlContent("<STRONG>negrito</STRONG>")).toBe(true);
  });
});

describe("textToHtml", () => {
  it("wraps single-line plain text in <p>", () => {
    expect(textToHtml("hello")).toBe("<p>hello</p>");
  });

  it("wraps multi-line text in separate <p> tags", () => {
    expect(textToHtml("linha1\nlinha2")).toBe("<p>linha1</p><p>linha2</p>");
  });

  it("replaces empty lines with <p><br></p>", () => {
    expect(textToHtml("a\n\nb")).toBe("<p>a</p><p><br></p><p>b</p>");
  });

  it("returns HTML content unchanged", () => {
    const html = "<p>já é HTML</p>";
    expect(textToHtml(html)).toBe(html);
  });

  it("handles empty string", () => {
    expect(textToHtml("")).toBe("<p><br></p>");
  });
});

describe("htmlToText", () => {
  it("strips <p> tags and returns inner text", () => {
    expect(htmlToText("<p>texto</p>")).toBe("texto");
  });

  it("converts <br> to newline", () => {
    expect(htmlToText("<p>a<br>b</p>")).toBe("a\nb");
  });

  it("converts </p><p> boundary to newline", () => {
    expect(htmlToText("<p>a</p><p>b</p>")).toBe("a\nb");
  });

  it("replaces &nbsp; with space", () => {
    expect(htmlToText("<p>a&nbsp;b</p>")).toBe("a b");
  });

  it("replaces &lt; with <", () => {
    expect(htmlToText("<p>&lt;tag&gt;</p>")).toBe("<tag>");
  });

  it("replaces &amp; with &", () => {
    expect(htmlToText("<p>&amp;</p>")).toBe("&");
  });

  it("trims leading and trailing whitespace", () => {
    expect(htmlToText("<p>  texto  </p>")).toBe("texto");
  });

  it("returns plain text unchanged", () => {
    expect(htmlToText("texto simples")).toBe("texto simples");
  });

  it("handles nested tags", () => {
    const result = htmlToText("<p><strong>negrito</strong></p>");
    expect(result).toBe("negrito");
  });
});
