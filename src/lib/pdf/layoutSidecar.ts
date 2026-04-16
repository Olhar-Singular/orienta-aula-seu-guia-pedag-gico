import type { EditableActivity, EditableQuestion } from "./editableActivity";
import type {
  InlineRun,
  ContentBlock,
  StructuredActivity,
  StructuredQuestion,
} from "@/types/adaptation";
import { hashQuestionContent } from "@/lib/questionIdentity";

export type WordColor = {
  blockId: string;
  word: string;
  occurrence: number;
  color: string;
};

export type QuestionLayout = {
  spacingAfter?: number;
  showSeparator?: boolean;
  alternativeIndent?: number;
  answerLines?: number;
  pageBreakBefore?: boolean;
  wordColors?: WordColor[];
};

export type LayoutSidecar = {
  version: 1;
  globalShowSeparators?: boolean;
  questions: Record<string, QuestionLayout>;
};

export function emptySidecar(): LayoutSidecar {
  return { version: 1, questions: {} };
}

const WORD_RE = /[\p{L}\p{N}]+/gu;

/** Tokenize `text` into word-or-separator runs and colorize the words that
 *  appear in `wordColors`. Word occurrence is counted per distinct word across
 *  the whole text (not per run). */
function buildRichContentWithColors(
  text: string,
  wordColors: WordColor[],
): InlineRun[] {
  const colorMap = new Map<string, string>();
  for (const wc of wordColors) {
    colorMap.set(`${wc.word}::${wc.occurrence}`, wc.color);
  }

  const runs: InlineRun[] = [];
  const occCount: Record<string, number> = {};
  const re = /([\p{L}\p{N}]+)|([^\p{L}\p{N}]+)/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const word = m[1];
    const rest = m[2];
    if (word !== undefined) {
      const idx = occCount[word] ?? 0;
      occCount[word] = idx + 1;
      const color = colorMap.get(`${word}::${idx}`);
      runs.push(color ? { text: word, color } : { text: word });
    } else if (rest !== undefined) {
      runs.push({ text: rest });
    }
  }

  return runs;
}

function applyColorsToBlocks(
  blocks: ContentBlock[],
  wordColors: WordColor[],
): ContentBlock[] {
  return blocks.map((block) => {
    if (block.type !== "text") return block;
    const colorsForBlock = wordColors.filter((c) => c.blockId === block.id);
    if (colorsForBlock.length === 0) return block;
    return {
      ...block,
      richContent: buildRichContentWithColors(block.content, colorsForBlock),
    };
  });
}

export function applySidecar(
  activity: EditableActivity,
  sidecar: LayoutSidecar,
): EditableActivity {
  return {
    ...activity,
    globalShowSeparators:
      sidecar.globalShowSeparators ?? activity.globalShowSeparators,
    questions: activity.questions.map((q): EditableQuestion => {
      const entry = sidecar.questions[q.id];
      if (!entry) return q;

      const next: EditableQuestion = { ...q };
      if (entry.spacingAfter !== undefined) next.spacingAfter = entry.spacingAfter;
      if (entry.showSeparator !== undefined) next.showSeparator = entry.showSeparator;
      if (entry.alternativeIndent !== undefined) {
        next.alternativeIndent = entry.alternativeIndent;
      }
      if (entry.answerLines !== undefined) next.answerLines = entry.answerLines;

      if (entry.wordColors && entry.wordColors.length > 0) {
        next.content = applyColorsToBlocks(q.content, entry.wordColors);
      }

      return next;
    }),
  };
}

/** Walk runs in order and count word occurrences globally (per text block),
 *  producing a `WordColor[]` for any run that carries an explicit `color`. */
function extractWordColorsFromBlock(
  blockId: string,
  runs: InlineRun[],
): WordColor[] {
  const result: WordColor[] = [];
  const occCount: Record<string, number> = {};
  for (const run of runs) {
    const re = new RegExp(WORD_RE.source, "gu");
    let m: RegExpExecArray | null;
    while ((m = re.exec(run.text)) !== null) {
      const word = m[0];
      const idx = occCount[word] ?? 0;
      occCount[word] = idx + 1;
      if (run.color) {
        result.push({ blockId, word, occurrence: idx, color: run.color });
      }
    }
  }
  return result;
}

