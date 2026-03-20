import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useUserSchool } from "@/hooks/useUserSchool";
import { toast } from "@/hooks/use-toast";
import type { WizardData, AdaptationResult, SectionQuestionImages, QuestionImageMap, SelectedQuestion } from "./AdaptationWizard";
import {
  Loader2,
  RefreshCw,
  Lightbulb,
  BookOpen,
  Target,
  ClipboardList,
} from "lucide-react";
import AdaptedContentRenderer from "./AdaptedContentRenderer";
import AdaptationEditModal, {
  type AdaptationQuestionEditPayload,
} from "./AdaptationEditModal";
import {
  parseAdaptedQuestions,
  replaceQuestionInAdaptedContent,
  type ParsedAdaptedQuestion,
} from "@/lib/adaptedQuestions";
import ContextIndicator from "./ContextIndicator";

type Props = {
  data: WizardData;
  updateData: (partial: Partial<WizardData>) => void;
  onNext: () => void;
  onPrev: () => void;
};

type EditableField = "version_universal" | "version_directed";

const VISUAL_CUE_REGEX =
  /\b(figura|imagem|gráfico|grafico|diagrama|esquema|mapa|ilustração|ilustracao|tabela)\b/i;

/**
 * Build a question→images map by matching each selectedQuestion (by order)
 * to the corresponding adapted question number.
 * Image from selectedQuestion[0] → adapted question 1, etc.
 */
const buildQuestionImageMap = (
  sectionContent: string,
  selectedQuestions: SelectedQuestion[]
): QuestionImageMap => {
  const parsedQuestions = parseAdaptedQuestions(sectionContent);
  if (parsedQuestions.length === 0 || selectedQuestions.length === 0) return {};

  const map: QuestionImageMap = {};

  selectedQuestions.forEach((sq, index) => {
    if (!sq.image_url) return;
    // Match by order: selectedQuestion index → adapted question at same index
    const adaptedQ = parsedQuestions[index];
    if (!adaptedQ) return;
    if (!map[adaptedQ.number]) map[adaptedQ.number] = [];
    map[adaptedQ.number].push(sq.image_url);
  });

  return map;
};

