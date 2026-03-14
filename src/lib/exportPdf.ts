import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
  /** Optional image URLs to include below each version */
  images?: string[];
};

const TYPE_LABELS: Record<string, string> = {
  prova: "Prova",
  exercicio: "Exercício",
  atividade_casa: "Atividade de Casa",
  trabalho: "Trabalho",
  resumo: "Resumo",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtml(text: string): string {
  return escapeHtml(text)
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "<br/>";
      return `<p style="margin:0 0 4px 0;line-height:1.6;">${trimmed}</p>`;
    })
    .join("");
}

const BASE_STYLE = `font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#1a1a1a;padding:12px 28px;max-width:700px;font-size:13px;line-height:1.6;background:#fff;`;

function buildSections(data: ExportData): string[] {
  const headerParts: string[] = [];
  if (data.schoolName) headerParts.push(escapeHtml(data.schoolName));
  if (data.teacherName) headerParts.push(`Prof. ${escapeHtml(data.teacherName)}`);
  headerParts.push(data.date);

  const imagesHtml =
    data.images && data.images.length > 0
      ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin:8px 0;">
          ${data.images.map((url) => `<img src="${url}" crossorigin="anonymous" style="max-height:180px;border-radius:6px;border:1px solid #ddd;object-fit:contain;" />`).join("")}
        </div>`
      : "";

  const sections: string[] = [];

  // Section 0: Header + Title + Meta
  sections.push(`
    <div style="${BASE_STYLE}">
      <div style="color:#888;font-size:11px;margin-bottom:16px;">${headerParts.join(" • ")}</div>
      <h1 style="font-size:22px;font-weight:700;margin:0 0 8px 0;color:#1a1a1a;">Atividade Adaptada</h1>
      ${data.activityType ? `<p style="font-size:12px;color:#555;margin:0 0 2px 0;"><strong>Tipo:</strong> ${escapeHtml(TYPE_LABELS[data.activityType] || data.activityType)}</p>` : ""}
      ${data.studentName ? `<p style="font-size:12px;color:#555;margin:0 0 10px 0;"><strong>Aluno:</strong> ${escapeHtml(data.studentName)}</p>` : ""}
    </div>
  `);

  // Split version text into paragraphs/questions for granular page breaks
  const splitVersionIntoParts = (text: string): string[] => {
    const lines = text.split("\n");
    const parts: string[] = [];
    let currentPart: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // Start a new part on question numbers or section headers (BLOCO, QUESTÃO, numbered items like "1.", "2.")
      const isNewBlock = /^(BLOCO\s|QUEST[ÃA]O\s|\d+[\.\)]\s)/i.test(trimmed);
      if (isNewBlock && currentPart.length > 0) {
        parts.push(currentPart.join("\n"));
        currentPart = [];
      }
      currentPart.push(line);
    }
    if (currentPart.length > 0) {
      parts.push(currentPart.join("\n"));
    }
    return parts;
  };

  // Section 1: Versão Universal heading
  sections.push(`
    <div style="${BASE_STYLE}">
      <h2 style="font-size:15px;font-weight:600;color:#0d7377;margin:0 0 8px 0;border-bottom:2px solid #0d737733;padding-bottom:4px;">Versão Universal (Design Universal para Aprendizagem)</h2>
    </div>
  `);

  // Section 1.x: Universal version parts
  const universalParts = splitVersionIntoParts(data.versionUniversal);
  for (const part of universalParts) {
    sections.push(`
      <div style="${BASE_STYLE}">
        <div>${textToHtml(part)}</div>
      </div>
    `);
  }

  // Images after universal version
  if (imagesHtml) {
    sections.push(`<div style="${BASE_STYLE}">${imagesHtml}</div>`);
  }

  // Section 2: Versão Direcionada heading
  sections.push(`
    <div style="${BASE_STYLE}">
      <h2 style="font-size:15px;font-weight:600;color:#0d7377;margin:0 0 8px 0;border-bottom:2px solid #0d737733;padding-bottom:4px;">Versão Direcionada</h2>
    </div>
  `);

  // Section 2.x: Directed version parts
  const directedParts = splitVersionIntoParts(data.versionDirected);
  for (const part of directedParts) {
    sections.push(`
      <div style="${BASE_STYLE}">
        <div>${textToHtml(part)}</div>
      </div>
    `);
  }

  if (imagesHtml) {
    sections.push(`<div style="${BASE_STYLE}">${imagesHtml}</div>`);
  }

  // Section 3: Estratégias
  sections.push(`
    <div style="${BASE_STYLE}">
      <h2 style="font-size:15px;font-weight:600;color:#0d7377;margin:0 0 8px 0;border-bottom:2px solid #0d737733;padding-bottom:4px;">Estratégias Aplicadas</h2>
      <ul style="margin:0;padding-left:18px;">
        ${data.strategiesApplied.map((s) => `<li style="margin-bottom:3px;">${escapeHtml(s)}</li>`).join("")}
      </ul>
    </div>
  `);

  // Section 4: Justificativa
  sections.push(`
    <div style="${BASE_STYLE}">
      <h2 style="font-size:15px;font-weight:600;color:#0d7377;margin:0 0 8px 0;border-bottom:2px solid #0d737733;padding-bottom:4px;">Justificativa Pedagógica</h2>
      <div>${textToHtml(data.pedagogicalJustification)}</div>
    </div>
  `);

  // Section 5: Dicas
  sections.push(`
    <div style="${BASE_STYLE}">
      <h2 style="font-size:15px;font-weight:600;color:#0d7377;margin:0 0 8px 0;border-bottom:2px solid #0d737733;padding-bottom:4px;">Dicas de Implementação</h2>
      <ol style="margin:0;padding-left:18px;">
        ${data.implementationTips.map((t) => `<li style="margin-bottom:4px;">${escapeHtml(t)}</li>`).join("")}
      </ol>
    </div>
  `);

  // Section 6: Footer
  sections.push(`
    <div style="${BASE_STYLE}">
      <div style="margin-top:8px;padding-top:10px;border-top:1px solid #eee;font-size:10px;color:#999;font-style:italic;">
        Gerado por Orienta Aula — Ferramenta pedagógica. Não realiza diagnóstico. A decisão final é sempre do profissional.
      </div>
    </div>
  `);

  return sections;
}

export async function exportToPdf(data: ExportData) {
  const sections = buildSections(data);

  // Create off-screen container
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "700px";
  container.style.background = "#fff";
  document.body.appendChild(container);

  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;
  const MARGIN_MM = 12;
  const CONTENT_WIDTH_MM = A4_WIDTH_MM - MARGIN_MM * 2;
  const USABLE_HEIGHT_MM = A4_HEIGHT_MM - MARGIN_MM * 2;
  const SECTION_GAP_MM = 1;

  const pdf = new jsPDF("p", "mm", "a4");
  let currentY = MARGIN_MM;

  try {
    for (const sectionHtml of sections) {
      // Render this section
      container.innerHTML = sectionHtml;

      // Wait for images
      const imgs = container.querySelectorAll("img");
      if (imgs.length > 0) {
        await Promise.all(
          Array.from(imgs).map(
            (img) =>
              new Promise<void>((resolve) => {
                if (img.complete) return resolve();
                img.onload = () => resolve();
                img.onerror = () => resolve();
              })
          )
        );
      }

      const canvas = await html2canvas(container, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const scaledW = canvas.width / 1.5;
      const scaledH = canvas.height / 1.5;
      const scaleFactor = CONTENT_WIDTH_MM / scaledW;
      const heightMM = scaledH * scaleFactor;

      // Skip empty sections
      if (heightMM < 1) continue;

      const remainingSpace = USABLE_HEIGHT_MM - (currentY - MARGIN_MM);

      // If section doesn't fit, add new page
      if (heightMM > remainingSpace && currentY > MARGIN_MM) {
        pdf.addPage();
        currentY = MARGIN_MM;
      }

      // If a single section is taller than one full page, we need to split it across pages
      if (heightMM > USABLE_HEIGHT_MM) {
        const imgData = canvas.toDataURL("image/png");
        const imgWidth = CONTENT_WIDTH_MM;
        const imgHeight = heightMM;
        let drawnHeight = 0;

        while (drawnHeight < imgHeight) {
          const spaceOnPage = USABLE_HEIGHT_MM - (currentY - MARGIN_MM);
          // Draw the full image offset so only the undrawn portion shows
          const yOffset = currentY - drawnHeight;
          
          // Clip to page bounds
          pdf.addImage(imgData, "PNG", MARGIN_MM, yOffset, imgWidth, imgHeight);
          
          drawnHeight += spaceOnPage;
          if (drawnHeight < imgHeight) {
            pdf.addPage();
            currentY = MARGIN_MM;
          } else {
            currentY = MARGIN_MM + (imgHeight - (drawnHeight - spaceOnPage));
          }
        }
      } else {
        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", MARGIN_MM, currentY, CONTENT_WIDTH_MM, heightMM);
        currentY += heightMM + SECTION_GAP_MM;
      }
    }

    pdf.save(`adaptacao-${Date.now()}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
