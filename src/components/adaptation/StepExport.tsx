import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import type { WizardData } from "./AdaptationWizard";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { Save, FileText, FileDown, Copy, RotateCcw, Check } from "lucide-react";

type Props = {
  data: WizardData;
  onPrev: () => void;
  onRestart: () => void;
};

export default function StepExport({ data, onPrev, onRestart }: Props) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const r = data.result;
  if (!r) return null;

  const fullText = `VERSÃO UNIVERSAL (Design Universal para Aprendizagem)\n\n${r.version_universal}\n\n---\n\nVERSÃO DIRECIONADA\n\n${r.version_directed}\n\n---\n\nESTRATÉGIAS APLICADAS\n${r.strategies_applied.map((s) => `• ${s}`).join("\n")}\n\n---\n\nJUSTIFICATIVA PEDAGÓGICA\n\n${r.pedagogical_justification}\n\n---\n\nDICAS DE IMPLEMENTAÇÃO\n${r.implementation_tips.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n---\nFerramenta pedagógica. Não realiza diagnóstico. A decisão final é sempre do profissional.`;

  const handleSaveHistory = async () => {
    setSaving(true);
    // Already saved by adapt-activity edge function, but we mark as saved
    setSaved(true);
    setSaving(false);
    toast({ title: "Adaptação salva no histórico!" });
  };

  const handleExportPdf = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "Permita pop-ups para exportar PDF.", variant: "destructive" });
      return;
    }

    const studentInfo = data.studentName ? `<p><strong>Aluno:</strong> ${data.studentName}</p>` : "";
    const typeLabel = { prova: "Prova", exercicio: "Exercício", atividade_casa: "Atividade de Casa", trabalho: "Trabalho" }[data.activityType || ""] || "";

    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Adaptação - Orienta Aula</title>
<style>
  body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; padding: 20px; color: #222; line-height: 1.6; }
  h1 { font-size: 22px; border-bottom: 2px solid #333; padding-bottom: 8px; }
  h2 { font-size: 16px; color: #555; margin-top: 24px; }
  .badge { display: inline-block; background: #f0f0f0; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin: 2px; }
  .disclaimer { font-size: 11px; color: #888; margin-top: 32px; border-top: 1px solid #ddd; padding-top: 8px; font-style: italic; }
  ul { padding-left: 20px; }
  @media print { body { margin: 0; } }
</style></head><body>
<h1>Atividade Adaptada</h1>
${typeLabel ? `<p><strong>Tipo:</strong> ${typeLabel}</p>` : ""}
${studentInfo}
<h2>Versão Universal (Design Universal para Aprendizagem)</h2>
<div>${r.version_universal.replace(/\n/g, "<br>")}</div>
<h2>Versão Direcionada</h2>
<div>${r.version_directed.replace(/\n/g, "<br>")}</div>
<h2>Estratégias Aplicadas</h2>
<div>${r.strategies_applied.map((s) => `<span class="badge">${s}</span>`).join(" ")}</div>
<h2>Justificativa Pedagógica</h2>
<div>${r.pedagogical_justification.replace(/\n/g, "<br>")}</div>
<h2>Dicas de Implementação</h2>
<ul>${r.implementation_tips.map((t) => `<li>${t}</li>`).join("")}</ul>
<p class="disclaimer">Ferramenta pedagógica. Não realiza diagnóstico. A decisão final é sempre do profissional.</p>
</body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleExportDocx = async () => {
    try {
      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                text: "Atividade Adaptada",
                heading: HeadingLevel.HEADING_1,
              }),
              ...(data.activityType
                ? [new Paragraph({ children: [new TextRun({ text: `Tipo: ${data.activityType}`, bold: true })] })]
                : []),
              ...(data.studentName
                ? [new Paragraph({ children: [new TextRun({ text: `Aluno: ${data.studentName}`, bold: true })] })]
                : []),
              new Paragraph({ text: "" }),
              new Paragraph({ text: "Versão Universal (Design Universal para Aprendizagem)", heading: HeadingLevel.HEADING_2 }),
              ...r.version_universal.split("\n").map((line) => new Paragraph({ text: line })),
              new Paragraph({ text: "" }),
              new Paragraph({ text: "Versão Direcionada", heading: HeadingLevel.HEADING_2 }),
              ...r.version_directed.split("\n").map((line) => new Paragraph({ text: line })),
              new Paragraph({ text: "" }),
              new Paragraph({ text: "Estratégias Aplicadas", heading: HeadingLevel.HEADING_2 }),
              ...r.strategies_applied.map((s) => new Paragraph({ text: `• ${s}` })),
              new Paragraph({ text: "" }),
              new Paragraph({ text: "Justificativa Pedagógica", heading: HeadingLevel.HEADING_2 }),
              ...r.pedagogical_justification.split("\n").map((line) => new Paragraph({ text: line })),
              new Paragraph({ text: "" }),
              new Paragraph({ text: "Dicas de Implementação", heading: HeadingLevel.HEADING_2 }),
              ...r.implementation_tips.map((t, i) => new Paragraph({ text: `${i + 1}. ${t}` })),
              new Paragraph({ text: "" }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Ferramenta pedagógica. Não realiza diagnóstico. A decisão final é sempre do profissional.",
                    italics: true,
                    size: 18,
                    color: "888888",
                  }),
                ],
              }),
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
      toast({ title: "Arquivo Word exportado!" });
    } catch (e) {
      toast({ title: "Erro ao gerar DOCX", variant: "destructive" });
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      toast({ title: "Copiado para a área de transferência!" });
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Exportar e Salvar</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card
          className="cursor-pointer hover:shadow-md transition-all"
          onClick={handleSaveHistory}
        >
          <CardContent className="flex items-center gap-4 p-5">
            <div className={`p-3 rounded-lg ${saved ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {saved ? <Check className="w-6 h-6" /> : <Save className="w-6 h-6" />}
            </div>
            <div>
              <p className="font-medium text-foreground">
                {saving ? "Salvando..." : saved ? "Salvo no Histórico" : "Salvar no Histórico"}
              </p>
              <p className="text-sm text-muted-foreground">Acesse depois em "Minhas Adaptações"</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-all" onClick={handleExportPdf}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="p-3 rounded-lg bg-muted text-muted-foreground">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="font-medium text-foreground">Exportar como PDF</p>
              <p className="text-sm text-muted-foreground">Gera PDF pronto para imprimir</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-all" onClick={handleExportDocx}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="p-3 rounded-lg bg-muted text-muted-foreground">
              <FileDown className="w-6 h-6" />
            </div>
            <div>
              <p className="font-medium text-foreground">Exportar como Word</p>
              <p className="text-sm text-muted-foreground">Arquivo .docx editável</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-all" onClick={handleCopy}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="p-3 rounded-lg bg-muted text-muted-foreground">
              <Copy className="w-6 h-6" />
            </div>
            <div>
              <p className="font-medium text-foreground">Copiar Texto</p>
              <p className="text-sm text-muted-foreground">Copiar adaptação para a área de transferência</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>Voltar ao Resultado</Button>
        <Button variant="outline" onClick={onRestart}>
          <RotateCcw className="w-4 h-4 mr-1" /> Nova Adaptação
        </Button>
      </div>
    </div>
  );
}
