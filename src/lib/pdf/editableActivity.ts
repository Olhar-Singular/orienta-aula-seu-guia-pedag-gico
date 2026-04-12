import type {
  ContentBlock,
  ActivityHeader,
  StructuredActivity,
  StructuredQuestion,
} from "@/types/adaptation";
import { migrateToContentBlocks, hasContentBlocks } from "@/lib/contentBlockMigration";

export type EditableQuestion = {
  id: string;
  number: number;
  content: ContentBlock[];
  alternatives?: string[];
  spacingAfter?: number;
  answerLines?: number;
  showSeparator?: boolean;
  alternativeIndent?: number;
};

export type EditableActivity = {
  header: ActivityHeader;
  globalShowSeparators: boolean;
  questions: EditableQuestion[];
};

let idCounter = 0;

function generateQuestionId(): string {
  return `eq-${Date.now()}-${++idCounter}`;
}

function formatAlternatives(
  question: StructuredQuestion,
): string[] | undefined {
  if (!question.alternatives || question.alternatives.length === 0) {
    return undefined;
  }
  return question.alternatives.map((alt) => `${alt.letter}) ${alt.text}`);
}

/**
 * Resolves which images to use for a question.
 * External images (from WizardData.questionImages) are the canonical source
 * with resolved URLs. q.images may contain stale references (e.g. "imagem-1")
 * that don't work as image src — so when externals exist, prefer them.
 */
function resolveQuestionImages(
  q: StructuredQuestion,
  externalImages?: Record<string, string[]>,
): string[] | undefined {
  if (!externalImages) return q.images;

  const qKey = String(q.number);
  const external = externalImages[qKey];
  if (external && external.length > 0) return external;

  return q.images;
}

/**
 * Converts a StructuredActivity (from AI or editor) to an EditableActivity
 * for use in the PDF Preview Editor.
 *
 * @param questionImages - External image map (from WizardData.questionImages)
 *   keyed by question number string, e.g. { "1": ["url1"], "2": ["url2"] }
 */
export function toEditableActivity(
  activity: StructuredActivity,
  header: ActivityHeader,
  questionImages?: Record<string, string[]>,
): EditableActivity {
  const questions: EditableQuestion[] = [];

  for (const section of activity.sections) {
    for (const q of section.questions) {
      if (hasContentBlocks(q)) {
        questions.push({
          id: generateQuestionId(),
          number: q.number,
          content: q.content!,
          alternatives: formatAlternatives(q),
          spacingAfter: q.spacingAfter,
          answerLines: q.answerLines,
          showSeparator: q.showSeparator,
          alternativeIndent: q.alternativeIndent,
        });
      } else {
        const mergedImages = resolveQuestionImages(q, questionImages);
        const questionWithImages: StructuredQuestion = {
          ...q,
          images: mergedImages,
        };
        const content = migrateToContentBlocks(questionWithImages);

        questions.push({
          id: generateQuestionId(),
          number: q.number,
          content,
          alternatives: formatAlternatives(q),
          spacingAfter: q.spacingAfter,
          answerLines: q.answerLines,
          showSeparator: q.showSeparator,
          alternativeIndent: q.alternativeIndent,
        });
      }
    }
  }

  return {
    header,
    globalShowSeparators: false,
    questions,
  };
}
