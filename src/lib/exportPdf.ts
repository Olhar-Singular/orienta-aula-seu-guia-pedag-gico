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

function buildHtml(data: ExportData): string {
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

  return `
<div id="pdf-render-root" style="font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#1a1a1a;padding:32px 28px;max-width:700px;font-size:13px;line-height:1.6;background:#fff;">
  <!-- Header -->
  <div style="color:#888;font-size:11px;margin-bottom:16px;">${headerParts.join(" • ")}</div>

  <!-- Title -->
  <h1 style="font-size:22px;font-weight:700;margin:0 0 8px 0;color:#1a1a1a;">Atividade Adaptada</h1>

  ${data.activityType ? `<p style="font-size:12px;color:#555;margin:0 0 2px 0;"><strong>Tipo:</strong> ${escapeHtml(TYPE_LABELS[data.activityType] || data.activityType)}</p>` : ""}
  ${data.studentName ? `<p style="font-size:12px;color:#555;margin:0 0 10px 0;"><strong>Aluno:</strong> ${escapeHtml(data.studentName)}</p>` : ""}

  <!-- Versão Universal -->
  <h2 style="font-size:15px;font-weight:600;color:#0d7377;margin:18px 0 8px 0;border-bottom:2px solid #0d737733;padding-bottom:4px;">Versão Universal (Design Universal para Aprendizagem)</h2>
  <div style="margin-bottom:6px;">${textToHtml(data.versionUniversal)}</div>
  ${imagesHtml}

  <!-- Versão Direcionada -->
  <h2 style="font-size:15px;font-weight:600;color:#0d7377;margin:18px 0 8px 0;border-bottom:2px solid #0d737733;padding-bottom:4px;">Versão Direcionada</h2>
  <div style="margin-bottom:6px;">${textToHtml(data.versionDirected)}</div>
  ${imagesHtml}

  <!-- Estratégias -->
  <h2 style="font-size:15px;font-weight:600;color:#0d7377;margin:18px 0 8px 0;border-bottom:2px solid #0d737733;padding-bottom:4px;">Estratégias Aplicadas</h2>
  <ul style="margin:0;padding-left:18px;">
    ${data.strategiesApplied.map((s) => `<li style="margin-bottom:3px;">${escapeHtml(s)}</li>`).join("")}
  </ul>

  <!-- Justificativa -->
  <h2 style="font-size:15px;font-weight:600;color:#0d7377;margin:18px 0 8px 0;border-bottom:2px solid #0d737733;padding-bottom:4px;">Justificativa Pedagógica</h2>
  <div>${textToHtml(data.pedagogicalJustification)}</div>

  <!-- Dicas -->
  <h2 style="font-size:15px;font-weight:600;color:#0d7377;margin:18px 0 8px 0;border-bottom:2px solid #0d737733;padding-bottom:4px;">Dicas de Implementação</h2>
  <ol style="margin:0;padding-left:18px;">
    ${data.implementationTips.map((t) => `<li style="margin-bottom:4px;">${escapeHtml(t)}</li>`).join("")}
  </ol>

  <!-- Footer -->
  <div style="margin-top:24px;padding-top:10px;border-top:1px solid #eee;font-size:10px;color:#999;font-style:italic;">
    Gerado por Orienta Aula — Ferramenta pedagógica. Não realiza diagnóstico. A decisão final é sempre do profissional.
  </div>
</div>`;
}

export async function exportToPdf(data: ExportData) {
  // Create off-screen container
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "700px";
  container.style.background = "#fff";
  container.innerHTML = buildHtml(data);
  document.body.appendChild(container);

  // Wait for images to load
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

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;

    while (heightLeft > 0) {
      pdf.addPage();
      position = margin - (imgHeight - heightLeft);
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
    }

    pdf.save(`adaptacao-${Date.now()}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
