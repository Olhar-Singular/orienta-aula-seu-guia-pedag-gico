import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Footer, ImageRun, Math as DocxMath, MathRun, MathFraction, PageBreak } from "docx";

export type QuestionImageMap = Record<string, string[]>;

/**
 * Convert HTML content from the WYSIWYG editor to plain text for DOCX export.
 * Preserves text formatting intentions while stripping HTML tags.
 */
function htmlToPlainText(html: string): string {
  if (!html) return "";

  // Check if it's actually HTML
  if (!/<[^>]+>/.test(html)) return html;

  // Create a temporary element to parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Process the document to extract formatted text
  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    let result = "";

    // Process children first
    const childText = Array.from(node.childNodes)
      .map(processNode)
      .join("");

    // Handle different tags
    switch (tag) {
      case "br":
        return "\n";
      case "p":
      case "div":
        return childText + "\n";
      case "li":
        const parent = el.parentElement;
        if (parent?.tagName.toLowerCase() === "ul") {
          return "• " + childText + "\n";
        } else if (parent?.tagName.toLowerCase() === "ol") {
          const index = Array.from(parent.children).indexOf(el) + 1;
          return `${index}. ` + childText + "\n";
        }
        return childText + "\n";
      case "ul":
      case "ol":
        return childText;
      case "mark":
      case "span":
      case "strong":
      case "b":
      case "em":
      case "i":
      case "u":
      case "s":
      case "sub":
      case "sup":
        // For inline elements, just return the text content
        // In the future, we could track formatting and apply it via TextRun options
        return childText;
      default:
        return childText;
    }
  }

  let result = processNode(doc.body);

  // Clean up multiple newlines
  result = result.replace(/\n{3,}/g, "\n\n");
  result = result.trim();

  return result;
}

export type DocxExportData = {
  schoolName?: string;
  teacherName?: string;
  studentName?: string;
  activityType?: string;
  date: string;
  versionUniversal: string;
  versionDirected: string;
  strategiesApplied: string[];
  pedagogicalJustification: string;
  implementationTips: string[];
  questionImagesUniversal?: QuestionImageMap;
  questionImagesDirected?: QuestionImageMap;
};

const TYPE_LABELS: Record<string, string> = {
  prova: "Prova",
  exercicio: "Exercício",
  atividade_casa: "Atividade de Casa",
  trabalho: "Trabalho",
};

/**
 * Normalize LaTeX markup for DOCX export.
 * Strips $ delimiters, converts operators to readable symbols,
 * but preserves \frac (handled by parseLineWithFractions) and ^exponents (handled by parseExponents).
 * Note: HTML should be converted to plain text before calling this function.
 */
function normalizeLatexForDocx(text: string): string {
  let result = text;

  // Restore corrupted LaTeX from JSON streaming
  result = result
    .replace(/\x0Crac/g, "\\frac")
    .replace(/\x0C/g, "\\f")
    .replace(/\x08inom/g, "\\binom")
    .replace(/\x09frac/g, "\\tfrac")
    .replace(/\x09ext/g, "\\text");

  // Strip dollar-sign delimiters: $...$ → content
  result = result.replace(/\$\$([^$]+)\$\$/g, (_m, inner) => inner.trim());
  result = result.replace(/\$([^$]+)\$/g, (_m, inner) => inner.trim());

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

  // Clean up remaining backslash commands (except \frac, \tfrac, \dfrac which are handled later)
  result = result.replace(/\\(?![tdf]?frac)[a-zA-Z]+\{([^{}]*)\}/g, "$1");

  return result;
}

// Match \frac{...}{...}, \tfrac{...}{...}, \dfrac{...}{...}
const LATEX_FRAC_RE = /\\[tdf]?frac\{([^{}]+)\}\{([^{}]+)\}/;
// Match plain fractions like 7/8, 42/48, ?/48
const PLAIN_FRAC_RE = /(^|[\s=,(;+\-])(\?|\d+)\s*\/\s*(\?|\d+)(?=[\s=,);.\-+:]|$)/;

type LineChild = TextRun | DocxMath;

/**
 * Parse a line of text and return an array of TextRun and Math elements,
 * converting fraction patterns into proper OMML MathFraction objects.
 */
