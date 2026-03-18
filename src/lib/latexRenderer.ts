/**
 * Shared LaTeX/KaTeX rendering utility.
 * Converts math patterns in plain text to KaTeX HTML strings.
 */
import katex from "katex";

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
  "·": "\\cdot ",
  "×": "\\times ",
  "÷": "\\div ",
  "≥": "\\geq ",
  "≤": "\\leq ",
  "≠": "\\neq ",
  "≈": "\\approx ",
  "∞": "\\infty ",
  "±": "\\pm ",
  "→": "\\rightarrow ",
  "⇒": "\\Rightarrow ",
  "∈": "\\in ",
  "√": "\\sqrt",
};

function renderKatex(latex: string): string {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false,
      strict: false,
    });
  } catch {
    return latex;
  }
}

function normalizeExpression(expr: string): string {
  let out = expr.trim();

  // Unicode symbols
  for (const [symbol, tex] of Object.entries(UNICODE_TO_LATEX)) {
    out = out.split(symbol).join(tex);
  }

  // Subscript variables: base_maior -> base_{maior}
  out = out.replace(/\b([A-Za-z]+)_([A-Za-z][A-Za-z0-9]*)\b/g, "$1_{$2}");

  // Multiplication operators
  out = out.replace(/\s*\*\s*/g, " \\cdot ");
  out = out.replace(/\b(x|X)\b/g, "\\cdot");

  return out;
}

function replaceWithToken(
  input: string,
  regex: RegExp,
  toLatex: (...args: string[]) => string,
  rendered: string[]
): string {
  return input.replace(regex, (...args) => {
    const match = args[0] as string;
    const groups = args.slice(1, -2) as string[];
    const latex = toLatex(...groups) || match;
    const html = renderKatex(normalizeExpression(latex));
    const token = `§§MATH_${rendered.length}§§`;
    rendered.push(html);
    return token;
  });
}

/**
 * Renders all math patterns in a text string as KaTeX HTML.
 * Returns an HTML string with math rendered inline.
 */
export function renderMathToHtml(text: string): string {
  if (!text) return "";

  const rendered: string[] = [];
  let result = text;

  // 1) Explicit LaTeX blocks: $...$
  result = replaceWithToken(
    result,
    /\$([^$]+)\$/g,
    (expr) => expr,
    rendered
  );

  // 2) Explicit fractions / roots
  result = replaceWithToken(
    result,
    /\\[tdf]?frac\{([^{}]+)\}\{([^{}]+)\}/g,
    (num, den) => `\\frac{${num}}{${den}}`,
    rendered
  );
  result = replaceWithToken(
    result,
    /\\sqrt(?:\[([^\]]+)\])?\{([^{}]+)\}/g,
    (n, body) => (n ? `\\sqrt[${n}]{${body}}` : `\\sqrt{${body}}`),
    rendered
  );

  // 3) Equations like A = ((base_maior + base_menor) * altura) / 2
  result = replaceWithToken(
    result,
    /\b([A-Za-z][A-Za-z0-9_]*)\s*=\s*([A-Za-z0-9_(),.+\-*/^\s]{3,120})/g,
    (lhs, rhs) => `${lhs} = ${rhs.trim()}`,
    rendered
  );

  // 4) Arithmetic equality like ((10 + 6) * 4) / 2 = 32
  result = replaceWithToken(
    result,
    /((?:\(|\d)[0-9A-Za-z_(),.+\-*/^\s]{3,120}=\s*-?[0-9]+(?:[.,][0-9]+)?)/g,
    (expr) => expr.trim(),
    rendered
  );

  // 5) Superscripts: 10^{-2}, 10^(24 - (-27)), 10^5
  result = replaceWithToken(
    result,
    /([A-Za-z0-9,.]+)\s*\^\s*\{([^{}]+)\}/g,
    (base, exp) => `${base}^{${exp}}`,
    rendered
  );
  result = replaceWithToken(
    result,
    /([A-Za-z0-9,.]+)\s*\^\s*\(([^)]+)\)/g,
    (base, exp) => `${base}^{${exp}}`,
    rendered
  );
  result = replaceWithToken(
    result,
    /([A-Za-z0-9,.]+)\s*\^\s*(-?\d+)/g,
    (base, exp) => `${base}^{${exp}}`,
    rendered
  );

  // 6) Plain fractions like 3/4
  result = replaceWithToken(
    result,
    /(^|[^A-Za-z])((?:\?|\d+)\s*\/\s*(?:\?|\d+))(?![A-Za-z/])/g,
    (prefix, frac) => `${prefix}\\tfrac{${frac.split("/")[0].trim()}}{${frac.split("/")[1].trim()}}`,
    rendered
  );

  // 7) Variable with subscript: x_1, a_{12}, base_maior
  result = replaceWithToken(
    result,
    /\b([A-Za-z]+)_(\{[^}]+\}|[A-Za-z0-9]+)\b/g,
    (base, sub) => `${base}_${sub.startsWith("{") ? sub : `{${sub}}`}`,
    rendered
  );

  // Restore rendered tokens
  result = result.replace(/§§MATH_(\d+)§§/g, (_m, idx) => rendered[Number(idx)] || "");

  // Line breaks
  result = result.replace(/\n/g, "<br/>");

  return result;
}

/**
 * Checks if a text contains any math-like patterns worth rendering.
 */
export function hasMathContent(text: string): boolean {
  if (!text) return false;
  return /\\frac|\\sqrt|\$[^$]+\$|\b[A-Za-z][A-Za-z0-9_]*\s*=|\d\s*\/\s*\d|[A-Za-z0-9]\s*\^\s*(?:\{|\(|-?\d)|\b[A-Za-z]+_[A-Za-z0-9]+\b|[+\-*/=()]/.test(
    text
  );
}
