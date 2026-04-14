import type {
  ContentBlock,
  ActivityHeader,
  StructuredActivity,
  StructuredQuestion,
  QuestionType,
  CheckItem,
  TrueFalseItem,
  MatchPair,
  OrderItem,
} from "@/types/adaptation";
import { migrateToContentBlocks, hasContentBlocks } from "@/lib/contentBlockMigration";
import { isHtmlContent, htmlToText } from "@/components/QuestionRichEditor";

export type EditableQuestion = {
  id: string;
  number: number;
  content: ContentBlock[];
  questionType?: QuestionType;
  alternatives?: string[];
  checkItems?: CheckItem[];
  tfItems?: TrueFalseItem[];
  matchPairs?: MatchPair[];
  orderItems?: OrderItem[];
  tableRows?: string[][];
  scaffolding?: string[];
  instruction?: string;
  sectionTitle?: string;
  spacingAfter?: number;
  answerLines?: number;
  showSeparator?: boolean;
  alternativeIndent?: number;
};

export type EditableActivity = {
  header: ActivityHeader;
  globalShowSeparators: boolean;
  questions: EditableQuestion[];
  generalInstructions?: string;
};

let idCounter = 0;

function generateQuestionId(): string {
  return `eq-${Date.now()}-${++idCounter}`;
}

function plainText(value: string): string {
  if (!value) return value;
  return isHtmlContent(value) ? htmlToText(value) : value;
}

function formatAlternatives(
  question: StructuredQuestion,
): string[] | undefined {
  if (!question.alternatives || question.alternatives.length === 0) {
    return undefined;
  }
  return question.alternatives.map(
    (alt) => `${alt.letter}) ${plainText(alt.text)}`,
  );
}

function normalizeScaffolding(
  scaffolding: string[] | undefined,
): string[] | undefined {
  if (!scaffolding || scaffolding.length === 0) return undefined;
  const normalized = scaffolding
    .map((step) => plainText(step).trim())
    .filter((step) => step.length > 0);
  return normalized.length > 0 ? normalized : undefined;
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
    const sectionTitle = section.title?.trim() || undefined;
    for (const q of section.questions) {
      const base = {
        id: generateQuestionId(),
        number: q.number,
        questionType: q.type,
        alternatives: formatAlternatives(q),
        checkItems: q.check_items?.map((c) => ({ ...c })),
        tfItems: q.tf_items?.map((t) => ({ ...t })),
        matchPairs: q.match_pairs?.map((p) => ({ ...p })),
        orderItems: q.order_items?.map((o) => ({ ...o })),
        tableRows: q.table_rows?.map((row) => [...row]),
        scaffolding: normalizeScaffolding(q.scaffolding),
        instruction: plainText(q.instruction ?? "") || undefined,
        sectionTitle,
        spacingAfter: q.spacingAfter,
        answerLines: q.answerLines,
        showSeparator: q.showSeparator,
        alternativeIndent: q.alternativeIndent,
      };

      if (hasContentBlocks(q)) {
        questions.push({ ...base, content: q.content! });
      } else {
        const mergedImages = resolveQuestionImages(q, questionImages);
        const questionWithImages: StructuredQuestion = {
          ...q,
          statement: plainText(q.statement),
          images: mergedImages,
        };
        const content = migrateToContentBlocks(questionWithImages);
        questions.push({ ...base, content });
      }
    }
  }

  return {
    header,
    globalShowSeparators: false,
    questions,
    generalInstructions:
      plainText(activity.general_instructions ?? "") || undefined,
  };
}
