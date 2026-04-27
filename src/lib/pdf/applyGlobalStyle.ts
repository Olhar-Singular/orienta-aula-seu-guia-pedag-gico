import type { InlineRun, TextStyle } from "@/types/adaptation";
import type { EditableActivity } from "./editableActivity";

export type GlobalStyleIncludeFlags = {
  fontFamily?: boolean;
  fontSize?: boolean;
  bold?: boolean;
  italic?: boolean;
  textAlign?: boolean;
  lineHeight?: boolean;
  color?: boolean;
};

export type GlobalStyleInput = {
  style: TextStyle;
  include: GlobalStyleIncludeFlags;
  questionSpacing?: number;
  alternativeIndent?: number;
  includeQuestionSpacing?: boolean;
  includeAlternativeIndent?: boolean;
};

const STYLE_KEYS = [
  "fontFamily",
  "fontSize",
  "bold",
  "italic",
  "textAlign",
  "lineHeight",
  "color",
] as const;

function mergeStyle(prev: TextStyle | undefined, input: GlobalStyleInput): TextStyle | undefined {
  const next: TextStyle = { ...(prev ?? {}) };
  let touched = false;
  for (const key of STYLE_KEYS) {
    if (input.include[key] && input.style[key] !== undefined) {
      (next as Record<string, unknown>)[key] = input.style[key];
      touched = true;
    }
  }
  if (!touched) return prev;
  return next;
}

/** Strip per-run color overrides from richContent so that the cascading
 *  parent `style.color` becomes the visible color. Preserves bold/italic and
 *  the original text shape — important because `block.content` may carry DSL
 *  placeholders (e.g. `[img:imagem-1]`) that richContent omits. Adjacent runs
 *  that became identical after stripping are merged. */
function stripRunColors(runs: InlineRun[] | undefined): InlineRun[] | undefined {
  if (!runs || runs.length === 0) return runs;
  let changed = false;
  const stripped: InlineRun[] = [];
  for (const r of runs) {
    let next: InlineRun;
    if (r.color === undefined) {
      next = r;
    } else {
      changed = true;
      const { color: _color, ...rest } = r;
      next = rest;
    }
    const last = stripped[stripped.length - 1];
    if (
      last &&
      last.bold === next.bold &&
      last.italic === next.italic &&
      last.color === next.color
    ) {
      stripped[stripped.length - 1] = { ...last, text: last.text + next.text };
    } else {
      stripped.push(next);
    }
  }
  return changed ? stripped : runs;
}

function isApplyNoOp(input: GlobalStyleInput): boolean {
  if (input.includeQuestionSpacing) return false;
  if (input.includeAlternativeIndent) return false;
  for (const key of STYLE_KEYS) {
    if (input.include[key]) return false;
  }
  return true;
}

/**
 * Aplica configurações globais de estilo a todos os blocos de texto da
 * atividade. Apenas os campos com flag `include[k] === true` são propagados —
 * o restante de cada bloco permanece intacto. Quando `color` está em `include`,
 * cores por palavra (`richContent[i].color`) são removidas para que a cor
 * uniforme do bloco prevaleça via cascata, sem mexer no texto em si.
 */
export function applyGlobalStyle(
  activity: EditableActivity,
  input: GlobalStyleInput,
): EditableActivity {
  // Short-circuit: nothing to apply → return input by reference so callers
  // (history, change subscribers) don't push a no-op snapshot.
  if (isApplyNoOp(input)) return activity;
  const colorWasIncluded = !!input.include.color;
  return {
    ...activity,
    questions: activity.questions.map((q) => {
      const next = { ...q };
      if (input.includeQuestionSpacing && input.questionSpacing !== undefined) {
        next.spacingAfter = input.questionSpacing;
      }
      if (input.includeAlternativeIndent && input.alternativeIndent !== undefined) {
        next.alternativeIndent = input.alternativeIndent;
      }
      next.content = q.content.map((b) => {
        if (b.type !== "text") return b;
        const mergedStyle = mergeStyle(b.style, input);
        const nextBlock = { ...b, style: mergedStyle };
        if (colorWasIncluded && nextBlock.richContent) {
          nextBlock.richContent = stripRunColors(nextBlock.richContent);
        }
        return nextBlock;
      });
      return next;
    }),
  };
}
