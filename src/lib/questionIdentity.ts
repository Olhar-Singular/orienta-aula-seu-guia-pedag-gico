import type { StructuredActivity, StructuredQuestion } from "@/types/adaptation";

let idCounter = 0;

function generateId(): string {
  idCounter += 1;
  return `q-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

export function ensureQuestionIds(activity: StructuredActivity): StructuredActivity {
  const seen = new Set<string>();
  return {
    ...activity,
    sections: activity.sections.map((section) => ({
      ...section,
      questions: section.questions.map((q): StructuredQuestion => {
        const hasValidId = typeof q.id === "string" && q.id.length > 0 && !seen.has(q.id);
        const id = hasValidId ? (q.id as string) : generateId();
        seen.add(id);
        return { ...q, id };
      }),
    })),
  };
}

/** Fields that define a question's content. Identity fields (id, number) and
 *  layout-only fields (spacingAfter, showSeparator, alternativeIndent) are
 *  intentionally excluded. `answerLines` and `statementFormat` are included
 *  because they come from the DSL and represent content intent. */
const CONTENT_FIELDS: Array<keyof StructuredQuestion> = [
  "type",
  "statement",
  "statementFormat",
  "instruction",
  "alternatives",
  "check_items",
  "tf_items",
  "match_pairs",
  "order_items",
  "table_rows",
  "blank_placeholder",
  "scaffolding",
  "images",
  "content",
  "answerLines",
];

function stableJsonStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJsonStringify).join(",")}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const entries = keys.map(
    (k) => `${JSON.stringify(k)}:${stableJsonStringify((value as Record<string, unknown>)[k])}`,
  );
  return `{${entries.join(",")}}`;
}

/** 32-bit FNV-1a-style string hash for compact, deterministic output. */
function hashString(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(36);
}

export function hashQuestionContent(q: StructuredQuestion): string {
  const subset: Record<string, unknown> = {};
  for (const key of CONTENT_FIELDS) {
    const value = q[key];
    if (value !== undefined) subset[key] = value;
  }
  return hashString(stableJsonStringify(subset));
}

/** Returns `next` with question ids inherited from `prev` where possible.
 *  Matching order per question:
 *    1. Direct id match (both sides have the same id).
 *    2. Content-hash match (prev question with identical content hash).
 *    3. Generate a new id.
 *  Each prev id is claimed at most once — if `next` contains duplicates of the
 *  same content, only the first inherits the id; the rest get new ones. */
export function reconcileQuestionIds(
  prev: StructuredActivity,
  next: StructuredActivity,
): StructuredActivity {
  const prevById = new Map<string, StructuredQuestion>();
  const prevByHash = new Map<string, StructuredQuestion>();
  for (const section of prev.sections) {
    for (const q of section.questions) {
      if (q.id) prevById.set(q.id, q);
      const hash = hashQuestionContent(q);
      if (!prevByHash.has(hash)) prevByHash.set(hash, q);
    }
  }

  const claimed = new Set<string>();

  return {
    ...next,
    sections: next.sections.map((section) => ({
      ...section,
      questions: section.questions.map((q): StructuredQuestion => {
        if (q.id && prevById.has(q.id) && !claimed.has(q.id)) {
          claimed.add(q.id);
          return { ...q, id: q.id };
        }

        const hash = hashQuestionContent(q);
        const candidate = prevByHash.get(hash);
        if (candidate?.id && !claimed.has(candidate.id)) {
          claimed.add(candidate.id);
          return { ...q, id: candidate.id };
        }

        const fresh = generateId();
        claimed.add(fresh);
        return { ...q, id: fresh };
      }),
    })),
  };
}
