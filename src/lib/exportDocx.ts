import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Footer, ImageRun, Math as DocxMath, MathRun, MathFraction } from "docx";

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
  imagesUniversal?: string[];
  imagesDirected?: string[];
};

const TYPE_LABELS: Record<string, string> = {
  prova: "Prova",
  exercicio: "Exercício",
  atividade_casa: "Atividade de Casa",
  trabalho: "Trabalho",
};

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
      // No more fractions, add remaining text
      if (remaining) children.push(new TextRun(remaining));
      break;
    }

    if (matchType === "latex") {
      // Text before the match
      const before = remaining.slice(0, match.index);
      if (before) children.push(new TextRun(before));

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
      // Plain fraction: group 1 is prefix, group 2 is num, group 3 is den
      const prefix = match[1] || "";
      const before = remaining.slice(0, match.index) + prefix;
      if (before) children.push(new TextRun(before));

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
 * Convert a block of text into Paragraphs with inline fraction support.
 */
function textToParagraphs(text: string): Paragraph[] {
  return text.split("\n").map((line) => {
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
        const maxWidth = 500;
        const scale = Math.min(1, maxWidth / imgData.width);
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

  const universalImageParagraphs = await fetchImageParagraphs(data.imagesUniversal || []);
  const directedImageParagraphs = await fetchImageParagraphs(data.imagesDirected || []);

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
          ...textToParagraphs(data.versionUniversal),
          ...universalImageParagraphs,
          new Paragraph({ text: "" }),
          // Directed
          new Paragraph({ text: "Versão Direcionada", heading: HeadingLevel.HEADING_2 }),
          ...textToParagraphs(data.versionDirected),
          ...directedImageParagraphs,
          new Paragraph({ text: "" }),
          // Strategies
          new Paragraph({ text: "Estratégias Aplicadas", heading: HeadingLevel.HEADING_2 }),
          ...data.strategiesApplied.map((s) => new Paragraph({
            children: [new TextRun({ text: `• ${s}` })],
          })),
          new Paragraph({ text: "" }),
          // Justification
          new Paragraph({ text: "Justificativa Pedagógica", heading: HeadingLevel.HEADING_2 }),
          ...textToParagraphs(data.pedagogicalJustification),
          new Paragraph({ text: "" }),
          // Tips
          new Paragraph({ text: "Dicas de Implementação", heading: HeadingLevel.HEADING_2 }),
          ...data.implementationTips.map((t, i) => new Paragraph({
            children: [new TextRun({ text: `${i + 1}. ${t}` })],
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