export default function StepResult({ data, updateData, onNext, onPrev }: Props) {
  const { schoolId } = useUserSchool();
  const [loading, setLoading] = useState(!data.result);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const questionImages = data.questionImages;
  const setQuestionImages = (updater: SectionQuestionImages | ((prev: SectionQuestionImages) => SectionQuestionImages)) => {
    if (typeof updater === "function") {
      updateData({ questionImages: updater(data.questionImages) });
    } else {
      updateData({ questionImages: updater });
    }
  };
  const [editingQuestion, setEditingQuestion] = useState<{
    field: EditableField;
    title: string;
    question: ParsedAdaptedQuestion;
  } | null>(null);

  const generateImagesForResult = async (accessToken?: string) => {
    const existingImages = data.selectedQuestions
      .map((q) => q.image_url)
      .filter((url): url is string => !!url);

    const candidatesFromSelected = data.selectedQuestions
      .filter((q) => !q.image_url && VISUAL_CUE_REGEX.test(q.text))
      .slice(0, 2)
      .map((q) => ({
        prompt: q.text,
        context: `${q.subject}${q.topic ? ` • ${q.topic}` : ""}`,
      }));

    const fallbackCandidate =
      candidatesFromSelected.length === 0 &&
      existingImages.length === 0 &&
      VISUAL_CUE_REGEX.test(data.activityText)
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
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-question-image`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                prompt: `Crie uma imagem pedagógica para esta questão: ${candidate.prompt}`,
                context: candidate.context,
              }),
            }
          );

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
        .map((b) => ({
          dimension: b.dimension,
          barrier_key: b.barrier_key,
          notes: b.notes,
        }));

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
            observation_notes: data.observationNotes || undefined,
            school_id: schoolId || undefined,
            question_images: data.selectedQuestions
              .filter((q) => q.image_url)
              .map((q) => ({
                question_text: q.text.slice(0, 100),
                image_url: q.image_url,
              })),
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Falha na adaptação");
      }

      const result = await resp.json();
      updateData({
        result: result.adaptation,
        contextPillars: result.context_pillars || null,
      });

      const mergedImages = await generateImagesForResult(accessToken);

      // Build per-question image maps using selectedQuestions order
      const universalImages = buildQuestionImageMap(
        result.adaptation.version_universal,
        data.selectedQuestions
      );
      const directedImages = buildQuestionImageMap(
        result.adaptation.version_directed,
        data.selectedQuestions
      );

      // Also add any AI-generated images (not from selectedQuestions) to the first visual-cue question
      if (mergedImages.length > 0) {
        const selectedUrls = new Set(data.selectedQuestions.map(q => q.image_url).filter(Boolean));
        const aiGeneratedImages = mergedImages.filter(url => !selectedUrls.has(url));
        if (aiGeneratedImages.length > 0) {
          const universalParsed = parseAdaptedQuestions(result.adaptation.version_universal);
          const visualQ = universalParsed.find(q => VISUAL_CUE_REGEX.test(q.text));
          if (visualQ) {
            if (!universalImages[visualQ.number]) universalImages[visualQ.number] = [];
            universalImages[visualQ.number].push(...aiGeneratedImages);
          }
          const directedParsed = parseAdaptedQuestions(result.adaptation.version_directed);
          const visualQDir = directedParsed.find(q => VISUAL_CUE_REGEX.test(q.text));
          if (visualQDir) {
            if (!directedImages[visualQDir.number]) directedImages[visualQDir.number] = [];
            directedImages[visualQDir.number].push(...aiGeneratedImages);
          }
        }
      }

      setQuestionImages({
        version_universal: universalImages,
        version_directed: directedImages,
      });

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

  const handleQuestionSave = (payload: AdaptationQuestionEditPayload) => {
    if (!editingQuestion || !data.result) return;

    const { field, question } = editingQuestion;
    const currentContent = String(data.result[field] || "");
    const updatedContent = replaceQuestionInAdaptedContent(currentContent, {
      number: question.number,
      text: payload.text,
      options: payload.questionType === "objetiva" ? payload.options : [],
      trailingLines: question.trailingLines,
    });

    updateData({ result: { ...data.result, [field]: updatedContent } as AdaptationResult });
    setQuestionImages((prev) => ({
      ...prev,
      [field]: {
        ...(prev[field] || {}),
        [question.number]: payload.images,
      },
    }));
    setEditingQuestion(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground">
          {isGeneratingImages
            ? "ISA está gerando as imagens da atividade..."
            : "ISA está adaptando a atividade..."}
        </p>
        <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos</p>
      </div>
    );
  }

  if (!data.result) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-muted-foreground">Não foi possível gerar a adaptação.</p>
        <Button onClick={generate}>Tentar Novamente</Button>
        <Button variant="outline" onClick={onPrev} className="ml-2">
          Voltar
        </Button>
      </div>
    );
  }

  const r = data.result;

  const renderQuestionSection = (
    title: string,
    icon: React.ReactNode,
    field: EditableField,
    content: string
  ) => {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {icon} {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <AdaptedContentRenderer
            content={content}
            questionImages={questionImages[field]}
            onEditQuestion={(question) =>
              setEditingQuestion({
                field,
                title,
                question,
              })
            }
            onContentChange={(newContent) => {
              if (!data.result) return;
              updateData({ result: { ...data.result, [field]: newContent } as AdaptationResult });
            }}
          />
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

      {data.contextPillars && (
        <ContextIndicator
          hasBarriers={data.contextPillars.hasBarriers}
          hasPEI={data.contextPillars.hasPEI}
          hasDocuments={data.contextPillars.hasDocuments}
          hasChatHistory={data.contextPillars.hasChatHistory}
          hasActivityContext={data.contextPillars.hasActivityContext}
        />
      )}

      {renderQuestionSection(
        "Versão Universal (Design Universal)",
        <BookOpen className="w-4 h-4 text-primary" />,
        "version_universal",
        r.version_universal
      )}

      {renderQuestionSection(
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
            {r.strategies_applied.map((strategy, index) => (
              <Badge key={index} variant="secondary">
                {strategy}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" /> Justificativa Pedagógica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdaptedContentRenderer content={r.pedagogical_justification} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" /> Dicas de Implementação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {r.implementation_tips.map((tip, index) => (
              <li key={index} className="text-sm text-foreground flex gap-2">
                <span className="text-primary font-bold shrink-0">{index + 1}.</span>
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
        <Button variant="outline" onClick={onPrev}>
          Voltar
        </Button>
        <Button onClick={onNext}>Exportar e Salvar</Button>
      </div>

      {editingQuestion && (
        <AdaptationEditModal
          open={!!editingQuestion}
          onOpenChange={(open) => !open && setEditingQuestion(null)}
          title={`${editingQuestion.title} • Questão ${editingQuestion.question.number}`}
          content={editingQuestion.question.text}
          initialOptions={editingQuestion.question.options}
          images={questionImages[editingQuestion.field]?.[editingQuestion.question.number] || []}
          activityContext={`Matéria: ${data.activityType || "Geral"}. Atividade: ${
            data.activityText?.slice(0, 200) || ""
          }`}
          onSave={handleQuestionSave}
        />
      )}
    </div>
  );
}