function parseLineWithFractions(line: string): LineChild[] {
  const children: LineChild[] = [];
  let remaining = line;

  while (remaining.length > 0) {
    // Try LaTeX fraction first
    const latexMatch = remaining.match(LATEX_FRAC_RE);
    // Try plain fraction
    const plainMatch = remaining.match(PLAIN_FRAC_RE);

    // Find the earliest match
    let match: RegExpMatchArray | null = null;
    let matchType: "latex" | "plain" | null = null;

    if (latexMatch && plainMatch) {
      if ((latexMatch.index ?? Infinity) <= (plainMatch.index ?? Infinity)) {
        match = latexMatch;
        matchType = "latex";
      } else {
        match = plainMatch;
        matchType = "plain";
      }
    } else if (latexMatch) {
      match = latexMatch;
      matchType = "latex";
    } else if (plainMatch) {
      match = plainMatch;
      matchType = "plain";
    }

    if (!match || match.index === undefined) {
      // No more fractions, add remaining text with superscript support
      if (remaining) children.push(...parseExponents(remaining));
      break;
    }

    if (matchType === "latex") {
      const before = remaining.slice(0, match.index);
      if (before) children.push(...parseExponents(before));

      const num = match[1];
      const den = match[2];
      children.push(
        new DocxMath({
          children: [
            new MathFraction({
              numerator: [new MathRun(num)],
              denominator: [new MathRun(den)],
            }),
          ],
        })
      );
      remaining = remaining.slice(match.index + match[0].length);
    } else {
      const prefix = match[1] || "";
      const before = remaining.slice(0, match.index) + prefix;
      if (before) children.push(...parseExponents(before));

      const num = match[2];
      const den = match[3];
      children.push(
        new DocxMath({
          children: [
            new MathFraction({
              numerator: [new MathRun(num)],
              denominator: [new MathRun(den)],
            }),
          ],
        })
      );
      remaining = remaining.slice(match.index + match[0].length);
    }
  }

  return children;
}

/**
 * Parse exponent patterns like ^2, ^{-3} and render as Word superscript TextRuns.
 */
const EXPONENT_RE = /\^[\{\(]?([0-9+\-]+)[\}\)]?/;

function parseExponents(text: string): TextRun[] {
  const runs: TextRun[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    const match = remaining.match(EXPONENT_RE);
    if (!match || match.index === undefined) {
      if (remaining) runs.push(new TextRun(remaining));
      break;
    }

    const before = remaining.slice(0, match.index);
    if (before) runs.push(new TextRun(before));

    runs.push(new TextRun({ text: match[1], superScript: true }));
    remaining = remaining.slice(match.index + match[0].length);
  }

  return runs;
}

/**
 * Convert a block of text into Paragraphs with inline fraction support.
 * Handles HTML content from the WYSIWYG editor.
 */
function textToParagraphs(text: string): Paragraph[] {
  // Convert HTML to plain text first
  const plainText = htmlToPlainText(text);
  return plainText.split("\n").map((rawLine) => {
    const line = normalizeLatexForDocx(rawLine);
    const children = parseLineWithFractions(line);
    return new Paragraph({ children });
  });
}

async function fetchImageAsBuffer(url: string): Promise<{ buffer: ArrayBuffer; width: number; height: number } | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const loaded = await new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = loaded.naturalWidth;
    canvas.height = loaded.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(loaded, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return null;

    const buffer = await blob.arrayBuffer();
    return { buffer, width: loaded.naturalWidth, height: loaded.naturalHeight };
  } catch {
    return null;
  }
}

