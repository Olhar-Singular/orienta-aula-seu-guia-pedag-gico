// Inline text formatter for activity DSL preview.
// Handles markdown-like formatting, math (KaTeX), colors, font sizes, and blanks.

import katex from "katex";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Pre-process a LaTeX expression before passing to KaTeX.
 * KaTeX does not support `_` as a literal character inside \text{} — it tries
 * to parse each underscore as a subscript and throws an error.
 * Replace \text{___...} with \underline{\hspace{Xem}} so blanks render correctly.
 */
function preprocessLatex(expr: string): string {
  return expr.replace(/\\text\{(_+)\}/g, (_, underscores: string) => {
    const em = Math.max(1.5, Math.min(underscores.length * 0.5, 8));
    return `\\underline{\\hspace{${em}em}}`;
  });
}

function renderKatexInline(expr: string): string {
  try {
    return katex.renderToString(preprocessLatex(expr), { throwOnError: false, displayMode: false });
  } catch {
    return "<code>" + esc(expr) + "</code>";
  }
}

export function renderKatexBlock(expr: string): string {
  try {
    return katex.renderToString(preprocessLatex(expr), { throwOnError: false, displayMode: true });
  } catch {
    return "<pre>" + esc(expr) + "</pre>";
  }
}

/**
 * Format inline text with markdown-like syntax:
 * - $$...$$ display math (block)
 * - $...$ inline math
 * - @cor[color]{text} colored text
 * - @tam[size]{text} sized text
 * - **bold**, *italic*, __underline__, ~~strike~~
 * - ___ blanks
 *
 * Math regions are extracted into placeholders BEFORE any other regex runs,
 * so blanks/bold/italic cannot corrupt KaTeX output or error HTML.
 */
export function formatInline(text: string): string {
  // Strip form-feed (0x0C) — safety net in case it arrives here.
  let s = text.replace(/\x0C/g, "");
  s = esc(s);

  // ── Step 1: extract math into placeholders ──────────────────────────────
  // Null-byte delimiters are safe: stripped upstream, never appear in DSL text.
  const mathSlots: string[] = [];
  function slot(html: string): string {
    mathSlots.push(html);
    return `\x00${mathSlots.length - 1}\x00`;
  }

  // Math block $$...$$ (before inline — avoids $$x$$ being matched as two $x$)
  s = s.replace(/\$\$(.+?)\$\$/g, (_, expr) =>
    slot(
      '<div style="margin:0.5rem 0;padding:0.5rem;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;text-align:center;overflow-x:auto">' +
        renderKatexBlock(expr) +
        "</div>"
    )
  );

  // Math inline $...$
  s = s.replace(/\$(.+?)\$/g, (_, expr) => slot(renderKatexInline(expr)));

  // ── Step 2: text formatting (math slots are opaque) ─────────────────────

  // Color @cor[color]{text}
  s = s.replace(/@cor\[(.+?)\]\{(.+?)\}/g, '<span style="color:$1">$2</span>');

  // Font size @tam[size]{text}
  s = s.replace(/@tam\[(\d+)\]\{(.+?)\}/g, '<span style="font-size:$1px">$2</span>');

  // Blanks ___ (BEFORE underline — avoids __(.+?)__ consuming blank underscores)
  // Width scales with number of underscores: each underscore ≈ 0.55em, capped at 12em.
  s = s.replace(/_{3,}/g, (match) => {
    const w = Math.max(2, Math.min(match.length * 0.55, 12));
    return `<span style="display:inline-block;border-bottom:1.5px solid currentColor;width:${w}em;vertical-align:bottom;margin:0 1px"></span>`;
  });

  // Bold **text** (before italic to avoid conflict)
  s = s.replace(/\*\*(.+?)\*\*/g, '<span style="font-weight:700">$1</span>');

  // Italic *text*
  s = s.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<span style="font-style:italic">$1</span>');

  // Underline __text__ (only matches 2 underscores each side — blanks already consumed above)
  s = s.replace(/__(.+?)__/g, '<span style="text-decoration:underline">$1</span>');

  // Strikethrough ~~text~~
  s = s.replace(/~~(.+?)~~/g, '<span style="text-decoration:line-through">$1</span>');

  // ── Step 3: restore math placeholders ───────────────────────────────────
  s = s.replace(/\x00(\d+)\x00/g, (_, i) => mathSlots[parseInt(i, 10)]);

  return s;
}
