import { describe, it, expect } from "vitest";
import { isStructuredActivity } from "@/types/adaptation";

describe("isStructuredActivity", () => {
  it("returns false for string", () => {
    expect(isStructuredActivity("1) Question")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isStructuredActivity(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isStructuredActivity(undefined)).toBe(false);
  });

  it("returns false for number", () => {
    expect(isStructuredActivity(42)).toBe(false);
  });

  it("returns false for empty object", () => {
    expect(isStructuredActivity({})).toBe(false);
  });

  it("returns false for object without sections", () => {
    expect(isStructuredActivity({ other: "field" })).toBe(false);
  });

  it("returns false when sections is not an array", () => {
    expect(isStructuredActivity({ sections: "not-array" })).toBe(false);
  });

  it("returns false for empty sections array (strengthened)", () => {
    // Before fix: returned true. After fix: must have at least one section.
    expect(isStructuredActivity({ sections: [] })).toBe(false);
  });

  it("returns false when section has no questions array", () => {
    expect(isStructuredActivity({ sections: [{}] })).toBe(false);
  });

  it("returns false when section.questions is not an array", () => {
    expect(isStructuredActivity({ sections: [{ questions: "not-array" }] })).toBe(false);
  });

  it("returns true for section with empty questions array", () => {
    expect(isStructuredActivity({ sections: [{ questions: [] }] })).toBe(true);
  });

  it("returns true for well-formed structured activity", () => {
    const valid = {
      sections: [
        {
          questions: [
            { number: 1, type: "open_ended", statement: "test" },
          ],
        },
      ],
    };
    expect(isStructuredActivity(valid)).toBe(true);
  });

  it("returns true for multi-section activity", () => {
    const valid = {
      sections: [
        { title: "Section 1", questions: [] },
        { title: "Section 2", questions: [{ number: 1, type: "open_ended", statement: "x" }] },
      ],
    };
    expect(isStructuredActivity(valid)).toBe(true);
  });

  it("returns false if any section is missing questions array", () => {
    const invalid = {
      sections: [
        { questions: [] },
        { title: "broken" }, // no questions
      ],
    };
    expect(isStructuredActivity(invalid)).toBe(false);
  });
});
