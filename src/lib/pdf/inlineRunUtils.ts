import type { InlineRun } from "@/types/adaptation";
import type { EditableActivity } from "@/lib/pdf/editableActivity";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Build initial TipTap-compatible HTML from a ContentBlock's plain content
 * and optional richContent. Newlines become <br> (hard breaks).
 *
 * Invariant: parsing the output back via extractRuns yields the same plain text.
 */
export function buildInitialHtml(content: string, richContent?: InlineRun[]): string {
  const lineToHtml = (line: string) => escapeHtml(line);
  if (richContent && richContent.length > 0) {
    const inner = richContent
      .map((r) => {
        const parts = r.text.split("\n");
        const joined = parts.map(lineToHtml).join("<br>");
        return r.color
          ? `<span style="color: ${r.color}">${joined}</span>`
          : joined;
      })
      .join("");
    return `<p>${inner}</p>`;
  }
  const lines = content.split("\n").map(lineToHtml).join("<br>");
  return `<p>${lines}</p>`;
}

/**
 * Walk a TipTap JSON document and emit inline runs.
 * Paragraph boundaries (after the first) emit a newline so the plain-text
 * round-trip preserves user-typed line breaks.
 * Adjacent runs with the same color are merged.
 */
export function extractRuns(docJson: unknown): {
  runs: InlineRun[];
  plain: string;
} {
  const raw: InlineRun[] = [];
  let paragraphCount = 0;

  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as {
      type?: string;
      text?: string;
      marks?: Array<{ type: string; attrs?: { color?: string } }>;
      content?: unknown[];
    };

    if (n.type === "paragraph") {
      if (paragraphCount > 0) raw.push({ text: "\n" });
      paragraphCount++;
      if (Array.isArray(n.content)) n.content.forEach(walk);
      return;
    }
    if (n.type === "text") {
      const mark = Array.isArray(n.marks)
        ? n.marks.find((m) => m.type === "textStyle" && m.attrs?.color)
        : undefined;
      raw.push({
        text: n.text ?? "",
        color: mark?.attrs?.color,
      });
      return;
    }
    if (n.type === "hardBreak") {
      raw.push({ text: "\n" });
      return;
    }
    if (Array.isArray(n.content)) n.content.forEach(walk);
  };

  walk(docJson);

  const merged: InlineRun[] = [];
  for (const r of raw) {
    const last = merged[merged.length - 1];
    if (last && last.color === r.color) {
      last.text += r.text;
    } else {
      merged.push({ text: r.text, color: r.color });
    }
  }
  const nonEmpty = merged.filter((r) => r.text.length > 0);
  const plain = nonEmpty.map((r) => r.text).join("");
  return { runs: nonEmpty, plain };
}

/** Does any run carry a color? */
export function hasAnyColor(runs: InlineRun[]): boolean {
  return runs.some((r) => !!r.color);
}

/**
 * Normalize a color string to lowercase hex when possible, so we can
 * compare editor state against our palette buttons regardless of how
 * ProseMirror/TipTap serializes (hex vs rgb).
 */
export function normalizeColor(color: string | undefined | null): string | undefined {
  if (!color) return undefined;
  const trimmed = color.trim().toLowerCase();
  if (trimmed.startsWith("#")) return trimmed;
  const rgbMatch = trimmed.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    const hex = [r, g, b]
      .map((v) => Number(v).toString(16).padStart(2, "0"))
      .join("");
    return `#${hex}`;
  }
  return trimmed;
}

/**
 * Strip run-level colors from all text blocks in an EditableActivity.
 * Invoked when the user navigates back from the layout step, so colors
 * (which are layout-only state) don't leak back into the editor flow.
 * Pure: returns a new object, does not mutate input.
 */
export function stripRichContent(
  activity: EditableActivity | undefined,
): EditableActivity | undefined {
  if (!activity) return undefined;
  return {
    ...activity,
    questions: activity.questions.map((q) => ({
      ...q,
      content: q.content.map((b) =>
        b.type === "text" ? { ...b, richContent: undefined } : b,
      ),
    })),
  };
}
