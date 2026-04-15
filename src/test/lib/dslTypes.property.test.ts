/**
 * Property tests for branded DSL types and the canonicalization boundary.
 *
 * These confirm the contract between RawDsl and CanonicalDsl: canonicalization
 * is idempotent, the registry only grows, and round-tripping (canonical →
 * expand → canonical) preserves semantic content.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { toCanonicalDsl, toRawDsl } from "@/lib/dsl/types";

const urlArb = fc.constantFrom(
  "https://a.test/1.png",
  "https://a.test/2.png",
  "https://b.test/3.jpg",
);

const dslTextArb = fc
  .array(
    fc.oneof(
      urlArb.map((u) => `[img:${u}]`),
      fc.constant("1) question one"),
      fc.constant("a) alt"),
      fc.constant(""),
    ),
    { maxLength: 6 },
  )
  .map((parts) => parts.join("\n"));

describe("toCanonicalDsl", () => {
  it("is idempotent: canonicalize(canonical) === canonical", () => {
    fc.assert(
      fc.property(dslTextArb, (raw) => {
        const first = toCanonicalDsl(raw);
        const second = toCanonicalDsl(first.dsl, first.registry);
        expect(second.dsl).toBe(first.dsl);
      }),
    );
  });

  it("never shrinks the input registry", () => {
    fc.assert(
      fc.property(
        dslTextArb,
        fc.dictionary(fc.string({ minLength: 1, maxLength: 6 }), urlArb, { maxKeys: 3 }),
        (raw, seed) => {
          const { registry } = toCanonicalDsl(raw, seed);
          for (const k of Object.keys(seed)) {
            expect(registry[k]).toBe(seed[k]);
          }
        },
      ),
    );
  });

  it("output contains no raw http/data URLs inside [img:...] tokens", () => {
    fc.assert(
      fc.property(dslTextArb, (raw) => {
        const { dsl } = toCanonicalDsl(raw);
        expect(dsl).not.toMatch(/\[img:(?:https?:\/\/|data:)/);
      }),
    );
  });
});

describe("toRawDsl", () => {
  it("round-trips: toRawDsl(toCanonicalDsl(x).dsl, registry) expands placeholders", () => {
    fc.assert(
      fc.property(dslTextArb, (raw) => {
        const { dsl, registry } = toCanonicalDsl(raw);
        const expanded = toRawDsl(dsl, registry);
        // Re-canonicalizing the expanded form must yield the same URL set.
        const rescanA = toCanonicalDsl(raw);
        const rescanB = toCanonicalDsl(expanded);
        expect(new Set(Object.values(rescanB.registry))).toEqual(
          new Set(Object.values(rescanA.registry)),
        );
      }),
    );
  });

  it("is a no-op when text contains no placeholders", () => {
    fc.assert(
      fc.property(fc.constant("1) plain text\na) alt"), (raw) => {
        expect(toRawDsl(raw, { "imagem-1": "https://x" })).toBe(raw);
      }),
    );
  });
});
