import { describe, it, expect } from "vitest";
import {
  normalizeAdaptedContent,
  parseAdaptedQuestions,
  replaceQuestionInAdaptedContent,
} from "@/lib/adaptedQuestions";

describe("normalizeAdaptedContent", () => {
  it("returns empty string for null/undefined", () => {
    expect(normalizeAdaptedContent(null as any)).toBe("");
    expect(normalizeAdaptedContent(undefined as any)).toBe("");
  });

  it("adds newline before question numbers mid-line", () => {
    const input = "Some text 1. Question here";
    const result = normalizeAdaptedContent(input);
    expect(result).toContain("\n1.");
  });

  it("adds newline before alternatives mid-line", () => {
    const input = "Question? a) Option A b) Option B";
    const result = normalizeAdaptedContent(input);
    expect(result).toContain("\na)");
    expect(result).toContain("\nb)");
  });

  it("removes markdown headings and replaces with colon", () => {
    const input = "## Section Title";
    const result = normalizeAdaptedContent(input);
    expect(result).toBe("Section Title:");
  });
});

describe("parseAdaptedQuestions", () => {
  it("parses numbered questions", () => {
    const content = "1. What is 2+2?\na) 3\nb) 4\nc) 5\n2. What is 3+3?\na) 5\nb) 6\nc) 7";
    const result = parseAdaptedQuestions(content);
    expect(result).toHaveLength(2);
    expect(result[0].number).toBe("1");
    expect(result[0].options).toHaveLength(3);
    expect(result[1].number).toBe("2");
  });

  it("handles questions without options", () => {
    const content = "1. Explain the water cycle.\n2. What is photosynthesis?";
    const result = parseAdaptedQuestions(content);
    expect(result).toHaveLength(2);
    expect(result[0].options).toHaveLength(0);
  });

  it("returns empty array for no questions", () => {
    const result = parseAdaptedQuestions("Just some text without questions.");
    expect(result).toHaveLength(0);
  });

  it("handles markdown bold in questions", () => {
    const content = "**1.** **What is bold?**\na) Yes\nb) No";
    const result = parseAdaptedQuestions(content);
    expect(result).toHaveLength(1);
    expect(result[0].text).not.toContain("**");
  });

  it("strips markdown bold from options", () => {
    const content = "1. Question\na) **Bold option**\nb) Normal option";
    const result = parseAdaptedQuestions(content);
    expect(result[0].options[0]).not.toContain("**");
  });
});

describe("replaceQuestionInAdaptedContent", () => {
  const content = "1. Original question?\na) A\nb) B\n2. Second question?\na) X\nb) Y";

  it("replaces question text and options", () => {
    const result = replaceQuestionInAdaptedContent(content, {
      number: "1",
      text: "New question text?",
      options: ["C", "D"],
    });
    expect(result).toContain("1. New question text?");
    expect(result).toContain("a) C");
    expect(result).toContain("b) D");
    expect(result).not.toContain("Original question");
  });

  it("returns original content if question number not found", () => {
    const result = replaceQuestionInAdaptedContent(content, {
      number: "99",
      text: "New",
      options: ["A"],
    });
    expect(result).toBe(content);
  });

  it("returns original content if replacement text is empty", () => {
    const result = replaceQuestionInAdaptedContent(content, {
      number: "1",
      text: "",
      options: ["A"],
    });
    expect(result).toBe(content);
  });
});