export function extractSidecar(activity: EditableActivity): LayoutSidecar {
  const sidecar: LayoutSidecar = { version: 1, questions: {} };
  if (activity.globalShowSeparators) {
    sidecar.globalShowSeparators = true;
  }

  for (const q of activity.questions) {
    const entry: QuestionLayout = {};
    if (q.spacingAfter !== undefined) entry.spacingAfter = q.spacingAfter;
    if (q.showSeparator !== undefined) entry.showSeparator = q.showSeparator;
    if (q.alternativeIndent !== undefined) entry.alternativeIndent = q.alternativeIndent;
    if (q.answerLines !== undefined) entry.answerLines = q.answerLines;

    const wordColors: WordColor[] = [];
    for (const block of q.content) {
      if (block.type !== "text" || !block.richContent) continue;
      wordColors.push(...extractWordColorsFromBlock(block.id, block.richContent));
    }
    if (wordColors.length > 0) entry.wordColors = wordColors;

    if (Object.keys(entry).length > 0) {
      sidecar.questions[q.id] = entry;
    }
  }

  return sidecar;
}

/** Drop entries whose `word` no longer occurs at the required `occurrence`
 *  index in `newText`. Used when upstream text changes to keep only colors
 *  whose target word survived the edit. */
export function reconcileWordColors(
  newText: string,
  prevColors: WordColor[],
): WordColor[] {
  const counts: Record<string, number> = {};
  const re = new RegExp(WORD_RE.source, "gu");
  let m: RegExpExecArray | null;
  while ((m = re.exec(newText)) !== null) {
    counts[m[0]] = (counts[m[0]] ?? 0) + 1;
  }
  return prevColors.filter((c) => c.occurrence < (counts[c.word] ?? 0));
}

function indexQuestions(
  activity: StructuredActivity,
): Map<string, StructuredQuestion> {
  const map = new Map<string, StructuredQuestion>();
  for (const section of activity.sections) {
    for (const q of section.questions) {
      if (q.id) map.set(q.id, q);
    }
  }
  return map;
}

function blockTextFromQuestion(
  q: StructuredQuestion,
  blockId: string,
): string | undefined {
  if (!q.content) return undefined;
  for (const b of q.content) {
    if (b.id === blockId && b.type === "text") return b.content;
  }
  return undefined;
}

/** Carry a sidecar forward across a text edit. Entries whose question id
 *  disappeared are dropped. For surviving questions whose content hash
 *  changed, layout props are preserved but wordColors are reconciled against
 *  the new text: colors for blocks that still exist and still contain the
 *  target word are kept; the rest are dropped silently. */
export function reconcileSidecar(
  prev: LayoutSidecar,
  prevActivity: StructuredActivity,
  nextActivity: StructuredActivity,
): LayoutSidecar {
  const prevIndex = indexQuestions(prevActivity);
  const nextIndex = indexQuestions(nextActivity);

  const questions: Record<string, QuestionLayout> = {};

  for (const [qid, entry] of Object.entries(prev.questions)) {
    const nextQ = nextIndex.get(qid);
    if (!nextQ) continue;

    const prevQ = prevIndex.get(qid);
    const unchanged =
      prevQ !== undefined &&
      hashQuestionContent(prevQ) === hashQuestionContent(nextQ);

    if (unchanged) {
      questions[qid] = entry;
      continue;
    }

    const carried: QuestionLayout = {};
    if (entry.spacingAfter !== undefined) carried.spacingAfter = entry.spacingAfter;
    if (entry.showSeparator !== undefined) carried.showSeparator = entry.showSeparator;
    if (entry.alternativeIndent !== undefined) carried.alternativeIndent = entry.alternativeIndent;
    if (entry.answerLines !== undefined) carried.answerLines = entry.answerLines;
    if (entry.pageBreakBefore !== undefined) carried.pageBreakBefore = entry.pageBreakBefore;

    if (entry.wordColors && entry.wordColors.length > 0) {
      const surviving: WordColor[] = [];
      const colorsByBlock = new Map<string, WordColor[]>();
      for (const wc of entry.wordColors) {
        const list = colorsByBlock.get(wc.blockId) ?? [];
        list.push(wc);
        colorsByBlock.set(wc.blockId, list);
      }
      for (const [blockId, colors] of colorsByBlock) {
        const text = blockTextFromQuestion(nextQ, blockId);
        if (text === undefined) continue;
        surviving.push(...reconcileWordColors(text, colors));
      }
      if (surviving.length > 0) carried.wordColors = surviving;
    }

    if (Object.keys(carried).length > 0) {
      questions[qid] = carried;
    }
  }

  return {
    version: 1,
    globalShowSeparators: prev.globalShowSeparators,
    questions,
  };
}
