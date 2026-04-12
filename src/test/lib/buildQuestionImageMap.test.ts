import { describe, it, expect } from "vitest";
import { parseAdaptedQuestions } from "@/lib/adaptedQuestions";
import type { ParsedAdaptedQuestion } from "@/lib/adaptedQuestions";

// ── Local replica of buildQuestionImageMap from StepAIEditor.tsx ──
// The function is not exported, so we replicate its logic here.
// Keep this in sync with the source whenever the algorithm changes.

type QuestionImageMap = Record<string, string[]>;

interface SelectedQuestion {
  id?: string;
  text: string;
  image_url: string | null;
}

function buildQuestionImageMap(
  sectionContent: string,
  selectedQuestions: SelectedQuestion[]
): QuestionImageMap {
  const parsedQuestions = parseAdaptedQuestions(sectionContent);
  if (parsedQuestions.length === 0 || selectedQuestions.length === 0) return {};
  const map: QuestionImageMap = {};

  for (const sq of selectedQuestions) {
    if (!sq.image_url) continue;
    const originalWords = new Set(
      sq.text
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );
    let bestMatch: { number: string; score: number } | null = null;
    for (const aq of parsedQuestions) {
      const aqWords = aq.text
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);
      const score = aqWords.filter((w) => originalWords.has(w)).length;
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { number: aq.number, score };
      }
    }
    // Fallback to index-based if no text match found
    if (!bestMatch) {
      const idx = selectedQuestions.indexOf(sq);
      const fallback = parsedQuestions[idx];
      if (fallback) bestMatch = { number: fallback.number, score: 0 };
    }
    if (bestMatch) {
      if (!map[bestMatch.number]) map[bestMatch.number] = [];
      map[bestMatch.number].push(sq.image_url);
    }
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────

describe("buildQuestionImageMap", () => {
  it("returns empty map when selectedQuestions is empty", () => {
    const dsl = "1. Quanto é 2 + 2?\na) 3\nb) 4\n2. Capital do Brasil?\na) Rio\nb) Brasília";
    const result = buildQuestionImageMap(dsl, []);
    expect(result).toEqual({});
  });

  it("returns empty map when sectionContent has no parseable questions", () => {
    const selectedQuestions: SelectedQuestion[] = [
      { text: "Quanto é 2 + 2?", image_url: "https://example.com/img.jpg" },
    ];
    const result = buildQuestionImageMap("", selectedQuestions);
    expect(result).toEqual({});
  });

  it("returns empty map when no selected question has an image_url", () => {
    const dsl = "1. Quanto é 2 + 2?\na) 3\nb) 4";
    const selectedQuestions: SelectedQuestion[] = [
      { text: "Quanto é 2 + 2?", image_url: null },
    ];
    const result = buildQuestionImageMap(dsl, selectedQuestions);
    expect(result).toEqual({});
  });

  it("maps image to question matched by text similarity", () => {
    const dsl = "1. Quanto é 2 + 2?\na) 3\nb) 4\nc) 5";
    const selectedQuestions: SelectedQuestion[] = [
      { text: "Quanto é 2 + 2?", image_url: "https://example.com/math.png" },
    ];
    const result = buildQuestionImageMap(dsl, selectedQuestions);
    expect(result["1"]).toEqual(["https://example.com/math.png"]);
  });

  it("matches correctly when AI reorders questions (numbers shifted)", () => {
    // AI output swapped question order: original Q1 (capital) is Q2 in the DSL,
    // original Q2 (fotossíntese) is Q1 in the DSL.
    // Selected question text must share unambiguous words (>3 chars, no trailing punctuation
    // so they match the tokens produced by split(/\s+/)) with the adapted question texts.
    const dsl = `2. Capital do Brasil fica onde
a) Rio de Janeiro
b) Brasília
1. Fotossíntese processo vegetal acontece
a) Respiração
b) Nutrição solar`;

    const selectedQuestions: SelectedQuestion[] = [
      // Text words "capital", "brasil" only appear in DSL question "2"
      { text: "Capital do Brasil fica", image_url: "https://example.com/capital.jpg" },
      // Text words "fotossíntese", "processo", "vegetal" only appear in DSL question "1"
      { text: "Fotossíntese processo vegetal", image_url: "https://example.com/foto.jpg" },
    ];

    const result = buildQuestionImageMap(dsl, selectedQuestions);
    // "Capital do Brasil" best matches DSL question "2"
    expect(result["2"]).toEqual(["https://example.com/capital.jpg"]);
    // "Fotossíntese processo vegetal" best matches DSL question "1"
    expect(result["1"]).toEqual(["https://example.com/foto.jpg"]);
  });

  it("falls back to index-based mapping when text similarity yields no match", () => {
    // Selected question text shares no words (> 3 chars) with any adapted question
    const dsl = "1. Somar dois mais dois?\na) 3\nb) 4\n2. Capital onde fica?\na) Aqui\nb) Lá";
    const selectedQuestions: SelectedQuestion[] = [
      // Very short words only — no word > 3 chars in common with DSL
      { text: "A B C", image_url: "https://example.com/fallback.png" },
    ];
    const result = buildQuestionImageMap(dsl, selectedQuestions);
    // Falls back to index 0 → question number "1"
    expect(result["1"]).toEqual(["https://example.com/fallback.png"]);
  });

  it("maps multiple selected questions with different images to distinct question numbers", () => {
    const dsl = `1. Qual é o resultado de 5 vezes 5?
a) 20
b) 25
c) 30
2. Descreva o processo de evaporação da água.`;

    const selectedQuestions: SelectedQuestion[] = [
      { text: "Qual é o resultado de 5 vezes 5?", image_url: "https://example.com/math.jpg" },
      { text: "Descreva o processo de evaporação da água.", image_url: "https://example.com/water.jpg" },
    ];

    const result = buildQuestionImageMap(dsl, selectedQuestions);
    expect(result["1"]).toEqual(["https://example.com/math.jpg"]);
    expect(result["2"]).toEqual(["https://example.com/water.jpg"]);
  });

  it("accumulates multiple images on the same question number when two selections match the same question", () => {
    // Both selected questions share enough words with adapted question 1
    const dsl = "1. Quanto vale soma dois mais três?\na) 4\nb) 5";
    const selectedQuestions: SelectedQuestion[] = [
      { text: "Quanto vale soma dois mais três?", image_url: "https://example.com/a.jpg" },
      { text: "Quanto vale soma dois mais três?", image_url: "https://example.com/b.jpg" },
    ];
    const result = buildQuestionImageMap(dsl, selectedQuestions);
    expect(result["1"]).toEqual(["https://example.com/a.jpg", "https://example.com/b.jpg"]);
  });

  it("skips selected questions with null image_url and does not affect other mappings", () => {
    const dsl = "1. Qual é a capital?\na) Rio\nb) Brasília\n2. Quanto é 2 + 2?\na) 3\nb) 4";
    const selectedQuestions: SelectedQuestion[] = [
      { text: "Qual é a capital?", image_url: null },
      { text: "Quanto é 2 + 2?", image_url: "https://example.com/soma.jpg" },
    ];
    const result = buildQuestionImageMap(dsl, selectedQuestions);
    expect(result["1"]).toBeUndefined();
    expect(result["2"]).toEqual(["https://example.com/soma.jpg"]);
  });
});
