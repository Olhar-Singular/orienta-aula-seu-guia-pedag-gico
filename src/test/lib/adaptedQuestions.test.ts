import { describe, it, expect } from "vitest";
import {
  normalizeAdaptedContent,
  parseAdaptedQuestions,
  replaceQuestionInAdaptedContent,
  stripMarkdownFormatting,
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

describe("stripMarkdownFormatting", () => {
  it("removes italic underscore markers", () => {
    expect(stripMarkdownFormatting("_texto em itálico_")).toBe("texto em itálico");
  });

  it("removes multiple italic underscore in same line", () => {
    expect(stripMarkdownFormatting("_primeiro_ e _segundo_")).toBe("primeiro e segundo");
  });

  it("preserves underscore in snake_case", () => {
    expect(stripMarkdownFormatting("variavel_nome")).toBe("variavel_nome");
  });

  it("preserves underscore in compound_words_like_this", () => {
    expect(stripMarkdownFormatting("word_one_two_three")).toBe("word_one_two_three");
  });

  it("preserves unclosed underscore", () => {
    expect(stripMarkdownFormatting("_sem fechar")).toBe("_sem fechar");
  });

  it("removes italic asterisk markers", () => {
    expect(stripMarkdownFormatting("*texto em itálico*")).toBe("texto em itálico");
  });

  it("removes multiple italic asterisk in same line", () => {
    expect(stripMarkdownFormatting("*primeiro* e *segundo*")).toBe("primeiro e segundo");
  });

  it("removes bold markers", () => {
    expect(stripMarkdownFormatting("**texto em bold**")).toBe("texto em bold");
  });

  it("removes mixed italic and bold", () => {
    expect(stripMarkdownFormatting("**bold** e _itálico_")).toBe("bold e itálico");
  });

  it("handles complex text with formatting", () => {
    const input = "(_Será que queremos criar o mosquito?_)";
    expect(stripMarkdownFormatting(input)).toBe("(Será que queremos criar o mosquito?)");
  });

  it("preserves math subscripts like v_0", () => {
    expect(stripMarkdownFormatting("v_0 = 10 m/s")).toBe("v_0 = 10 m/s");
  });
});
