import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { HelpCircle, X, ImageIcon } from "lucide-react";
import EditorToolbar from "./EditorToolbar";
import ActivityPreview from "./ActivityPreview";
import ActivityStatusBar from "./ActivityStatusBar";
import ImageManagerModal from "./ImageManagerModal";
import { registerAndGenerateDsl, scanAndRegisterUrls } from "./imageManagerUtils";
import type { ImageItem, ImageRegistry } from "./imageManagerUtils";
import { parseActivity } from "@/lib/activityParser";
import "katex/dist/katex.min.css";

type Props = {
  value: string;
  onChange: (text: string) => void;
  imageRegistry?: ImageRegistry;
  onImageRegistryChange?: (registry: ImageRegistry) => void;
};

// Max undo states kept in memory
const MAX_HISTORY = 100;

const HINT_ITEMS = [
  { label: "Questão", hints: ["1)", "1."] },
  { label: "Alternativa", hints: ["a)"] },
  { label: "Correta", hints: ["b*)"] },
  { label: "Checkbox", hints: ["[x] item", "[ ] item"] },
  { label: "Seção", hints: ["# Título"] },
  { label: "Lacuna", hints: ["___"] },
  { label: "V/F", hints: ["( ) afirmação"] },
  { label: "Associar", hints: ["item -- item"] },
  { label: "Ordenar", hints: ["[1] item"] },
  { label: "Tabela", hints: ["| col1 | col2 |"] },
  { label: "Negrito", hints: ["**texto**"] },
  { label: "Itálico", hints: ["*texto*"] },
  { label: "Sublinhado", hints: ["__texto__"] },
  { label: "Tachado", hints: ["~~texto~~"] },
  { label: "Math", hints: ["$x^2$", "$$\\frac{a}{b}$$"] },
  { label: "Linhas", hints: ["[linhas:5]"] },
  { label: "Banco", hints: ["[banco: a, b, c]"] },
  { label: "Instrução", hints: ["> texto"] },
  { label: "Separador", hints: ["---"] },
  { label: "Imagem", hints: ["[img:url]"] },
];

