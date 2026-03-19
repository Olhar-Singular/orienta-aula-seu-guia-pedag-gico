import { describe, it, expect } from "vitest";
import {
  normalizeTextForDedup,
  findDuplicates,
  dataUrlToBlob,
} from "@/lib/extraction-utils";

describe("normalizeTextForDedup", () => {
  it("normalizes text to lowercase", () => {
    expect(normalizeTextForDedup("Hello World")).toBe("hello world");
  });

  it("collapses whitespace", () => {
    expect(normalizeTextForDedup("hello   world")).toBe("hello world");
  });

  it("trims whitespace", () => {
    expect(normalizeTextForDedup("  hello  ")).toBe("hello");
  });

  it("handles NFKC normalization", () => {
    expect(normalizeTextForDedup("ﬁ")).toBe("fi");
  });

  it("handles empty string", () => {
    expect(normalizeTextForDedup("")).toBe("");
  });
});

describe("findDuplicates", () => {
  it("finds duplicate questions by normalized text", () => {
    const existing = [{ text: "What is 2+2?" }];
    const newQ = [{ text: "what is 2+2?" }, { text: "New question?" }];
    const dups = findDuplicates(newQ, existing);
    expect(dups.has(0)).toBe(true);
    expect(dups.has(1)).toBe(false);
  });

  it("returns empty set with no duplicates", () => {
    const existing = [{ text: "Question A" }];
    const newQ = [{ text: "Question B" }];
    expect(findDuplicates(newQ, existing).size).toBe(0);
  });

  it("handles empty arrays", () => {
    expect(findDuplicates([], []).size).toBe(0);
    expect(findDuplicates([{ text: "Q" }], []).size).toBe(0);
  });
});

describe("dataUrlToBlob", () => {
  it("converts a data URL to a Blob", () => {
    // Create a minimal PNG data URL
    const dataUrl = "data:image/png;base64,iVBORw0KGgo=";
    const blob = dataUrlToBlob(dataUrl);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/png");
  });

  it("handles data URLs with different mime types", () => {
    const dataUrl = "data:image/jpeg;base64,aGVsbG8=";
    const blob = dataUrlToBlob(dataUrl);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/jpeg");
  });
});
