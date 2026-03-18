/**
 * Shared LaTeX/KaTeX rendering utility.
 * Converts math patterns in plain text to KaTeX HTML strings.
 * Supports: fractions, superscripts, subscripts, roots, greek letters,
 * units, unicode math symbols, and explicit LaTeX commands.
 */
import katex from "katex";

/** Unicode → LaTeX mapping */
const UNICODE_TO_LATEX: Record<string, string> = {
  "Δ": "\\Delta ",
  "λ": "\\lambda ",
  "π": "\\pi ",
  "σ": "\\sigma ",
  "μ": "\\mu ",
  "α": "\\alpha ",
  "β": "\\beta ",
  "γ": "\\gamma ",
  "θ": "\\theta ",
  "ω": "\\omega ",
  "Ω": "\\Omega ",
  "φ": "\\varphi ",
  "ε": "\\varepsilon ",
  "ρ": "\\rho ",
  "τ": "\\tau ",
  "₀": "_0",
  "₁": "_1",
  "₂": "_2",
  "₃": "_3",
  "₄": "_4",
  "³": "^3",
  "²": "^2",
  "¹": "^1",
  "⁴": "^4",
  "⁻": "^{-",
  "·": "\\cdot ",
  "×": "\\times ",
  "÷": "\\div ",
  "≥": "\\geq ",
  "≤": "\\leq ",
  "≠": "\\neq ",
  "≈": "\\approx ",
  "∞": "\\infty ",
  "∑": "\\sum ",
  "∏": "\\prod ",
  "∫": "\\int ",
  "√": "\\sqrt",
  "±": "\\pm ",
  "∓": "\\mp ",
  "→": "\\rightarrow ",
  "←": "\\leftarrow ",
  "⇒": "\\Rightarrow ",
  "∈": "\\in ",
  "∉": "\\notin ",
  "⊂": "\\subset ",
  "∪": "\\cup ",
  "∩": "\\cap ",
  "∅": "\\emptyset ",
  "∀": "\\forall ",
  "∃": "\\exists ",
  "°C": "°\\text{C}",
  "°F": "°\\text{F}",
};

function unicodeToLatex(text: string): string {
  let result = text;
  for (const [unicode, tex] of Object.entries(UNICODE_TO_LATEX)) {
    result = result.split(unicode).join(tex);
  }
  return result;
}

function renderKatex(latex: string): string {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode: false, strict: false });
  } catch {
    return latex;
  }
}

/**
 * Renders all math patterns in a text string as KaTeX HTML.
 * Returns an HTML string with math rendered inline.
 */
export function renderMathToHtml(text: string): string {
  if (!text) return "";

  let result = text;

  // 1. Explicit LaTeX: $...$ inline math
  result = result.replace(/\$([^$]+)\$/g, (_m, expr) => {
    return renderKatex(unicodeToLatex(expr));
  });

  // 2. \frac{a}{b}, \tfrac, \dfrac
  result = result.replace(/\\[tdf]?frac\{([^{}]+)\}\{([^{}]+)\}/g, (_m, num, den) => {
    return renderKatex(`\\frac{${unicodeToLatex(num)}}{${unicodeToLatex(den)}}`);
  });

  // 3. \sqrt{...} or \sqrt[n]{...}
  result = result.replace(/\\sqrt(?:\[([^\]]+)\])?\{([^{}]+)\}/g, (_m, n, body) => {
    const latex = n ? `\\sqrt[${n}]{${unicodeToLatex(body)}}` : `\\sqrt{${unicodeToLatex(body)}}`;
    return renderKatex(latex);
  });

  // 4. Plain fractions like 3/4, 23/48, ?/48 (not in words)
  result = result.replace(/(?<![a-zA-Z])(\?|\d+)\s*\/\s*(\?|\d+)(?![a-zA-Z/])/g, (m, num, den) => {
    return renderKatex(`\\tfrac{${num}}{${den}}`);
  });

  // 5. Superscripts: 10^{-2}, x^{3}, then 10^(-2), then 10^5
  result = result.replace(/([a-zA-Z0-9,.]+)\s*\^\s*\{([^{}]+)\}/g, (_m, base, exp) => {
    return renderKatex(`${unicodeToLatex(base)}^{${unicodeToLatex(exp)}}`);
  });
  // Parenthesized exponents: 10^(24), 10^(-27), 3 x 10^(24 - (-27))
  result = result.replace(/([a-zA-Z0-9,.]+)\s*\^\s*\(([^)]+)\)/g, (_m, base, exp) => {
    return renderKatex(`${unicodeToLatex(base)}^{${unicodeToLatex(exp)}}`);
  });
  // Simple numeric exponents: 10^5, x^2
  result = result.replace(/([a-zA-Z0-9,.]+)\s*\^\s*(-?\d+)(?![{(])/g, (_m, base, exp) => {
    return renderKatex(`${unicodeToLatex(base)}^{${exp}}`);
  });

  // 6. Subscripts: x_1, a_{12}
  result = result.replace(/([a-zA-Z])\s*_\s*\{([^{}]+)\}/g, (_m, base, sub) => {
    return renderKatex(`${base}_{${sub}}`);
  });
  result = result.replace(/([a-zA-Z])\s*_\s*(\d+)/g, (_m, base, sub) => {
    return renderKatex(`${base}_{${sub}}`);
  });

  // 7. Scientific notation: 3 x 10^5, 0,09 . 10^{-2} (render dot as \cdot)
  // This runs after superscripts are already rendered, so match rendered katex spans
  result = result.replace(/\.\s*(?=<span class="katex">)/g, " \\cdot ".replace(/\\/g, "\\"));
  
  // 8. Newlines to <br>
  result = result.replace(/\n/g, "<br/>");

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Checks if a text contains any math-like patterns worth rendering.
 */
export function hasMathContent(text: string): boolean {
  if (!text) return false;
  return /\\frac|\\sqrt|\$[^$]+\$|(?<![a-zA-Z])\d+\s*\/\s*\d+(?![a-zA-Z/])|[a-zA-Z0-9]\^|[₀₁₂₃₄³²¹⁴]|[Δλπσμαβγθωφ]|[×÷≥≤≠≈∞√±→←⇒∈∪∩]/.test(text);
}
