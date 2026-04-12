// Bidirectional converter: StructuredActivity <-> Activity DSL (markdown-like text)

import type {
  StructuredActivity,
  StructuredQuestion,
  ActivitySection,
  Alternative,
} from "@/types/adaptation";
import { parseActivity } from "./activityParser";
import type { ParsedQuestion, ParsedSection } from "./activityParser";
import { normalizeAIText } from "./normalizeAIText";

/**
 * Convert a StructuredActivity (JSON) into the markdown DSL text format
 * that the editor textarea uses.
 */
export function structuredToMarkdownDsl(activity: StructuredActivity): string {
  const lines: string[] = [];

  // Helper: normalize AI text fields that may contain literal escape sequences
  const n = normalizeAIText;

  if (activity.general_instructions) {
    lines.push("> " + n(activity.general_instructions));
    lines.push("");
  }

  for (let si = 0; si < activity.sections.length; si++) {
    const section = activity.sections[si];

    if (section.title) {
      lines.push("# " + n(section.title));
      lines.push("");
    }

    if (section.introduction) {
      lines.push("> " + n(section.introduction));
      lines.push("");
    }

    for (const q of section.questions) {
      // Instruction before question
      if (q.instruction) {
        lines.push("> " + n(q.instruction));
      }

      // Question statement
      lines.push(`${q.number}) ${n(q.statement)}`);

      // Type-specific content
      switch (q.type) {
        case "multiple_choice":
          if (q.alternatives && q.alternatives.length > 0) {
            for (const alt of q.alternatives) {
              const correctMark = alt.is_correct ? "*" : "";
              lines.push(`${alt.letter}${correctMark}) ${n(alt.text)}`);
            }
          }
          break;

        case "true_false":
          // The StructuredActivity type doesn't have dedicated V/F items,
          // but we can check if alternatives are used as V/F
          // Default: add empty V/F placeholders
          lines.push("( ) Verdadeiro");
          lines.push("( ) Falso");
          break;

        case "fill_blank":
          // Statement already contains ___ blanks typically
          if (q.blank_placeholder) {
            lines.push(`[banco: ${q.blank_placeholder}]`);
          }
          break;

        case "open_ended":
          lines.push("[linhas:4]");
          break;
      }

      // Scaffolding as instructions
      if (q.scaffolding && q.scaffolding.length > 0) {
        for (const step of q.scaffolding) {
          lines.push("> Apoio: " + n(step));
        }
      }

      // Images
      if (q.images && q.images.length > 0) {
        for (const img of q.images) {
          lines.push(`[img:${img}]`);
        }
      }

      lines.push("");
    }

    // Section separator (except last section)
    if (si < activity.sections.length - 1) {
      lines.push("---");
      lines.push("");
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Convert markdown DSL text back into a StructuredActivity (JSON).
 * Uses the parser to parse the DSL, then maps to StructuredActivity types.
 */
export function markdownDslToStructured(text: string): StructuredActivity {
  const parsed = parseActivity(text);

  const sections: ActivitySection[] = [];

  for (const sec of parsed.sections) {
    const questions: StructuredQuestion[] = [];
    let sectionInstruction: string | undefined;

    for (const item of sec.items) {
      if (item.kind === "instruction" && questions.length === 0) {
        // Instruction before any question -> section introduction
        sectionInstruction = item.text;
        continue;
      }

      if (item.kind === "question") {
        questions.push(parsedQuestionToStructured(item.data));
      }
    }

    sections.push({
      title: sec.title ?? undefined,
      introduction: sectionInstruction,
      questions,
    });
  }

  // Extract general instruction from first section if it has no title and only instructions
  let generalInstructions: string | undefined;
  if (
    sections.length > 0 &&
    !sections[0].title &&
    sections[0].questions.length === 0 &&
    sections[0].introduction
  ) {
    generalInstructions = sections[0].introduction;
    sections.shift();
  }

  return {
    sections,
    general_instructions: generalInstructions,
  };
}

function parsedQuestionToStructured(pq: ParsedQuestion): StructuredQuestion {
  const q: StructuredQuestion = {
    number: pq.number,
    type: mapQuestionType(pq.type),
    statement: buildFullStatement(pq),
  };

  // Alternatives (multiple choice) — filter out empty entries
  if (pq.alternatives.length > 0) {
    const alts = pq.alternatives
      .filter((a) => a.text.trim())
      .map(
        (a): Alternative => ({
          letter: a.letter,
          text: a.text,
          is_correct: a.correct || undefined,
        })
      );
    if (alts.length > 0) {
      q.alternatives = alts;
    }
  }

  // Images
  if (pq.images.length > 0) {
    q.images = [...pq.images];
  }

  // Extract ALL instructions from continuations (not just the first)
  const instructions = pq.continuations
    .filter((c) => c.startsWith("> ") && !/^>\s*Apoio\s*:/i.test(c))
    .map((c) => c.slice(2));
  if (instructions.length > 0) {
    q.instruction = instructions.join("\n");
  }

  // Scaffolding from "> Apoio: " continuations — use regex for robustness
  const scaffolding = pq.continuations
    .filter((c) => /^>\s*Apoio\s*:/i.test(c))
    .map((c) => c.replace(/^>\s*Apoio\s*:\s*/i, ""));
  if (scaffolding.length > 0) {
    q.scaffolding = scaffolding;
  }

  return q;
}

function buildFullStatement(pq: ParsedQuestion): string {
  let stmt = pq.statement;
  // Append non-instruction continuations to statement
  const textConts = pq.continuations.filter(
    (c) => !c.startsWith("> ") && !c.startsWith("$$") && c !== "<!--blank-->"
  );
  if (textConts.length > 0) {
    stmt += " " + textConts.join(" ");
  }
  return stmt;
}

/**
 * Map extended parser types to the 4 StructuredActivity types.
 * Types not in StructuredActivity (matching, ordering, table, multiple_answer)
 * get mapped to the closest equivalent.
 */
function mapQuestionType(
  parserType: string
): "multiple_choice" | "open_ended" | "fill_blank" | "true_false" {
  switch (parserType) {
    case "multiple_choice":
      return "multiple_choice";
    case "multiple_answer":
      return "multiple_choice";
    case "true_false":
      return "true_false";
    case "fill_blank":
      return "fill_blank";
    case "matching":
    case "ordering":
    case "table":
    case "open_ended":
    default:
      return "open_ended";
  }
}
