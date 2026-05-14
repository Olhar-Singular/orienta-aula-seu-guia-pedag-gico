import { describe, it, expect } from "vitest";
import {
  inferLegacyType,
  refineTypeHeuristic,
  parsePayload,
  serializePayloadForDb,
  emptyPayloadFor,
  isBankQuestionType,
  QUESTION_TYPES,
} from "@/lib/questionType";

describe("questionType — inferLegacyType", () => {
  it("returns explicit type when present", () => {
    expect(inferLegacyType({ type: "true_false", options: null })).toBe("true_false");
    expect(inferLegacyType({ type: "fill_blank", options: ["A"] })).toBe("fill_blank");
  });

  it("returns multiple_choice for legacy rows with options array", () => {
    expect(inferLegacyType({ type: null, options: ["A", "B", "C"] })).toBe("multiple_choice");
  });

  it("returns open_ended for legacy rows without options", () => {
    expect(inferLegacyType({ type: null, options: null })).toBe("open_ended");
    expect(inferLegacyType({ type: null, options: [] })).toBe("open_ended");
    expect(inferLegacyType({ type: null, options: undefined })).toBe("open_ended");
  });

  it("falls back when type string is invalid", () => {
    expect(inferLegacyType({ type: "garbage", options: ["A"] })).toBe("multiple_choice");
    expect(inferLegacyType({ type: "garbage", options: null })).toBe("open_ended");
  });
});

describe("questionType — refineTypeHeuristic", () => {
  it("forces true_false when text has V/F markers", () => {
    expect(refineTypeHeuristic({ type: "multiple_choice", text: "Afirme: (V) ou (F)", options: ["A"] })).toBe("true_false");
    expect(refineTypeHeuristic({ type: "open_ended", text: "Marque V ou F" })).toBe("true_false");
    expect(refineTypeHeuristic({ type: "open_ended", text: "Verdadeiro ou falso?" })).toBe("true_false");
    expect(refineTypeHeuristic({ type: "open_ended", text: "( ) afirma" })).toBe("true_false");
  });

  it("forces fill_blank when text has multiple underscores", () => {
    expect(refineTypeHeuristic({ type: "open_ended", text: "Complete: A capital é ____" })).toBe("fill_blank");
    expect(refineTypeHeuristic({ type: "multiple_choice", text: "Brasília é ______", options: undefined })).toBe("fill_blank");
  });

  it("returns explicit type when no heuristic matches", () => {
    expect(refineTypeHeuristic({ type: "matching", text: "Associe", options: undefined })).toBe("matching");
  });

  it("falls back to multiple_choice when has options", () => {
    expect(refineTypeHeuristic({ type: undefined, text: "Qual a capital?", options: ["São Paulo", "Brasília"] })).toBe("multiple_choice");
  });

  it("falls back to open_ended otherwise", () => {
    expect(refineTypeHeuristic({ type: undefined, text: "Disserte sobre..." })).toBe("open_ended");
  });

  it("prioritizes heuristics over invalid type strings", () => {
    expect(refineTypeHeuristic({ type: "invalid", text: "(V) ou (F)" })).toBe("true_false");
  });
});

