import { describe, it, expect } from "vitest";
import { resolveFontFamily, textStyleToPdf } from "@/lib/pdf/contentRenderer";
import type { TextStyle } from "@/types/adaptation";

describe("resolveFontFamily", () => {
  it("returns base font when no bold/italic", () => {
    expect(resolveFontFamily("Helvetica", false, false)).toBe("Helvetica");
    expect(resolveFontFamily("Courier", false, false)).toBe("Courier");
    expect(resolveFontFamily("Times-Roman", false, false)).toBe("Times-Roman");
  });

  it("returns bold variant for Helvetica and Courier", () => {
    expect(resolveFontFamily("Helvetica", true, false)).toBe("Helvetica-Bold");
    expect(resolveFontFamily("Courier", true, false)).toBe("Courier-Bold");
  });

  it("returns italic/oblique variant", () => {
    expect(resolveFontFamily("Helvetica", false, true)).toBe("Helvetica-Oblique");
    expect(resolveFontFamily("Courier", false, true)).toBe("Courier-Oblique");
    expect(resolveFontFamily("Times-Roman", false, true)).toBe("Times-Italic");
  });

  it("returns bold+italic variant", () => {
    expect(resolveFontFamily("Helvetica", true, true)).toBe("Helvetica-BoldOblique");
    expect(resolveFontFamily("Courier", true, true)).toBe("Courier-BoldOblique");
    expect(resolveFontFamily("Times-Roman", true, true)).toBe("Times-BoldItalic");
  });
});

describe("textStyleToPdf", () => {
  it("uses defaults when no style provided", () => {
    const result = textStyleToPdf();

    expect(result).toEqual({
      fontSize: 11,
      fontFamily: "Helvetica",
      textAlign: "justify",
      lineHeight: 1.5,
    });
  });

  it("merges partial style with defaults", () => {
    const style: TextStyle = { fontSize: 14, bold: true };
    const result = textStyleToPdf(style);

    expect(result).toEqual({
      fontSize: 14,
      fontFamily: "Helvetica-Bold",
      textAlign: "justify",
      lineHeight: 1.5,
    });
  });

  it("resolves font family with bold+italic", () => {
    const style: TextStyle = {
      fontFamily: "Times-Roman",
      bold: true,
      italic: true,
    };
    const result = textStyleToPdf(style);

    expect(result.fontFamily).toBe("Times-BoldItalic");
  });

  it("applies all custom values", () => {
    const style: TextStyle = {
      fontSize: 16,
      fontFamily: "Courier",
      bold: false,
      italic: true,
      textAlign: "center",
      lineHeight: 2,
    };
    const result = textStyleToPdf(style);

    expect(result).toEqual({
      fontSize: 16,
      fontFamily: "Courier-Oblique",
      textAlign: "center",
      lineHeight: 2,
    });
  });
});
