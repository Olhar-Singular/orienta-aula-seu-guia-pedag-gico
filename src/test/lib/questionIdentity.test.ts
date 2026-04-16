import { describe, it, expect } from "vitest";
import {
  ensureQuestionIds,
  hashQuestionContent,
  reconcileQuestionIds,
} from "@/lib/questionIdentity";
import type { StructuredActivity, StructuredQuestion } from "@/types/adaptation";

function sampleActivity(): StructuredActivity {
  return {
    sections: [
      {
        questions: [
          { number: 1, type: "open_ended", statement: "Q1" },
          { number: 2, type: "open_ended", statement: "Q2" },
        ],
      },
      {
        questions: [
          { number: 3, type: "open_ended", statement: "Q3" },
        ],
      },
    ],
  };
}

describe("ensureQuestionIds", () => {
  it("generates an id for every question that lacks one", () => {
    const activity = ensureQuestionIds(sampleActivity());
    for (const section of activity.sections) {
      for (const q of section.questions) {
        expect(q.id).toBeTruthy();
        expect(typeof q.id).toBe("string");
      }
    }
  });

  it("preserves existing ids", () => {
    const activity: StructuredActivity = {
      sections: [
        {
          questions: [
            { id: "preset-1", number: 1, type: "open_ended", statement: "Q1" },
            { number: 2, type: "open_ended", statement: "Q2" },
          ],
        },
      ],
    };
    const result = ensureQuestionIds(activity);
    expect(result.sections[0].questions[0].id).toBe("preset-1");
    expect(result.sections[0].questions[1].id).toBeTruthy();
    expect(result.sections[0].questions[1].id).not.toBe("preset-1");
  });

  it("produces unique ids across the whole activity", () => {
    const result = ensureQuestionIds(sampleActivity());
    const ids = result.sections.flatMap((s) => s.questions.map((q) => q.id!));
    expect(ids.length).toBe(3);
    expect(new Set(ids).size).toBe(3);
  });

  it("does not mutate the input activity", () => {
    const input = sampleActivity();
    const inputBefore = structuredClone(input);
    ensureQuestionIds(input);
    expect(input).toEqual(inputBefore);
  });

  it("returns the same shape (sections, questions, fields preserved)", () => {
    const result = ensureQuestionIds(sampleActivity());
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].questions).toHaveLength(2);
    expect(result.sections[1].questions).toHaveLength(1);
    expect(result.sections[0].questions[0].statement).toBe("Q1");
    expect(result.sections[0].questions[0].type).toBe("open_ended");
    expect(result.sections[0].questions[0].number).toBe(1);
  });

  it("deduplicates when two questions came in with the same id (keeps first, regenerates second)", () => {
    const activity: StructuredActivity = {
      sections: [
        {
          questions: [
            { id: "dup", number: 1, type: "open_ended", statement: "A" },
            { id: "dup", number: 2, type: "open_ended", statement: "B" },
          ],
        },
      ],
    };
    const result = ensureQuestionIds(activity);
    const [a, b] = result.sections[0].questions;
    expect(a.id).toBe("dup");
    expect(b.id).toBeTruthy();
    expect(b.id).not.toBe("dup");
  });
});

describe("hashQuestionContent", () => {
  const base: StructuredQuestion = {
    number: 1,
    type: "multiple_choice",
    statement: "What is 2+2?",
    alternatives: [
      { letter: "a", text: "3" },
      { letter: "b", text: "4", is_correct: true },
    ],
  };

  it("returns a stable string", () => {
    const h = hashQuestionContent(base);
    expect(typeof h).toBe("string");
    expect(h.length).toBeGreaterThan(0);
  });

  it("returns the same hash for identical content", () => {
    expect(hashQuestionContent(base)).toBe(hashQuestionContent({ ...base }));
  });

  it("returns a different hash when the statement changes", () => {
    const changed = { ...base, statement: "What is 2+3?" };
    expect(hashQuestionContent(changed)).not.toBe(hashQuestionContent(base));
  });

  it("returns a different hash when alternatives change", () => {
    const changed: StructuredQuestion = {
      ...base,
      alternatives: [
        { letter: "a", text: "3" },
        { letter: "b", text: "5", is_correct: true },
      ],
    };
    expect(hashQuestionContent(changed)).not.toBe(hashQuestionContent(base));
  });

  it("returns a different hash when images change", () => {
    const withImage = { ...base, images: ["https://example.com/a.png"] };
    const withOther = { ...base, images: ["https://example.com/b.png"] };
    expect(hashQuestionContent(withImage)).not.toBe(hashQuestionContent(withOther));
  });

  it("ignores id (identity, not content)", () => {
    const a = hashQuestionContent({ ...base, id: "x" });
    const b = hashQuestionContent({ ...base, id: "y" });
    expect(a).toBe(b);
  });

  it("ignores number (renumbering is not a content change)", () => {
    const a = hashQuestionContent({ ...base, number: 1 });
    const b = hashQuestionContent({ ...base, number: 42 });
    expect(a).toBe(b);
  });

  it("ignores layout-only props (spacingAfter, showSeparator, alternativeIndent)", () => {
    const a = hashQuestionContent(base);
    const b = hashQuestionContent({ ...base, spacingAfter: 40, showSeparator: true, alternativeIndent: 30 });
    expect(a).toBe(b);
  });

  it("changes hash when answerLines changes (content property, not layout)", () => {
    const open: StructuredQuestion = { number: 1, type: "open_ended", statement: "X", answerLines: 3 };
    const a = hashQuestionContent(open);
    const b = hashQuestionContent({ ...open, answerLines: 6 });
    expect(a).not.toBe(b);
  });
});

