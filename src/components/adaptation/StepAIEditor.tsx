import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, FileEdit, Loader2, RefreshCw } from "lucide-react";
import ActivityEditor from "@/components/editor/ActivityEditor";
import type { StructuredActivity } from "@/types/adaptation";
import { isStructuredActivity } from "@/types/adaptation";
import { structuredToMarkdownDsl } from "@/lib/activityDslConverter";
import type {
  AdaptationResult,
  WizardData,
  SectionQuestionImages,
  QuestionImageMap,
} from "./AdaptationWizard";
import { supabase } from "@/integrations/supabase/client";
import { useUserSchool } from "@/hooks/useUserSchool";
import { toast } from "@/hooks/use-toast";
import { parseAdaptedQuestions } from "@/lib/adaptedQuestions";
import { buildAIEditorAdvancePatch, resetGeneratedState } from "@/lib/adaptationWizardHelpers";
import { mergeImages, injectImagesDsl } from "@/lib/activityImageInjection";
import { useActivityContent } from "@/hooks/useActivityContent";

type Props = {
  data: WizardData;
  updateData: (partial: Partial<WizardData>) => void;
  onNext: () => void;
  onPrev: () => void;
};

const VISUAL_CUE_REGEX =
  /\b(figura|imagem|gráfico|grafico|diagrama|esquema|mapa|ilustração|ilustracao|tabela)\b/i;

type QuestionImageMapLocal = QuestionImageMap;

function toStructured(data: string | StructuredActivity): StructuredActivity {
  if (isStructuredActivity(data)) return data;
  return {
    sections: [{ questions: [{ number: 1, type: "open_ended", statement: String(data) }] }],
  };
}

function buildStructuredImageMap(
  activity: StructuredActivity,
  selectedQuestions: WizardData["selectedQuestions"]
): QuestionImageMapLocal {
  const map: QuestionImageMapLocal = {};
  let qIndex = 0;
  for (const section of activity.sections) {
    for (const q of section.questions) {
      const sq = selectedQuestions[qIndex];
      if (sq?.image_url) {
        if (!map[String(q.number)]) map[String(q.number)] = [];
        map[String(q.number)].push(sq.image_url);
      }
      qIndex++;
    }
  }
  return map;
}

function buildQuestionImageMap(
  sectionContent: string,
  selectedQuestions: WizardData["selectedQuestions"]
): QuestionImageMapLocal {
  const parsedQuestions = parseAdaptedQuestions(sectionContent);
  if (parsedQuestions.length === 0 || selectedQuestions.length === 0) return {};
  const map: QuestionImageMapLocal = {};

  for (const sq of selectedQuestions) {
    if (!sq.image_url) continue;
    const originalWords = new Set(sq.text.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
    let bestMatch: { number: string; score: number } | null = null;
    for (const aq of parsedQuestions) {
      const aqWords = aq.text.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const score = aqWords.filter((w) => originalWords.has(w)).length;
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { number: aq.number, score };
      }
    }
    if (!bestMatch) {
      const idx = selectedQuestions.indexOf(sq);
      const fallback = parsedQuestions[idx];
      if (fallback) bestMatch = { number: fallback.number, score: 0 };
    }
    if (bestMatch) {
      if (!map[bestMatch.number]) map[bestMatch.number] = [];
      map[bestMatch.number].push(sq.image_url);
    }
  }
  return map;
}

function computeInitialDsl(
  version: string | StructuredActivity,
  imageMap: QuestionImageMapLocal,
): string {
  if (typeof version === "string") return injectImagesDsl(version, imageMap);
  return structuredToMarkdownDsl(mergeImages(toStructured(version), imageMap));
}

