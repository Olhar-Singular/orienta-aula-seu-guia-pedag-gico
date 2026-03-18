/**
 * Shared LaTeX/KaTeX rendering utility.
 * Converts math patterns in plain text to KaTeX HTML strings.
 */
import katex from "katex";

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
  result = result.replace(/\$([^$]+)\$/g, (_m, expr) => renderKatex(expr));

  // 2. \frac{a}{b}, \tfrac, \dfrac
  result = result.replace(/\\[tdf]?frac\{([^{}]+)\}\{([^{}]+)\}/g, (_m, num, den) => {
    return renderKatex(`\\frac{${num}}{${den}}`);
  });

  // 3. \sqrt{...} or \sqrt[n]{...}
  result = result.replace(/\\sqrt(?:\[([^\]]+)\])?\{([^{}]+)\}/g, (_m, n, body) => {
    const latex = n ? `\\sqrt[${n}]{${body}}` : `\\sqrt{${body}}`;
    return renderKatex(latex);
  });

  // 4. Superscripts with braces: 10^{-2}, x^{3}
  result = result.replace(/([a-zA-Z0-9,.]+)\s*\^\s*\{([^{}]+)\}/g, (_m, base, exp) => {
    return renderKatex(`${base}^{${exp}}`);
  });

  // 5. Superscripts with parens: 10^(24), 10^(-27)
  result = result.replace(/([a-zA-Z0-9,.]+)\s*\^\s*\(([^)]+)\)/g, (_m, base, exp) => {
    return renderKatex(`${base}^{${exp}}`);
  });

  // 6. Simple superscripts: 10^5, x^2, 10^-2
  result = result.replace(/([a-zA-Z0-9,.]+)\s*\^\s*(-?\d+)/g, (_m, base, exp) => {
    return renderKatex(`${base}^{${exp}}`);
  });

  // 7. Plain fractions like 3/4, 23/48, ?/48 (not in words)
  result = result.replace(/(?<![a-zA-Z])(\?|\d+)\s*\/\s*(\?|\d+)(?![a-zA-Z/])/g, (_m, num, den) => {
    return renderKatex(`\\tfrac{${num}}{${den}}`);
  });

  // 8. Subscripts: x_1, a_{12}
  result = result.replace(/([a-zA-Z])\s*_\s*\{([^{}]+)\}/g, (_m, base, sub) => {
    return renderKatex(`${base}_{${sub}}`);
  });
  result = result.replace(/([a-zA-Z])\s*_\s*(\d+)/g, (_m, base, sub) => {
    return renderKatex(`${base}_{${sub}}`);
  });

  // 9. Newlines to <br>
  result = result.replace(/\n/g, "<br/>");

  return result;
}

/**
 * Checks if a text contains any math-like patterns worth rendering.
 */
export function hasMathContent(text: string): boolean {
  if (!text) return false;
  return /\\frac|\\sqrt|\$[^$]+\$|(?<![a-zA-Z])\d+\s*\/\s*\d+(?![a-zA-Z/])|[a-zA-Z0-9]\^/.test(text);
}
