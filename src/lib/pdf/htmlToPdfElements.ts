/**
 * Converts HTML content from TipTap editor to PDF segments for PDFRichLine.
 * Handles bold, italic, underline, strikethrough, highlight, color, font-family,
 * font-size, subscript, superscript, and nested formatting.
 */

export type RichSegment = {
  type: "text" | "fraction";
  content?: string;
  num?: string;
  den?: string;
  // Style attributes
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  subscript?: boolean;
  superscript?: boolean;
  color?: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: string;
};

// LaTeX fraction patterns
const LATEX_FRAC_RE = /\\[tdf]?frac\{([^{}]+)\}\{([^{}]+)\}/g;
const PLAIN_FRAC_RE = /(^|[\s=,(;+\-])(\?|\d+)\s*\/\s*(\?|\d+)(?=[\s=,);.\-+:]|$)/g;

// Style tracking during parsing
interface StyleContext {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  subscript: boolean;
  superscript: boolean;
  color?: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: string;
}

const defaultStyle: StyleContext = {
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  subscript: false,
  superscript: false,
};

/**
 * Parse HTML string to array of styled segments for PDF rendering.
 */
export function parseHtmlToSegments(html: string): RichSegment[] {
  if (!html || typeof html !== "string") return [];

  // Check if it's plain text (no HTML tags)
  if (!/<[^>]+>/.test(html)) {
    return parseTextWithFractions(html, defaultStyle);
  }

  const segments: RichSegment[] = [];

  // Create a temporary DOM parser
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Process all text nodes with their formatting context
  function processNode(node: Node, styles: StyleContext) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (text.trim() || text === " ") {
        addSegments(segments, text, styles);
      }
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tag = el.tagName.toLowerCase();
      const newStyles = { ...styles };

      // Track formatting from tags
      if (tag === "strong" || tag === "b") newStyles.bold = true;
      if (tag === "em" || tag === "i") newStyles.italic = true;
      if (tag === "u") newStyles.underline = true;
      if (tag === "s" || tag === "strike" || tag === "del") newStyles.strikethrough = true;
      if (tag === "sub") newStyles.subscript = true;
      if (tag === "sup") newStyles.superscript = true;
      if (tag === "mark") {
        // Get background color from style or data attribute
        const bgColor = el.getAttribute("data-color") ||
                        (el as HTMLElement).style?.backgroundColor ||
                        "#FEF08A"; // default yellow
        newStyles.backgroundColor = normalizeColor(bgColor);
      }

      // Parse inline styles from <span> elements
      if (tag === "span") {
        const style = (el as HTMLElement).style;
        if (style) {
          if (style.color) newStyles.color = normalizeColor(style.color);
          if (style.backgroundColor) newStyles.backgroundColor = normalizeColor(style.backgroundColor);
          if (style.fontFamily) newStyles.fontFamily = style.fontFamily;
          if (style.fontSize) newStyles.fontSize = style.fontSize;
        }
      }

      // Handle line breaks
      if (tag === "br") {
        segments.push({ type: "text", content: "\n", ...extractStyles(styles) });
        return;
      }

      // Handle list items
      if (tag === "li") {
        const parent = el.parentElement;
        if (parent?.tagName.toLowerCase() === "ul") {
          segments.push({ type: "text", content: "• ", ...extractStyles(styles) });
        } else if (parent?.tagName.toLowerCase() === "ol") {
          const index = Array.from(parent.children).indexOf(el) + 1;
          segments.push({ type: "text", content: `${index}. `, ...extractStyles(styles) });
        }
      }

      // Process children
      for (const child of Array.from(node.childNodes)) {
        processNode(child, newStyles);
      }

      // Add line break after block elements
      if (["p", "div", "li"].includes(tag)) {
        const lastSeg = segments[segments.length - 1];
        if (lastSeg && lastSeg.type === "text" && !lastSeg.content?.endsWith("\n")) {
          segments.push({ type: "text", content: "\n" });
        }
      }
    }
  }

  processNode(doc.body, defaultStyle);

  // Clean up trailing newlines
  while (segments.length > 0) {
    const last = segments[segments.length - 1];
    if (last.type === "text" && last.content === "\n") {
      segments.pop();
    } else if (last.type === "text" && last.content?.endsWith("\n")) {
      last.content = last.content.slice(0, -1);
      break;
    } else {
      break;
    }
  }

  // Process fractions within text segments
  return expandFractions(segments);
}

/**
 * Normalize color values (rgb, hex, named colors).
 */
