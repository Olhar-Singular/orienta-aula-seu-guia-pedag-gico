import type {
  StructuredActivity,
  StructuredQuestion,
  ActivitySection,
  Alternative,
} from "@/types/adaptation";
import { isStructuredActivity } from "@/types/adaptation";
import { parseAdaptedQuestions } from "@/lib/adaptedQuestions";

/**
 * Convert legacy string content to a StructuredActivity.
 * Uses the existing parseAdaptedQuestions regex parser as a best-effort migration.
 */
export function migrateStringToStructured(content: string): StructuredActivity {
  const parsed = parseAdaptedQuestions(content);

  if (parsed.length === 0) {
    // No questions detected — wrap the entire text as a single open-ended "question"
    return {
      sections: [
        {
          questions: [
            {
              number: 1,
              type: "open_ended",
              statement: content.trim(),
            },
          ],
        },
      ],
    };
  }

  const questions: StructuredQuestion[] = parsed.map((q) => {
    const hasOptions = q.options.length > 0;
    const alternatives: Alternative[] | undefined = hasOptions
      ? q.options.map((opt, i) => ({
          letter: String.fromCharCode(97 + i),
          text: opt,
        }))
      : undefined;

    return {
      number: parseInt(q.number, 10),
      type: hasOptions ? "multiple_choice" : "open_ended",
      statement: q.text,
      alternatives,
    };
  });

  return {
    sections: [{ questions }],
  };
}

/**
 * Convert a StructuredActivity back to a flat text string.
 * Used for legacy exports (PDF/DOCX) and clipboard copy.
 */
export function structuredToText(activity: StructuredActivity): string {
  const lines: string[] = [];

  if (activity.general_instructions) {
    lines.push(activity.general_instructions, "");
  }

  for (const section of activity.sections) {
    if (section.title) {
      lines.push(section.title.toUpperCase(), "");
    }
    if (section.introduction) {
      lines.push(section.introduction, "");
    }

    for (const q of section.questions) {
      if (q.instruction) {
        lines.push(q.instruction);
      }

      lines.push(`${q.number}. ${q.statement}`);

      if (q.alternatives && q.alternatives.length > 0) {
        for (const alt of q.alternatives) {
          lines.push(`${alt.letter}) ${alt.text}`);
        }
      }

      if (q.scaffolding && q.scaffolding.length > 0) {
        lines.push("");
        lines.push("Apoio:");
        q.scaffolding.forEach((step, i) => {
          lines.push(`${i + 1}. ${step}`);
        });
      }

      lines.push("");
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Normalize adaptation result data: if it's a string, return as-is;
 * if it's structured, return as-is. Used for safe access.
 */
export function ensureStructured(
  data: string | StructuredActivity
): StructuredActivity {
  if (typeof data === "string") {
    return migrateStringToStructured(data);
  }
  if (isStructuredActivity(data)) {
    return data;
  }
  // Fallback
  return migrateStringToStructured(String(data));
}

/**
 * Get text representation of an adaptation version (string or structured).
 */
export function getVersionText(data: string | StructuredActivity): string {
  if (typeof data === "string") return data;
  if (isStructuredActivity(data)) return structuredToText(data);
  return String(data);
}
