import jsPDF from "jspdf";

export type ExportData = {
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
};

const TYPE_LABELS: Record<string, string> = {
  prova: "Prova",
  exercicio: "Exercício",
  atividade_casa: "Atividade de Casa",
  trabalho: "Trabalho",
};

export function exportToPdf(data: ExportData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const addPageIfNeeded = (height: number) => {
    if (y + height > 270) {
      doc.addPage();
      y = 20;
    }
  };

  // Header
  doc.setFontSize(8);
  doc.setTextColor(120);
  const headerParts: string[] = [];
  if (data.schoolName) headerParts.push(data.schoolName);
  if (data.teacherName) headerParts.push(`Prof. ${data.teacherName}`);
  headerParts.push(data.date);
  doc.text(headerParts.join(" • "), margin, y);
  y += 10;

  // Title
  doc.setFontSize(18);
  doc.setTextColor(30);
  doc.text("Atividade Adaptada", margin, y);
  y += 8;

  // Meta
  doc.setFontSize(10);
  doc.setTextColor(80);
  if (data.activityType) {
    doc.text(`Tipo: ${TYPE_LABELS[data.activityType] || data.activityType}`, margin, y);
    y += 5;
  }
  if (data.studentName) {
    doc.text(`Aluno: ${data.studentName}`, margin, y);
    y += 5;
  }
  y += 5;

  // Section helper
  const addSection = (title: string, content: string) => {
    addPageIfNeeded(20);
    doc.setFontSize(13);
    doc.setTextColor(40);
    doc.text(title, margin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(60);
    const lines = doc.splitTextToSize(content, contentWidth);
    for (const line of lines) {
      addPageIfNeeded(6);
      doc.text(line, margin, y);
      y += 5;
    }
    y += 5;
  };

  addSection("Versão Universal (Design Universal para Aprendizagem)", data.versionUniversal);
  addSection("Versão Direcionada", data.versionDirected);

  // Strategies
  addPageIfNeeded(15);
  doc.setFontSize(13);
  doc.setTextColor(40);
  doc.text("Estratégias Aplicadas", margin, y);
  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(60);
  data.strategiesApplied.forEach((s) => {
    addPageIfNeeded(6);
    doc.text(`• ${s}`, margin + 3, y);
    y += 5;
  });
  y += 5;

  addSection("Justificativa Pedagógica", data.pedagogicalJustification);

  // Tips
  addPageIfNeeded(15);
  doc.setFontSize(13);
  doc.setTextColor(40);
  doc.text("Dicas de Implementação", margin, y);
  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(60);
  data.implementationTips.forEach((t, i) => {
    const tipLines = doc.splitTextToSize(`${i + 1}. ${t}`, contentWidth - 5);
    for (const line of tipLines) {
      addPageIfNeeded(6);
      doc.text(line, margin + 3, y);
      y += 5;
    }
  });

  // Footer
  y += 10;
  addPageIfNeeded(10);
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Gerado por Orienta Aula — Ferramenta pedagógica. Não realiza diagnóstico.", margin, y);

  doc.save(`adaptacao-${Date.now()}.pdf`);
}
