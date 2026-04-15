/**
 * Property-based tests for toEditableActivity.
 *
 * Invariants covered:
 *   - one EditableQuestion per input question (flattening sections)
 *   - question numbers preserved in order
 *   - each question receives a unique id
 *   - externalImages take priority over q.images when both present
 *   - scaffolding is normalized (trimmed + non-empty) or dropped
 *   - MC alternative count preserved
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { toEditableActivity } from "@/lib/pdf/editableActivity";
import type {
  StructuredActivity,
  StructuredQuestion,
  ActivityHeader,
} from "@/types/adaptation";

const HEADER: ActivityHeader = {
  schoolName: "Escola Teste",
  subject: "Matemática",
  teacherName: "Prof Teste",
  className: "9A",
  date: "01/01/2026",
  showStudentLine: true,
};

const safeTextArb = fc
  .array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz      "), {
    minLength: 2,
    maxLength: 15,
  })
  .map((chars) => chars.join("").trim().replace(/\s+/g, " "))
  .filter((s) => s.length >= 2);

const urlArb = fc.constantFrom(
  "https://a.test/1.png",
  "https://a.test/2.png",
  "https://b.test/3.jpg",
);

const mcQuestionArb = (n: number): fc.Arbitrary<StructuredQuestion> =>
  fc.integer({ min: 2, max: 4 }).chain((altCount) =>
    fc.array(safeTextArb, { minLength: altCount, maxLength: altCount }).map(
      (texts): StructuredQuestion => ({
        number: n,
        type: "multiple_choice",
        statement: `mc ${n}`,
        alternatives: texts.map((t, i) => ({
          letter: "abcde"[i],
          text: t,
        })),
      }),
    ),
  );

const openEndedQuestionArb = (n: number): fc.Arbitrary<StructuredQuestion> =>
  fc.record({
    statement: safeTextArb,
    images: fc.array(urlArb, { maxLength: 2 }).map((a) => Array.from(new Set(a))),
    scaffolding: fc.array(safeTextArb, { maxLength: 2 }),
  }).map(({ statement, images, scaffolding }): StructuredQuestion => ({
    number: n,
    type: "open_ended",
    statement,
    images: images.length > 0 ? images : undefined,
    scaffolding: scaffolding.length > 0 ? scaffolding : undefined,
  }));

const questionArb = (n: number) =>
  fc.oneof(mcQuestionArb(n), openEndedQuestionArb(n));

const activityArb: fc.Arbitrary<StructuredActivity> = fc
  .integer({ min: 1, max: 4 })
  .chain((qCount) =>
    fc
      .tuple(...Array.from({ length: qCount }, (_, i) => questionArb(i + 1)))
      .map(
        (qs): StructuredActivity => ({
          sections: [{ questions: qs as StructuredQuestion[] }],
        }),
      ),
  );

describe("toEditableActivity", () => {
  it("produces exactly one EditableQuestion per input question", () => {
    fc.assert(
      fc.property(activityArb, (activity) => {
        const edit = toEditableActivity(activity, HEADER);
        const inputCount = activity.sections.flatMap((s) => s.questions).length;
        expect(edit.questions.length).toBe(inputCount);
      }),
    );
  });

  it("preserves question numbers in order", () => {
    fc.assert(
      fc.property(activityArb, (activity) => {
        const edit = toEditableActivity(activity, HEADER);
        const expected = activity.sections.flatMap((s) => s.questions.map((q) => q.number));
        expect(edit.questions.map((q) => q.number)).toEqual(expected);
      }),
    );
  });

  it("assigns a unique id to every question", () => {
    fc.assert(
      fc.property(activityArb, (activity) => {
        const edit = toEditableActivity(activity, HEADER);
        const ids = edit.questions.map((q) => q.id);
        expect(new Set(ids).size).toBe(ids.length);
      }),
    );
  });

  it("external images override q.images when provided", () => {
    fc.assert(
      fc.property(
        openEndedQuestionArb(1),
        fc.array(urlArb, { minLength: 1, maxLength: 2 }).map((a) => Array.from(new Set(a))),
        (q, externalImgs) => {
          const activity: StructuredActivity = { sections: [{ questions: [q] }] };
          const edit = toEditableActivity(activity, HEADER, { "1": externalImgs });
          // The image blocks in content should match the external URLs, not q.images.
          const imageBlocks = edit.questions[0].content.filter(
            (b): b is Extract<typeof b, { type: "image" }> => b.type === "image",
          );
          const srcs = imageBlocks.map((b) => b.src);
          expect(srcs).toEqual(externalImgs);
        },
      ),
    );
  });

  it("falls back to q.images when no external map key for the question", () => {
    fc.assert(
      fc.property(openEndedQuestionArb(1), (q) => {
        const activity: StructuredActivity = { sections: [{ questions: [q] }] };
        const edit = toEditableActivity(activity, HEADER, {});
        const imageBlocks = edit.questions[0].content.filter(
          (b): b is Extract<typeof b, { type: "image" }> => b.type === "image",
        );
        expect(imageBlocks.map((b) => b.src)).toEqual(q.images ?? []);
      }),
    );
  });

  it("normalizes scaffolding: trims, drops empty, keeps non-empty", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            safeTextArb,
            fc.constantFrom("", "   ", "\n", "\t"),
            safeTextArb.map((s) => `   ${s}   `),
          ),
          { maxLength: 5 },
        ),
        (scaffoldingRaw) => {
          const q: StructuredQuestion = {
            number: 1,
            type: "open_ended",
            statement: "q 1",
            scaffolding: scaffoldingRaw,
          };
          const edit = toEditableActivity(
            { sections: [{ questions: [q] }] },
            HEADER,
          );
          const out = edit.questions[0].scaffolding;
          if (out === undefined) {
            expect(
              scaffoldingRaw.every((s) => s.trim().length === 0),
            ).toBe(true);
          } else {
            // All surviving entries must be non-empty and already trimmed.
            for (const step of out) {
              expect(step.length).toBeGreaterThan(0);
              expect(step).toBe(step.trim());
            }
          }
        },
      ),
    );
  });

  it("preserves MC alternative count in the EditableQuestion.alternatives array", () => {
    fc.assert(
      fc.property(mcQuestionArb(1), (q) => {
        const activity: StructuredActivity = { sections: [{ questions: [q] }] };
        const edit = toEditableActivity(activity, HEADER);
        expect(edit.questions[0].alternatives?.length).toBe(q.alternatives?.length);
      }),
    );
  });
});
