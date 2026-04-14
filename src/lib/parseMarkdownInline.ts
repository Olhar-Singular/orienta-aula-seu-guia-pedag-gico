import type { InlineRun } from "@/types/adaptation";

type Span = { start: number; end: number; text: string; bold: boolean; italic: boolean };

/**
 * Parse inline markdown bold/italic markers into InlineRun[].
 *
 * Supports: ***bold italic***, **bold**, *italic*
 *
 * Returns undefined when the text has no formatting markers so callers can
 * skip setting richContent and avoid unnecessary overhead.
 */
export function parseMarkdownInline(text: string): InlineRun[] | undefined {
  if (!text.includes("*")) return undefined;

  const spans: Span[] = [];
  let m: RegExpExecArray | null;

  // Step 1: Find *** and ** spans (order: *** before **)
  const RE_BOLD = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*/g;
  while ((m = RE_BOLD.exec(text)) !== null) {
    if (m[1] !== undefined) {
      spans.push({ start: m.index, end: RE_BOLD.lastIndex, text: m[1], bold: true, italic: true });
    } else {
      spans.push({ start: m.index, end: RE_BOLD.lastIndex, text: m[2], bold: true, italic: false });
    }
  }

  // Step 2: Mask out positions already consumed by bold spans so the italic
  // regex does not accidentally match delimiter chars inside those regions.
  let masked = text;
  for (const span of [...spans].reverse()) {
    masked =
      masked.slice(0, span.start) +
      " ".repeat(span.end - span.start) +
      masked.slice(span.end);
  }

  // Step 3: Find lone * italic spans in the masked text (positions are same as original)
  const RE_ITALIC = /\*([^*]+?)\*/g;
  while ((m = RE_ITALIC.exec(masked)) !== null) {
    spans.push({ start: m.index, end: RE_ITALIC.lastIndex, text: m[1], bold: false, italic: true });
  }

  if (spans.length === 0) return undefined;

  // Sort by start position to build runs in order
  spans.sort((a, b) => a.start - b.start);

  const runs: InlineRun[] = [];
  let cursor = 0;

  for (const span of spans) {
    // Plain text before this span
    if (span.start > cursor) {
      runs.push({ text: text.slice(cursor, span.start) });
    }
    const run: InlineRun = { text: span.text };
    if (span.bold) run.bold = true;
    if (span.italic) run.italic = true;
    runs.push(run);
    cursor = span.end;
  }

  // Remaining plain text after last span
  if (cursor < text.length) {
    runs.push({ text: text.slice(cursor) });
  }

  // Guard: if somehow all runs ended up plain, return undefined
  if (runs.every((r) => !r.bold && !r.italic)) return undefined;

  return runs;
}
