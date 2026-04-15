import type { StructuredActivity } from "@/types/adaptation";

/**
 * Map of question number (as string) -> list of image URLs.
 * Mirrors WizardData.questionImages[version].
 */
export type QuestionImageMap = Record<string, string[]>;

/**
 * Merge per-question image URLs into a StructuredActivity's `images` arrays.
 *
 * Dedupes URLs that already appear in `q.images` (common in edit mode where
 * the stored activity already carries the URLs the map is about to inject).
 *
 * Invariants:
 *  - question order and count preserved
 *  - non-image fields untouched
 *  - sections without matching entries pass through unchanged
 */
export function mergeImages(
  activity: StructuredActivity,
  imageMap: QuestionImageMap,
): StructuredActivity {
  if (!imageMap || Object.keys(imageMap).length === 0) return activity;
  return {
    ...activity,
    sections: activity.sections.map((section) => ({
      ...section,
      questions: section.questions.map((q) => {
        const urls = imageMap[String(q.number)] || [];
        if (urls.length === 0) return q;
        const seen = new Set<string>();
        const merged: string[] = [];
        for (const url of [...(q.images || []), ...urls]) {
          if (!seen.has(url)) {
            seen.add(url);
            merged.push(url);
          }
        }
        return { ...q, images: merged };
      }),
    })),
  };
}

/**
 * Inject `[img:URL]` lines into DSL text directly after the matching
 * question-number line.
 *
 * Invariants:
 *  - idempotent: injecting the same map twice is a no-op on the second call
 *  - URLs already present in the DSL are skipped (no duplicates)
 *  - lines not matching a question number are left untouched
 */
export function injectImagesDsl(
  dsl: string,
  imageMap: QuestionImageMap,
): string {
  if (!imageMap || Object.keys(imageMap).length === 0) return dsl;
  let result = dsl;
  for (const [qNum, urls] of Object.entries(imageMap)) {
    if (!urls || urls.length === 0) continue;
    // Dedupe input and skip URLs already present in the DSL.
    const uniqueUrls = Array.from(new Set(urls));
    const missing = uniqueUrls.filter((url) => !result.includes(`[img:${url}`));
    if (missing.length === 0) continue;
    const imgLines = missing.map((url) => `[img:${url}]`).join("\n");
    result = result.replace(
      new RegExp(`(^${qNum}\\s*[.)][^\n]*)`, "m"),
      `$1\n${imgLines}`,
    );
  }
  return result;
}