export async function exportToDocx(data: DocxExportData) {
  const headerParts: string[] = [];
  if (data.schoolName) headerParts.push(data.schoolName);
  if (data.teacherName) headerParts.push(`Prof. ${data.teacherName}`);
  headerParts.push(data.date);

  const metaRows: Paragraph[] = [];
  if (data.activityType) {
    metaRows.push(new Paragraph({
      children: [new TextRun({ text: `Tipo: ${TYPE_LABELS[data.activityType] || data.activityType}`, bold: true, size: 22 })],
    }));
  }
  if (data.studentName) {
    metaRows.push(new Paragraph({
      children: [new TextRun({ text: `Aluno: ${data.studentName}`, bold: true, size: 22 })],
    }));
  }

  // Fetch images per version
  async function fetchImageParagraphs(urls: string[]): Promise<Paragraph[]> {
    const paragraphs: Paragraph[] = [];
    for (const imgUrl of urls) {
      const imgData = await fetchImageAsBuffer(imgUrl);
      if (imgData) {
        const maxWidth = 380;
        const scale = Math.min(0.75, maxWidth / imgData.width);
        const w = Math.round(imgData.width * scale);
        const h = Math.round(imgData.height * scale);
        paragraphs.push(new Paragraph({
          children: [
            new ImageRun({
              data: imgData.buffer,
              transformation: { width: w, height: h },
              type: "png",
            }),
          ],
        }));
      }
    }
    return paragraphs;
  }

  // Build paragraphs with per-question images inserted inline
  const QUESTION_RE = /^(?:\*{0,2})(\d+)[\.\)]\s/;

  async function textToParagraphsWithImages(
    text: string,
    qImages?: QuestionImageMap
  ): Promise<Paragraph[]> {
    // First convert HTML to plain text, then split by lines
    const plainText = htmlToPlainText(text);
    const lines = plainText.split("\n");
    const result: Paragraph[] = [];
    let currentQNum: string | undefined;

    for (const rawLine of lines) {
      const line = normalizeLatexForDocx(rawLine);
      const qMatch = rawLine.trim().match(QUESTION_RE);

      // If we hit a new question, flush images for the previous question
      if (qMatch) {
        if (currentQNum && qImages?.[currentQNum]) {
          const imgs = await fetchImageParagraphs(qImages[currentQNum]);
          result.push(...imgs);
        }
        currentQNum = qMatch[1];
      }

      const children = parseLineWithFractions(line);
      result.push(new Paragraph({ children }));
    }

    // Flush images for the last question
    if (currentQNum && qImages?.[currentQNum]) {
      const imgs = await fetchImageParagraphs(qImages[currentQNum]);
      result.push(...imgs);
    }

    return result;
  }

  const universalParagraphs = await textToParagraphsWithImages(
    data.versionUniversal,
    data.questionImagesUniversal
  );
  const directedParagraphs = await textToParagraphsWithImages(
    data.versionDirected,
    data.questionImagesDirected
  );

  const doc = new Document({
    sections: [
      {
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Gerado por Olhar Singular — Ferramenta pedagógica. Não realiza diagnóstico.", italics: true, size: 16, color: "999999" }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: headerParts.join(" • "), size: 18, color: "888888" })],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "Atividade Adaptada", heading: HeadingLevel.HEADING_1 }),
          ...metaRows,
          new Paragraph({ text: "" }),
          // Universal
          new Paragraph({ text: "Versão Universal (Design Universal para Aprendizagem)", heading: HeadingLevel.HEADING_2 }),
          ...universalParagraphs,
          // Page break before Directed version
          new Paragraph({ children: [new PageBreak()] }),
          // Directed
          new Paragraph({ text: "Versão Direcionada", heading: HeadingLevel.HEADING_2 }),
          ...directedParagraphs,
          // Page break before Strategies/Justification/Tips
          new Paragraph({ children: [new PageBreak()] }),
          // Strategies
          new Paragraph({ text: "Estratégias Aplicadas", heading: HeadingLevel.HEADING_2 }),
          ...data.strategiesApplied.map((s) => new Paragraph({
            children: [new TextRun({ text: `• ${htmlToPlainText(s)}` })],
          })),
          new Paragraph({ text: "" }),
          // Justification
          new Paragraph({ text: "Justificativa Pedagógica", heading: HeadingLevel.HEADING_2 }),
          ...textToParagraphs(data.pedagogicalJustification),
          new Paragraph({ text: "" }),
          // Tips
          new Paragraph({ text: "Dicas de Implementação", heading: HeadingLevel.HEADING_2 }),
          ...data.implementationTips.map((t, i) => new Paragraph({
            children: [new TextRun({ text: `${i + 1}. ${htmlToPlainText(t)}` })],
          })),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `adaptacao-${Date.now()}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