export default function ActivityEditor({
  value,
  onChange,
  imageRegistry: externalRegistry,
  onImageRegistryChange,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewText, setPreviewText] = useState(value);
  const [showHelp, setShowHelp] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [internalRegistry, setInternalRegistry] = useState<ImageRegistry>(
    externalRegistry ?? {},
  );
  const imageRegistry = externalRegistry ?? internalRegistry;
  const updateRegistry = useCallback(
    (next: ImageRegistry) => {
      setInternalRegistry(next);
      onImageRegistryChange?.(next);
    },
    [onImageRegistryChange],
  );
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);
  const registryEntries = useMemo(() => Object.entries(imageRegistry), [imageRegistry]);
  const lastScannedRef = useRef("");

  // Auto-detect raw URLs in text and register with short names
  useEffect(() => {
    if (value === lastScannedRef.current) return;
    const result = scanAndRegisterUrls(value, imageRegistry);
    if (result) {
      lastScannedRef.current = result.cleanText;
      updateRegistry(result.updatedRegistry);
      onChange(result.cleanText);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── History (undo / redo) ──────────────────────────────────────────────
  // Mutable history in refs to avoid triggering re-renders on every keystroke.
  const historyRef = useRef<string[]>([value]);
  const historyIdxRef = useRef<number>(0);
  const valueRef = useRef(value);
  const skipPushRef = useRef(false);
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Derived availability — only these two trigger re-renders (button enabled state).
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncAvailability = useCallback(() => {
    setCanUndo(historyIdxRef.current > 0);
    setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
  }, []);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Debounced snapshot for typing — fires 600 ms after the last keystroke.
  useEffect(() => {
    if (skipPushRef.current) {
      skipPushRef.current = false;
      return;
    }
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      const cur = historyRef.current[historyIdxRef.current];
      if (cur !== value) {
        const next = historyRef.current.slice(0, historyIdxRef.current + 1);
        next.push(value);
        if (next.length > MAX_HISTORY) next.shift();
        historyRef.current = next;
        historyIdxRef.current = next.length - 1;
        syncAvailability();
      }
    }, 600);
    return () => {
      if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    };
  }, [value, syncAvailability]);

  // Immediate snapshot — call BEFORE programmatic changes (toolbar, image resize).
  const snapshotNow = useCallback(() => {
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    const cur = historyRef.current[historyIdxRef.current];
    const v = valueRef.current;
    if (cur !== v) {
      const next = historyRef.current.slice(0, historyIdxRef.current + 1);
      next.push(v);
      if (next.length > MAX_HISTORY) next.shift();
      historyRef.current = next;
      historyIdxRef.current = next.length - 1;
      syncAvailability();
    }
  }, [syncAvailability]);

  const handleUndo = useCallback(() => {
    if (historyIdxRef.current > 0) {
      skipPushRef.current = true;
      historyIdxRef.current--;
      onChange(historyRef.current[historyIdxRef.current]);
      syncAvailability();
    }
  }, [onChange, syncAvailability]);

  const handleRedo = useCallback(() => {
    if (historyIdxRef.current < historyRef.current.length - 1) {
      skipPushRef.current = true;
      historyIdxRef.current++;
      onChange(historyRef.current[historyIdxRef.current]);
      syncAvailability();
    }
  }, [onChange, syncAvailability]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (ctrl && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
        return;
      }
    },
    [handleUndo, handleRedo]
  );
  // ──────────────────────────────────────────────────────────────────────

  // Debounced preview update
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setPreviewText(value);
    }, 100);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value]);

  const getNextQuestionNumber = useCallback(() => {
    const parsed = parseActivity(value);
    let n = 0;
    for (const s of parsed.sections) {
      for (const it of s.items) {
        if (it.kind === "question") n++;
      }
    }
    return n + 1;
  }, [value]);

  const handleInsert = useCallback(
    (tpl: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      snapshotNow();
      const start = ta.selectionStart;
      const before = value.slice(0, start);
      const after = value.slice(ta.selectionEnd);
      const prefix = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
      const newValue = before + prefix + tpl + after;
      onChange(newValue);

      // Restore cursor position
      requestAnimationFrame(() => {
        const pos = before.length + prefix.length + tpl.length;
        ta.selectionStart = ta.selectionEnd = pos;
        ta.focus();
      });
    },
    [value, onChange, snapshotNow]
  );

  const handleWrap = useCallback(
    (before: string, after: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      snapshotNow();
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const sel = value.slice(start, end) || "texto";
      const pre = value.slice(0, start);
      const post = value.slice(end);
      const newValue = pre + before + sel + after + post;
      onChange(newValue);

      requestAnimationFrame(() => {
        ta.selectionStart = start + before.length;
        ta.selectionEnd = start + before.length + sel.length;
        ta.focus();
      });
    },
    [value, onChange, snapshotNow]
  );

  const [activeImageName, setActiveImageName] = useState<string | null>(null);

  // Detect which question the cursor is inside + which image line it's on
  const detectActiveQuestion = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const textBefore = value.slice(0, pos);
    // Find the last question header before cursor: "N) " or "N. " or "Questão N"
    const matches = textBefore.match(/(?:^|\n)(\d+)\s*[.)]/g);
    if (matches && matches.length > 0) {
      const last = matches[matches.length - 1];
      const num = last.match(/(\d+)/);
      if (num) setActiveQuestion(parseInt(num[1], 10));
    } else {
      setActiveQuestion(null);
    }
    // Detect if cursor is on an [img:...] line
    const lineStart = value.lastIndexOf("\n", pos - 1) + 1;
    const lineEnd = value.indexOf("\n", pos);
    const currentLine = value.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    const imgMatch = currentLine.match(/^\[img:([^\]\s]+)/);
    setActiveImageName(imgMatch ? imgMatch[1] : null);
  }, [value]);

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const handleImageInsert = useCallback(
    (images: ImageItem[]) => {
      if (images.length === 0) return;
      const { dsl, updatedRegistry } = registerAndGenerateDsl(images, imageRegistry);
      updateRegistry(updatedRegistry);
      handleInsert("\n" + dsl + "\n");
    },
    [handleInsert, imageRegistry, updateRegistry]
  );


  const handleImageResize = useCallback(
    (url: string, width: number) => {
      snapshotNow();
      const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\[img[:\\s]${escaped}(?:\\s[^\\]]*)?\\]`, "g");
      onChange(value.replace(re, `[img:${url} width=${width}]`));
    },
    [value, onChange, snapshotNow]
  );

  return (
    <div className="space-y-0">
      {/* Split layout: editor left, preview right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 min-h-[640px] h-[calc(100vh-260px)]">
        {/* ── LEFT: Editor panel ── */}
        <div className="flex flex-col bg-background border border-border rounded-xl overflow-hidden shadow-sm">
          {/* Panel header */}
          <div className="px-3.5 py-2 border-b border-border bg-muted/50 flex items-center gap-2 text-[0.75rem] font-semibold text-muted-foreground">
            <span className="w-[7px] h-[7px] rounded-full bg-indigo-500" />
            Editor Técnico
          </div>

          {/* Toolbar */}
          <EditorToolbar
            textareaRef={textareaRef}
            onInsert={handleInsert}
            onWrap={handleWrap}
            getNextQuestionNumber={getNextQuestionNumber}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            onImageClick={() => setShowImageModal(true)}
          />

          {/* Textarea */}
          <div className="flex-1 relative min-h-0">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              onKeyUp={detectActiveQuestion}
              onClick={detectActiveQuestion}
              spellCheck={false}
              placeholder="Cole ou digite a atividade aqui..."
              className="absolute inset-0 w-full h-full border-none outline-none resize-none p-3.5 font-mono text-[0.78rem] leading-[1.75] text-zinc-800 bg-white"
              style={{ tabSize: 2 }}
            />
          </div>

          {/* Registered images bar — thumbnails with cursor-aware highlight */}
          {registryEntries.length > 0 && (
            <div className="border-t border-border bg-emerald-50/60 px-3 py-2 flex items-center gap-2.5 overflow-x-auto">
              <ImageIcon className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              {registryEntries.map(([name, src]) => {
                const isActive = activeImageName === name;
                return (
                  <div
                    key={name}
                    className={`flex flex-col items-center gap-1 rounded-md px-1.5 py-1 flex-shrink-0 transition-all ${isActive ? "bg-emerald-100 ring-2 ring-emerald-400 shadow-sm" : "bg-white border border-emerald-200"}`}
                    title={`Usado como [img:${name}]`}
                  >
                    <img
                      src={src}
                      alt={name}
                      className={`rounded object-cover border ${isActive ? "w-14 h-10 border-emerald-400" : "w-10 h-7 border-emerald-200"}`}
                    />
                    <span className={`font-mono font-medium ${isActive ? "text-[0.68rem] text-emerald-800" : "text-[0.6rem] text-emerald-600"}`}>
                      {name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Help bar */}
          <div className="border-t border-border bg-muted/50">
            <div className="flex items-center justify-between px-3.5 py-1">
              <span className="text-[0.65rem] text-muted-foreground">
                {showHelp ? "Referência de sintaxe" : "Sintaxe DSL disponível"}
              </span>
              <button
                type="button"
                onClick={() => setShowHelp((h) => !h)}
                className="inline-flex items-center gap-1 text-[0.68rem] text-muted-foreground hover:text-foreground transition-colors"
                title={showHelp ? "Fechar ajuda" : "Mostrar ajuda de sintaxe"}
              >
                {showHelp ? <X className="w-3.5 h-3.5" /> : <HelpCircle className="w-3.5 h-3.5" />}
                {showHelp ? "Fechar" : "Ajuda"}
              </button>
            </div>
            {showHelp && (
              <div className="px-3.5 pb-2.5 text-[0.64rem] text-muted-foreground leading-[1.8] flex flex-wrap gap-x-3 gap-y-1 border-t border-border/60 pt-1.5">
                {HINT_ITEMS.map((h, i) => (
                  <span key={i}>
                    {h.label}:{" "}
                    {h.hints.map((hint, j) => (
                      <code
                        key={j}
                        className="bg-indigo-50 rounded px-1 py-px font-mono text-indigo-600 text-[0.62rem]"
                      >
                        {hint}
                      </code>
                    ))}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Preview panel ── */}
        <div className="flex flex-col bg-background border border-border rounded-xl overflow-hidden shadow-sm">
          {/* Panel header */}
          <div className="px-3.5 py-2 border-b border-border bg-muted/50 flex items-center gap-2 text-[0.75rem] font-semibold text-muted-foreground">
            <span className="w-[7px] h-[7px] rounded-full bg-emerald-500" />
            Prévia em Tempo Real
          </div>

          {/* Preview content */}
          <div className="flex-1 overflow-y-auto">
            <ActivityPreview text={previewText} onImageResize={handleImageResize} imageRegistry={imageRegistry} activeQuestion={activeQuestion} />
          </div>
        </div>
      </div>

      {/* Status bar */}
      <ActivityStatusBar text={previewText} />

      {/* Image manager modal */}
      <ImageManagerModal
        open={showImageModal}
        onClose={() => setShowImageModal(false)}
        onConfirm={handleImageInsert}
      />
    </div>
  );
}
