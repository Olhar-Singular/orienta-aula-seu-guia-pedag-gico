import { describe, it, expect } from "vitest";
import { TEXT_STYLE_DEFAULTS, type TextStyle } from "@/types/adaptation";

// Replicates the stripDefaults function from StructuralEditor.tsx (not exported).
// Keep in sync with src/components/adaptation/pdf-preview/StructuralEditor.tsx
function stripDefaults(style: TextStyle): TextStyle | undefined {
  const result: Partial<TextStyle> = {};
  for (const key of Object.keys(style) as Array<keyof TextStyle>) {
    if (style[key] !== TEXT_STYLE_DEFAULTS[key]) {
      (result as Record<string, unknown>)[key] = style[key];
    }
  }
  return Object.keys(result).length > 0 ? (result as TextStyle) : undefined;
}

describe("stripDefaults", () => {
  it("returns undefined when all values match defaults", () => {
    const style: TextStyle = { ...TEXT_STYLE_DEFAULTS };
    expect(stripDefaults(style)).toBeUndefined();
  });

  it("returns undefined for empty object", () => {
    expect(stripDefaults({})).toBeUndefined();
  });

  it("preserves fontSize override", () => {
    expect(stripDefaults({ fontSize: 14 })).toEqual({ fontSize: 14 });
  });

  it("preserves bold override", () => {
    expect(stripDefaults({ bold: true })).toEqual({ bold: true });
  });

  it("preserves italic override", () => {
    expect(stripDefaults({ italic: true })).toEqual({ italic: true });
  });

  it("preserves fontFamily override", () => {
    expect(stripDefaults({ fontFamily: "Times-Roman" })).toEqual({ fontFamily: "Times-Roman" });
  });

  it("preserves textAlign override", () => {
    expect(stripDefaults({ textAlign: "center" })).toEqual({ textAlign: "center" });
  });

  it("preserves lineHeight override", () => {
    expect(stripDefaults({ lineHeight: 2 })).toEqual({ lineHeight: 2 });
  });

  it("preserves multiple overrides", () => {
    const input: TextStyle = { fontSize: 14, bold: true, textAlign: "center" };
    expect(stripDefaults(input)).toEqual(input);
  });

  it("strips defaults mixed with overrides", () => {
    const input: TextStyle = {
      fontSize: 14,
      fontFamily: "Helvetica", // default
      bold: false, // default
      italic: false, // default
      textAlign: "justify", // default
      lineHeight: 1.5, // default
    };
    expect(stripDefaults(input)).toEqual({ fontSize: 14 });
  });

  it("handles full Required<TextStyle> with one override", () => {
    const input: TextStyle = { ...TEXT_STYLE_DEFAULTS, bold: true };
    expect(stripDefaults(input)).toEqual({ bold: true });
  });
});