describe("reconcileQuestionIds", () => {
  const prev: StructuredActivity = {
    sections: [
      {
        questions: [
          { id: "q-A", number: 1, type: "open_ended", statement: "Alpha" },
          { id: "q-B", number: 2, type: "open_ended", statement: "Beta" },
        ],
      },
    ],
  };

  it("keeps matching ids when both sides already have them", () => {
    const next: StructuredActivity = {
      sections: [
        {
          questions: [
            { id: "q-A", number: 1, type: "open_ended", statement: "Alpha edited" },
            { id: "q-B", number: 2, type: "open_ended", statement: "Beta" },
          ],
        },
      ],
    };
    const result = reconcileQuestionIds(prev, next);
    expect(result.sections[0].questions[0].id).toBe("q-A");
    expect(result.sections[0].questions[1].id).toBe("q-B");
  });

  it("inherits id from prev when content matches and next lacks id", () => {
    const next: StructuredActivity = {
      sections: [
        {
          questions: [
            { number: 1, type: "open_ended", statement: "Alpha" },
            { number: 2, type: "open_ended", statement: "Beta" },
          ],
        },
      ],
    };
    const result = reconcileQuestionIds(prev, next);
    expect(result.sections[0].questions[0].id).toBe("q-A");
    expect(result.sections[0].questions[1].id).toBe("q-B");
  });

  it("generates a new id when the question is truly new (no match in prev)", () => {
    const next: StructuredActivity = {
      sections: [
        {
          questions: [
            { id: "q-A", number: 1, type: "open_ended", statement: "Alpha" },
            { number: 2, type: "open_ended", statement: "Gamma (new)" },
          ],
        },
      ],
    };
    const result = reconcileQuestionIds(prev, next);
    expect(result.sections[0].questions[0].id).toBe("q-A");
    const newId = result.sections[0].questions[1].id;
    expect(newId).toBeTruthy();
    expect(newId).not.toBe("q-A");
    expect(newId).not.toBe("q-B");
  });

  it("drops prev ids that no longer exist in next (deletion)", () => {
    const next: StructuredActivity = {
      sections: [
        {
          questions: [
            { number: 1, type: "open_ended", statement: "Alpha" },
          ],
        },
      ],
    };
    const result = reconcileQuestionIds(prev, next);
    expect(result.sections[0].questions).toHaveLength(1);
    expect(result.sections[0].questions[0].id).toBe("q-A");
  });

  it("does not assign the same prev id to two next questions (stable, first wins)", () => {
    const prevOne: StructuredActivity = {
      sections: [
        { questions: [{ id: "q-X", number: 1, type: "open_ended", statement: "Same" }] },
      ],
    };
    const next: StructuredActivity = {
      sections: [
        {
          questions: [
            { number: 1, type: "open_ended", statement: "Same" },
            { number: 2, type: "open_ended", statement: "Same" },
          ],
        },
      ],
    };
    const result = reconcileQuestionIds(prevOne, next);
    const ids = result.sections[0].questions.map((q) => q.id);
    expect(ids[0]).toBe("q-X");
    expect(ids[1]).toBeTruthy();
    expect(ids[1]).not.toBe("q-X");
  });

  it("does not mutate the input activities", () => {
    const prevCopy = structuredClone(prev);
    const next: StructuredActivity = {
      sections: [
        { questions: [{ number: 1, type: "open_ended", statement: "Alpha" }] },
      ],
    };
    const nextCopy = structuredClone(next);
    reconcileQuestionIds(prev, next);
    expect(prev).toEqual(prevCopy);
    expect(next).toEqual(nextCopy);
  });
});
