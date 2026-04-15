/**
 * Property-based tests for the image registry pipeline.
 *
 * These cover invariants that the seeder/scanner race in StepAIEditor +
 * ActivityEditor depends on. Violating any of them reintroduces the cursor
 * jump class of bugs (see docs/architecture/refactor-wizard-adaptacao.md).
 *
 * Contracts enforced here:
 *  - scanAndRegisterUrls is idempotent: scan(scan(x).cleanText) === null
 *  - scanAndRegisterUrls never shrinks the registry
 *  - same URL → same placeholder across a single call (dedup)
 *  - expandImageRegistry round-trips a scanned text using the returned registry
 *  - expandImageRegistry passes through unknown placeholders and raw URLs
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  scanAndRegisterUrls,
  expandImageRegistry,
  type ImageRegistry,
} from "@/components/editor/imageManagerUtils";

// Bounded, deterministic URL pool so dedup paths are actually exercised
// (fc.webUrl would make every generated URL unique).
const urlArb = fc.constantFrom(
  "https://example.com/a.png",
  "https://example.com/b.png",
  "https://cdn.test/c.jpg",
  "http://img.test/d.gif",
  "data:image/png;base64,iVBORw0KGgo",
  "data:image/jpeg;base64,AAAAC3Bhc",
);

const paramsArb = fc.constantFrom("", " align=center", " align=right");

// A block of markdown DSL text with embedded [img:URL] tokens and prose.
const dslWithUrlsArb = fc
  .array(
    fc.oneof(
      fc.record({ url: urlArb, params: paramsArb }).map(
        ({ url, params }) => `[img:${url}${params}]`,
      ),
      fc.string({ maxLength: 20 }).map((s) =>
        // Strip any accidental [img:...] leakage from arbitrary strings.
        s.replace(/\[img[:\s]/g, "[img_"),
      ),
    ),
    { minLength: 0, maxLength: 8 },
  )
  .map((parts) => parts.join("\n"));

describe("scanAndRegisterUrls — invariants", () => {
  it("returns null for text with no raw-URL [img:...] tokens", () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 60 }).map((s) =>
          s.replace(/\[img[:\s]/g, "[img_").replace(/https?:/g, "xyz:"),
        ),
        (clean) => {
          expect(scanAndRegisterUrls(clean, {})).toBeNull();
        },
      ),
    );
  });

  it("is idempotent: re-scanning the cleanText returns null", () => {
    fc.assert(
      fc.property(dslWithUrlsArb, (text) => {
        const first = scanAndRegisterUrls(text, {});
        if (!first) return; // no URLs — trivially idempotent
        expect(scanAndRegisterUrls(first.cleanText, first.updatedRegistry)).toBeNull();
      }),
    );
  });

  it("never shrinks the input registry (monotonic growth)", () => {
    fc.assert(
      fc.property(
        dslWithUrlsArb,
        fc.dictionary(fc.string({ minLength: 1, maxLength: 6 }), urlArb, { maxKeys: 5 }),
        (text, seed) => {
          const result = scanAndRegisterUrls(text, seed);
          if (!result) return;
          for (const k of Object.keys(seed)) {
            expect(result.updatedRegistry[k]).toBe(seed[k]);
          }
        },
      ),
    );
  });

  it("dedups: same URL maps to the same placeholder within one call", () => {
    fc.assert(
      fc.property(urlArb, fc.integer({ min: 2, max: 5 }), (url, n) => {
        const text = Array.from({ length: n }, () => `[img:${url}]`).join("\n");
        const result = scanAndRegisterUrls(text, {});
        expect(result).not.toBeNull();
        const placeholders = (result!.cleanText.match(/\[img:([^\]\s]+)/g) || []).map((m) =>
          m.replace("[img:", ""),
        );
        // All placeholders for the same URL should be identical.
        expect(new Set(placeholders).size).toBe(1);
        // The single registry entry resolves back to the original URL.
        const name = placeholders[0];
        expect(result!.updatedRegistry[name]).toBe(url);
      }),
    );
  });

  it("reuses an existing registry name when the URL is already registered", () => {
    fc.assert(
      fc.property(urlArb, fc.string({ minLength: 1, maxLength: 8 }), (url, name) => {
        const seeded: ImageRegistry = { [name]: url };
        const result = scanAndRegisterUrls(`[img:${url}]`, seeded);
        expect(result).not.toBeNull();
        expect(result!.cleanText).toContain(`[img:${name}]`);
        // No new entry should be created for an already-known URL.
        expect(Object.keys(result!.updatedRegistry).length).toBe(
          Object.keys(seeded).length,
        );
      }),
    );
  });

  it("preserves params across rewrite", () => {
    fc.assert(
      fc.property(urlArb, paramsArb, (url, params) => {
        if (params === "") return;
        const result = scanAndRegisterUrls(`[img:${url}${params}]`, {});
        expect(result).not.toBeNull();
        expect(result!.cleanText).toMatch(new RegExp(`\\[img:[^\\s\\]]+${params.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\]`));
      }),
    );
  });
});

describe("expandImageRegistry — invariants", () => {
  it("is a no-op when no [img:...] tokens are present", () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 60 }).map((s) =>
          s.replace(/\[img[:\s]/g, "[img_"),
        ),
        (text) => {
          expect(expandImageRegistry(text, { "imagem-1": "https://x" })).toBe(text);
        },
      ),
    );
  });

  it("passes through raw URL tokens unchanged", () => {
    fc.assert(
      fc.property(urlArb, (url) => {
        const text = `prose [img:${url}] more prose`;
        expect(expandImageRegistry(text, {})).toBe(text);
      }),
    );
  });

  it("passes through unknown placeholders unchanged", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 8 }).filter((s) => !/[\s\]]/.test(s)), (name) => {
        const text = `before [img:${name}] after`;
        expect(expandImageRegistry(text, {})).toBe(text);
      }),
    );
  });

  it("expands known placeholders to their URL", () => {
    fc.assert(
      fc.property(urlArb, (url) => {
        const registry: ImageRegistry = { "imagem-1": url };
        const out = expandImageRegistry("[img:imagem-1]", registry);
        expect(out).toBe(`[img:${url}]`);
      }),
    );
  });
});

describe("scan ↔ expand round-trip", () => {
  it("expand(scan(x).cleanText, scan(x).updatedRegistry) equals scan input after dedup normalization", () => {
    fc.assert(
      fc.property(dslWithUrlsArb, (text) => {
        const scanned = scanAndRegisterUrls(text, {});
        if (!scanned) {
          // No URLs — expansion of input with any registry should preserve content.
          expect(expandImageRegistry(text, {})).toBe(text);
          return;
        }
        const expanded = expandImageRegistry(scanned.cleanText, scanned.updatedRegistry);
        // After dedup, the expanded text contains the exact URL tokens of the
        // original, in order. We verify by re-scanning both and comparing
        // their clean forms + registries content (URL set and occurrences).
        const rescanA = scanAndRegisterUrls(text, {});
        const rescanB = scanAndRegisterUrls(expanded, {});
        expect(rescanB?.cleanText).toBe(rescanA?.cleanText);
        expect(new Set(Object.values(rescanB?.updatedRegistry ?? {}))).toEqual(
          new Set(Object.values(rescanA?.updatedRegistry ?? {})),
        );
      }),
    );
  });

  it("scan is a fixed point after the first pass", () => {
    fc.assert(
      fc.property(dslWithUrlsArb, (text) => {
        const first = scanAndRegisterUrls(text, {});
        if (!first) return;
        // Feeding expanded → scan should produce the same placeholder map (by URL set).
        const expanded = expandImageRegistry(first.cleanText, first.updatedRegistry);
        const second = scanAndRegisterUrls(expanded, {});
        expect(second).not.toBeNull();
        expect(new Set(Object.values(second!.updatedRegistry))).toEqual(
          new Set(Object.values(first.updatedRegistry)),
        );
      }),
    );
  });
});
