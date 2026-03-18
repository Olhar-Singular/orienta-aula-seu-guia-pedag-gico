/**
 * Smart text parser for PDF export.
 * Analyzes activity text and returns typed elements for styled rendering.
 */

export type TextElementType =
  | "title"
  | "question-number"
  | "paragraph"
  | "bullet-item"
  | "step"
  | "alternative"
  | "formula"
  | "separator"
  | "instruction"
  | "header";

export type ParsedElement = {
  type: TextElementType;
  content: string;
  level?: number;
  metadata?: {
    number?: string;
    isUpperCase?: boolean;
  };
};

// ── Patterns ──────────────────────────────────────────────

const TITLE_RE = /^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇÜ\s\-–—]+$/;

// Question number must be followed by text starting with a letter (not math symbols)
const QUESTION_NUMBER_RE =
  /^(?:quest[ãa]o\s*)?(\d{1,3})[\.\)\:\-]\s+([A-Za-zÀ-ú"(].*)/i;

// Alternatives: only a-e (standard exam answers), require space + text after
const ALTERNATIVE_RE = /^[\(\[]?([a-eA-E])[\)\]\.\:]\s+(.*)/;

const STEP_RE =
  /^(?:(?:PRIMEIRO|SEGUNDO|TERCEIRO|QUARTO|QUINTO|SEXTO|SÉTIMO|OITAVO|NONO|DÉCIMO|\d+[ºª]?)\s*(?:PASSO|ETAPA)|(?:PASSO|ETAPA)\s*\d+)\s*[\:\-]?\s*/i;

const BULLET_RE = /^[\-\•\*]\s+(.*)/;

const HEADER_RE =
  /^(?:BLOCO|PARTE|SEÇÃO|MÓDULO|TEXTO)\s+[IVXLCDM\dA-Z]+\s*[\:\-]?\s*/i;

const INSTRUCTION_RE =
  /^(?:ATENÇÃO|IMPORTANTE|NOTA|DICA|OBSERVAÇÃO|OBS|LEMBRE-SE|ORIENTAÇÕES?\s*GERAIS?|GABARITO)\s*[\:\-]\s*/i;

const FORMULA_CHARS = /[=×÷±√∫∑∏≠≤≥∞αβγδεμπσλΩ²³⁻¹]/;
const FORMULA_EXPONENT = /\d[\^_]\{?\d+\}?/;

// ── Helpers ───────────────────────────────────────────────

/**
 * Normalize Unicode superscript/subscript characters that cause
 * overlapping in @react-pdf/renderer built-in fonts (Helvetica/Courier).
 * Replaces them with ASCII-safe equivalents.
 */
const SUPERSCRIPT_MAP: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
  "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
  "⁺": "+", "⁻": "-", "⁼": "=", "⁽": "(", "⁾": ")",
  "ⁿ": "n", "ⁱ": "i",
};
const SUBSCRIPT_MAP: Record<string, string> = {
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
  "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
  "₊": "+", "₋": "-", "₌": "=", "₍": "(", "₎": ")",
};

const SUPER_RE = new RegExp(`[${Object.keys(SUPERSCRIPT_MAP).join("")}]+`, "g");
const SUB_RE = new RegExp(`[${Object.keys(SUBSCRIPT_MAP).join("")}]+`, "g");

export function normalizeMathText(text: string): string {
  let result = text;
  // Replace sequences of superscript chars → ^(digits)
  result = result.replace(SUPER_RE, (match) => {
    const converted = [...match].map((c) => SUPERSCRIPT_MAP[c] ?? c).join("");
    return `^${converted}`;
  });
  // Replace sequences of subscript chars → _(digits)
  result = result.replace(SUB_RE, (match) => {
    const converted = [...match].map((c) => SUBSCRIPT_MAP[c] ?? c).join("");
    return `_${converted}`;
  });
  // Normalize common problematic Unicode symbols
  result = result.replace(/×/g, " x ");
  result = result.replace(/÷/g, " / ");
  result = result.replace(/±/g, "+/-");
  result = result.replace(/≠/g, "!=");
  result = result.replace(/≤/g, "<=");
  result = result.replace(/≥/g, ">=");
  result = result.replace(/·/g, ".");
  return result;
}

function isTitle(line: string): boolean {
  if (line.length < 5 || line.length > 80) return false;
  if (line.endsWith(":")) return false;
  // Must be all uppercase letters/spaces/dashes
  return TITLE_RE.test(line);
}

function isFormula(line: string): boolean {
  if (line.length > 80) return false;
  return FORMULA_CHARS.test(line) || FORMULA_EXPONENT.test(line);
}

function isQuestionEnd(line: string): boolean {
  // Lines ending with ? are likely questions (paragraph style)
  return line.endsWith("?");
}

// ── Main Parser ───────────────────────────────────────────

export function parseActivityText(text: string): ParsedElement[] {
  if (!text || typeof text !== "string") return [];

  const lines = text.split("\n");
  const elements: ParsedElement[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Empty line → separator
    if (!trimmed) {
      if (
        elements.length > 0 &&
        elements[elements.length - 1].type !== "separator"
      ) {
        elements.push({ type: "separator", content: "" });
      }
      continue;
    }

    // Horizontal rule separators
    if (/^[\-=_\*]{3,}$/.test(trimmed)) {
      if (
        elements.length > 0 &&
        elements[elements.length - 1].type !== "separator"
      ) {
        elements.push({ type: "separator", content: "" });
      }
      continue;
    }

    // 1. Title (all uppercase, no trailing colon, > 5 chars)
    if (isTitle(trimmed)) {
      elements.push({ type: "title", content: trimmed });
      continue;
    }

    // 2. Header / Block
    if (HEADER_RE.test(trimmed)) {
      elements.push({
        type: "header",
        content: trimmed,
        metadata: { isUpperCase: trimmed === trimmed.toUpperCase() },
      });
      continue;
    }

    // 3. Instruction
    if (INSTRUCTION_RE.test(trimmed)) {
      elements.push({ type: "instruction", content: trimmed });
      continue;
    }

    // 4. Step
    if (STEP_RE.test(trimmed)) {
      elements.push({ type: "step", content: trimmed });
      continue;
    }

    // 5. Alternative (a), b), etc.)
    const altMatch = trimmed.match(ALTERNATIVE_RE);
    if (altMatch) {
      const letter = altMatch[1].toLowerCase();
      elements.push({
        type: "alternative",
        content: trimmed,
        metadata: { number: letter },
      });
      continue;
    }

    // 6. Question number: "1.", "2)", "Questão 3:", etc.
    const qMatch = trimmed.match(QUESTION_NUMBER_RE);
    if (qMatch && trimmed.length > 2) {
      const num = qMatch[1];
      const rest = (qMatch[2] || "").trim();

      elements.push({
        type: "question-number",
        content: rest ? `${num}. ${rest}` : `${num}.`,
        metadata: { number: num },
      });
      continue;
    }

    // 7. Bullet list
    const bulletMatch = trimmed.match(BULLET_RE);
    if (bulletMatch) {
      elements.push({
        type: "bullet-item",
        content: bulletMatch[1],
      });
      continue;
    }

    // 8. Formula (short line with math symbols)
    if (isFormula(trimmed) && trimmed.length < 60) {
      elements.push({ type: "formula", content: trimmed });
      continue;
    }

    // 9. Default: paragraph
    elements.push({ type: "paragraph", content: trimmed });
  }

  return optimizeElements(elements);
}

function optimizeElements(elements: ParsedElement[]): ParsedElement[] {
  return elements.filter((el, i, arr) => {
    // Remove leading/trailing separators
    if (el.type === "separator" && (i === 0 || i === arr.length - 1)) {
      return false;
    }
    // Remove consecutive separators
    if (el.type === "separator" && arr[i - 1]?.type === "separator") {
      return false;
    }
    return true;
  });
}
