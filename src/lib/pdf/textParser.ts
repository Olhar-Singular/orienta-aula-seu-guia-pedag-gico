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
const ALTERNATIVE_RE = /^[\(\[]?([a-jA-J])[\)\]\.\:]\s+(.*)/;

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

  // Restore corrupted LaTeX from JSON streaming
  result = result
    .replace(/\x0Crac/g, "\\frac")
    .replace(/\x0C/g, "\\f")
    .replace(/\x08inom/g, "\\binom")
    .replace(/\x09frac/g, "\\tfrac")
    .replace(/\x09ext/g, "\\text");

  // Strip markdown bold and italic markers
  result = result.replace(/\*\*/g, "");
  result = result.replace(/_([^_\n]+)_/g, "$1");
  result = result.replace(/\*([^*\n]+)\*/g, "$1");

  // Strip dollar-sign delimiters: $...$ → content
  result = result.replace(/\$([^$]+)\$/g, (_m, inner) => inner.trim());

  // Strip double-dollar delimiters: $$...$$ → content
  result = result.replace(/\$\$([^$]+)\$\$/g, (_m, inner) => inner.trim());

  // Convert \frac{a}{b}, \tfrac{a}{b}, \dfrac{a}{b} → a/b
  result = result.replace(/\\[tdf]?frac\{([^{}]+)\}\{([^{}]+)\}/g, (_m, num, den) => `${num.trim()}/${den.trim()}`);

  // Convert LaTeX operators to readable symbols
  result = result.replace(/\\div\b/g, "÷");
  result = result.replace(/\\times\b/g, "×");
  result = result.replace(/\\cdot\b/g, "·");
  result = result.replace(/\\pm\b/g, "±");
  result = result.replace(/\\sqrt\{([^{}]+)\}/g, "√($1)");
  result = result.replace(/\\text\{([^{}]+)\}/g, "$1");
  result = result.replace(/\\left\b/g, "");
  result = result.replace(/\\right\b/g, "");
  result = result.replace(/\\,/g, " ");
  result = result.replace(/\\;/g, " ");
  result = result.replace(/\\quad\b/g, "  ");
  result = result.replace(/\\qquad\b/g, "    ");
  result = result.replace(/\\\\/g, "");

  // Convert caret exponents to Unicode superscripts: 0,8^2 → 0,8²
  const SUPERSCRIPT_DIGITS: Record<string, string> = {
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
    "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
    "+": "⁺", "-": "⁻",
  };
  result = result.replace(/\^[\{\(]?([0-9+\-]+)[\}\)]?/g, (_m, exp: string) => {
    return [...exp].map(c => SUPERSCRIPT_DIGITS[c] ?? c).join("");
  });
  // Clean up any remaining backslash commands that weren't caught
  result = result.replace(/\\[a-zA-Z]+\{([^{}]*)\}/g, "$1");

  // Subscript chars → _(digits) (keep as ASCII, no unicode needed)
  result = result.replace(SUB_RE, (match) => {
    const converted = [...match].map((c) => SUBSCRIPT_MAP[c] ?? c).join("");
    return `_${converted}`;
  });
  // Normalize common problematic Unicode symbols
  result = result.replace(/×/g, " x ");
  result = result.replace(/÷/g, " ÷ ");
  result = result.replace(/±/g, "+/-");
  result = result.replace(/≠/g, "!=");
  result = result.replace(/≤/g, "<=");
  result = result.replace(/≥/g, ">=");
  result = result.replace(/·/g, ".");
  // Remove any remaining unmatched dollar signs
  result = result.replace(/\$/g, "");
  return result;
}

function isTitle(line: string): boolean {
  if (line.length < 5 || line.length > 80) return false;
  if (line.endsWith(":")) return false;
  // Must be all uppercase letters/spaces/dashes
  return TITLE_RE.test(line);
}

function isFormula(line: string): boolean {
  if (line.length > 120) return false;
  if (FORMULA_CHARS.test(line) || FORMULA_EXPONENT.test(line)) return true;
  // Expression-like: multiple operators with numbers
  const operatorCount = (line.match(/[+\-×÷=\/\(\)]/g) || []).length;
  return /\d/.test(line) && operatorCount >= 3;
}

function isQuestionEnd(line: string): boolean {
  // Lines ending with ? are likely questions (paragraph style)
  return line.endsWith("?");
}

// ── Line Joining ──────────────────────────────────────────

/**
 * Join lines that are formula continuations.
 * Detects lines ending with operators or incomplete fractions
 * and merges them with the following line.
 */
function joinFormulaLines(rawLines: string[]): string[] {
  const result: string[] = [];
  let i = 0;

  while (i < rawLines.length) {
    let current = rawLines[i].trim();

    if (!current) {
      result.push(rawLines[i]);
      i++;
      continue;
    }

    // Keep joining while current line ends with an operator or open paren
    while (i + 1 < rawLines.length) {
      const next = rawLines[i + 1].trim();
      if (!next) break;

      // Don't join bullet items (- text), horizontal rules (---), or header-like lines
      const isBulletOrRule = /^[\-\•\*]\s+/.test(next) || /^[\-=_\*]{3,}$/.test(next);
      if (isBulletOrRule) break;

      const endsWithOperator = /[+×÷=\(\[,\/\\]$/.test(current) || /[+\-]\s*$/.test(current);
      const nextStartsWithContinuation = /^[+×÷=\)\]\.,]/.test(next) || /^\d+[\)\]]/.test(next);

      if (endsWithOperator || nextStartsWithContinuation) {
        current = current + " " + next;
        i++;
      } else {
        break;
      }
    }

    result.push(current);
    i++;
  }

  return result;
}

// ── Main Parser ───────────────────────────────────────────

export function parseActivityText(text: string): ParsedElement[] {
  if (!text || typeof text !== "string") return [];

  const lines = joinFormulaLines(text.split("\n"));
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

      // Skip if the "text" is actually a formula fragment (e.g., "x (1,2² - 3/4)")
      const isFormulaFragment = /^[a-z]\s*[\(\[×÷+\-=²³]/.test(rest) && rest.length < 40;
      if (!isFormulaFragment) {
        elements.push({
          type: "question-number",
          content: rest ? `${num}. ${rest}` : `${num}.`,
          metadata: { number: num },
        });
        continue;
      }
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

    // 8. Formula (line with math symbols)
    if (isFormula(trimmed) && trimmed.length < 120) {
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
