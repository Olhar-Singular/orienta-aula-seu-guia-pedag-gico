import { cn } from "@/lib/utils";

/**
 * Parses AI-generated adapted content and renders it with rich formatting.
 * Pre-processes inline content to ensure proper line breaks before parsing.
 */

type Props = {
  content: string;
  className?: string;
};

// Detect formula-like patterns: variables, equals signs, operators, units
const FORMULA_REGEX =
  /(?:^|\s)((?:[A-Za-zΔλπσμ][₀₁₂³²]?\s*=\s*[^\n,]{3,60})|(?:\b\d+(?:[.,]\d+)?\s*(?:m\/s²?|cm\/s|km\/h|m|cm|mm|Hz|s|kg|N|J|W|Pa|°C|K)\b))/g;

const BOLD_REGEX = /\*\*(.+?)\*\*/g;

// Clean up broken bold markers like "Período (T):** Use..." → "Período (T): Use..."
function cleanBrokenBold(text: string): string {
  // Remove orphan closing ** that have no opening match
  return text.replace(/(?<!\*\*[^*]*)\*\*(?![^*]*\*\*)/g, "");
}

function parseInlineFormatting(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let key = 0;

  // Clean broken bold markers first, then split
  const cleaned = text.replace(/\*\*/g, (_, offset, str) => {
    // Count ** occurrences - if odd number, remove the orphan
    const before = str.slice(0, offset);
    const count = (before.match(/\*\*/g) || []).length;
    return count % 2 === 0 ? "**" : "";
  });
  const boldParts = cleaned.split(BOLD_REGEX);
  for (let i = 0; i < boldParts.length; i++) {
    if (i % 2 === 1) {
      nodes.push(
        <strong key={key++} className="font-semibold text-foreground">
          {boldParts[i]}
        </strong>
      );
    } else {
      const part = boldParts[i];
      let lastIndex = 0;
      const formulaRegex = new RegExp(FORMULA_REGEX.source, "g");
      let match;
      while ((match = formulaRegex.exec(part)) !== null) {
        const before = part.slice(lastIndex, match.index);
        if (before) nodes.push(<span key={key++}>{before}</span>);
        nodes.push(
          <code
            key={key++}
            className="inline-block bg-primary/10 text-primary font-mono text-[0.92em] px-1.5 py-0.5 rounded-md mx-0.5 font-medium"
          >
            {match[1] || match[0].trim()}
          </code>
        );
        lastIndex = match.index + match[0].length;
      }
      const tail = part.slice(lastIndex);
      if (tail) nodes.push(<span key={key++}>{tail}</span>);
    }
  }

  return nodes;
}

// Detect alternative lines like: a) ..., b) ..., A) ..., B) ...
const ALT_LINE_REGEX = /^([a-eA-E])\)\s*(.+)/;
// Detect numbered question/item lines like: 1. ..., 2. ..., **1. ...
const QUESTION_LINE_REGEX = /^(?:\*{0,2})(\d+)[\.\)]\s*(?:\*{0,2})\s*(.+)/;
// Detect section-like headers (all caps or ending with :)
const HEADER_REGEX = /^([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]{4,}):?\s*$/;
// Detect markdown headers ## ...
const MD_HEADER_REGEX = /^#{1,3}\s+(.+)/;

type Block =
  | { type: "paragraph"; lines: string[] }
  | { type: "question"; number: string; text: string }
  | { type: "alternatives"; items: { letter: string; text: string }[] }
  | { type: "header"; text: string };

/**
 * Pre-process content to insert line breaks before numbered questions and alternatives
 * that are inline (not already on their own line).
 * This handles AI output like: "1. Question a) alt b) alt 2. Question..."
 */
function preProcessContent(content: string): string {
  let processed = content;

  // Insert newline before numbered questions that appear mid-text (e.g., "... text 1. Question")
  // But not at the start of a line
  processed = processed.replace(/([^\n])(\s*)(\*{0,2}\d+[\.\)]\s)/g, "$1\n$3");

  // Insert newline before alternatives mid-text (e.g., "... text a) alt b) alt")
  processed = processed.replace(/([^\n])(\s+)([a-eA-E]\)\s)/g, "$1\n$3");

  // Convert markdown headers to our format
  processed = processed.replace(/^#{1,3}\s+(.+)$/gm, "$1:");

  return processed;
}

function parseBlocks(content: string): Block[] {
  const processed = preProcessContent(content);
  const lines = processed.split("\n");
  const blocks: Block[] = [];
  let currentParagraph: string[] = [];
  let currentAlts: { letter: string; text: string }[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      blocks.push({ type: "paragraph", lines: [...currentParagraph] });
      currentParagraph = [];
    }
  };

  const flushAlts = () => {
    if (currentAlts.length > 0) {
      blocks.push({ type: "alternatives", items: [...currentAlts] });
      currentAlts = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed === "---") {
      flushAlts();
      flushParagraph();
      continue;
    }

    // Check for markdown header
    const mdMatch = trimmed.match(MD_HEADER_REGEX);
    if (mdMatch) {
      flushAlts();
      flushParagraph();
      blocks.push({ type: "header", text: mdMatch[1].replace(/:$/, "") });
      continue;
    }

    // Check for all-caps header
    const headerMatch = trimmed.match(HEADER_REGEX);
    if (headerMatch) {
      flushAlts();
      flushParagraph();
      blocks.push({ type: "header", text: trimmed.replace(/:$/, "") });
      continue;
    }

    // Check for numbered question
    const qMatch = trimmed.match(QUESTION_LINE_REGEX);
    if (qMatch) {
      flushAlts();
      flushParagraph();
      blocks.push({ type: "question", number: qMatch[1], text: qMatch[2] });
      continue;
    }

    // Check for alternative
    const altMatch = trimmed.match(ALT_LINE_REGEX);
    if (altMatch) {
      flushParagraph();
      currentAlts.push({ letter: altMatch[1].toLowerCase(), text: altMatch[2] });
      continue;
    }

    // Regular text
    flushAlts();
    currentParagraph.push(trimmed);
  }

  flushAlts();
  flushParagraph();

  return blocks;
}

export default function AdaptedContentRenderer({ content, className }: Props) {
  const blocks = parseBlocks(content);

  return (
    <div className={cn("space-y-3", className)}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "header":
            return (
              <h4
                key={i}
                className="text-xs font-bold uppercase tracking-wider text-primary border-b border-primary/20 pb-1 mt-1.5"
              >
                {block.text}
              </h4>
            );

          case "question":
            return (
              <div
                key={i}
                className="flex gap-2.5 items-start bg-muted/40 rounded-lg p-3 border-l-[3px] border-primary/50"
              >
                <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {block.number}
                </span>
                <p className="text-[13px] text-foreground leading-relaxed flex-1 pt-0.5">
                  {parseInlineFormatting(block.text)}
                </p>
              </div>
            );

          case "alternatives":
            return (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-5">
                {block.items.map((alt, j) => (
                  <div
                    key={j}
                    className="flex items-center gap-2 rounded-md border border-border/40 bg-card px-2.5 py-1.5"
                  >
                    <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-bold uppercase">
                      {alt.letter}
                    </span>
                    <span className="text-[13px] text-foreground leading-snug">
                      {parseInlineFormatting(alt.text)}
                    </span>
                  </div>
                ))}
              </div>
            );

          case "paragraph":
            return (
              <p key={i} className="text-[13px] text-foreground/90 leading-relaxed">
                {parseInlineFormatting(block.lines.join(" "))}
              </p>
            );
        }
      })}
    </div>
  );
}
