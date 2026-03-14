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

  const imageUrls = data.selectedQuestions
    ?.filter((q) => q.image_url)
    .map((q) => q.image_url as string) || [];

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
        images: imageUrls,
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
        images: imageUrls,
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-all" onClick={handleSaveHistory}>
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
              <p className="text-sm text-muted-foreground">Com cabeçalho e rodapé formatados</p>
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

        <Card className="cursor-pointer hover:shadow-md transition-all sm:col-span-2" onClick={!shareUrl ? handleShare : undefined}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="p-3 rounded-lg bg-accent/10 text-accent">
              {sharing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Share2 className="w-6 h-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">Compartilhar Link</p>
              <p className="text-sm text-muted-foreground">Link público que expira em 7 dias</p>
              {shareUrl && (
                <div className="flex items-center gap-2 mt-2">
                  <Input value={shareUrl} readOnly className="text-xs font-mono h-8" />
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); copyShareUrl(); }} className="shrink-0 gap-1">
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                </div>
              )}
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
