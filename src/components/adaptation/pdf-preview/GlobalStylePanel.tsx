import { useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  ChevronUp,
  Italic,
  Sliders,
} from "lucide-react";
import type { PdfFontFamily, TextStyle } from "@/types/adaptation";
import { TEXT_STYLE_DEFAULTS } from "@/types/adaptation";
import type { GlobalStyleInput } from "@/lib/pdf/applyGlobalStyle";

const STORAGE_KEY = "pdf-editor-global-style";

const FONT_OPTIONS: { value: PdfFontFamily; label: string }[] = [
  { value: "Helvetica", label: "Helvetica" },
  { value: "Courier", label: "Courier" },
  { value: "Times-Roman", label: "Times" },
];
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24];
const LINE_HEIGHTS = [1, 1.2, 1.5, 1.8, 2, 2.5];

const COLOR_PALETTE: { value: string; label: string }[] = [
  { value: "#dc2626", label: "Vermelho" },
  { value: "#d97706", label: "Laranja" },
  { value: "#16a34a", label: "Verde" },
  { value: "#2563eb", label: "Azul" },
  { value: "#7c3aed", label: "Roxo" },
  { value: "#0f172a", label: "Preto" },
];

type IncludeFlags = {
  fontFamily: boolean;
  fontSize: boolean;
  bold: boolean;
  italic: boolean;
  textAlign: boolean;
  lineHeight: boolean;
  color: boolean;
  questionSpacing: boolean;
  alternativeIndent: boolean;
};

type PanelState = {
  style: Required<TextStyle>;
  questionSpacing: number;
  alternativeIndent: number;
  include: IncludeFlags;
};

const INITIAL_STATE: PanelState = {
  style: { ...TEXT_STYLE_DEFAULTS },
  questionSpacing: 20,
  alternativeIndent: 12,
  include: {
    fontFamily: false,
    fontSize: false,
    bold: false,
    italic: false,
    textAlign: false,
    lineHeight: false,
    color: false,
    questionSpacing: false,
    alternativeIndent: false,
  },
};

function loadState(): PanelState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return INITIAL_STATE;
    return {
      style: { ...TEXT_STYLE_DEFAULTS, ...(parsed.style ?? {}) },
      questionSpacing: typeof parsed.questionSpacing === "number" ? parsed.questionSpacing : 20,
      alternativeIndent: typeof parsed.alternativeIndent === "number" ? parsed.alternativeIndent : 12,
      include: { ...INITIAL_STATE.include, ...(parsed.include ?? {}) },
    };
  } catch {
    return INITIAL_STATE;
  }
}

function saveState(state: PanelState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage indisponível — silencioso
  }
}

type Props = {
  onApply: (input: GlobalStyleInput) => void;
};