function normalizeColor(color: string): string {
  if (!color) return "";

  // Already hex
  if (color.startsWith("#")) return color;

  // RGB format: rgb(r, g, b)
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, "0");
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, "0");
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`.toUpperCase();
  }

  return color;
}

/**
 * Extract non-default styles from context.
 */
function extractStyles(styles: StyleContext): Partial<RichSegment> {
  const result: Partial<RichSegment> = {};
  if (styles.bold) result.bold = true;
  if (styles.italic) result.italic = true;
  if (styles.underline) result.underline = true;
  if (styles.strikethrough) result.strikethrough = true;
  if (styles.subscript) result.subscript = true;
  if (styles.superscript) result.superscript = true;
  if (styles.color) result.color = styles.color;
  if (styles.backgroundColor) result.backgroundColor = styles.backgroundColor;
  if (styles.fontFamily) result.fontFamily = styles.fontFamily;
  if (styles.fontSize) result.fontSize = styles.fontSize;
  return result;
}

/**
 * Add segment(s) with styles applied.
 */
function addSegments(segments: RichSegment[], content: string, styles: StyleContext) {
  if (!content) return;
  segments.push({
    type: "text",
    content,
    ...extractStyles(styles),
  });
}

/**
 * Parse plain text and extract fractions.
 */
function parseTextWithFractions(text: string, styles: StyleContext): RichSegment[] {
  LATEX_FRAC_RE.lastIndex = 0;
  PLAIN_FRAC_RE.lastIndex = 0;

  const fractions: { num: string; den: string }[] = [];
  let processed = text;

  processed = processed.replace(LATEX_FRAC_RE, (_m, num, den) => {
    fractions.push({ num, den });
    return `\x00FRAC${fractions.length - 1}\x00`;
  });

  processed = processed.replace(PLAIN_FRAC_RE, (_m, prefix, num, den) => {
    fractions.push({ num, den });
    return `${prefix}\x00FRAC${fractions.length - 1}\x00`;
  });

  const parts = processed.split(/\x00/);
  const segments: RichSegment[] = [];
  const styleAttrs = extractStyles(styles);

  for (const part of parts) {
    const fracMatch = part.match(/^FRAC(\d+)$/);
    if (fracMatch) {
      const idx = parseInt(fracMatch[1], 10);
      segments.push({ type: "fraction", ...fractions[idx], ...styleAttrs });
    } else if (part) {
      segments.push({ type: "text", content: part, ...styleAttrs });
    }
  }

  return segments;
}

/**
 * Expand fractions within existing segments.
 */
function expandFractions(segments: RichSegment[]): RichSegment[] {
  const result: RichSegment[] = [];

  for (const seg of segments) {
    if (seg.type === "fraction") {
      result.push(seg);
      continue;
    }

    const content = seg.content || "";
    LATEX_FRAC_RE.lastIndex = 0;
    PLAIN_FRAC_RE.lastIndex = 0;

    if (!LATEX_FRAC_RE.test(content) && !PLAIN_FRAC_RE.test(content)) {
      result.push(seg);
      continue;
    }

    LATEX_FRAC_RE.lastIndex = 0;
    PLAIN_FRAC_RE.lastIndex = 0;

    const fractions: { num: string; den: string }[] = [];
    let processed = content;

    processed = processed.replace(LATEX_FRAC_RE, (_m, num, den) => {
      fractions.push({ num, den });
      return `\x00FRAC${fractions.length - 1}\x00`;
    });

    processed = processed.replace(PLAIN_FRAC_RE, (_m, prefix, num, den) => {
      fractions.push({ num, den });
      return `${prefix}\x00FRAC${fractions.length - 1}\x00`;
    });

    const parts = processed.split(/\x00/);
    for (const part of parts) {
      const fracMatch = part.match(/^FRAC(\d+)$/);
      if (fracMatch) {
        const idx = parseInt(fracMatch[1], 10);
        // Copy styles from original segment to fraction
        const { content: _, ...styles } = seg;
        result.push({ type: "fraction", ...fractions[idx], ...styles });
      } else if (part) {
        result.push({ ...seg, content: part });
      }
    }
  }

  return result;
}

/**
 * Check if content has any HTML formatting.
 */
export function hasHtmlFormatting(content: string): boolean {
  return /<(strong|b|em|i|u|s|strike|del|ul|ol|li|mark|span|sub|sup)\b/i.test(content);
}

/**
 * Check if content has fractions (LaTeX or plain).
 */
export function hasFractions(text: string): boolean {
  LATEX_FRAC_RE.lastIndex = 0;
  PLAIN_FRAC_RE.lastIndex = 0;
  return LATEX_FRAC_RE.test(text) || PLAIN_FRAC_RE.test(text);
}

/**
 * Check if a segment has any styling.
 */
export function hasStyles(seg: RichSegment): boolean {
  return !!(
    seg.bold ||
    seg.italic ||
    seg.underline ||
    seg.strikethrough ||
    seg.subscript ||
    seg.superscript ||
    seg.color ||
    seg.backgroundColor ||
    seg.fontFamily ||
    seg.fontSize
  );
}
