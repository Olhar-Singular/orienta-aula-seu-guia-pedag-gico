/**
 * Shared LaTeX/KaTeX rendering utility.
 * Converts math patterns in plain text to KaTeX HTML strings.
 * Supports: fractions, superscripts, subscripts, roots, and explicit LaTeX.
 */
import katex from "katex";

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

/**
 * Renders math patterns in a text string as KaTeX HTML.
 * Only transforms clearly mathematical patterns, leaving prose untouched.
 */
export function renderMathToHtml(text: string): string {
  if (!text) return "";

  let result = text;

  // 1. Explicit LaTeX blocks: $...$
  result = result.replace(/\$([^$]+)\$/g, (_m, expr) => renderKatex(expr));

  // 2. \frac{a}{b}, \tfrac, \dfrac
  result = result.replace(/\\[tdf]?frac\{([^{}]+)\}\{([^{}]+)\}/g, (_m, num, den) => {
    return renderKatex(`\\frac{${num}}{${den}}`);
  });

  // 3. \sqrt{...} or \sqrt[n]{...}
  result = result.replace(/\\sqrt(?:\[([^\]]+)\])?\{([^{}]+)\}/g, (_m, n, body) => {
    return renderKatex(n ? `\\sqrt[${n}]{${body}}` : `\\sqrt{${body}}`);
  });

  // 4. Superscripts with braces: 10^{-2}, x^{3}
  result = result.replace(/([A-Za-z0-9,.]+)\s*\^\s*\{([^{}]+)\}/g, (_m, base, exp) => {
    return renderKatex(`${base}^{${exp}}`);
  });

  // 5. Superscripts with parens: 10^(24), 10^(-27)
  result = result.replace(/([A-Za-z0-9,.]+)\s*\^\s*\(([^)]+)\)/g, (_m, base, exp) => {
    return renderKatex(`${base}^{${exp}}`);
  });

  // 6. Simple superscripts: 10^5, x^2, 10^-2
  result = result.replace(/([A-Za-z0-9,.]+)\s*\^\s*(-?\d+)/g, (_m, base, exp) => {
    return renderKatex(`${base}^{${exp}}`);
  });

  // 7. Plain fractions like 3/4, 23/48 (not inside words like km/h)
  result = result.replace(/(?<![a-zA-Z)\]])(\?|\d+)\s*\/\s*(\?|\d+)(?![a-zA-Z/(])/g, (_m, num, den) => {
    return renderKatex(`\\tfrac{${num}}{${den}}`);
  });

  // 8. Subscripts with braces: x_{12}
  result = result.replace(/([A-Za-z])\s*_\s*\{([^{}]+)\}/g, (_m, base, sub) => {
    return renderKatex(`${base}_{${sub}}`);
  });

  // 9. Simple subscripts: x_1, a_0
  result = result.replace(/([A-Za-z])_(\d+)(?![A-Za-z_])/g, (_m, base, sub) => {
    return renderKatex(`${base}_{${sub}}`);
  });

  // 10. Newlines to <br>
  result = result.replace(/\n/g, "<br/>");

  return result;
}

/**
 * Checks if a text contains any math-like patterns worth rendering.
 */
export function hasMathContent(text: string): boolean {
  if (!text) return false;
  return /\\frac|\\sqrt|\$[^$]+\$|(?<![a-zA-Z])\d+\s*\/\s*\d+(?![a-zA-Z/])|[A-Za-z0-9]\^|[A-Za-z]_\d/.test(text);
}
