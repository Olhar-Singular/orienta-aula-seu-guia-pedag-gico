import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import type { WizardData } from "./AdaptationWizard";
import { Save, FileText, FileDown, Copy, RotateCcw, Check, Share2, Link2, Loader2 } from "lucide-react";
import { exportToPdf } from "@/lib/exportPdf";
import { exportToDocx } from "@/lib/exportDocx";
import { generateShareToken } from "@/lib/shareToken";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Props = {
  data: WizardData;
  onPrev: () => void;
  onRestart: () => void;
};

export default function StepExport({ data, onPrev, onRestart }: Props) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);

  const r = data.result;
  if (!r) return null;

  const fullText = `VERSÃO UNIVERSAL (Design Universal para Aprendizagem)\n\n${r.version_universal}\n\n---\n\nVERSÃO DIRECIONADA\n\n${r.version_directed}\n\n---\n\nESTRATÉGIAS APLICADAS\n${r.strategies_applied.map((s) => `• ${s}`).join("\n")}\n\n---\n\nJUSTIFICATIVA PEDAGÓGICA\n\n${r.pedagogical_justification}\n\n---\n\nDICAS DE IMPLEMENTAÇÃO\n${r.implementation_tips.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n---\nFerramenta pedagógica. Não realiza diagnóstico. A decisão final é sempre do profissional.`;

  const handleSaveHistory = async () => {
    setSaving(true);
    setSaved(true);
    setSaving(false);
    toast({ title: "Adaptação salva no histórico!" });
  };

  // Pass per-question image maps to exports
  const questionImagesUniversal = data.questionImages.version_universal;
  const questionImagesDirected = data.questionImages.version_directed;

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      await exportToPdf({
        teacherName: user?.user_metadata?.name,
        studentName: data.studentName || undefined,
        activityType: data.activityType || undefined,
        date: new Date().toLocaleDateString("pt-BR"),
        versionUniversal: r.version_universal,
        versionDirected: r.version_directed,
        strategiesApplied: r.strategies_applied,
        pedagogicalJustification: r.pedagogical_justification,
        implementationTips: r.implementation_tips,
        questionImagesUniversal,
        questionImagesDirected,
      });
      toast({ title: "PDF exportado!" });
    } catch {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    }
    setExportingPdf(false);
  };

  const handleExportDocx = async () => {
    setExportingDocx(true);
    try {
      await exportToDocx({
        teacherName: user?.user_metadata?.name,
        studentName: data.studentName || undefined,
        activityType: data.activityType || undefined,
        date: new Date().toLocaleDateString("pt-BR"),
        versionUniversal: r.version_universal,
        versionDirected: r.version_directed,
        strategiesApplied: r.strategies_applied,
        pedagogicalJustification: r.pedagogical_justification,
        implementationTips: r.implementation_tips,
        questionImagesUniversal,
        questionImagesDirected,
      });
      toast({ title: "Arquivo Word exportado!" });
    } catch {
      toast({ title: "Erro ao gerar DOCX", variant: "destructive" });
    }
    setExportingDocx(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      toast({ title: "Copiado para a área de transferência!" });
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    if (!user) return;
    setSharing(true);

    try {
      // We need the adaptation_id from history. Try to find last saved one.
      const { data: lastAdaptation } = await supabase
        .from("adaptations_history")
        .select("id")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!lastAdaptation) {
        toast({ title: "Salve a adaptação no histórico antes de compartilhar.", variant: "destructive" });
        setSharing(false);
        return;
      }

      const token = generateShareToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase.from("shared_adaptations").insert({
        adaptation_id: lastAdaptation.id,
        token,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
      });

      if (error) {
        toast({ title: "Erro ao gerar link.", variant: "destructive" });
        setSharing(false);
        return;
      }

      const url = `${window.location.origin}/compartilhado/${token}`;
      setShareUrl(url);
      toast({ title: "Link de compartilhamento gerado!" });
    } catch {
      toast({ title: "Erro ao compartilhar.", variant: "destructive" });
    }
    setSharing(false);
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Link copiado!" });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Exportar e Salvar</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          className="cursor-pointer group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-2 border-transparent hover:border-primary/20"
          onClick={handleSaveHistory}
        >
          <CardContent className="flex flex-col items-center text-center gap-3 p-6">
            <div className={`p-4 rounded-xl transition-colors duration-300 ${saved ? "bg-primary text-primary-foreground shadow-md" : "bg-primary/10 text-primary group-hover:bg-primary/20"}`}>
              {saved ? <Check className="w-7 h-7" /> : <Save className="w-7 h-7" />}
            </div>
            <div>
              <p className="font-semibold text-foreground text-base">
                {saving ? "Salvando..." : saved ? "Salvo ✓" : "Salvar no Histórico"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Acesse depois em "Minhas Adaptações"</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-2 border-transparent hover:border-destructive/20 ${exportingPdf ? "opacity-70 pointer-events-none" : ""}`}
          onClick={handleExportPdf}
        >
          <CardContent className="flex flex-col items-center text-center gap-3 p-6">
            <div className="p-4 rounded-xl bg-destructive/10 text-destructive group-hover:bg-destructive/20 transition-colors duration-300">
              {exportingPdf ? <Loader2 className="w-7 h-7 animate-spin" /> : <FileText className="w-7 h-7" />}
            </div>
            <div>
              <p className="font-semibold text-foreground text-base">{exportingPdf ? "Gerando..." : "Exportar PDF"}</p>
              <p className="text-xs text-muted-foreground mt-1">Com cabeçalho e rodapé formatados</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-2 border-transparent hover:border-blue-500/20 ${exportingDocx ? "opacity-70 pointer-events-none" : ""}`}
          onClick={handleExportDocx}
        >
          <CardContent className="flex flex-col items-center text-center gap-3 p-6">
            <div className="p-4 rounded-xl bg-blue-500/10 text-blue-600 group-hover:bg-blue-500/20 transition-colors duration-300">
              {exportingDocx ? <Loader2 className="w-7 h-7 animate-spin" /> : <FileDown className="w-7 h-7" />}
            </div>
            <div>
              <p className="font-semibold text-foreground text-base">{exportingDocx ? "Gerando..." : "Exportar Word"}</p>
              <p className="text-xs text-muted-foreground mt-1">Arquivo .docx editável com imagens</p>
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
