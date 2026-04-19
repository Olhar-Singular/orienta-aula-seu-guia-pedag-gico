import { describe, it, expect } from "vitest";
import { parseActivityText } from "@/lib/parseActivityText";

describe("parseActivityText", () => {
  it("returns a single section with empty questions for empty input", () => {
    const result = parseActivityText("");
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].questions).toEqual([]);
  });

  it("ignores whitespace-only lines", () => {
    const result = parseActivityText("\n   \n\n");
    expect(result.sections[0].questions).toEqual([]);
  });

  it("parses a single open-ended question using '1.' prefix", () => {
    const result = parseActivityText("1. Qual é a capital do Brasil?");
    const q = result.sections[0].questions[0];
    expect(q.number).toBe(1);
    expect(q.type).toBe("open_ended");
    expect(q.statement).toBe("Qual é a capital do Brasil?");
    expect(q.alternatives).toBeUndefined();
  });

  it("parses a single question using '1)' prefix", () => {
    const result = parseActivityText("1) Pergunta de teste");
    expect(result.sections[0].questions[0].number).toBe(1);
    expect(result.sections[0].questions[0].statement).toBe("Pergunta de teste");
  });

  it("parses multiple questions and preserves order", () => {
    const text = [
      "1. Primeira pergunta",
      "2. Segunda pergunta",
      "3. Terceira pergunta",
    ].join("\n");
    const questions = parseActivityText(text).sections[0].questions;
    expect(questions).toHaveLength(3);
    expect(questions.map((q) => q.number)).toEqual([1, 2, 3]);
    expect(questions[1].statement).toBe("Segunda pergunta");
  });

  it("marks a question as multiple_choice when alternatives are present", () => {
    const text = ["1. Escolha uma opção:", "a) Opção A", "b) Opção B"].join("\n");
    const q = parseActivityText(text).sections[0].questions[0];
    expect(q.type).toBe("multiple_choice");
    expect(q.alternatives).toEqual([
      { letter: "a", text: "Opção A" },
      { letter: "b", text: "Opção B" },
    ]);
  });

  it("supports both 'a)' and 'a.' alternative delimiters, lowercased", () => {
    const text = [
      "1. Pergunta",
      "A. Primeira",
      "B) Segunda",
    ].join("\n");
    const q = parseActivityText(text).sections[0].questions[0];
    expect(q.alternatives).toEqual([
      { letter: "a", text: "Primeira" },
      { letter: "b", text: "Segunda" },
    ]);
  });

  it("ignores alternative-like lines that appear before any question", () => {
    const text = ["a) orfan", "1. Pergunta válida"].join("\n");
    const questions = parseActivityText(text).sections[0].questions;
    expect(questions).toHaveLength(1);
    expect(questions[0].alternatives).toBeUndefined();
  });

  it("appends continuation lines to the current question statement", () => {
    const text = ["1. Primeira linha", "segunda linha de continuação"].join("\n");
    const q = parseActivityText(text).sections[0].questions[0];
    expect(q.statement).toBe("Primeira linha segunda linha de continuação");
  });

  it("does not create alternatives for a question that has none", () => {
    const text = ["1. Uma pergunta", "2. Outra pergunta"].join("\n");
    const questions = parseActivityText(text).sections[0].questions;
    expect(questions[0].type).toBe("open_ended");
    expect(questions[1].type).toBe("open_ended");
  });

  it("trims statement content after prefix and whitespace", () => {
    const q = parseActivityText("1.    com espaços   ").sections[0].questions[0];
    expect(q.statement).toBe("com espaços");
  });
});
