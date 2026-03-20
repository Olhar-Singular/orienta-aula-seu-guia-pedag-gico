import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Pencil, X, Trash2 } from "lucide-react";
import katex from "katex";
import TextBlockEditModal from "./TextBlockEditModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import "katex/dist/katex.min.css";
import {
  parseAdaptedQuestions,
  type ParsedAdaptedQuestion,
} from "@/lib/adaptedQuestions";

/**
 * Parses AI-generated adapted content and renders it with rich formatting.
 * Pre-processes inline content to ensure proper line breaks before parsing.
 */

type Props = {
  content: string;
  className?: string;
  questionImages?: Record<string, string[]>;
  onEditQuestion?: (question: ParsedAdaptedQuestion) => void;
  onContentChange?: (newContent: string) => void;
};

/**
 * Maps common Unicode math symbols to LaTeX equivalents.
 */
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
  "°C": "°\\text{C}",
  "°F": "°\\text{F}",
};

function unicodeToLatex(formula: string): string {
  let latex = formula;
  for (const [unicode, tex] of Object.entries(UNICODE_TO_LATEX)) {
    latex = latex.split(unicode).join(tex);
  }

  // Convert plain fractions to inline LaTeX (keeps them compact and readable)
  latex = latex.replace(
    /(^|[\s=,(;])((?:\?|\d+)\s*\/\s*(?:\?|\d+))(?!\s*\/\s*\d)/g,
    (_match, prefix: string, fraction: string) => {
      const [num, den] = fraction.split("/").map((part) => part.trim());
      return `${prefix}\\tfrac{${num}}{${den}}`;
    }
  );

  // Wrap units like m/s², km/h etc in \text{}
  latex = latex.replace(
    /\b(m\/s²?|cm\/s|km\/h|Hz|kg|Pa|mol|atm)\b/g,
    "\\text{$1}"
  );
  return latex.trim();
}

/**
 * Detects formula-like patterns and renders them with KaTeX.
 * Supports explicit LaTeX fractions (\frac{}{}) and plain fractions (23/24).
 */
const FORMULA_REGEX =
  /(?:^|\s)((?:\\(?:frac|tfrac|dfrac)\{[^{}\n]+\}\{[^{}\n]+\})|(?:(?:\?|\d+)\s*\/\s*(?:\?|\d+)(?!\s*\/\s*\d))|(?:[A-Za-zΔλπσμ][₀₁₂³²]?\s*=\s*[^\n,]{3,60})|(?:Δ[A-Za-z]\s*[\/=][^\n,]{2,40})|(?:\b\d+(?:[.,]\d+)?\s*(?:m\/s²?|cm\/s|km\/h|m|cm|mm|Hz|s|kg|N|J|W|Pa|°C|°F|K)\b))/g;

/**
 * Restores LaTeX commands that were corrupted by JSON escape sequences.
 * In JSON, \f = form feed, \t = tab, \n = newline, \r = carriage return, \b = backspace.
 * When AI outputs \frac, \tfrac, etc., JSON parsing turns \f into U+000C, \t into tab, etc.
 */
function restoreCorruptedLatex(text: string): string {
  return text
    .replace(/\x0Crac/g, "\\frac")       // form feed + rac → \frac
    .replace(/\x0C/g, "\\f")             // any remaining form feeds
    .replace(/\x08inom/g, "\\binom")     // backspace + inom → \binom
    .replace(/\x09frac/g, "\\tfrac")     // tab + frac → \tfrac
    .replace(/\x09ext/g, "\\text");      // tab + ext → \text
}

function KaTeXInline({ formula }: { formula: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(unicodeToLatex(formula), ref.current, {
        throwOnError: false,
        displayMode: false,
        strict: false,
      });
    } catch {
      if (ref.current) ref.current.textContent = formula;
    }
  }, [formula]);

  return (
    <span
      ref={ref}
      className="inline-flex mx-0.5 align-middle whitespace-nowrap text-[115%]"
    />
  );
}

