import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Footer, ImageRun } from "docx";

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
  images?: string[];
};

const TYPE_LABELS: Record<string, string> = {
  prova: "Prova",
  exercicio: "Exercício",
  atividade_casa: "Atividade de Casa",
  trabalho: "Trabalho",
};

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

  // Fetch images
  const imageParagraphs: Paragraph[] = [];
  if (data.images && data.images.length > 0) {
    for (const imgUrl of data.images) {
      const imgData = await fetchImageAsBuffer(imgUrl);
      if (imgData) {
        // Scale to max 500px wide, maintaining aspect ratio
        const maxWidth = 500;
        const scale = Math.min(1, maxWidth / imgData.width);
        const w = Math.round(imgData.width * scale);
        const h = Math.round(imgData.height * scale);

        imageParagraphs.push(new Paragraph({
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
  }

  const doc = new Document({
    sections: [
      {
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Gerado por Orienta Aula — Ferramenta pedagógica. Não realiza diagnóstico.", italics: true, size: 16, color: "999999" }),
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
          ...data.versionUniversal.split("\n").map((line) => new Paragraph({ text: line })),
          ...imageParagraphs,
          new Paragraph({ text: "" }),
          // Directed
          new Paragraph({ text: "Versão Direcionada", heading: HeadingLevel.HEADING_2 }),
          ...data.versionDirected.split("\n").map((line) => new Paragraph({ text: line })),
          ...imageParagraphs,
          new Paragraph({ text: "" }),
          // Strategies
          new Paragraph({ text: "Estratégias Aplicadas", heading: HeadingLevel.HEADING_2 }),
          ...data.strategiesApplied.map((s) => new Paragraph({
            children: [new TextRun({ text: `• ${s}` })],
          })),
          new Paragraph({ text: "" }),
          // Justification
          new Paragraph({ text: "Justificativa Pedagógica", heading: HeadingLevel.HEADING_2 }),
          ...data.pedagogicalJustification.split("\n").map((line) => new Paragraph({ text: line })),
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
