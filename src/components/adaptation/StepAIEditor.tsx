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
import { toCanonicalDsl, toRawDsl } from "@/lib/dsl/types";

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
    // Match by text similarity: find the adapted question whose text best matches the original
    const originalWords = new Set(sq.text.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
    let bestMatch: { number: string; score: number } | null = null;
    for (const aq of parsedQuestions) {
      const aqWords = aq.text.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const score = aqWords.filter((w) => originalWords.has(w)).length;
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { number: aq.number, score };
      }
    }
    // Fallback to index-based if no text match found
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

/** Compute the initial DSL string for a given version from a result + image map.
 *  New path: AI returns DSL string → inject images inline.
 *  Legacy: AI returned StructuredActivity JSON → merge images then serialize. */
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
  // Tracks the result reference we've already seeded drafts for, so we don't
  // overwrite the user's edits on every re-render.
  const seededResultRef = useRef<AdaptationResult | null>(null);

  // Local fallback for rendering before drafts are populated in the wizard store.
  // Once drafts exist in `data`, they take precedence.
  const fallbackUniversal = useMemo(
    () =>
      data.result
        ? computeInitialDsl(data.result.version_universal, data.questionImages.version_universal || {})
        : "",
    [data.result, data.questionImages.version_universal],
  );
  const fallbackDirected = useMemo(
    () =>
      data.result
        ? computeInitialDsl(data.result.version_directed, data.questionImages.version_directed || {})
        : "",
    [data.result, data.questionImages.version_directed],
  );

  const universalValue = data.aiEditorUniversalDsl ?? fallbackUniversal;
  const directedValue = data.aiEditorDirectedDsl ?? fallbackDirected;

  // Seed drafts in the wizard store once per result, so they survive unmount/remount.
  //
  // Canonicalization (raw http URLs → `imagem-N` placeholders + registry) happens
  // here, at the wizard→editor boundary. Otherwise ActivityEditor's internal
  // scanner does it on first render and races with parent state on every keystroke,
  // jumping the cursor to the end of the textarea.
  useEffect(() => {
    if (!data.result) return;
    if (seededResultRef.current === data.result) return;
    seededResultRef.current = data.result;
    const next: Partial<WizardData> = {};
    let registry = data.editorImageRegistry ?? {};
    if (data.aiEditorUniversalDsl === undefined) {
      const c = toCanonicalDsl(fallbackUniversal, registry);
      next.aiEditorUniversalDsl = c.dsl;
      registry = c.registry;
    }
    if (data.aiEditorDirectedDsl === undefined) {
      const c = toCanonicalDsl(fallbackDirected, registry);
      next.aiEditorDirectedDsl = c.dsl;
      registry = c.registry;
    }
    if (registry !== (data.editorImageRegistry ?? {})) {
      next.editorImageRegistry = registry;
    }
    if (Object.keys(next).length > 0) updateData(next);
  }, [data.result, data.aiEditorUniversalDsl, data.aiEditorDirectedDsl, data.editorImageRegistry, fallbackUniversal, fallbackDirected, updateData]);

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
    // Abort any previous in-flight generation
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

      // Single updateData that atomically sets result, context, images, and seeded drafts.
      // Regeneration counts as a fresh result — wipe ALL downstream state
      // (editableActivity, pdfHistory, etc.) so the layout step rebuilds from
      // the new content instead of reusing the previous generation.
      seededResultRef.current = adaptation;
      updateData({
        ...resetGeneratedState(),
        result: adaptation,
        contextPillars: result.context_pillars || null,
        questionImages: {
          version_universal: universalImages,
          version_directed: directedImages,
        } as SectionQuestionImages,
        aiEditorUniversalDsl: computeInitialDsl(vUniversal, universalImages),
        aiEditorDirectedDsl: computeInitialDsl(vDirected, directedImages),
      });

      if (mergedImages.length > 0) {
        toast({ title: `${mergedImages.length} imagem(ns) vinculada(s) à adaptação` });
      }
    } catch (e: any) {
      if (e.name === "AbortError") return; // Superseded by a newer generation
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
    const registry = data.editorImageRegistry ?? {};
    const expandedUniversal = toRawDsl(universalValue, registry);
    const expandedDirected = toRawDsl(directedValue, registry);
    // Preserves editableActivity when the user didn't actually change the
    // text — only invalidates the version(s) that changed.
    const patch = buildAIEditorAdvancePatch(data, expandedUniversal, expandedDirected);
    // Keep drafts in sync with what we wrote to `result` (expanded URLs), so
    // the next round-trip comparison sees the same representation on both
    // sides instead of placeholders-vs-URLs.
    updateData({
      ...patch,
      aiEditorUniversalDsl: expandedUniversal,
      aiEditorDirectedDsl: expandedDirected,
    });
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

  return (
    <div className="space-y-4">
      {/* Header */}
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

      {/* Tab selector */}
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

      {/* Editor — full-bleed: fills entire main area (viewport minus sidebar).
          overflow-x-hidden is disabled on the wizard wrapper for this step.
          Negative margins cancel Layout padding (px-3/sm:px-4/lg:px-6) + wizard px-1.
          Width fills all available space = viewport - sidebar (16rem). */}
      <div className="-mx-4 sm:-mx-5 lg:-mx-7">
        {activeTab === "universal" ? (
          <ActivityEditor
            value={universalValue}
            onChange={(v) => updateData({ aiEditorUniversalDsl: v })}
            imageRegistry={data.editorImageRegistry}
            onImageRegistryChange={(registry) => updateData({ editorImageRegistry: registry })}
          />
        ) : (
          <ActivityEditor
            value={directedValue}
            onChange={(v) => updateData({ aiEditorDirectedDsl: v })}
            imageRegistry={data.editorImageRegistry}
            onImageRegistryChange={(registry) => updateData({ editorImageRegistry: registry })}
          />
        )}
      </div>

      {/* Navigation */}
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