export default function StepAIEditor({ data, updateData, onNext, onPrev }: Props) {
  const { schoolId } = useUserSchool();
  const [loading, setLoading] = useState(!data.result);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [activeTab, setActiveTab] = useState<"universal" | "directed">("universal");
  const abortRef = useRef<AbortController | null>(null);

  const fallbackUniversal = useMemo(
    () =>
      data.result
        ? computeInitialDsl(data.result.version_universal, data.questionImages.version_universal || {})
        : "",
    // Seeded once; changes to `result` are handled via `resultRef` + content.reset below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const fallbackDirected = useMemo(
    () =>
      data.result
        ? computeInitialDsl(data.result.version_directed, data.questionImages.version_directed || {})
        : "",
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const universalContent = useActivityContent({
    initialDsl: data.aiEditorUniversalDsl ?? fallbackUniversal,
    initialRegistry: data.editorImageRegistry ?? {},
    onChange: ({ dsl, registry }) => {
      updateData({ aiEditorUniversalDsl: dsl, editorImageRegistry: registry });
    },
  });
  const directedContent = useActivityContent({
    initialDsl: data.aiEditorDirectedDsl ?? fallbackDirected,
    initialRegistry: data.editorImageRegistry ?? {},
    onChange: ({ dsl, registry }) => {
      updateData({ aiEditorDirectedDsl: dsl, editorImageRegistry: registry });
    },
  });

  // Reset hook state when the underlying result reference changes (regenerate).
  const resultRef = useRef(data.result);
  useEffect(() => {
    if (data.result && data.result !== resultRef.current) {
      resultRef.current = data.result;
      const nextUniversal = computeInitialDsl(
        data.result.version_universal,
        data.questionImages.version_universal || {},
      );
      const nextDirected = computeInitialDsl(
        data.result.version_directed,
        data.questionImages.version_directed || {},
      );
      universalContent.reset({ dsl: nextUniversal, registry: {} });
      directedContent.reset({ dsl: nextDirected, registry: {} });
    }
  }, [data.result, data.questionImages, universalContent, directedContent]);

  const generateImagesForResult = async (accessToken?: string): Promise<string[]> => {
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
    if (!accessToken || candidates.length === 0) return Array.from(new Set(existingImages));

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

  const generate = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

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
          signal: controller.signal,
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
      if (controller.signal.aborted) return;
      const adaptation: AdaptationResult = result.adaptation;

      const mergedImages = await generateImagesForResult(accessToken);
      if (controller.signal.aborted) return;

      const vUniversal = adaptation.version_universal;
      const vDirected = adaptation.version_directed;

      let universalImages: QuestionImageMapLocal;
      let directedImages: QuestionImageMapLocal;

      if (isStructuredActivity(vUniversal)) {
        universalImages = buildStructuredImageMap(vUniversal, data.selectedQuestions);
      } else {
        universalImages = buildQuestionImageMap(String(vUniversal), data.selectedQuestions);
      }
      if (isStructuredActivity(vDirected)) {
        directedImages = buildStructuredImageMap(vDirected, data.selectedQuestions);
      } else {
        directedImages = buildQuestionImageMap(String(vDirected), data.selectedQuestions);
      }

      if (mergedImages.length > 0) {
        const selectedUrls = new Set(data.selectedQuestions.map((q) => q.image_url).filter(Boolean));
        const aiGeneratedImages = mergedImages.filter((url) => !selectedUrls.has(url));
        if (aiGeneratedImages.length > 0) {
          let firstQNum: string | undefined;
          if (isStructuredActivity(vUniversal)) {
            const firstQ = vUniversal.sections[0]?.questions[0];
            if (firstQ) firstQNum = String(firstQ.number);
          } else {
            const parsed = parseAdaptedQuestions(String(vUniversal));
            const visualQ = parsed.find((q) => VISUAL_CUE_REGEX.test(q.text));
            if (visualQ) firstQNum = visualQ.number;
          }
          if (firstQNum) {
            if (!universalImages[firstQNum]) universalImages[firstQNum] = [];
            universalImages[firstQNum].push(...aiGeneratedImages);
            if (!directedImages[firstQNum]) directedImages[firstQNum] = [];
            directedImages[firstQNum].push(...aiGeneratedImages);
          }
        }
      }

      // Regeneration wipes ALL downstream state — the resultRef-watcher effect
      // above will reset the hooks once `data.result` flips to `adaptation`.
      updateData({
        ...resetGeneratedState(),
        result: adaptation,
        contextPillars: result.context_pillars || null,
        questionImages: {
          version_universal: universalImages,
          version_directed: directedImages,
        } as SectionQuestionImages,
      });

      if (mergedImages.length > 0) {
        toast({ title: `${mergedImages.length} imagem(ns) vinculada(s) à adaptação` });
      }
    } catch (e: any) {
      if (e.name === "AbortError") return;
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setIsGeneratingImages(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, schoolId, updateData]);

  useEffect(() => {
    if (!data.result) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNext = () => {
    // Use expanded form (raw URLs) so the layout step's structured result
    // carries renderable src values without registry context.
    const patch = buildAIEditorAdvancePatch(
      data,
      universalContent.dslExpanded,
      directedContent.dslExpanded,
    );
    updateData(patch);
    onNext();
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

  const activeContent = activeTab === "universal" ? universalContent : directedContent;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileEdit className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">Editar Atividade Adaptada</h2>
            <p className="text-sm text-muted-foreground">
              Revise e edite a atividade gerada pela IA antes de exportar.
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={generate}>
          <RefreshCw className="w-4 h-4 mr-1" /> Regerar
        </Button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("universal")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "universal"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Versão Original
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("directed")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "directed"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Versão Adaptada
        </button>
      </div>

      <div className="-mx-4 sm:-mx-5 lg:-mx-7">
        <ActivityEditor
          key={activeTab}
          value={activeContent.dsl}
          onChange={activeContent.setDsl}
          imageRegistry={activeContent.registry}
          onUndo={activeContent.undo}
          onRedo={activeContent.redo}
          canUndo={activeContent.canUndo}
          canRedo={activeContent.canRedo}
        />
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev} aria-label="Voltar">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={handleNext} aria-label="Avançar para exportação">
          Avançar
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
