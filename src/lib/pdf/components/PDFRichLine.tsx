/**
 * Renders a single line of text with rich formatting support for PDF export.
 * Supports: bold, italic, underline, strikethrough, highlight, colors,
 * font-family, font-size, subscript, superscript, and fractions.
 */
import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { colors } from "../styles";
import PDFFraction from "./PDFFraction";
import { parseHtmlToSegments, type RichSegment, hasStyles } from "../htmlToPdfElements";

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  textSegment: {
    fontSize: 11,
    lineHeight: 1.6,
    color: colors.text,
  },
});

// Font size mapping from CSS to PDF points
const FONT_SIZE_MAP: Record<string, number> = {
  "0.875em": 9,
  "1em": 11,
  "1.25em": 13,
  "1.5em": 15,
  small: 9,
  normal: 11,
  large: 13,
  xlarge: 15,
};

// Font family mapping - OpenDyslexic and custom fonts fallback to Helvetica in PDF
// (OpenDyslexic works in the web editor but not yet in PDF export)
const FONT_FAMILY_MAP: Record<string, string> = {
  opendyslexic: "Helvetica",
  arial: "Helvetica",
  verdana: "Helvetica",
  "courier new": "Courier",
  courier: "Courier",
  inherit: "Helvetica",
};

/**
 * Normalize font family string for lookup.
 * Extracts the first font name and lowercases it.
 */
