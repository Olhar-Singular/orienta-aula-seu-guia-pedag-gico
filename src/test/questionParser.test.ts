import { describe, it, expect } from "vitest";
import { validateExtractedQuestions } from "@/lib/questionParser";

describe("validateExtractedQuestions", () => {
  it("validates valid questions with all fields", () => {
    const data = [
      {
        text: "Quanto é 2+2?",
        subject: "Matemática",
        options: ["3", "4", "5"],
        correct_answer: 1,
        topic: "Aritmética",
      },
    ];
    const result = validateExtractedQuestions(data);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Quanto é 2+2?");
    expect(result[0].subject).toBe("Matemática");
    expect(result[0].options).toEqual(["3", "4", "5"]);
    expect(result[0].correct_answer).toBe(1);
    expect(result[0].topic).toBe("Aritmética");
  });

  it("filters out questions with empty text", () => {
    const data = [
      { text: "", subject: "Matemática" },
      { text: "  ", subject: "Português" },
      { text: "Valid question", subject: "Ciências" },
    ];
    expect(validateExtractedQuestions(data)).toHaveLength(1);
  });

  it("filters out questions with empty subject", () => {
    const data = [
      { text: "Question", subject: "" },
      { text: "Question 2", subject: "Math" },
    ];
    expect(validateExtractedQuestions(data)).toHaveLength(1);
  });

  it("handles non-array input gracefully", () => {
    expect(validateExtractedQuestions("not an array")).toEqual([]);
    expect(validateExtractedQuestions(null)).toEqual([]);
    expect(validateExtractedQuestions(undefined)).toEqual([]);
    expect(validateExtractedQuestions(42)).toEqual([]);
  });

  it("handles questions without optional fields", () => {
    const data = [{ text: "Simple question", subject: "History" }];
    const result = validateExtractedQuestions(data);
    expect(result).toHaveLength(1);
    expect(result[0].options).toBeUndefined();
    expect(result[0].correct_answer).toBeNull();
    expect(result[0].topic).toBeUndefined();
  });

  it("handles invalid correct_answer types", () => {
    const data = [
      { text: "Q1", subject: "S1", correct_answer: "abc" },
      { text: "Q2", subject: "S2", correct_answer: null },
    ];
    const result = validateExtractedQuestions(data);
    expect(result[0].correct_answer).toBeNull();
    expect(result[1].correct_answer).toBeNull();
  });

  it("trims text and subject", () => {
    const data = [{ text: "  spaced  ", subject: "  Math  " }];
    const result = validateExtractedQuestions(data);
    expect(result[0].text).toBe("spaced");
    expect(result[0].subject).toBe("Math");
  });
});
