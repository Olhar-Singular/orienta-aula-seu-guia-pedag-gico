import { sanitize } from "./sanitize.ts";

const AI_INSTRUCTIONS_MAX_LENGTH = 500;

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(as\s+|todas\s+as\s+|the\s+)?(instru[cç][oõ]es|regras|prompt|tudo|previous|anterior|above)/i,
  /esque[cç]a\s+(as\s+|todas\s+as\s+)?(instru[cç][oõ]es|regras|prompt|tudo)/i,
  /system\s*prompt/i,
  /prompt\s+(do\s+)?sistema/i,
  /instru[cç][oõ]es\s+(do\s+)?sistema/i,
  /\bjailbreak\b/i,
  /\bDAN\b/,
  /(reveal|mostre|exiba|show)\s+(me\s+)?(the\s+|o\s+|as\s+)?(prompt|sistema|system|instru[cç])/i,
  /act\s+as|finja\s+ser|pretenda\s+ser/i,
  /sem\s+(filtro|filtros|restri[cç][aã]o|restri[cç][oõ]es|censura)/i,
  /new\s+system/i,
  /novo\s+sistema/i,
];

/**
 * Hardens free-text "AI style instructions" coming from the teacher before
 * splicing them into the model prompt. Returns "" when the input is empty,
 * malicious-looking, or otherwise unsafe to forward.
 *
 * Layered defense:
 *  1. base sanitize() — strips HTML/quote chars, truncates
 *  2. flatten line breaks — kills "------ NEW INSTRUCTIONS ------" patterns
 *  3. strip markdown/header runs — kills `###`, `***`, `~~~`, ``` etc.
 *  4. collapse whitespace
 *  5. blacklist of injection phrases — discards entire input on hit
 */
export function prepareAiInstructions(raw: string | undefined | null): string {
  if (!raw || typeof raw !== "string") return "";

  const sanitized = sanitize(raw, AI_INSTRUCTIONS_MAX_LENGTH);
  if (!sanitized) return "";

  const flattened = sanitized
    .replace(/[\r\n]+/g, " ")
    .replace(/[`#*_~>|=-]{3,}/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!flattened) return "";

  if (INJECTION_PATTERNS.some((pattern) => pattern.test(flattened))) {
    return "";
  }

  return flattened;
}

export const __AI_INSTRUCTIONS_MAX_LENGTH = AI_INSTRUCTIONS_MAX_LENGTH;