function parseInlineFormatting(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let key = 0;

  // Bold markers already stripped in preProcessContent
  let cleaned = text;

  // First, handle $...$ delimited LaTeX blocks — render them directly
  const dollarParts = cleaned.split(/\$([^$]+)\$/g);
  // dollarParts: [text, latex, text, latex, text, ...]
  for (let i = 0; i < dollarParts.length; i++) {
    const part = dollarParts[i];
    if (!part) continue;

    if (i % 2 === 1) {
      // This is a LaTeX expression inside $...$
      nodes.push(<KaTeXInline key={key++} formula={part} />);
    } else {
      // Regular text — parse with FORMULA_REGEX for non-delimited formulas
      let lastIndex = 0;
      const formulaRegex = new RegExp(FORMULA_REGEX.source, "g");
      let match;
      while ((match = formulaRegex.exec(part)) !== null) {
        const before = part.slice(lastIndex, match.index);
        if (before) nodes.push(<span key={key++}>{before}</span>);
        const formulaText = (match[1] || match[0]).trim();
        nodes.push(<KaTeXInline key={key++} formula={formulaText} />);
        lastIndex = match.index + match[0].length;
      }
      const tail = part.slice(lastIndex);
      if (tail) nodes.push(<span key={key++}>{tail}</span>);
    }
  }

  return nodes;
}