describe("questionType — parsePayload", () => {
  it("returns bare { type } for multiple_choice / open_ended", () => {
    expect(parsePayload("multiple_choice", null)).toEqual({ type: "multiple_choice" });
    expect(parsePayload("open_ended", null)).toEqual({ type: "open_ended" });
    expect(parsePayload("multiple_choice", { garbage: 1 })).toEqual({ type: "multiple_choice" });
  });

  it("normalizes fill_blank", () => {
    expect(parsePayload("fill_blank", { blank_placeholder: "____", expected_answer: "Brasília" })).toEqual({
      type: "fill_blank",
      blank_placeholder: "____",
      expected_answer: "Brasília",
    });
    expect(parsePayload("fill_blank", null)).toEqual({
      type: "fill_blank",
      blank_placeholder: "",
      expected_answer: undefined,
    });
  });

  it("normalizes true_false items (marked must be true/false/null)", () => {
    const result = parsePayload("true_false", {
      tf_items: [
        { text: "A", marked: true },
        { text: "B", marked: false },
        { text: "C", marked: null },
        { text: "D" },
        { garbage: 1 },
        null,
      ],
    });
    expect(result).toEqual({
      type: "true_false",
      tf_items: [
        { text: "A", marked: true },
        { text: "B", marked: false },
        { text: "C", marked: null },
        { text: "D", marked: null },
        { text: "", marked: null },
      ],
    });
  });

  it("normalizes multiple_answer check_items", () => {
    const result = parsePayload("multiple_answer", {
      check_items: [
        { text: "A", checked: true },
        { text: "B" },
      ],
    });
    expect(result).toEqual({
      type: "multiple_answer",
      check_items: [
        { text: "A", checked: true },
        { text: "B", checked: false },
      ],
    });
  });

  it("normalizes matching pairs", () => {
    expect(
      parsePayload("matching", {
        match_pairs: [{ left: "Brasil", right: "Brasília" }, { left: "" }],
      })
    ).toEqual({
      type: "matching",
      match_pairs: [
        { left: "Brasil", right: "Brasília" },
        { left: "", right: "" },
      ],
    });
  });

  it("normalizes ordering items with renumbering", () => {
    const result = parsePayload("ordering", {
      order_items: [{ text: "C" }, { n: 5, text: "A" }],
    });
    expect(result).toEqual({
      type: "ordering",
      order_items: [
        { n: 1, text: "C" },
        { n: 5, text: "A" },
      ],
    });
  });

  it("normalizes table rows (coerces non-strings)", () => {
    const result = parsePayload("table", {
      table_rows: [
        ["A", "B"],
        [1, null, "C"],
        "not-an-array",
      ],
    });
    expect(result).toEqual({
      type: "table",
      table_rows: [
        ["A", "B"],
        ["1", "", "C"],
      ],
    });
  });
});

describe("questionType — serializePayloadForDb", () => {
  it("returns null for legacy types and null/undefined payload", () => {
    expect(serializePayloadForDb(null)).toBeNull();
    expect(serializePayloadForDb(undefined)).toBeNull();
    expect(serializePayloadForDb({ type: "multiple_choice" })).toBeNull();
    expect(serializePayloadForDb({ type: "open_ended" })).toBeNull();
  });

  it("returns structured payloads for new types", () => {
    expect(serializePayloadForDb({ type: "fill_blank", blank_placeholder: "___", expected_answer: "A" })).toEqual({
      blank_placeholder: "___",
      expected_answer: "A",
    });
    expect(
      serializePayloadForDb({
        type: "true_false",
        tf_items: [{ text: "x", marked: true }],
      })
    ).toEqual({ tf_items: [{ text: "x", marked: true }] });
  });

  it("preserves null expected_answer in fill_blank when undefined", () => {
    expect(serializePayloadForDb({ type: "fill_blank", blank_placeholder: "___" })).toEqual({
      blank_placeholder: "___",
      expected_answer: null,
    });
  });
});

describe("questionType — emptyPayloadFor", () => {
  it("provides a default for every type", () => {
    for (const t of QUESTION_TYPES) {
      const p = emptyPayloadFor(t);
      expect(p.type).toBe(t);
    }
  });

  it("seeds at least one editable item per non-trivial type", () => {
    expect((emptyPayloadFor("true_false") as any).tf_items.length).toBe(1);
    expect((emptyPayloadFor("multiple_answer") as any).check_items.length).toBe(1);
    expect((emptyPayloadFor("matching") as any).match_pairs.length).toBe(1);
    expect((emptyPayloadFor("ordering") as any).order_items.length).toBe(1);
    expect((emptyPayloadFor("table") as any).table_rows.length).toBe(1);
  });
});

describe("questionType — isBankQuestionType", () => {
  it("accepts all valid types and rejects everything else", () => {
    for (const t of QUESTION_TYPES) {
      expect(isBankQuestionType(t)).toBe(true);
    }
    expect(isBankQuestionType("garbage")).toBe(false);
    expect(isBankQuestionType(null)).toBe(false);
    expect(isBankQuestionType(undefined)).toBe(false);
    expect(isBankQuestionType(123)).toBe(false);
  });
});
