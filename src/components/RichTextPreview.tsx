/**
 * Preview component for rendering rich HTML content from the WYSIWYG editor.
 * Handles HTML formatting (bold, italic, colors, fonts) and LaTeX rendering.
 */
import { useEffect, useRef, useMemo } from "react";
import katex from "katex";
import { cn } from "@/lib/utils";
import { isHtmlContent } from "./QuestionRichEditor";
import "katex/dist/katex.min.css";

interface RichTextPreviewProps {
  content: string;
  className?: string;
}

/**
 * Render LaTeX expressions in a text string.
 */
function renderLatexInText(text: string): string {
  // Replace $...$ with rendered KaTeX
  return text.replace(/\$([^$]+)\$/g, (_match, formula) => {
    try {
      return katex.renderToString(formula, {
        throwOnError: false,
        displayMode: false,
        strict: false,
      });
    } catch {
      return `$${formula}$`;
    }
  });
}

/**
 * Process HTML content to render LaTeX within text nodes.
 */
function processHtmlWithLatex(html: string): string {
  // Create a temporary element to parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Process all text nodes
  const walker = document.createTreeWalker(
    doc.body,
    NodeFilter.SHOW_TEXT,
    null
  );

  const textNodes: Text[] = [];
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    if (node.textContent?.includes("$")) {
      textNodes.push(node);
    }
  }

  // Replace text nodes with LaTeX-rendered content
  textNodes.forEach((textNode) => {
    const content = textNode.textContent || "";
    if (content.includes("$")) {
      const span = document.createElement("span");
      span.innerHTML = renderLatexInText(content);
      textNode.parentNode?.replaceChild(span, textNode);
    }
  });

  return doc.body.innerHTML;
}

/**
 * Simple inline content renderer for plain text with LaTeX.
 */
function KaTeXInline({ formula }: { formula: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(formula, ref.current, {
        throwOnError: false,
        displayMode: false,
        strict: false,
      });
    } catch {
      if (ref.current) ref.current.textContent = formula;
    }
  }, [formula]);

  return <span ref={ref} className="inline-flex mx-0.5 align-middle whitespace-nowrap" />;
}

/**
 * Render plain text with LaTeX support.
 */
function renderPlainTextContent(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let key = 0;

  const parts = text.split(/\$([^$]+)\$/g);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    if (i % 2 === 1) {
      nodes.push(<KaTeXInline key={key++} formula={part} />);
    } else {
      nodes.push(<span key={key++}>{part}</span>);
    }
  }
  return nodes;
}

export default function RichTextPreview({ content, className }: RichTextPreviewProps) {
  const processedContent = useMemo(() => {
    if (!content) return "";

    if (isHtmlContent(content)) {
      return processHtmlWithLatex(content);
    }

    return null; // Will use plain text rendering
  }, [content]);

  if (!content) {
    return null;
  }

  // HTML content - render with dangerouslySetInnerHTML
  if (processedContent !== null) {
    return (
      <div
        className={cn(
          "rich-text-preview",
          "[&_mark]:rounded [&_mark]:px-0.5",
          "[&_sub]:text-[0.75em] [&_sub]:align-sub",
          "[&_sup]:text-[0.75em] [&_sup]:align-super",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1",
          "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1",
          "[&_li]:my-0.5",
          "[&_p]:my-1",
          "[&_.katex]:text-[115%]",
          className
        )}
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
    );
  }

  // Plain text with LaTeX support
  return (
    <div className={cn("space-y-1", className)}>
      {content.split("\n").map((line, i) => (
        <p key={i}>{renderPlainTextContent(line)}</p>
      ))}
    </div>
  );
}

/**
 * Inline version for single-line content.
 */
export function RichTextInline({ content, className }: RichTextPreviewProps) {
  const processedContent = useMemo(() => {
    if (!content) return "";

    if (isHtmlContent(content)) {
      return processHtmlWithLatex(content);
    }

    return null;
  }, [content]);

  if (!content) {
    return null;
  }

  if (processedContent !== null) {
    return (
      <span
        className={cn(
          "rich-text-inline",
          "[&_mark]:rounded [&_mark]:px-0.5",
          "[&_sub]:text-[0.75em] [&_sub]:align-sub",
          "[&_sup]:text-[0.75em] [&_sup]:align-super",
          "[&_.katex]:text-[115%]",
          className
        )}
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
    );
  }

  return <span className={className}>{renderPlainTextContent(content)}</span>;
}
