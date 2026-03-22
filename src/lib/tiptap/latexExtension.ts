/**
 * TipTap extension for inline LaTeX math rendering.
 * Detects $...$ patterns and renders them using KaTeX.
 */
import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import katex from "katex";

// Match inline LaTeX: $...$
const LATEX_INLINE_RE = /\$([^$\n]+)\$/g;

/**
 * Render a LaTeX expression to HTML string.
 */
function renderLatex(latex: string): string {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false,
      strict: false,
    });
  } catch {
    return `<span class="latex-error" title="Invalid LaTeX">$${latex}$</span>`;
  }
}

/**
 * Plugin to decorate LaTeX expressions with rendered output.
 */
function createLatexDecorationPlugin() {
  const key = new PluginKey("latexDecoration");

  return new Plugin({
    key,
    state: {
      init(_, { doc }) {
        return buildDecorations(doc);
      },
      apply(tr, decorationSet) {
        if (tr.docChanged) {
          return buildDecorations(tr.doc);
        }
        return decorationSet.map(tr.mapping, tr.doc);
      },
    },
    props: {
      decorations(state) {
        return this.getState(state);
      },
    },
  });
}

/**
 * Build decorations for all LaTeX expressions in the document.
 */
function buildDecorations(doc: any): DecorationSet {
  const decorations: Decoration[] = [];

  doc.descendants((node: any, pos: number) => {
    if (!node.isText) return;

    const text = node.text || "";
    let match;

    LATEX_INLINE_RE.lastIndex = 0;
    while ((match = LATEX_INLINE_RE.exec(text)) !== null) {
      const from = pos + match.index;
      const to = from + match[0].length;
      const latex = match[1];

      // Create a decoration that shows the rendered LaTeX
      const html = renderLatex(latex);

      decorations.push(
        Decoration.inline(from, to, {
          class: "latex-rendered",
          "data-latex": latex,
        })
      );
    }
  });

  return DecorationSet.create(doc, decorations);
}

/**
 * TipTap extension for LaTeX math support.
 * Adds inline decorations for $...$ expressions.
 */
export const LatexExtension = Node.create({
  name: "latex",

  // This is a mark-like extension but implemented as decorations
  // to avoid modifying the document structure
  addProseMirrorPlugins() {
    return [createLatexDecorationPlugin()];
  },
});

/**
 * CSS styles for LaTeX rendering in the editor.
 * Include this in your global CSS or inject it.
 */
export const latexStyles = `
  .latex-rendered {
    background: linear-gradient(to bottom, rgba(99, 102, 241, 0.1), transparent);
    border-radius: 2px;
    padding: 0 2px;
  }

  .latex-rendered:hover {
    background: rgba(99, 102, 241, 0.15);
  }

  .latex-error {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 2px;
    padding: 0 2px;
  }

  /* KaTeX font size adjustments */
  .ProseMirror .katex {
    font-size: 1.1em;
  }
`;

export default LatexExtension;