// Detect alternative lines: only a-e (standard exam answers), must start at line beginning
const ALT_LINE_REGEX = /^([a-zA-Z])\)\s+(.+)/;
// Detect numbered question/item lines: must start with number + "." + space + text starting with a letter/word
// Avoids matching bare numbers or math like "= 42/48"
const QUESTION_LINE_REGEX = /^(\d+)[\.\)]\s*([A-Za-zÀ-ú"(].+)/;
// Detect section-like headers (all caps or ending with :)
const HEADER_REGEX = /^([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]{4,}):?\s*$/;
// Detect markdown headers ## ...
const MD_HEADER_REGEX = /^#{1,3}\s+(.+)/;
// Detect bullet list items: * item, - item, • item
const BULLET_REGEX = /^(?:[*\-•])\s+(.+)/;

type Block =
  | { type: "paragraph"; lines: string[] }
  | { type: "question"; number: string; text: string }
  | { type: "alternatives"; items: { letter: string; text: string }[] }
  | { type: "header"; text: string }
  | { type: "bulletList"; items: string[] };

/**
 * Pre-process content to insert line breaks before numbered questions and alternatives
 * that are inline (not already on their own line).
 */
function preProcessContent(content: string): string {
  let processed = restoreCorruptedLatex(content);

  // Strip bold and italic markers early so block-level regexes work on clean text
  processed = processed.replace(/\*\*/g, "");
  processed = processed.replace(/_([^_\n]+)_/g, "$1");
  processed = processed.replace(/\*([^*\n]+)\*/g, "$1");

  // Split numbered questions that are inline
  processed = processed.replace(
    /([^\n\/x*+\-=()\d])(\s+)(\d+[\.\)]\s+[A-Za-zÀ-ú])/g,
    "$1\n$3"
  );
  // Split alternatives that are inline
  processed = processed.replace(
    /([^\n\/x*+\-=()\d])(\s+)([a-eA-E]\)\s+[A-Za-zÀ-ú])/g,
    "$1\n$3"
  );
  // Split bullet items (* item, - item, • item) that are inline
  processed = processed.replace(
    /([^\n])(\s+)([*\-•]\s+[A-Za-zÀ-ú])/g,
    "$1\n$3"
  );
  // Convert "Passo N:" / "Etapa N:" style labels to recognisable headers
  processed = processed.replace(
    /^([*\-•]\s+)?(Passo|Etapa)\s+(\d+)\s*[:\-–]\s*/gim,
    "$3. "
  );

  processed = processed.replace(/^#{1,3}\s+(.+)$/gm, "$1:");
  return processed;
}

function parseBlocks(content: string): Block[] {
  const processed = preProcessContent(content);
  const lines = processed.split("\n");
  const blocks: Block[] = [];
  let currentParagraph: string[] = [];
  let currentAlts: { letter: string; text: string }[] = [];
  let currentBullets: string[] = [];
  let currentQuestion: { number: string; textLines: string[] } | null = null;

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

  const flushBullets = () => {
    if (currentBullets.length > 0) {
      blocks.push({ type: "bulletList", items: [...currentBullets] });
      currentBullets = [];
    }
  };

  const flushQuestion = () => {
    if (currentQuestion) {
      blocks.push({
        type: "question",
        number: currentQuestion.number,
        text: currentQuestion.textLines.join("\n"),
      });
      currentQuestion = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed === "---") {
      flushAlts();
      flushBullets();
      flushQuestion();
      flushParagraph();
      continue;
    }

    const mdMatch = trimmed.match(MD_HEADER_REGEX);
    if (mdMatch) {
      flushAlts();
      flushBullets();
      flushQuestion();
      flushParagraph();
      blocks.push({ type: "header", text: mdMatch[1].replace(/:$/, "") });
      continue;
    }

    const headerMatch = trimmed.match(HEADER_REGEX);
    if (headerMatch) {
      flushAlts();
      flushBullets();
      flushQuestion();
      flushParagraph();
      blocks.push({ type: "header", text: trimmed.replace(/:$/, "") });
      continue;
    }

    const qMatch = trimmed.match(QUESTION_LINE_REGEX);
    if (qMatch) {
      flushAlts();
      flushBullets();
      flushQuestion();
      flushParagraph();
      currentQuestion = { number: qMatch[1], textLines: [qMatch[2]] };
      continue;
    }

    const altMatch = trimmed.match(ALT_LINE_REGEX);
    if (altMatch) {
      flushQuestion();
      flushBullets();
      flushParagraph();
      currentAlts.push({ letter: altMatch[1].toLowerCase(), text: altMatch[2] });
      continue;
    }

    const bulletMatch = trimmed.match(BULLET_REGEX);
    if (bulletMatch) {
      flushAlts();
      flushQuestion();
      flushParagraph();
      currentBullets.push(bulletMatch[1]);
      continue;
    }

    // Regular text — if inside a question context, accumulate as continuation
    if (currentQuestion && currentAlts.length === 0) {
      currentQuestion.textLines.push(trimmed);
      continue;
    }

    flushAlts();
    flushBullets();
    flushQuestion();
    currentParagraph.push(trimmed);
  }

  flushAlts();
  flushBullets();
  flushQuestion();
  flushParagraph();

  return blocks;
}

export default function AdaptedContentRenderer({
  content,
  className,
  questionImages,
  onEditQuestion,
  onContentChange,
}: Props) {
  const blocks = parseBlocks(content);
  const parsedQuestions = parseAdaptedQuestions(content);
  const questionByNumber = new Map(parsedQuestions.map((question) => [question.number, question]));

   const [editingBlock, setEditingBlock] = useState<{ lines: string[]; type: "paragraph" | "bulletList" } | null>(null);
  const [deleteQuestionNumber, setDeleteQuestionNumber] = useState<string | null>(null);

  const handleDeleteParagraph = (paragraphLines: string[]) => {
    if (!onContentChange) return;
    const lines = content.split("\n");
    const targetTexts = new Set(paragraphLines.map((l) => l.replace(/\*\*/g, "").trim()).filter(Boolean));
    const filtered = lines.filter((line) => {
      const cleaned = line.replace(/\*\*/g, "").trim();
      return !targetTexts.has(cleaned);
    });
    onContentChange(filtered.join("\n").replace(/\n{3,}/g, "\n\n").trim());
  };

  const confirmDeleteQuestion = () => {
    if (!onContentChange || !deleteQuestionNumber) return;
    const q = questionByNumber.get(deleteQuestionNumber);
    if (!q) return;
    const normalized = content.replace(/([^\n])(\s*)(\*{0,2}\d+[\.\)]\s)/g, "$1\n$3")
      .replace(/([^\n])(\s+)([a-eA-E]\)\s)/g, "$1\n$3");
    const lines = normalized.split("\n");
    lines.splice(q.startLine, q.endLine - q.startLine + 1);
    onContentChange(lines.join("\n").replace(/\n{3,}/g, "\n\n").trim());
    setDeleteQuestionNumber(null);
  };

  const handleEditBlockSave = (newText: string) => {
    if (!onContentChange || !editingBlock) return;
    const lines = content.split("\n");
    const targetTexts = editingBlock.lines.map((l) => l.replace(/\*\*/g, "").trim()).filter(Boolean);

    // Find the first matching line index
    let startIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      const cleaned = lines[i].replace(/\*\*/g, "").trim();
      if (cleaned === targetTexts[0]) {
        startIdx = i;
        break;
      }
    }

    if (startIdx === -1) return;

    // Count how many consecutive lines match
    let matchCount = 0;
    for (let i = 0; i < targetTexts.length && startIdx + i < lines.length; i++) {
      const cleaned = lines[startIdx + i].replace(/\*\*/g, "").trim();
      if (cleaned === targetTexts[i]) matchCount++;
      else break;
    }

    const newLines = newText.split("\n").map((l) => {
      if (editingBlock.type === "bulletList" && l.trim() && !l.trim().startsWith("- ") && !l.trim().startsWith("* ") && !l.trim().startsWith("• ")) {
        return `- ${l.trim()}`;
      }
      return l;
    });

    lines.splice(startIdx, matchCount, ...newLines);
    onContentChange(lines.join("\n").replace(/\n{3,}/g, "\n\n").trim());
    setEditingBlock(null);
  };

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

          case "question": {
            const question = questionByNumber.get(block.number);
            const images = questionImages?.[block.number] || [];

            return (
              <div key={i} className="space-y-2">
                <div className="flex gap-2.5 items-start bg-muted/40 rounded-lg p-3 border-l-[3px] border-primary/50">
                  <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {block.number}
                  </span>
                  <div className="text-[13px] text-foreground leading-relaxed flex-1 pt-0.5 space-y-1">
                    {block.text.split("\n").map((line, li) => (
                      <p key={li}>{parseInlineFormatting(line)}</p>
                    ))}
                  </div>
                  {onEditQuestion && question && (
                    <div className="flex gap-0.5 shrink-0">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => onEditQuestion({ ...question, text: block.text })}
                        aria-label={`Editar questão ${block.number}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      {onContentChange && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteQuestion(block.number)}
                          aria-label={`Excluir questão ${block.number}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {images.length > 0 && (
                  <div className="pl-8 flex flex-wrap gap-2">
                    {images.map((imageUrl, imageIndex) => (
                      <img
                        key={`${block.number}-${imageIndex}`}
                        src={imageUrl}
                        alt={`Imagem da questão ${block.number}`}
                        className="max-h-40 rounded-lg border border-border/50 object-contain"
                        loading="lazy"
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          }

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

          case "bulletList":
            return (
              <div key={i} className="flex items-start gap-2 group">
                <ul className="space-y-1.5 pl-5 flex-1">
                  {block.items.map((item, j) => (
                    <li
                      key={j}
                      className="flex items-start gap-2 text-[13px] text-foreground/90 leading-relaxed"
                    >
                      <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60" />
                      <span>{parseInlineFormatting(item)}</span>
                    </li>
                  ))}
                </ul>
                {onContentChange && (
                  <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-muted-foreground hover:text-primary"
                      onClick={() => setEditingBlock({ lines: block.items, type: "bulletList" })}
                      aria-label="Editar lista"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteParagraph(block.items)}
                      aria-label="Remover lista"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );

          case "paragraph":
            return (
              <div key={i} className="flex items-start gap-2 group">
                <p className="text-[13px] text-foreground/90 leading-relaxed flex-1">
                  {parseInlineFormatting(block.lines.join(" "))}
                </p>
                {onContentChange && (
                  <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-muted-foreground hover:text-primary"
                      onClick={() => setEditingBlock({ lines: block.lines, type: "paragraph" })}
                      aria-label="Editar parágrafo"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteParagraph(block.lines)}
                      aria-label="Remover parágrafo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
        }
      })}

      <TextBlockEditModal
        open={!!editingBlock}
        onOpenChange={(open) => { if (!open) setEditingBlock(null); }}
        initialText={editingBlock ? editingBlock.lines.join("\n") : ""}
        onSave={handleEditBlockSave}
      />
    </div>
  );
}