export default function GlobalStylePanel({ onApply }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState<PanelState>(() => loadState());

  function setStyle<K extends keyof Required<TextStyle>>(key: K, value: Required<TextStyle>[K]) {
    setState((s) => ({ ...s, style: { ...s.style, [key]: value } }));
  }

  function toggleInclude(key: keyof IncludeFlags) {
    setState((s) => ({
      ...s,
      include: { ...s.include, [key]: !s.include[key] },
    }));
  }

  function handleApply() {
    saveState(state);

    const partialStyle: TextStyle = {};
    if (state.include.fontFamily) partialStyle.fontFamily = state.style.fontFamily;
    if (state.include.fontSize) partialStyle.fontSize = state.style.fontSize;
    if (state.include.bold) partialStyle.bold = state.style.bold;
    if (state.include.italic) partialStyle.italic = state.style.italic;
    if (state.include.textAlign) partialStyle.textAlign = state.style.textAlign;
    if (state.include.lineHeight) partialStyle.lineHeight = state.style.lineHeight;
    if (state.include.color) partialStyle.color = state.style.color;

    onApply({
      style: partialStyle,
      include: {
        fontFamily: state.include.fontFamily,
        fontSize: state.include.fontSize,
        bold: state.include.bold,
        italic: state.include.italic,
        textAlign: state.include.textAlign,
        lineHeight: state.include.lineHeight,
        color: state.include.color,
      },
      questionSpacing: state.questionSpacing,
      alternativeIndent: state.alternativeIndent,
      includeQuestionSpacing: state.include.questionSpacing,
      includeAlternativeIndent: state.include.alternativeIndent,
    });
  }

  const s = state.style;
  const inc = state.include;
  const hasAnyInclude =
    inc.fontFamily ||
    inc.fontSize ||
    inc.bold ||
    inc.italic ||
    inc.textAlign ||
    inc.lineHeight ||
    inc.color ||
    inc.questionSpacing ||
    inc.alternativeIndent;

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 text-sm font-semibold text-emerald-900"
      >
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        <Sliders className="h-4 w-4" />
        Edição global
      </button>
      {expanded && (
        <div className="mt-3 space-y-3 text-xs">
          <p className="text-[11px] text-emerald-800">
            Marque os campos que devem ser aplicados a toda a prova e clique em
            "Aplicar". Edições por bloco continuam funcionando.
          </p>

          {/* Fonte */}
          <div className="flex flex-wrap items-center gap-2 rounded border border-emerald-100 bg-white px-2 py-1.5">
            <label className="flex items-center gap-1 text-[11px] text-gray-700">
              <input
                type="checkbox"
                aria-label="Incluir fonte"
                checked={inc.fontFamily}
                onChange={() => toggleInclude("fontFamily")}
                className="rounded"
              />
              Fonte
            </label>
            <select
              aria-label="Fonte"
              value={s.fontFamily}
              onChange={(e) => setStyle("fontFamily", e.target.value as PdfFontFamily)}
              className="h-7 rounded border border-gray-200 bg-white px-1.5 text-xs"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Tamanho */}
          <div className="flex flex-wrap items-center gap-2 rounded border border-emerald-100 bg-white px-2 py-1.5">
            <label className="flex items-center gap-1 text-[11px] text-gray-700">
              <input
                type="checkbox"
                aria-label="Incluir tamanho"
                checked={inc.fontSize}
                onChange={() => toggleInclude("fontSize")}
                className="rounded"
              />
              Tamanho
            </label>
            <select
              aria-label="Tamanho"
              value={s.fontSize}
              onChange={(e) => setStyle("fontSize", Number(e.target.value))}
              className="h-7 rounded border border-gray-200 bg-white px-1.5 text-xs"
            >
              {FONT_SIZES.map((sz) => (
                <option key={sz} value={sz}>{sz}pt</option>
              ))}
            </select>
          </div>

          {/* Negrito / Itálico */}
          <div className="flex flex-wrap items-center gap-2 rounded border border-emerald-100 bg-white px-2 py-1.5">
            <label className="flex items-center gap-1 text-[11px] text-gray-700">
              <input
                type="checkbox"
                aria-label="Incluir negrito"
                checked={inc.bold}
                onChange={() => toggleInclude("bold")}
                className="rounded"
              />
              Negrito
            </label>
            <button
              type="button"
              aria-label="Negrito"
              onClick={() => setStyle("bold", !s.bold)}
              className={`rounded border border-gray-200 px-2 py-0.5 ${s.bold ? "bg-blue-600 text-white" : "bg-white text-gray-600"}`}
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <label className="ml-2 flex items-center gap-1 text-[11px] text-gray-700">
              <input
                type="checkbox"
                aria-label="Incluir itálico"
                checked={inc.italic}
                onChange={() => toggleInclude("italic")}
                className="rounded"
              />
              Itálico
            </label>
            <button
              type="button"
              aria-label="Itálico"
              onClick={() => setStyle("italic", !s.italic)}
              className={`rounded border border-gray-200 px-2 py-0.5 ${s.italic ? "bg-blue-600 text-white" : "bg-white text-gray-600"}`}
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Alinhamento */}
          <div className="flex flex-wrap items-center gap-2 rounded border border-emerald-100 bg-white px-2 py-1.5">
            <label className="flex items-center gap-1 text-[11px] text-gray-700">
              <input
                type="checkbox"
                aria-label="Incluir alinhamento"
                checked={inc.textAlign}
                onChange={() => toggleInclude("textAlign")}
                className="rounded"
              />
              Alinhamento
            </label>
            <div className="flex overflow-hidden rounded border border-gray-200 bg-white">
              {([
                { v: "left", I: AlignLeft, lbl: "Esquerda" },
                { v: "center", I: AlignCenter, lbl: "Centro" },
                { v: "right", I: AlignRight, lbl: "Direita" },
                { v: "justify", I: AlignJustify, lbl: "Justificado" },
              ] as const).map(({ v, I, lbl }) => (
                <button
                  type="button"
                  key={v}
                  aria-label={lbl}
                  onClick={() => setStyle("textAlign", v)}
                  className={`px-1.5 py-0.5 ${s.textAlign === v ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                >
                  <I className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>

          {/* Espaçamento de linha */}
          <div className="flex flex-wrap items-center gap-2 rounded border border-emerald-100 bg-white px-2 py-1.5">
            <label className="flex items-center gap-1 text-[11px] text-gray-700">
              <input
                type="checkbox"
                aria-label="Incluir altura de linha"
                checked={inc.lineHeight}
                onChange={() => toggleInclude("lineHeight")}
                className="rounded"
              />
              Linha
            </label>
            <select
              aria-label="Altura de linha"
              value={s.lineHeight}
              onChange={(e) => setStyle("lineHeight", Number(e.target.value))}
              className="h-7 rounded border border-gray-200 bg-white px-1.5 text-xs"
            >
              {LINE_HEIGHTS.map((lh) => (
                <option key={lh} value={lh}>{lh}x</option>
              ))}
            </select>
          </div>

          {/* Cor */}
          <div className="flex flex-wrap items-center gap-2 rounded border border-emerald-100 bg-white px-2 py-1.5">
            <label className="flex items-center gap-1 text-[11px] text-gray-700">
              <input
                type="checkbox"
                aria-label="Incluir cor"
                checked={inc.color}
                onChange={() => toggleInclude("color")}
                className="rounded"
              />
              Cor
            </label>
            <div className="flex flex-wrap gap-1">
              {COLOR_PALETTE.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  aria-label={c.label}
                  onClick={() => setStyle("color", c.value)}
                  style={{ backgroundColor: c.value }}
                  className={`h-5 w-5 rounded border-2 ${s.color === c.value ? "border-gray-900" : "border-gray-200"}`}
                />
              ))}
            </div>
          </div>

          {/* Espaçamento entre questões */}
          <div className="flex flex-wrap items-center gap-2 rounded border border-emerald-100 bg-white px-2 py-1.5">
            <label className="flex items-center gap-1 text-[11px] text-gray-700">
              <input
                type="checkbox"
                aria-label="Incluir espaçamento entre questões"
                checked={inc.questionSpacing}
                onChange={() => toggleInclude("questionSpacing")}
                className="rounded"
              />
              Espaço entre questões
            </label>
            <input
              aria-label="Espaçamento entre questões"
              type="range"
              min={0}
              max={60}
              step={4}
              value={state.questionSpacing}
              onChange={(e) => setState((st) => ({ ...st, questionSpacing: Number(e.target.value) }))}
              className="h-1 flex-1 cursor-pointer"
            />
            <span className="w-10 text-right tabular-nums text-gray-600">{state.questionSpacing}pt</span>
          </div>

          {/* Recuo de alternativas */}
          <div className="flex flex-wrap items-center gap-2 rounded border border-emerald-100 bg-white px-2 py-1.5">
            <label className="flex items-center gap-1 text-[11px] text-gray-700">
              <input
                type="checkbox"
                aria-label="Incluir recuo de alternativas"
                checked={inc.alternativeIndent}
                onChange={() => toggleInclude("alternativeIndent")}
                className="rounded"
              />
              Recuo das alternativas
            </label>
            <input
              aria-label="Recuo de alternativas"
              type="range"
              min={0}
              max={48}
              step={4}
              value={state.alternativeIndent}
              onChange={(e) => setState((st) => ({ ...st, alternativeIndent: Number(e.target.value) }))}
              className="h-1 flex-1 cursor-pointer"
            />
            <span className="w-10 text-right tabular-nums text-gray-600">{state.alternativeIndent}pt</span>
          </div>
          <p className="text-[10px] text-gray-500">
            "Recuo das alternativas" só afeta questões de múltipla escolha
            (a, b, c…). Em outros tipos de questão a configuração é ignorada.
          </p>

          <button
            type="button"
            onClick={handleApply}
            disabled={!hasAnyInclude}
            className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:hover:bg-gray-300"
          >
            Aplicar a toda a prova
          </button>
        </div>
      )}
    </div>
  );
}
