/**
 * Branded DSL types.
 *
 * The editor pipeline has two forms of "DSL text" that look identical at the
 * string level but mean different things:
 *
 *  - RawDsl        Text that may still contain raw http(s)/data URLs inside
 *                  `[img:URL]` tokens. Comes from AI responses, stored
 *                  adaptations, or direct user paste.
 *
 *  - CanonicalDsl  Text where every URL inside `[img:...]` has been registered
 *                  and replaced with a short placeholder (e.g. `imagem-1`).
 *                  This is the shape the editor needs: short stable names,
 *                  resolvable through an ImageRegistry.
 *
 * Mixing them up caused the cursor-jumping class of bugs (seeder wrote Raw,
 * scanner tried to rewrite on every keystroke). Branded types make that
 * mistake a type error instead of a runtime race.
 */

import {
  scanAndRegisterUrls,
  expandImageRegistry,
  type ImageRegistry,
} from "@/components/editor/imageManagerUtils";

declare const __rawDsl: unique symbol;
declare const __canonicalDsl: unique symbol;

export type RawDsl = string & { readonly [__rawDsl]: true };
export type CanonicalDsl = string & { readonly [__canonicalDsl]: true };

/** Cheap, unchecked brand. Use only at trusted boundaries (e.g. factory fns). */
export function asRawDsl(text: string): RawDsl {
  return text as RawDsl;
}

/**
 * Canonicalize raw DSL by registering all embedded URLs and replacing them
 * with short placeholders. The returned registry is always a superset of the
 * input registry (monotonic growth).
 *
 * If the input was already canonical (no raw URLs), the text is returned as-is
 * and the registry is unchanged.
 */
export function toCanonicalDsl(
  raw: RawDsl | string,
  registry: ImageRegistry = {},
): { dsl: CanonicalDsl; registry: ImageRegistry } {
  const scanned = scanAndRegisterUrls(String(raw), registry);
  if (!scanned) {
    return { dsl: String(raw) as CanonicalDsl, registry };
  }
  return {
    dsl: scanned.cleanText as CanonicalDsl,
    registry: scanned.updatedRegistry,
  };
}

/**
 * Expand canonical DSL back into raw form using the registry.
 * Used at the editor → layout boundary where placeholders must be resolved
 * to real image sources.
 */
export function toRawDsl(
  canonical: CanonicalDsl | string,
  registry: ImageRegistry,
): RawDsl {
  return expandImageRegistry(String(canonical), registry) as RawDsl;
}
