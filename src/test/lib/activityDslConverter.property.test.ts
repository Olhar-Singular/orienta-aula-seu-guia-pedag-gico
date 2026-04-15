/**
 * Property-based tests for StructuredActivity <-> markdown DSL conversion.
 *
 * The round-trip is not strictly lossless for arbitrary input (whitespace,
 * instruction merging, etc.), but must preserve:
 *   - question count
 *   - question numbers and types
 *   - alternative letters and count
 *   - images, scaffolding, answer lines
 *
 * The serializer itself must be a fixed point: serializing, parsing, and
 * serializing again produces the same text. This is the strongest guarantee
 * we can make against regressions in either direction of the pipeline.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  structuredToMarkdownDsl,
  markdownDslToStructured,
} from "@/lib/activityDslConverter";
import type {
  StructuredActivity,
  StructuredQuestion,
  QuestionType,
} from "@/types/adaptation";

// ── Arbitraries ──────────────────────────────────────────────────────────

// Safe text: lowercase letters + spaces. Avoids every DSL metachar.
const safeTextArb = fc
  .array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz      "), {
    minLength: 2,
    maxLength: 20,
  })
  .map((chars) => chars.join("").trim().replace(/\s+/g, " "))
  .filter((s) => s.length >= 2);

const letterPool = ["a", "b", "c", "d", "e"] as const;

const alternativeArb = (letter: string) =>
  fc.record({
    letter: fc.constant(letter),
    text: safeTextArb,
    is_correct: fc.option(fc.boolean(), { nil: undefined }),
  });

const mcQuestionArb = (number: number) =>
  fc.integer({ min: 2, max: 4 }).chain((altCount) =>
    fc.tuple(
      ...letterPool.slice(0, altCount).map((l) => alternativeArb(l)),
    ).map(
      (alts): StructuredQuestion => ({
        number,
        type: "multiple_choice",
        statement: `statement ${number}`,
        alternatives: alts as StructuredQuestion["alternatives"],
      }),
    ),
  );

const openEndedQuestionArb = (number: number) =>
  fc.record({
    statement: safeTextArb,
    answerLines: fc.integer({ min: 1, max: 10 }),
  }).map(
    ({ statement, answerLines }): StructuredQuestion => ({
      number,
      type: "open_ended",
      statement,
      answerLines,
    }),
  );

const trueFalseQuestionArb = (number: number) =>
  fc.array(
    fc.record({
      text: safeTextArb,
      marked: fc.oneof(fc.constant(true), fc.constant(false), fc.constant(null)),
    }),
    { minLength: 1, maxLength: 3 },
  ).map(
    (items): StructuredQuestion => ({
      number,
      type: "true_false",
      statement: `tf statement ${number}`,
      tf_items: items,
    }),
  );

const fillBlankQuestionArb = (number: number) =>
  fc.record({
    prefix: safeTextArb,
    suffix: safeTextArb,
    placeholder: fc.option(safeTextArb, { nil: undefined }),
  }).map(
    ({ prefix, suffix, placeholder }): StructuredQuestion => ({
      number,
      type: "fill_blank",
      statement: `${prefix} ___ ${suffix}`,
      blank_placeholder: placeholder,
    }),
  );

const orderingQuestionArb = (number: number) =>
  fc.array(safeTextArb, { minLength: 2, maxLength: 4 }).map(
    (texts): StructuredQuestion => ({
      number,
      type: "ordering",
      statement: `order ${number}`,
      order_items: texts.map((t, i) => ({ n: i + 1, text: t })),
    }),
  );

const matchingQuestionArb = (number: number) =>
  fc.array(
    fc.record({ left: safeTextArb, right: safeTextArb }),
    { minLength: 2, maxLength: 3 },
  ).map(
    (pairs): StructuredQuestion => ({
      number,
      type: "matching",
      statement: `match ${number}`,
      match_pairs: pairs,
    }),
  );

const questionArb = (number: number) =>
  fc.oneof(
    mcQuestionArb(number),
    openEndedQuestionArb(number),
    trueFalseQuestionArb(number),
    fillBlankQuestionArb(number),
    orderingQuestionArb(number),
    matchingQuestionArb(number),
  );

const activityArb = fc
  .integer({ min: 1, max: 4 })
  .chain((qCount) =>
    fc.tuple(
      ...Array.from({ length: qCount }, (_, i) => questionArb(i + 1)),
    ).map(
      (questions): StructuredActivity => ({
        sections: [{ questions: questions as StructuredQuestion[] }],
      }),
    ),
  );

// ── Helpers ──────────────────────────────────────────────────────────────

const flatQuestions = (a: StructuredActivity): StructuredQuestion[] =>
  a.sections.flatMap((s) => s.questions);

// ── Tests ────────────────────────────────────────────────────────────────

describe("structuredToMarkdownDsl is a fixed point under double-parse", () => {
  it("serializing → parsing → serializing yields the same text (idempotency)", () => {
    fc.assert(
      fc.property(activityArb, (activity) => {
        const first = structuredToMarkdownDsl(activity);
        const parsed = markdownDslToStructured(first);
        const second = structuredToMarkdownDsl(parsed);
        expect(second).toBe(first);
      }),
      { numRuns: 100 },
    );
  });
});

describe("structured → dsl → structured preserves invariants", () => {
  it("preserves total question count", () => {
    fc.assert(
      fc.property(activityArb, (activity) => {
        const back = markdownDslToStructured(structuredToMarkdownDsl(activity));
        expect(flatQuestions(back).length).toBe(flatQuestions(activity).length);
      }),
    );
  });

  it("preserves question numbers in order", () => {
    fc.assert(
      fc.property(activityArb, (activity) => {
        const back = markdownDslToStructured(structuredToMarkdownDsl(activity));
        expect(flatQuestions(back).map((q) => q.number)).toEqual(
          flatQuestions(activity).map((q) => q.number),
        );
      }),
    );
  });

  it("preserves question types for MC/OE/TF/fill_blank/ordering/matching", () => {
    fc.assert(
      fc.property(activityArb, (activity) => {
        const back = markdownDslToStructured(structuredToMarkdownDsl(activity));
        const expected = flatQuestions(activity).map((q) => q.type);
        const actual = flatQuestions(back).map((q) => q.type);
        expect(actual).toEqual(expected);
      }),
    );
  });

  it("preserves MC alternative count and letters", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 3 })
          .chain((n) =>
            fc.tuple(...Array.from({ length: n }, (_, i) => mcQuestionArb(i + 1))),
          )
          .map(
            (qs): StructuredActivity => ({
              sections: [{ questions: qs as StructuredQuestion[] }],
            }),
          ),
        (activity) => {
          const back = markdownDslToStructured(structuredToMarkdownDsl(activity));
          for (let i = 0; i < activity.sections[0].questions.length; i++) {
            const orig = activity.sections[0].questions[i].alternatives ?? [];
            const roundtripped = back.sections[0].questions[i]?.alternatives ?? [];
            expect(roundtripped.length).toBe(orig.length);
            expect(roundtripped.map((a) => a.letter)).toEqual(orig.map((a) => a.letter));
          }
        },
      ),
    );
  });

  it("preserves correct-alternative markers in MC", () => {
    fc.assert(
      fc.property(mcQuestionArb(1), (q) => {
        const activity: StructuredActivity = { sections: [{ questions: [q] }] };
        const back = markdownDslToStructured(structuredToMarkdownDsl(activity));
        const origCorrect = (q.alternatives ?? [])
          .filter((a) => a.is_correct)
          .map((a) => a.letter)
          .sort();
        const backCorrect = (back.sections[0].questions[0].alternatives ?? [])
          .filter((a) => a.is_correct)
          .map((a) => a.letter)
          .sort();
        expect(backCorrect).toEqual(origCorrect);
      }),
    );
  });

  it("preserves open_ended answerLines", () => {
    fc.assert(
      fc.property(openEndedQuestionArb(1), (q) => {
        const activity: StructuredActivity = { sections: [{ questions: [q] }] };
        const back = markdownDslToStructured(structuredToMarkdownDsl(activity));
        expect(back.sections[0].questions[0].answerLines).toBe(q.answerLines);
      }),
    );
  });

  it("preserves ordering item count and order", () => {
    fc.assert(
      fc.property(orderingQuestionArb(1), (q) => {
        const activity: StructuredActivity = { sections: [{ questions: [q] }] };
        const back = markdownDslToStructured(structuredToMarkdownDsl(activity));
        const orig = q.order_items ?? [];
        const roundtripped = back.sections[0].questions[0].order_items ?? [];
        expect(roundtripped.length).toBe(orig.length);
        expect(roundtripped.map((o) => o.n)).toEqual(orig.map((o) => o.n));
      }),
    );
  });

  it("preserves matching pair count", () => {
    fc.assert(
      fc.property(matchingQuestionArb(1), (q) => {
        const activity: StructuredActivity = { sections: [{ questions: [q] }] };
        const back = markdownDslToStructured(structuredToMarkdownDsl(activity));
        const orig = q.match_pairs ?? [];
        const roundtripped = back.sections[0].questions[0].match_pairs ?? [];
        expect(roundtripped.length).toBe(orig.length);
      }),
    );
  });
});

describe("images are preserved through the round-trip", () => {
  const withImagesArb = fc.array(safeTextArb, { minLength: 1, maxLength: 3 })
    .map((names) => names.map((n) => `https://test.img/${n.replace(/\s/g, "-")}.png`))
    .chain((imgs) =>
      openEndedQuestionArb(1).map((q): StructuredQuestion => ({ ...q, images: imgs })),
    );

  it("preserves images array length and values", () => {
    fc.assert(
      fc.property(withImagesArb, (q) => {
        const activity: StructuredActivity = { sections: [{ questions: [q] }] };
        const back = markdownDslToStructured(structuredToMarkdownDsl(activity));
        expect(back.sections[0].questions[0].images).toEqual(q.images);
      }),
    );
  });
});
