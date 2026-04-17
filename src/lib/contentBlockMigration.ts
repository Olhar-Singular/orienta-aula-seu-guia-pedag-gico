import type { ContentBlock, StructuredQuestion } from "@/types/adaptation";
import { parseMarkdownInline } from "@/lib/parseMarkdownInline";

/**
 * Type guard: returns true if the question uses the new ContentBlock[] format.
 */
export function hasContentBlocks(
  question: StructuredQuestion,
): boolean {
  return Array.isArray(question.content) && question.content.length > 0;
}

let counter = 0;

function generateId(): string {
  return `cb-${Date.now()}-${++counter}`;
}

/**
 * Converts a legacy StructuredQuestion (statement + images) into ContentBlock[]
 * for the pre-body `content` slot. Scaffolding is NOT included here — legacy
 * AI output has no positional info relative to alternatives, so scaffolding
 * should be placed in `trailingContent` via `buildLegacyTrailingContent`
 * below, preserving the historical "end of question" rendering.
 */
export function migrateToContentBlocks(
  question: StructuredQuestion,
  images?: string[],
): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const imgList = images ?? question.images;

  if (question.statement) {
    const richContent = parseMarkdownInline(question.statement);
    blocks.push({
      id: generateId(),
      type: "text",
      content: question.statement,
      ...(richContent ? { richContent } : {}),
    });
  }

  if (imgList && imgList.length > 0) {
    const width = imgList.length === 1 ? 0.7 : 0.4;
    for (const src of imgList) {
      blocks.push({
        id: generateId(),
        type: "image",
        src,
        width,
        alignment: "center",
      });
    }
  }

  return blocks;
}

/** Produce trailing content blocks from legacy `scaffolding: string[]`. When
 *  upstream data has no positional info, this places the Apoio AFTER the
 *  question body — mirroring the previous behavior. */
export function buildLegacyTrailingContent(
  question: StructuredQuestion,
): ContentBlock[] {
  if (!question.scaffolding || question.scaffolding.length === 0) return [];
  return [
    {
      id: generateId(),
      type: "scaffolding",
      items: [...question.scaffolding],
    },
  ];
}
