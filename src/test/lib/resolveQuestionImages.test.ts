import { describe, it, expect } from "vitest";
import type { StructuredQuestion } from "@/types/adaptation";

// Replicates the resolveQuestionImages function from editableActivity.ts (not exported).
// Keep in sync with src/lib/pdf/editableActivity.ts
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

const baseQuestion: StructuredQuestion = {
  number: 1,
  type: "open_ended",
  statement: "Test",
};

describe("resolveQuestionImages", () => {
  it("returns q.images when no externalImages provided", () => {
    const q = { ...baseQuestion, images: ["a.jpg", "b.jpg"] };
    expect(resolveQuestionImages(q)).toEqual(["a.jpg", "b.jpg"]);
  });

  it("returns undefined when q has no images and no external provided", () => {
    expect(resolveQuestionImages(baseQuestion)).toBeUndefined();
  });

  it("returns external images when they exist for the question number", () => {
    const q = { ...baseQuestion, number: 3, images: ["old.jpg"] };
    const external = { "3": ["new1.jpg", "new2.jpg"] };
    expect(resolveQuestionImages(q, external)).toEqual(["new1.jpg", "new2.jpg"]);
  });

  it("falls back to q.images when external has no entry for this question", () => {
    const q = { ...baseQuestion, number: 2, images: ["fallback.jpg"] };
    const external = { "5": ["other.jpg"] };
    expect(resolveQuestionImages(q, external)).toEqual(["fallback.jpg"]);
  });

  it("falls back to q.images when external entry is empty array", () => {
    const q = { ...baseQuestion, number: 1, images: ["fallback.jpg"] };
    const external = { "1": [] };
    expect(resolveQuestionImages(q, external)).toEqual(["fallback.jpg"]);
  });

  it("returns undefined when q.images is undefined and external is empty object", () => {
    expect(resolveQuestionImages(baseQuestion, {})).toBeUndefined();
  });

  it("prefers external even when q.images has entries (avoids duplication)", () => {
    const q = { ...baseQuestion, number: 1, images: ["imagem-1"] };
    const external = { "1": ["https://real-url.jpg"] };
    expect(resolveQuestionImages(q, external)).toEqual(["https://real-url.jpg"]);
  });

  it("converts numeric question number to string key for lookup", () => {
    const q = { ...baseQuestion, number: 42 };
    const external = { "42": ["match.jpg"] };
    expect(resolveQuestionImages(q, external)).toEqual(["match.jpg"]);
  });
});
