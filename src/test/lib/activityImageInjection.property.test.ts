/**
 * Property-based tests for mergeImages + injectImagesDsl.
 *
 * These cover the image-wiring path that failed silently in edit mode: the
 * saved StructuredActivity already held the image URLs, and a second merge
 * pass duplicated them. Invariants enforced:
 *   - idempotency: merging (or injecting) twice equals once
 *   - no duplicate URLs per question
 *   - question order and count preserved
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  mergeImages,
  injectImagesDsl,
  type QuestionImageMap,
} from "@/lib/activityImageInjection";
import type { StructuredActivity, StructuredQuestion } from "@/types/adaptation";

// Bounded URL pool so dedup paths are exercised.
const urlArb = fc.constantFrom(
  "https://a.test/1.png",
  "https://a.test/2.png",
  "https://b.test/3.jpg",
);

const questionArb = (n: number): fc.Arbitrary<StructuredQuestion> =>
  fc.record({
    images: fc.array(urlArb, { minLength: 0, maxLength: 3 }),
  }).map(({ images }): StructuredQuestion => {
    // Canonical input: no duplicate URLs in the stored question. mergeImages
    // only removes duplicates it would introduce via the map, not pre-existing ones.
    const unique = Array.from(new Set(images));
    return {
      number: n,
      type: "open_ended",
      statement: `q ${n}`,
      images: unique.length > 0 ? unique : undefined,
    };
  });

const activityArb: fc.Arbitrary<StructuredActivity> = fc
  .integer({ min: 1, max: 4 })
  .chain((n) =>
    fc.tuple(...Array.from({ length: n }, (_, i) => questionArb(i + 1))).map(
      (qs): StructuredActivity => ({
        sections: [{ questions: qs as StructuredQuestion[] }],
      }),
    ),
  );

const imageMapArb = (activity: StructuredActivity): fc.Arbitrary<QuestionImageMap> =>
  fc.dictionary(
    fc.constantFrom(
      ...activity.sections.flatMap((s) => s.questions.map((q) => String(q.number))),
    ),
    fc.array(urlArb, { minLength: 0, maxLength: 2 }),
    { maxKeys: 4 },
  );

// ── mergeImages ──────────────────────────────────────────────────────────

describe("mergeImages", () => {
  it("preserves question order and count", () => {
    fc.assert(
      fc.property(
        activityArb.chain((a) => fc.tuple(fc.constant(a), imageMapArb(a))),
        ([activity, map]) => {
          const merged = mergeImages(activity, map);
          expect(merged.sections.length).toBe(activity.sections.length);
          for (let s = 0; s < activity.sections.length; s++) {
            const origQs = activity.sections[s].questions;
            const mergedQs = merged.sections[s].questions;
            expect(mergedQs.length).toBe(origQs.length);
            expect(mergedQs.map((q) => q.number)).toEqual(origQs.map((q) => q.number));
          }
        },
      ),
    );
  });

  it("is idempotent: merge(merge(a, m), m) === merge(a, m)", () => {
    fc.assert(
      fc.property(
        activityArb.chain((a) => fc.tuple(fc.constant(a), imageMapArb(a))),
        ([activity, map]) => {
          const once = mergeImages(activity, map);
          const twice = mergeImages(once, map);
          expect(twice).toEqual(once);
        },
      ),
    );
  });

  it("produces no duplicate URLs per question", () => {
    fc.assert(
      fc.property(
        activityArb.chain((a) => fc.tuple(fc.constant(a), imageMapArb(a))),
        ([activity, map]) => {
          const merged = mergeImages(activity, map);
          for (const section of merged.sections) {
            for (const q of section.questions) {
              const imgs = q.images ?? [];
              expect(new Set(imgs).size).toBe(imgs.length);
            }
          }
        },
      ),
    );
  });

  it("empty or missing map is a no-op", () => {
    fc.assert(
      fc.property(activityArb, (activity) => {
        expect(mergeImages(activity, {})).toEqual(activity);
      }),
    );
  });

  it("result contains the union of original and injected URLs", () => {
    fc.assert(
      fc.property(
        activityArb.chain((a) => fc.tuple(fc.constant(a), imageMapArb(a))),
        ([activity, map]) => {
          const merged = mergeImages(activity, map);
          for (const section of merged.sections) {
            for (const q of section.questions) {
              const orig = activity.sections[0].questions.find((x) => x.number === q.number);
              const origImgs = orig?.images ?? [];
              const injected = map[String(q.number)] ?? [];
              const expected = new Set([...origImgs, ...injected]);
              expect(new Set(q.images ?? [])).toEqual(expected);
            }
          }
        },
      ),
    );
  });
});

// ── injectImagesDsl ──────────────────────────────────────────────────────

describe("injectImagesDsl", () => {
  // A minimal DSL text with numbered questions.
  const dslArb = fc
    .integer({ min: 1, max: 3 })
    .map((n) =>
      Array.from({ length: n }, (_, i) => `${i + 1}) question ${i + 1}`).join("\n\n"),
    );

  const dslMapArb = fc
    .tuple(
      fc.integer({ min: 1, max: 3 }),
      fc.array(urlArb, { minLength: 0, maxLength: 2 }),
    )
    .chain(([qCount, _]) =>
      fc.tuple(
        fc.constant(Array.from({ length: qCount }, (_, i) => `${i + 1}) q${i + 1}`).join("\n\n")),
        fc.dictionary(
          fc.constantFrom(...Array.from({ length: qCount }, (_, i) => String(i + 1))),
          fc.array(urlArb, { minLength: 0, maxLength: 2 }),
          { maxKeys: qCount },
        ),
      ),
    );

  it("empty map is a no-op", () => {
    fc.assert(
      fc.property(dslArb, (dsl) => {
        expect(injectImagesDsl(dsl, {})).toBe(dsl);
      }),
    );
  });

  it("is idempotent: injecting the same map twice equals once", () => {
    fc.assert(
      fc.property(dslMapArb, ([dsl, map]) => {
        const once = injectImagesDsl(dsl, map);
        const twice = injectImagesDsl(once, map);
        expect(twice).toBe(once);
      }),
    );
  });

  it("never produces duplicate [img:URL] tokens for the same URL", () => {
    fc.assert(
      fc.property(dslMapArb, ([dsl, map]) => {
        const result = injectImagesDsl(dsl, map);
        // For each URL that was injected, count occurrences of its literal token.
        const allUrls = new Set(Object.values(map).flat());
        for (const url of allUrls) {
          const occurrences = result.split(`[img:${url}]`).length - 1;
          expect(occurrences).toBeLessThanOrEqual(1);
        }
      }),
    );
  });

  it("leaves the DSL unchanged for question numbers not in the map", () => {
    fc.assert(
      fc.property(dslArb, (dsl) => {
        expect(injectImagesDsl(dsl, { "99": ["https://x/y.png"] })).toBe(dsl);
      }),
    );
  });
});
