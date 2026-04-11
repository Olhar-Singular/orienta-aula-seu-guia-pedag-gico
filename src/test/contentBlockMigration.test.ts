import { describe, it, expect } from "vitest";
import { migrateToContentBlocks, hasContentBlocks } from "@/lib/contentBlockMigration";
import type { StructuredQuestion } from "@/types/adaptation";

describe("migrateToContentBlocks", () => {
  it("converts statement-only question to a single text block", () => {
    const question: StructuredQuestion = {
      number: 1,
      type: "open_ended",
      statement: "Qual e o tema principal do texto?",
    };

    const blocks = migrateToContentBlocks(question);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      type: "text",
      content: "Qual e o tema principal do texto?",
    });
    expect(blocks[0].id).toBeDefined();
  });

  it("converts statement + images to text block followed by image blocks", () => {
    const question: StructuredQuestion = {
      number: 1,
      type: "multiple_choice",
      statement: "Observe a imagem e responda:",
      images: ["https://example.com/img1.png", "https://example.com/img2.png"],
    };

    const blocks = migrateToContentBlocks(question);

    expect(blocks).toHaveLength(3);

    // First block is text
    expect(blocks[0]).toMatchObject({
      type: "text",
      content: "Observe a imagem e responda:",
    });

    // Second and third blocks are images
    expect(blocks[1]).toMatchObject({
      type: "image",
      src: "https://example.com/img1.png",
      alignment: "center",
    });
    expect(blocks[2]).toMatchObject({
      type: "image",
      src: "https://example.com/img2.png",
      alignment: "center",
    });
  });

  it("sets width to 0.7 for single image, 0.4 for multiple", () => {
    const singleImage: StructuredQuestion = {
      number: 1,
      type: "open_ended",
      statement: "Texto",
      images: ["https://example.com/img.png"],
    };

    const multiImage: StructuredQuestion = {
      number: 2,
      type: "open_ended",
      statement: "Texto",
      images: ["https://example.com/a.png", "https://example.com/b.png"],
    };

    const singleBlocks = migrateToContentBlocks(singleImage);
    const multiBlocks = migrateToContentBlocks(multiImage);

    const singleImgBlock = singleBlocks.find((b) => b.type === "image");
    expect(singleImgBlock).toMatchObject({ width: 0.7 });

    const multiImgBlocks = multiBlocks.filter((b) => b.type === "image");
    expect(multiImgBlocks[0]).toMatchObject({ width: 0.4 });
    expect(multiImgBlocks[1]).toMatchObject({ width: 0.4 });
  });

  it("returns empty array for question with no statement and no images", () => {
    const question: StructuredQuestion = {
      number: 1,
      type: "open_ended",
      statement: "",
    };

    const blocks = migrateToContentBlocks(question);

    expect(blocks).toHaveLength(0);
  });

  it("handles images-only question (no statement)", () => {
    const question: StructuredQuestion = {
      number: 1,
      type: "open_ended",
      statement: "",
      images: ["https://example.com/img.png"],
    };

    const blocks = migrateToContentBlocks(question);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      type: "image",
      src: "https://example.com/img.png",
    });
  });

  it("generates unique ids for each block", () => {
    const question: StructuredQuestion = {
      number: 1,
      type: "open_ended",
      statement: "Texto",
      images: ["https://example.com/a.png", "https://example.com/b.png"],
    };

    const blocks = migrateToContentBlocks(question);
    const ids = blocks.map((b) => b.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe("hasContentBlocks", () => {
  it("returns true when question has content array with blocks", () => {
    const question: StructuredQuestion = {
      number: 1,
      type: "open_ended",
      statement: "legacy text",
      content: [{ id: "b1", type: "text", content: "new format" }],
    };

    expect(hasContentBlocks(question)).toBe(true);
  });

  it("returns false when question has no content field", () => {
    const question: StructuredQuestion = {
      number: 1,
      type: "open_ended",
      statement: "legacy only",
    };

    expect(hasContentBlocks(question)).toBe(false);
  });

  it("returns false when content is an empty array", () => {
    const question: StructuredQuestion = {
      number: 1,
      type: "open_ended",
      statement: "legacy",
      content: [],
    };

    expect(hasContentBlocks(question)).toBe(false);
  });

  it("returns false when content is undefined", () => {
    const question: StructuredQuestion = {
      number: 1,
      type: "open_ended",
      statement: "text",
      content: undefined,
    };

    expect(hasContentBlocks(question)).toBe(false);
  });
});
