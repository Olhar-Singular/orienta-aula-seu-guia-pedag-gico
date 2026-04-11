import { useEffect, useRef, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import {
  Redo2,
  Undo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
  Palette,
  Save,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import PreviewPdfDocument from "@/lib/pdf/PreviewPdfDocument";
import PdfCanvasPreview from "./pdf-preview/PdfCanvasPreview";
import StructuralEditor from "./pdf-preview/StructuralEditor";
import { useHistory } from "@/hooks/useHistory";
import { toEditableActivity, type EditableActivity } from "@/lib/pdf/editableActivity";
import { applyPreset } from "@/lib/pdf/applyPreset";
import type {
  StructuredActivity,
  ActivityHeader,
  PdfLayoutConfig,
  StylePreset,
} from "@/types/adaptation";
import { STYLE_PRESETS } from "@/types/adaptation";

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function loadSavedTemplates(): StylePreset[] {
  try {
    const raw = localStorage.getItem("pdf-editor-templates");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSavedTemplates(templates: StylePreset[]) {
  localStorage.setItem("pdf-editor-templates", JSON.stringify(templates));
}

type Props = {
  structuredActivity: StructuredActivity;
  header: ActivityHeader;
  questionImages?: Record<string, string[]>;
  savedActivity?: EditableActivity;
  onNext: () => void;
  onBack: () => void;
  onLayoutChange: (config: PdfLayoutConfig) => void;
  onActivityChange?: (activity: EditableActivity) => void;
};

export default function StepPdfPreview({
  structuredActivity,
  header,
  questionImages,
  savedActivity,
  onNext,
  onBack,
  onLayoutChange,
  onActivityChange,
}: Props) {
  // Restore from saved state if available, otherwise convert from structured
  const initialActivity = savedActivity ?? toEditableActivity(structuredActivity, header, questionImages);

  const {
    current: activity,
    set: setActivityInternal,
    undo: undoInternal,
    redo: redoInternal,
    reset,
    canUndo,
    canRedo,
  } = useHistory<EditableActivity>(initialActivity);

  const [blob, setBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<StylePreset[]>(
    loadSavedTemplates,
  );
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    null,
  );
  const genTokenRef = useRef(0);
  const presetMenuRef = useRef<HTMLDivElement>(null);

  // Wrap setActivity to also sync to WizardData
  function setActivity(next: EditableActivity) {
    setActivityInternal(next);
    onActivityChange?.(next);
  }
  function undo() {
    undoInternal();
  }
  function redo() {
    redoInternal();
  }

  // Sync activity to parent after undo/redo (state changes via internal setState)
  const activityRef = useRef(activity);
  useEffect(() => {
    if (activityRef.current !== activity) {
      activityRef.current = activity;
      onActivityChange?.(activity);
    }
  }, [activity, onActivityChange]);

  const debouncedActivity = useDebounced(activity, 200);

  // Generate PDF blob
  useEffect(() => {
    const token = ++genTokenRef.current;
    setIsGenerating(true);

    (async () => {
      try {
        const instance = pdf(
          <PreviewPdfDocument activity={debouncedActivity} />,
        );
        const newBlob = await instance.toBlob();
        if (token !== genTokenRef.current) return;
        setBlob(newBlob);
      } catch (err) {
        console.error("[StepPdfPreview] PDF generation failed:", err);
      } finally {
        if (token === genTokenRef.current) setIsGenerating(false);
      }
    })();
  }, [debouncedActivity]);

  // Close preset menu on outside click
  useEffect(() => {
    if (!showPresetMenu) return;
    function handleClick(e: MouseEvent) {
      if (
        presetMenuRef.current &&
        !presetMenuRef.current.contains(e.target as Node)
      ) {
        setShowPresetMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showPresetMenu]);

  function handleExport() {
    // Build PdfLayoutConfig from current state
    const config: PdfLayoutConfig = {
      header: activity.header,
      globalShowSeparators: activity.globalShowSeparators,
      questionLayouts: {},
      contentOverrides: {},
    };

    for (const q of activity.questions) {
      config.questionLayouts[q.id] = {
        spacingAfter: q.spacingAfter,
        answerLines: q.answerLines,
        showSeparator: q.showSeparator,
        alternativeIndent: q.alternativeIndent,
      };
      config.contentOverrides[q.id] = q.content;
    }

    onLayoutChange(config);
    onNext();
  }

  function handleZoomIn() {
    setZoom((z) => ZOOM_STEPS.find((s) => s > z) ?? z);
  }
  function handleZoomOut() {
    setZoom((z) => [...ZOOM_STEPS].reverse().find((s) => s < z) ?? z);
  }

  function handleApplyPreset(preset: StylePreset) {
    setActivity(applyPreset(activity, preset));
    setShowPresetMenu(false);
  }

  function handleSaveTemplate() {
    const name = prompt("Nome do template:");
    if (!name) return;
    const firstTextBlock = activity.questions
      .flatMap((q) => q.content)
      .find((b) => b.type === "text");
    const baseStyle =
      firstTextBlock?.type === "text" && firstTextBlock.style
        ? firstTextBlock.style
        : {};

    const template: StylePreset = {
      id: `custom-${Date.now()}`,
      name,
      description: "Template salvo pelo professor",
      textStyle: {
        fontSize: baseStyle.fontSize ?? 11,
        fontFamily: baseStyle.fontFamily ?? "Helvetica",
        bold: baseStyle.bold ?? false,
        italic: baseStyle.italic ?? false,
        textAlign: baseStyle.textAlign ?? "justify",
        lineHeight: baseStyle.lineHeight ?? 1.5,
      },
      questionSpacing: activity.questions[0]?.spacingAfter ?? 20,
      alternativeIndent: activity.questions[0]?.alternativeIndent ?? 12,
    };

    const next = [...savedTemplates, template];
    setSavedTemplates(next);
    saveSavedTemplates(next);
  }

  function handleDeleteTemplate(id: string) {
    const next = savedTemplates.filter((t) => t.id !== id);
    setSavedTemplates(next);
    saveSavedTemplates(next);
  }

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[600px] flex-col bg-white">
      {/* Toolbar */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Preview e Layout do PDF
            </h2>
            <p className="text-[10px] text-gray-500">
              Ctrl+Z desfaz, Ctrl+Y refaz
            </p>
          </div>

          {/* Undo/Redo */}
          <div className="flex items-center gap-0.5 rounded border border-gray-200 bg-white">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="rounded-l px-2 py-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
              title="Desfazer (Ctrl+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="rounded-r px-2 py-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
              title="Refazer (Ctrl+Y)"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-0.5 rounded border border-gray-200 bg-white">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= ZOOM_STEPS[0]}
              className="rounded-l px-2 py-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
              title="Diminuir zoom"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="w-10 text-center text-[10px] tabular-nums text-gray-700">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
              className="px-2 py-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
              title="Aumentar zoom"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="rounded-r px-2 py-1.5 text-gray-600 hover:bg-gray-100"
              title="Zoom 100%"
            >
              <Maximize className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Presets */}
          <div className="relative" ref={presetMenuRef}>
            <button
              onClick={() => setShowPresetMenu(!showPresetMenu)}
              className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              <Palette className="h-3.5 w-3.5" />
              Estilos
            </button>
            {showPresetMenu && (
              <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Presets
                </div>
                {STYLE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleApplyPreset(p)}
                    className="flex w-full flex-col px-3 py-2 text-left hover:bg-gray-50"
                  >
                    <span className="text-xs font-medium text-gray-900">
                      {p.name}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {p.description}
                    </span>
                  </button>
                ))}
                {savedTemplates.length > 0 && (
                  <>
                    <div className="mx-3 my-1 h-px bg-gray-100" />
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      Meus Templates
                    </div>
                    {savedTemplates.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50"
                      >
                        <button
                          onClick={() => handleApplyPreset(t)}
                          className="text-xs font-medium text-gray-900"
                        >
                          {t.name}
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(t.id)}
                          className="text-[10px] text-red-500 hover:text-red-700"
                        >
                          remover
                        </button>
                      </div>
                    ))}
                  </>
                )}
                <div className="mx-3 my-1 h-px bg-gray-100" />
                <button
                  onClick={handleSaveTemplate}
                  className="flex w-full items-center gap-1.5 px-3 py-2 text-xs text-blue-600 hover:bg-blue-50"
                >
                  <Save className="h-3 w-3" />
                  Salvar estilo atual como template
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => reset(initialActivity)}
            className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <RotateCcw className="h-3 w-3" />
            Resetar
          </button>
        </div>
      </header>

      {/* Split layout */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-2/5 border-r border-gray-200">
          <StructuralEditor
            activity={activity}
            onChange={setActivity}
            selectedQuestionId={selectedQuestionId}
            onSelectQuestion={setSelectedQuestionId}
          />
        </div>
        <div className="w-3/5">
          <PdfCanvasPreview
            blob={blob}
            isGenerating={isGenerating}
            zoom={zoom}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Editor
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Exportar
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
