export type ParsedAdaptedQuestion = {
  number: string;
  text: string;
  options: string[];
  trailingLines: string[];
  startLine: number;
  endLine: number;
};

const ALT_LINE_REGEX = /^([a-zA-Z])\)\s*(.+)/;
const QUESTION_LINE_REGEX = /^(?:\*{0,2})(\d+)[\.\)](?!\d)\s*(?:\*{0,2})\s*(.+)/;
const QUESTION_MARKER_RE = /^(?:\*{0,2})\d+[\.\)](?!\d)\s*(?:\*{0,2})\s*/;

/**
 * Strips bold (**), italic underscore (_text_) and italic asterisk (*text*)
 * markers from a string. Preserves snake_case identifiers and LaTeX subscripts.
 */
export const stripMarkdownFormatting = (value: string) =>
  value
    .replace(/\*\*/g, "")
    .replace(/_([^_\n]+)_/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .trim();

export function normalizeAdaptedContent(content: string): string {
  let processed = content ?? "";

  processed = processed.replace(/([^\n])(\s*)(\*{0,2}\d+[\.\)]\s)/g, "$1\n$3");
  processed = processed.replace(/([^\n])(\s+)([a-eA-E]\)\s)/g, "$1\n$3");
  processed = processed.replace(/^#{1,3}\s+(.+)$/gm, "$1:");

  return processed;
}

export function parseAdaptedQuestions(content: string): ParsedAdaptedQuestion[] {
  const normalized = normalizeAdaptedContent(content);
  const lines = normalized.split("\n");

  const questions: ParsedAdaptedQuestion[] = [];
  let current: ParsedAdaptedQuestion | null = null;
  let textParts: string[] = [];
  let options: string[] = [];
  let trailingLines: string[] = [];

  const finalizeCurrent = (endLine: number) => {
    if (!current) return;

    questions.push({
      ...current,
      endLine,
      text: textParts.map(stripMarkdownFormatting).join("\n").trim(),
      options: options.map(stripMarkdownFormatting).filter(Boolean),
      trailingLines: trailingLines.map(stripMarkdownFormatting).filter(Boolean),
    });

    current = null;
    textParts = [];
    options = [];
    trailingLines = [];
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const rawLine = lines[lineIndex];
    const trimmed = rawLine.trim();

    const questionMatch = trimmed.match(QUESTION_LINE_REGEX);
    if (questionMatch) {
      finalizeCurrent(lineIndex - 1);

      current = {
        number: questionMatch[1],
        text: "",
        options: [],
        trailingLines: [],
        startLine: lineIndex,
        endLine: lineIndex,
      };
      textParts = [questionMatch[2].trim()];
      continue;
    }

    if (!current || !trimmed || trimmed === "---") {
      continue;
    }

    const alternativeMatch = trimmed.match(ALT_LINE_REGEX);
    if (alternativeMatch) {
      options.push(alternativeMatch[2].trim());
      continue;
    }

    if (options.length === 0) {
      textParts.push(trimmed);
    } else {
      trailingLines.push(trimmed);
    }
  }

  finalizeCurrent(lines.length - 1);
  return questions;
}

export function replaceQuestionInAdaptedContent(
  content: string,
  payload: {
    number: string;
    text: string;
    options: string[];
    trailingLines?: string[];
  }
): string {
  const normalized = normalizeAdaptedContent(content);
  const lines = normalized.split("\n");
  const parsedQuestions = parseAdaptedQuestions(normalized);

  const currentQuestion = parsedQuestions.find((q) => q.number === payload.number);
  if (!currentQuestion) return content;

  const questionText = payload.text.trim();
  if (!questionText) return content;

  // Split multi-line text: first line goes with the question number, rest on separate lines
  const textLines = questionText.split("\n").map((l) => l.trim()).filter(Boolean);
  const nextQuestionLines: string[] = [`${currentQuestion.number}. ${textLines[0]}`];
  for (let i = 1; i < textLines.length; i++) {
    nextQuestionLines.push(textLines[i]);
  }

  payload.options
    .map((option) => option.trim())
    .filter(Boolean)
    .forEach((option, index) => {
      nextQuestionLines.push(`${String.fromCharCode(97 + index)}) ${option}`);
    });

  const trailing = payload.trailingLines ?? currentQuestion.trailingLines;
  trailing
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => nextQuestionLines.push(line));

  lines.splice(
    currentQuestion.startLine,
    currentQuestion.endLine - currentQuestion.startLine + 1,
    ...nextQuestionLines
  );

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
