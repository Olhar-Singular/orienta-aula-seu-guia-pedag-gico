import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, FileEdit, Loader2, RefreshCw } from "lucide-react";
import ActivityEditor from "@/components/editor/ActivityEditor";
import type { StructuredActivity } from "@/types/adaptation";
import { isStructuredActivity } from "@/types/adaptation";
import {
  structuredToMarkdownDsl,
  markdownDslToStructured,
} from "@/lib/activityDslConverter";
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

/** Merge per-question image URLs from the wizard state into the StructuredActivity
 *  so they become [img:URL] lines in the markdown DSL. */
function mergeImages(
  activity: StructuredActivity,
  imageMap: QuestionImageMapLocal
): StructuredActivity {
  if (!imageMap || Object.keys(imageMap).length === 0) return activity;
  return {
    ...activity,
    sections: activity.sections.map((section) => ({
      ...section,
      questions: section.questions.map((q) => {
        const urls = imageMap[String(q.number)] || [];
        if (urls.length === 0) return q;
        return {
          ...q,
          images: [...(q.images || []), ...urls],
        };
      }),
    })),
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

/** Inject [img:URL] lines into DSL text after the matching question number line. */
function injectImagesDsl(dsl: string, imageMap: QuestionImageMapLocal): string {
  if (!imageMap || Object.keys(imageMap).length === 0) return dsl;
  let result = dsl;
  for (const [qNum, urls] of Object.entries(imageMap)) {
    if (!urls || urls.length === 0) continue;
    const imgLines = urls.map((url) => `[img:${url}]`).join("\n");
    // Insert after the line that starts with the question number (e.g. "3) " or "3. ")
    result = result.replace(
      new RegExp(`(^${qNum}\\s*[.)][^\n]*)`, "m"),
      `$1\n${imgLines}`
    );
  }
  return result;
}

function buildQuestionImageMap(
  sectionContent: string,
  selectedQuestions: WizardData["selectedQuestions"]
): QuestionImageMapLocal {
  const parsedQuestions = parseAdaptedQuestions(sectionContent);
  if (parsedQuestions.length === 0 || selectedQuestions.length === 0) return {};
  const map: QuestionImageMapLocal = {};
  selectedQuestions.forEach((sq, index) => {
    if (!sq.image_url) return;
    const adaptedQ = parsedQuestions[index];
    if (!adaptedQ) return;
    if (!map[adaptedQ.number]) map[adaptedQ.number] = [];
    map[adaptedQ.number].push(sq.image_url);
  });
  return map;
}

export default function StepAIEditor({ data, updateData, onNext, onPrev }: Props) {
  const { schoolId } = useUserSchool();
  const [loading, setLoading] = useState(!data.result);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [activeTab, setActiveTab] = useState<"universal" | "directed">("universal");
  const [universalText, setUniversalText] = useState("");
  const [directedText, setDirectedText] = useState("");
  const initialized = useRef(false);

  // Initialize editor text when result is available
  const initEditorText = useCallback(
    (result: AdaptationResult, questionImages: SectionQuestionImages) => {
      // New path: AI returns DSL string directly — inject images inline then use as-is
      // Legacy path: AI returned StructuredActivity JSON — convert to DSL first
      if (typeof result.version_universal === "string") {
        setUniversalText(injectImagesDsl(result.version_universal, questionImages.version_universal || {}));
      } else {
        const universalActivity = mergeImages(toStructured(result.version_universal), questionImages.version_universal || {});
        setUniversalText(structuredToMarkdownDsl(universalActivity));
      }
      if (typeof result.version_directed === "string") {
        setDirectedText(injectImagesDsl(result.version_directed, questionImages.version_directed || {}));
      } else {
        const directedActivity = mergeImages(toStructured(result.version_directed), questionImages.version_directed || {});
        setDirectedText(structuredToMarkdownDsl(directedActivity));
      }
    },
    []
  );

  useEffect(() => {
    if (data.result && !initialized.current) {
      initialized.current = true;
      initEditorText(data.result, data.questionImages);
    }
  }, [data.result, data.questionImages, initEditorText]);

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
    setLoading(true);
    initialized.current = false;
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
      const adaptation: AdaptationResult = result.adaptation;

      updateData({
        result: adaptation,
        contextPillars: result.context_pillars || null,
      });

      const mergedImages = await generateImagesForResult(accessToken);

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

      updateData({
        questionImages: {
          version_universal: universalImages,
          version_directed: directedImages,
        } as SectionQuestionImages,
      });

      if (mergedImages.length > 0) {
        toast({ title: `${mergedImages.length} imagem(ns) vinculada(s) à adaptação` });
      }

      initEditorText(adaptation, {
        version_universal: universalImages,
        version_directed: directedImages,
      });
      initialized.current = true;
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setIsGeneratingImages(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, schoolId, updateData, initEditorText]);

  useEffect(() => {
    if (!data.result) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNext = () => {
    const updatedResult: AdaptationResult = {
      ...(data.result!),
      version_universal: markdownDslToStructured(universalText),
      version_directed: markdownDslToStructured(directedText),
    };
    updateData({ result: updatedResult });
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
          Versão Universal
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
          Versão Direcionada
        </button>
      </div>

      {/* Editor — full-bleed: fills entire main area (viewport minus sidebar).
          overflow-x-hidden is disabled on the wizard wrapper for this step.
          Negative margins cancel: layout p-4/p-6/p-8 + wizard px-1.
          Width fills all available space = viewport - sidebar (16rem). */}
      <div className="-mx-[1.25rem] sm:-mx-[1.75rem] lg:-mx-[2.25rem]">
        {activeTab === "universal" ? (
          <ActivityEditor value={universalText} onChange={setUniversalText} />
        ) : (
          <ActivityEditor value={directedText} onChange={setDirectedText} />
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