function normalizeFontFamily(fontFamily: string): string {
  if (!fontFamily) return "";
  // Remove quotes and get first font in the stack
  const first = fontFamily.split(",")[0].trim().replace(/['"]/g, "").toLowerCase();
  console.log("[PDF] normalizeFontFamily:", fontFamily, "->", first);
  return first;
}

// Match \frac{...}{...} or \tfrac{...}{...} or \dfrac{...}{...}
const LATEX_FRAC_RE = /\\[tdf]?frac\{([^{}]+)\}\{([^{}]+)\}/g;
// Match plain fractions like 7/8, 42/48, ?/48
const PLAIN_FRAC_RE = /(^|[\s=,(;+\-])(\?|\d+)\s*\/\s*(\?|\d+)(?=[\s=,);.\-+:]|$)/g;

type LegacySegment = { type: "text"; content: string } | { type: "fraction"; num: string; den: string };

function parseLineFractions(text: string): LegacySegment[] {
  let processed = text;
  const fractions: { num: string; den: string }[] = [];

  processed = processed.replace(LATEX_FRAC_RE, (_m, num, den) => {
    fractions.push({ num, den });
    return `\x00FRAC${fractions.length - 1}\x00`;
  });

  processed = processed.replace(PLAIN_FRAC_RE, (_m, prefix, num, den) => {
    fractions.push({ num, den });
    return `${prefix}\x00FRAC${fractions.length - 1}\x00`;
  });

  const parts = processed.split(/\x00/);
  const segments: LegacySegment[] = [];

  for (const part of parts) {
    const fracMatch = part.match(/^FRAC(\d+)$/);
    if (fracMatch) {
      const idx = parseInt(fracMatch[1], 10);
      segments.push({ type: "fraction", ...fractions[idx] });
    } else if (part) {
      segments.push({ type: "text", content: part });
    }
  }

  return segments;
}

export function hasFractions(text: string): boolean {
  LATEX_FRAC_RE.lastIndex = 0;
  PLAIN_FRAC_RE.lastIndex = 0;
  return LATEX_FRAC_RE.test(text) || PLAIN_FRAC_RE.test(text);
}

export function hasHtmlFormatting(content: string): boolean {
  return /<(strong|b|em|i|u|s|strike|del|p|ul|ol|li|mark|span|sub|sup)\b/i.test(content);
}

/**
 * Build text style object for a rich segment.
 */
function buildSegmentStyle(seg: RichSegment, baseStyle: any): any {
  // Create base style, but remove any fontFamily from baseStyle to prevent invalid fonts
  const { fontFamily: _ignoredBaseFont, ...safeBaseStyle } = baseStyle || {};
  const style: any = { ...styles.textSegment, ...safeBaseStyle };

  // Font family - map to PDF-safe fonts
  if (seg.fontFamily) {
    const normalized = normalizeFontFamily(seg.fontFamily);
    const baseFamily = FONT_FAMILY_MAP[normalized] || "Helvetica";

    // Apply bold/italic variants for standard PDF fonts
    if (baseFamily === "Helvetica") {
      if (seg.bold && seg.italic) {
        style.fontFamily = "Helvetica-BoldOblique";
      } else if (seg.bold) {
        style.fontFamily = "Helvetica-Bold";
      } else if (seg.italic) {
        style.fontFamily = "Helvetica-Oblique";
      } else {
        style.fontFamily = "Helvetica";
      }
    } else if (baseFamily === "Courier") {
      if (seg.bold && seg.italic) {
        style.fontFamily = "Courier-BoldOblique";
      } else if (seg.bold) {
        style.fontFamily = "Courier-Bold";
      } else if (seg.italic) {
        style.fontFamily = "Courier-Oblique";
      } else {
        style.fontFamily = "Courier";
      }
    } else {
      style.fontFamily = baseFamily;
    }
  } else {
    // Default Helvetica variants - always set a valid fontFamily
    if (seg.bold && seg.italic) {
      style.fontFamily = "Helvetica-BoldOblique";
    } else if (seg.bold) {
      style.fontFamily = "Helvetica-Bold";
    } else if (seg.italic) {
      style.fontFamily = "Helvetica-Oblique";
    } else {
      style.fontFamily = "Helvetica";
    }
  }

  // Font size
  if (seg.fontSize) {
    const size = FONT_SIZE_MAP[seg.fontSize];
    if (size) style.fontSize = size;
  }

  // Text color
  if (seg.color) {
    style.color = seg.color;
  }

  // Background color (highlight)
  if (seg.backgroundColor) {
    style.backgroundColor = seg.backgroundColor;
  }

  // Text decoration
  if (seg.underline && seg.strikethrough) {
    style.textDecoration = "underline line-through";
  } else if (seg.underline) {
    style.textDecoration = "underline";
  } else if (seg.strikethrough) {
    style.textDecoration = "line-through";
  }

  return style;
}

/**
 * Render a single rich segment as inline Text (for nesting inside parent Text).
 * When hasFraction is true, it means we need to return for View-based rendering.
 */
function renderRichSegmentInline(seg: RichSegment, index: number, baseStyle: any): React.ReactElement | null {
  if (seg.type === "fraction") {
    // Fractions can't be inline - they need View-based rendering
    return null;
  }

  const segmentStyle = buildSegmentStyle(seg, baseStyle);
  const content = seg.content || "";

  // Handle subscript/superscript with font size adjustment
  if (seg.subscript || seg.superscript) {
    const subSupStyle = {
      ...segmentStyle,
      fontSize: (segmentStyle.fontSize || 11) * 0.7,
    };
    return (
      <Text key={index} style={subSupStyle}>
        {content}
      </Text>
    );
  }

  return (
    <Text key={index} style={segmentStyle}>
      {content}
    </Text>
  );
}

/**
 * Render a single rich segment for View-based layout (needed when fractions are present).
 */
function renderRichSegmentBlock(seg: RichSegment, index: number, baseStyle: any) {
  if (seg.type === "fraction") {
    return <PDFFraction key={index} numerator={seg.num!} denominator={seg.den!} />;
  }

  const segmentStyle = buildSegmentStyle(seg, baseStyle);
  const content = seg.content || "";

  if (seg.subscript || seg.superscript) {
    const subSupStyle = {
      ...segmentStyle,
      fontSize: (segmentStyle.fontSize || 11) * 0.7,
    };
    return (
      <Text key={index} style={subSupStyle}>
        {content}
      </Text>
    );
  }

  return (
    <Text key={index} style={segmentStyle}>
      {content}
    </Text>
  );
}

type Props = {
  text: string;
  style?: any;
  /** If true, force parse as HTML with rich formatting */
  html?: boolean;
};

export default function PDFRichLine({ text, style, html }: Props) {
  LATEX_FRAC_RE.lastIndex = 0;
  PLAIN_FRAC_RE.lastIndex = 0;

  const shouldParseHtml = html || hasHtmlFormatting(text);

  if (shouldParseHtml) {
    const segments = parseHtmlToSegments(text);

    if (segments.length === 0) {
      return <Text style={style}>{""}</Text>;
    }

    // Single plain text segment with no styling
    if (segments.length === 1 && segments[0].type === "text" && !hasStyles(segments[0])) {
      return <Text style={style}>{segments[0].content}</Text>;
    }

    // Check if any segment is a fraction (requires View-based layout)
    const hasFractionSegment = segments.some((seg) => seg.type === "fraction");

    if (hasFractionSegment) {
      // Use View-based layout for fractions (they can't be inline)
      return (
        <View style={[styles.row, { minHeight: style?.fontSize ? style.fontSize * 1.8 : 20 }]}>
          {segments.map((seg, i) => renderRichSegmentBlock(seg, i, style))}
        </View>
      );
    }

    // No fractions: use nested Text elements for proper inline flow
    // This prevents unwanted line breaks between styled segments
    return (
      <Text style={style}>
        {segments.map((seg, i) => renderRichSegmentInline(seg, i, style))}
      </Text>
    );
  }

  // Legacy plain text mode with fraction support only
  if (!hasFractions(text)) {
    return <Text style={style}>{text}</Text>;
  }

  LATEX_FRAC_RE.lastIndex = 0;
  PLAIN_FRAC_RE.lastIndex = 0;

  const segments = parseLineFractions(text);

  return (
    <View style={[styles.row, { minHeight: style?.fontSize ? style.fontSize * 1.8 : 20 }]}>
      {segments.map((seg, i) =>
        seg.type === "fraction" ? (
          <PDFFraction key={i} numerator={seg.num} denominator={seg.den} />
        ) : (
          <Text key={i} style={[styles.textSegment, style]}>
            {seg.content}
          </Text>
        )
      )}
    </View>
  );
}
