import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { WizardData, AdaptationResult } from "./AdaptationWizard";
import {
  Loader2, RefreshCw, Pencil, Lightbulb, BookOpen,
  Target, ClipboardList,
} from "lucide-react";
import AdaptedContentRenderer from "./AdaptedContentRenderer";
import AdaptationEditModal from "./AdaptationEditModal";

type Props = {
  data: WizardData;
  updateData: (partial: Partial<WizardData>) => void;
  onNext: () => void;
  onPrev: () => void;
};

type SectionImages = Record<string, string[]>;

const VISUAL_CUE_REGEX = /\b(figura|imagem|gráfico|grafico|diagrama|esquema|mapa|ilustração|ilustracao|tabela)\b/i;

export default function StepResult({ data, updateData, onNext, onPrev }: Props) {
  const [loading, setLoading] = useState(!data.result);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [sectionImages, setSectionImages] = useState<SectionImages>({});
  const [editingField, setEditingField] = useState<{ field: keyof AdaptationResult; title: string } | null>(null);

  const generateImagesForResult = async (accessToken?: string) => {
    const existingImages = data.selectedQuestions
      .map((q) => q.image_url)
      .filter((url): url is string => !!url);

    const candidatesFromSelected = data.selectedQuestions
      .filter((q) => !q.image_url && VISUAL_CUE_REGEX.test(q.text))
      .slice(0, 2)
      .map((q) => ({ prompt: q.text, context: `${q.subject}${q.topic ? ` • ${q.topic}` : ""}` }));

    const fallbackCandidate = candidatesFromSelected.length === 0 && existingImages.length === 0 && VISUAL_CUE_REGEX.test(data.activityText)
      ? [{ prompt: data.activityText.slice(0, 800), context: data.activityType || "atividade" }]
      : [];

    const candidates = [...candidatesFromSelected, ...fallbackCandidate];
    if (!accessToken || candidates.length === 0) {
      return Array.from(new Set(existingImages));
    }

    setIsGeneratingImages(true);
    const generated = await Promise.all(
      candidates.map(async (candidate) => {
        try {
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-question-image`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              prompt: `Crie uma imagem pedagógica para esta questão: ${candidate.prompt}`,
              context: candidate.context,
            }),
          });

          if (!response.ok) return null;
          const payload = await response.json();
          return typeof payload.image_url === "string" ? payload.image_url : null;
        } catch {
          return null;
        }
      })
    );
    setIsGeneratingImages(false);

    return Array.from(new Set([...existingImages, ...generated.filter((u): u is string => !!u)]));
  };

  const generate = async () => {
    setLoading(true);
    try {
      const activeBarriers = data.barriers
        .filter((b) => b.is_active)
        .map((b) => ({ dimension: b.dimension, barrier_key: b.label, notes: b.notes }));

      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/adapt-activity`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            original_activity: data.activityText,
            activity_type: data.activityType,
            barriers: activeBarriers,
            student_id: data.studentId || undefined,
            class_id: data.classId || undefined,
            question_images: data.selectedQuestions
              .filter((q) => q.image_url)
              .map((q) => ({ question_text: q.text.slice(0, 100), image_url: q.image_url })),
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Falha na adaptação");
      }

      const result = await resp.json();
      updateData({ result: result.adaptation });

      const mergedImages = await generateImagesForResult(accessToken);
      setSectionImages((prev) => ({
        ...prev,
        version_universal: mergedImages,
        version_directed: mergedImages,
      }));

      if (mergedImages.length > 0) {
        toast({ title: `${mergedImages.length} imagem(ns) vinculada(s) à adaptação` });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setIsGeneratingImages(false);
    }
  };

  useEffect(() => {
    if (!data.result) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEditSave = (field: keyof AdaptationResult, content: string, images: string[]) => {
    if (data.result) {
      updateData({ result: { ...data.result, [field]: content } });
    }
    setSectionImages((prev) => ({ ...prev, [field]: images }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground">ISA está adaptando a atividade...</p>
        <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos</p>
      </div>
    );
  }

  if (!data.result) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-muted-foreground">Não foi possível gerar a adaptação.</p>
        <Button onClick={generate}>Tentar Novamente</Button>
        <Button variant="outline" onClick={onPrev} className="ml-2">Voltar</Button>
      </div>
    );
  }

  const r = data.result;

  const renderEditableSection = (
    title: string,
    icon: React.ReactNode,
    field: keyof AdaptationResult,
    content: string
  ) => {
    const images = sectionImages[field] || [];

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {icon} {title}
            <div className="ml-auto">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingField({ field, title })}
                aria-label={`Editar ${title}`}
              >
                <Pencil className="w-3 h-3" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Imagem ${i + 1}`}
                  className="max-h-40 rounded-lg border border-border/50 object-contain"
                />
              ))}
            </div>
          )}
          <AdaptedContentRenderer content={content} />
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Resultado da Adaptação</h2>
        <Button size="sm" variant="outline" onClick={generate}>
          <RefreshCw className="w-4 h-4 mr-1" /> Regenerar
        </Button>
      </div>

      {data.studentName && (
        <p className="text-sm text-muted-foreground">
          Adaptação para: <span className="font-medium text-foreground">{data.studentName}</span>
        </p>
      )}

      {renderEditableSection(
        "Versão Universal (Design Universal)",
        <BookOpen className="w-4 h-4 text-primary" />,
        "version_universal",
        r.version_universal
      )}

      {renderEditableSection(
        "Versão Direcionada",
        <Target className="w-4 h-4 text-primary" />,
        "version_directed",
        r.version_directed
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" /> Estratégias Aplicadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {r.strategies_applied.map((s, i) => (
              <Badge key={i} variant="secondary">{s}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {renderEditableSection(
        "Justificativa Pedagógica",
        <Lightbulb className="w-4 h-4 text-primary" />,
        "pedagogical_justification",
        r.pedagogical_justification
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" /> Dicas de Implementação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {r.implementation_tips.map((tip, i) => (
              <li key={i} className="text-sm text-foreground flex gap-2">
                <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                {tip}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground italic">
        Ferramenta pedagógica. Não realiza diagnóstico. A decisão final é sempre do profissional.
      </p>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>Voltar</Button>
        <Button onClick={onNext}>Exportar e Salvar</Button>
      </div>

      {/* Edit Modal */}
      {editingField && (
        <AdaptationEditModal
          open={!!editingField}
          onOpenChange={(open) => !open && setEditingField(null)}
          title={editingField.title}
          content={String(r[editingField.field] || "")}
          images={sectionImages[editingField.field] || []}
          activityContext={`Matéria: ${data.activityType || "Geral"}. Atividade: ${data.activityText?.slice(0, 200) || ""}`}
          onSave={(content, images) => handleEditSave(editingField.field, content, images)}
        />
      )}
    </div>
  );
}
