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
 * Converts a legacy StructuredQuestion (statement + images) to ContentBlock[].
 * Used at the boundary between the AI editor and the PDF preview step.
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
