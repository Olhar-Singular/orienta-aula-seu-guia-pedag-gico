import type { EditableActivity } from "./editableActivity";

export function isRemoteUrl(src: string): boolean {
  return /^https?:\/\//i.test(src);
}

/**
 * Converts blob to base64 data URL via FileReader.
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target!.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Fetch a remote URL and return it as a data URL.
 * Returns null on any network/parse error.
 */
async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

/**
 * Walk all image blocks in an EditableActivity and replace remote URLs (http/https)
 * with base64 data URLs so @react-pdf/renderer can embed them without CORS issues.
 *
 * - data: URLs are passed through unchanged (already resolved).
 * - If a fetch fails, the original URL is kept as-is (PDF renderer will omit it silently).
 * - Returns the same activity reference unchanged when no image blocks are present.
 *
 * @param cache Optional URL→dataUrl cache to avoid re-fetching across re-renders.
 */
export async function resolveActivityImageSrcs(
  activity: EditableActivity,
  cache: Map<string, string> = new Map(),
): Promise<EditableActivity> {
  // Collect all remote image srcs that need resolving
  const pending: Array<{ qIdx: number; bIdx: number; src: string }> = [];

  for (let qi = 0; qi < activity.questions.length; qi++) {
    const q = activity.questions[qi];
    for (let bi = 0; bi < q.content.length; bi++) {
      const block = q.content[bi];
      if (block.type === "image" && isRemoteUrl(block.src)) {
        pending.push({ qIdx: qi, bIdx: bi, src: block.src });
      }
    }
  }

  if (pending.length === 0) return activity;

  // Fetch uncached URLs in parallel
  const uniqueUrls = [...new Set(pending.map((p) => p.src))];
  await Promise.all(
    uniqueUrls.map(async (url) => {
      if (cache.has(url)) return;
      const dataUrl = await fetchAsDataUrl(url);
      if (dataUrl) cache.set(url, dataUrl);
    }),
  );

  // Build a new activity with resolved srcs (shallow-clone only what changed)
  const newQuestions = activity.questions.map((q, qi) => {
    const hasPending = pending.some((p) => p.qIdx === qi);
    if (!hasPending) return q;

    const newContent = q.content.map((block, bi) => {
      if (
        block.type === "image" &&
        isRemoteUrl(block.src) &&
        cache.has(block.src)
      ) {
        return { ...block, src: cache.get(block.src)! };
      }
      return block;
    });
    return { ...q, content: newContent };
  });

  return { ...activity, questions: newQuestions };
}
