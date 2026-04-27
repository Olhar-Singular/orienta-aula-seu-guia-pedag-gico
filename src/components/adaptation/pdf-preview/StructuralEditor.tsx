import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Image as ImageIcon,
  Italic,
  Minus,
  Plus,
  SeparatorHorizontal,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import type { ContentBlock, TextStyle, PdfFontFamily, ActivityHeader, InlineRun } from "@/types/adaptation";
import { TEXT_STYLE_DEFAULTS } from "@/types/adaptation";
import type { EditableActivity, EditableQuestion } from "@/lib/pdf/editableActivity";
import { applyGlobalStyle, type GlobalStyleInput } from "@/lib/pdf/applyGlobalStyle";
import InlineTextEditor from "./InlineTextEditor";
import GlobalStylePanel from "./GlobalStylePanel";

/** Strip properties that match TEXT_STYLE_DEFAULTS so we only store real overrides. */
function stripDefaults(style: TextStyle): TextStyle | undefined {
  const result: Partial<TextStyle> = {};
  for (const key of Object.keys(style) as Array<keyof TextStyle>) {
    if (style[key] !== TEXT_STYLE_DEFAULTS[key]) {
      (result as Record<string, unknown>)[key] = style[key];
    }
  }
  return Object.keys(result).length > 0 ? (result as TextStyle) : undefined;
}

type Props = {
  activity: EditableActivity;
  onChange: (next: EditableActivity) => void;
  selectedQuestionId: string | null;
  onSelectQuestion: (id: string | null) => void;
};

// ID helpers
function slotId(questionId: string, blockIndex: number): string {
  return `slot:${questionId}:${blockIndex}`;
}
function parseSlotId(id: string) {
  if (!id.startsWith("slot:")) return null;
  const parts = id.split(":");
  if (parts.length !== 3) return null;
  return { questionId: parts[1], blockIndex: Number(parts[2]) };
}
function draggableId(questionId: string, blockId: string): string {
  return `drag:${questionId}:${blockId}`;
}
function parseDraggableId(id: string) {
  if (!id.startsWith("drag:")) return null;
  const parts = id.split(":");
  if (parts.length !== 3) return null;
  return { questionId: parts[1], blockId: parts[2] };
}
function questionDraggableId(questionId: string): string {
  return `qdrag:${questionId}`;
}
function parseQuestionDraggableId(id: string) {
  if (!id.startsWith("qdrag:")) return null;
  return { questionId: id.slice(6) };
}
function questionSlotId(index: number): string {
  return `qslot:${index}`;
}
function parseQuestionSlotId(id: string) {
  if (!id.startsWith("qslot:")) return null;
  return { index: Number(id.slice(6)) };
}

// Slot - drop zone between blocks
function Slot({ id, onInsertPageBreak }: { id: string; onInsertPageBreak: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`group relative flex h-3 items-center justify-center transition-all ${isOver ? "h-8" : ""}`}
    >
      <div className={`h-0.5 w-full transition-colors ${isOver ? "bg-blue-500" : "bg-transparent group-hover:bg-gray-200"}`} />
      <button
        type="button"
        onClick={onInsertPageBreak}
        className="absolute right-2 hidden rounded-full border border-gray-300 bg-white p-0.5 text-gray-500 shadow-sm hover:border-blue-500 hover:text-blue-600 group-hover:block"
        title="Inserir quebra de pagina"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

// Question Slot - drop zone between questions
function QuestionSlot({ index }: { index: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: questionSlotId(index) });
  return (
    <div
      ref={setNodeRef}
      className={`flex h-2 items-center transition-all ${isOver ? "h-10 rounded border-2 border-dashed border-green-400 bg-green-50" : ""}`}
    >
      {isOver && <span className="mx-auto text-xs text-green-700">Soltar aqui</span>}
    </div>
  );
}

// Text Block Row
const FONT_OPTIONS: { value: PdfFontFamily; label: string }[] = [
  { value: "Helvetica", label: "Helvetica" },
  { value: "Courier", label: "Courier" },
  { value: "Times-Roman", label: "Times" },
];
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24];

function TextBlockRow({
  block,
  questionId,
  onStyleChange,
  onContentChange,
}: {
  block: Extract<ContentBlock, { type: "text" }>;
  questionId: string;
  onStyleChange: (style: TextStyle) => void;
  onContentChange: (value: { content: string; richContent?: InlineRun[] }) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const s = { ...TEXT_STYLE_DEFAULTS, ...block.style };
  const preview = block.content.length > 80 ? block.content.slice(0, 80) + "\u2026" : block.content;
  const hasCustomStyle = block.style && Object.keys(block.style).length > 0;
  const hasRichContent = !!block.richContent && block.richContent.length > 0;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: draggableId(questionId, block.id),
  });

  return (
    <div ref={setNodeRef} {...attributes} className={`rounded-md border border-gray-200 bg-white text-sm ${isDragging ? "opacity-30" : ""}`}>
      <div className="flex w-full items-start gap-1 px-2 py-2">
        <button {...listeners} className="mt-0.5 cursor-grab rounded p-0.5 text-gray-400 hover:bg-gray-100 active:cursor-grabbing" aria-label="Arrastar bloco de texto">
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => setExpanded(!expanded)} className="flex flex-1 items-start gap-1.5 text-left hover:bg-gray-50">
          <Type className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
          <p className="flex-1 whitespace-pre-wrap text-gray-700">{preview}</p>
          {hasRichContent && (
            <span className="mt-0.5 rounded bg-fuchsia-100 px-1.5 py-0.5 text-[10px] font-medium text-fuchsia-700">colorido</span>
          )}
          {hasCustomStyle && (
            <span className="mt-0.5 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">estilizado</span>
          )}
          {expanded ? <ChevronUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" /> : <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />}
        </button>
      </div>
      {expanded && (
        <div className="space-y-2 border-t border-gray-100 bg-gray-50 px-3 py-2">
          <InlineTextEditor
            content={block.content}
            richContent={block.richContent}
            onChange={onContentChange}
          />
          <div className="flex flex-wrap items-center gap-2">
            <select value={s.fontFamily} onChange={(e) => onStyleChange({ ...s, fontFamily: e.target.value as PdfFontFamily })} className="h-7 rounded border border-gray-200 bg-white px-1.5 text-xs">
              {FONT_OPTIONS.map((f) => (<option key={f.value} value={f.value}>{f.label}</option>))}
            </select>
            <div className="flex items-center gap-1 rounded border border-gray-200 bg-white px-1 py-0.5">
              <button onClick={() => onStyleChange({ ...s, fontSize: Math.max(6, s.fontSize - 1) })} className="text-gray-500 hover:text-gray-900"><Minus className="h-3 w-3" /></button>
              <select value={s.fontSize} onChange={(e) => onStyleChange({ ...s, fontSize: Number(e.target.value) })} className="h-5 w-10 border-0 bg-transparent text-center text-xs focus:ring-0">
                {FONT_SIZES.map((sz) => (<option key={sz} value={sz}>{sz}</option>))}
              </select>
              <button onClick={() => onStyleChange({ ...s, fontSize: Math.min(36, s.fontSize + 1) })} className="text-gray-500 hover:text-gray-900"><Plus className="h-3 w-3" /></button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded border border-gray-200 bg-white">
              <button onClick={() => onStyleChange({ ...s, bold: !s.bold })} className={`px-1.5 py-0.5 ${s.bold ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"}`} title="Negrito"><Bold className="h-3.5 w-3.5" /></button>
              <button onClick={() => onStyleChange({ ...s, italic: !s.italic })} className={`px-1.5 py-0.5 ${s.italic ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"}`} title="Italico"><Italic className="h-3.5 w-3.5" /></button>
            </div>
            <div className="flex overflow-hidden rounded border border-gray-200 bg-white">
              {([{ v: "left", I: AlignLeft }, { v: "center", I: AlignCenter }, { v: "right", I: AlignRight }, { v: "justify", I: AlignJustify }] as const).map(({ v, I }) => (
                <button key={v} onClick={() => onStyleChange({ ...s, textAlign: v })} className={`px-1.5 py-0.5 ${s.textAlign === v ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"}`} title={v}><I className="h-3.5 w-3.5" /></button>
              ))}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className="whitespace-nowrap">Linha:</span>
              <select value={s.lineHeight} onChange={(e) => onStyleChange({ ...s, lineHeight: Number(e.target.value) })} className="h-5 rounded border border-gray-200 bg-white px-1 text-xs">
                {[1, 1.2, 1.5, 1.8, 2, 2.5].map((lh) => (<option key={lh} value={lh}>{lh}x</option>))}
              </select>
            </div>
          </div>
          {hasCustomStyle && (
            <button onClick={() => onStyleChange({})} className="text-[10px] text-gray-500 underline hover:text-gray-700">Resetar estilo</button>
          )}
        </div>
      )}
    </div>
  );
}

// Image Block Row
function ImageBlockRow({
  block,
  questionId,
  onSizeChange,
  onAlignmentChange,
  onDelete,
}: {
  block: Extract<ContentBlock, { type: "image" }>;
  questionId: string;
  onSizeChange: (newWidth: number) => void;
  onAlignmentChange: (alignment: "left" | "center" | "right") => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: draggableId(questionId, block.id),
  });

  return (
    <div ref={setNodeRef} {...attributes} className={`flex flex-wrap items-center gap-2 rounded-md border-2 border-dashed border-purple-300 bg-purple-50 px-2 py-2 text-sm ${isDragging ? "opacity-30" : ""}`}>
      <button {...listeners} className="cursor-grab rounded p-1 text-purple-500 hover:bg-purple-100 active:cursor-grabbing" aria-label="Arrastar imagem"><GripVertical className="h-4 w-4" /></button>
      <ImageIcon className="h-4 w-4 shrink-0 text-purple-600" />
      <img src={block.src} alt="" className="h-10 w-14 shrink-0 rounded border border-purple-200 object-cover" />
      <div className="flex flex-wrap items-center gap-1">
        <div className="flex items-center gap-1 rounded border border-gray-200 bg-white px-1.5 py-0.5">
          <button onClick={() => onSizeChange(Math.max(0.2, block.width - 0.1))} className="text-gray-500 hover:text-gray-900" title="Diminuir"><Minus className="h-3 w-3" /></button>
          <span className="w-8 text-center text-xs tabular-nums text-gray-700">{Math.round(block.width * 100)}%</span>
          <button onClick={() => onSizeChange(Math.min(1, block.width + 0.1))} className="text-gray-500 hover:text-gray-900" title="Aumentar"><Plus className="h-3 w-3" /></button>
        </div>
        <div className="flex overflow-hidden rounded border border-gray-200 bg-white">
          {(["left", "center", "right"] as const).map((a) => {
            const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : AlignRight;
            return (<button key={a} onClick={() => onAlignmentChange(a)} className={`px-1.5 py-0.5 ${block.alignment === a ? "bg-purple-600 text-white" : "text-gray-500 hover:bg-gray-100"}`} title={`Alinhar ${a}`}><Icon className="h-3 w-3" /></button>);
          })}
        </div>
      </div>
      <button onClick={onDelete} className="rounded p-1 text-red-500 hover:bg-red-100" title="Remover"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  );
}

// Scaffolding Block Row - rendered inline at its position in q.content.
// Amber styling mirrors the PDF output so the editor reflects the final layout.
function ScaffoldingBlockRow({
  block,
  questionId,
  onDelete,
}: {
  block: Extract<ContentBlock, { type: "scaffolding" }>;
  questionId: string;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: draggableId(questionId, block.id),
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className={`rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 ${isDragging ? "opacity-30" : ""}`}
    >
      <div className="mb-1 flex items-center gap-1">
        <button
          {...listeners}
          className="cursor-grab rounded p-0.5 text-amber-500 hover:bg-amber-100 active:cursor-grabbing"
          aria-label="Arrastar bloco de apoio"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
          Apoio ({block.items.length} passos)
        </span>
        <button
          onClick={onDelete}
          className="ml-auto rounded p-0.5 text-amber-700 hover:bg-amber-200"
          title="Remover apoio"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <ol className="list-inside list-decimal space-y-0.5 pl-1 text-[11px] leading-snug text-amber-900">
        {block.items.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
  );
}

// Page Break Row
function PageBreakRow({ onDelete }: { onDelete: () => void }) {
  return (
    <div className="group relative flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
      <div className="h-px flex-1 bg-amber-400" />
      <span>QUEBRA DE PAGINA</span>
      <div className="h-px flex-1 bg-amber-400" />
      <button onClick={onDelete} className="rounded p-0.5 text-amber-700 opacity-0 hover:bg-amber-200 group-hover:opacity-100" title="Remover quebra"><Trash2 className="h-3 w-3" /></button>
    </div>
  );
}

// Alternative Row
function AlternativeRow({ text, index, total, onMoveUp, onMoveDown }: {
  text: string; index: number; total: number; onMoveUp: () => void; onMoveDown: () => void;
}) {
  return (
    <div className="flex items-center gap-1 py-0.5 text-xs text-gray-600">
      <div className="flex flex-col">
        <button onClick={onMoveUp} disabled={index === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-20" title="Mover para cima"><ArrowUp className="h-2.5 w-2.5" /></button>
        <button onClick={onMoveDown} disabled={index === total - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-20" title="Mover para baixo"><ArrowDown className="h-2.5 w-2.5" /></button>
      </div>
      <span className="text-gray-500">{text}</span>
    </div>
  );
}

// Question Layout Controls
function QuestionLayoutControls({ question, onUpdate }: { question: EditableQuestion; onUpdate: (patch: Partial<EditableQuestion>) => void }) {
  const [expanded, setExpanded] = useState(false);
  const spacing = question.spacingAfter ?? 20;
  const answerLines = question.answerLines ?? 0;
  const indent = question.alternativeIndent ?? 12;

  return (
    <div className="mt-2 border-t border-gray-100 pt-2">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[10px] font-medium text-gray-500 hover:text-gray-700">
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Layout da questao
      </button>
      {expanded && (
        <div className="mt-2 space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-gray-500 sm:w-24">Espacamento:</span>
            <input type="range" min={0} max={60} step={4} value={spacing} onChange={(e) => onUpdate({ spacingAfter: Number(e.target.value) })} className="h-1 min-w-0 flex-1 cursor-pointer" />
            <span className="w-8 shrink-0 text-right tabular-nums text-gray-600">{spacing}pt</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-gray-500 sm:w-24">Linhas resposta:</span>
            <input type="range" min={0} max={10} value={answerLines} onChange={(e) => onUpdate({ answerLines: Number(e.target.value) })} className="h-1 min-w-0 flex-1 cursor-pointer" />
            <span className="w-8 shrink-0 text-right tabular-nums text-gray-600">{answerLines}</span>
          </div>
          <label className="flex items-start gap-2 text-gray-500">
            <input type="checkbox" checked={question.showSeparator ?? false} onChange={(e) => onUpdate({ showSeparator: e.target.checked })} className="mt-0.5 rounded" />
            <SeparatorHorizontal className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Separador antes da questao</span>
          </label>
          {question.alternatives && question.alternatives.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-gray-500 sm:w-24">Recuo altern.:</span>
              <input type="range" min={0} max={48} step={4} value={indent} onChange={(e) => onUpdate({ alternativeIndent: Number(e.target.value) })} className="h-1 min-w-0 flex-1 cursor-pointer" />
              <span className="w-8 shrink-0 text-right tabular-nums text-gray-600">{indent}pt</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Header Editor
function HeaderEditor({ header, onChange }: { header: ActivityHeader; onChange: (h: ActivityHeader) => void }) {
  const [expanded, setExpanded] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ ...header, logoSrc: reader.result as string });
    reader.readAsDataURL(file);
  }

  const inputClass =
    "w-full min-w-0 rounded border border-gray-200 bg-white px-2 py-1";

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center gap-2 text-sm font-semibold text-blue-900">
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        Cabecalho
      </button>
      {expanded && (
        <div className="mt-3 space-y-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="shrink-0 text-gray-600">Logo:</span>
            {header.logoSrc ? (
              <div className="flex items-center gap-2">
                <img src={header.logoSrc} alt="Logo" className="h-8 w-8 rounded border border-gray-200 object-contain" />
                <button onClick={() => onChange({ ...header, logoSrc: undefined })} className="text-red-500 hover:text-red-700">remover</button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 rounded border border-blue-300 bg-white px-2 py-1 text-blue-700 hover:bg-blue-50">
                <Upload className="h-3 w-3" />
                Upload
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          </div>
          <label className="block text-gray-600">
            <span className="mb-1 block">Escola:</span>
            <input value={header.schoolName} onChange={(e) => onChange({ ...header, schoolName: e.target.value })} className={inputClass} />
          </label>
          <label className="block text-gray-600">
            <span className="mb-1 block">Disciplina:</span>
            <input value={header.subject} onChange={(e) => onChange({ ...header, subject: e.target.value })} className={inputClass} />
          </label>
          <label className="block text-gray-600">
            <span className="mb-1 block">Professor:</span>
            <input value={header.teacherName} onChange={(e) => onChange({ ...header, teacherName: e.target.value })} className={inputClass} />
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="block text-gray-600">
              <span className="mb-1 block">Turma:</span>
              <input value={header.className} onChange={(e) => onChange({ ...header, className: e.target.value })} className={inputClass} />
            </label>
            <label className="block text-gray-600">
              <span className="mb-1 block">Data:</span>
              <input value={header.date} onChange={(e) => onChange({ ...header, date: e.target.value })} className={inputClass} />
            </label>
          </div>
          <label className="flex items-start gap-2 text-gray-600">
            <input type="checkbox" checked={header.showStudentLine} onChange={(e) => onChange({ ...header, showStudentLine: e.target.checked })} className="mt-0.5 rounded" />
            <span>Campo "Nome do aluno: ___________"</span>
          </label>
        </div>
      )}
    </div>
  );
}

// Question Block
function QuestionBlock({
  question, isSelected, onSelect, onInsertPageBreak, onDeleteBlock,
  onImageSizeChange, onImageAlignmentChange, onTextStyleChange, onTextContentChange, onQuestionUpdate, onAlternativeReorder,
}: {
  question: EditableQuestion; isSelected: boolean; onSelect: () => void;
  onInsertPageBreak: (blockIndex: number) => void; onDeleteBlock: (blockIndex: number) => void;
  onImageSizeChange: (blockIndex: number, width: number) => void;
  onImageAlignmentChange: (blockIndex: number, alignment: "left" | "center" | "right") => void;
  onTextStyleChange: (blockIndex: number, style: TextStyle) => void;
  onTextContentChange: (blockIndex: number, value: { content: string; richContent?: InlineRun[] }) => void;
  onQuestionUpdate: (patch: Partial<EditableQuestion>) => void;
  onAlternativeReorder: (fromIdx: number, toIdx: number) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: questionDraggableId(question.id),
  });

  return (
    <div
      ref={setNodeRef} {...attributes} onClick={onSelect}
      className={`rounded-lg border p-3 transition-colors ${isDragging ? "opacity-30" : ""} ${isSelected ? "border-blue-400 bg-blue-50/30 ring-1 ring-blue-200" : "border-gray-200 bg-white"}`}
    >
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <button {...listeners} className="cursor-grab rounded p-0.5 text-gray-400 hover:bg-gray-100 active:cursor-grabbing" aria-label="Arrastar questao">
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">Questao {question.number}</span>
      </div>
      {question.instruction && (
        <p className="mb-2 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] italic text-gray-600">
          {question.instruction}
        </p>
      )}
      <div className="space-y-0">
        <Slot id={slotId(question.id, 0)} onInsertPageBreak={() => onInsertPageBreak(0)} />
        {question.content.map((block, i) => (
          <div key={block.id}>
            {block.type === "text" && <TextBlockRow block={block} questionId={question.id} onStyleChange={(style) => onTextStyleChange(i, style)} onContentChange={(v) => onTextContentChange(i, v)} />}
            {block.type === "image" && (
              <ImageBlockRow block={block} questionId={question.id} onSizeChange={(w) => onImageSizeChange(i, w)} onAlignmentChange={(a) => onImageAlignmentChange(i, a)} onDelete={() => onDeleteBlock(i)} />
            )}
            {block.type === "page_break" && <PageBreakRow onDelete={() => onDeleteBlock(i)} />}
            {block.type === "scaffolding" && <ScaffoldingBlockRow block={block} questionId={question.id} onDelete={() => onDeleteBlock(i)} />}
            <Slot id={slotId(question.id, i + 1)} onInsertPageBreak={() => onInsertPageBreak(i + 1)} />
          </div>
        ))}
      </div>
      {question.alternatives && question.alternatives.length > 0 && (
        <div className="mt-2 rounded border border-gray-100 bg-gray-50 px-2 py-1.5">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">Alternativas</div>
          {question.alternatives.map((alt, i) => (
            <AlternativeRow key={i} text={alt} index={i} total={question.alternatives!.length} onMoveUp={() => onAlternativeReorder(i, i - 1)} onMoveDown={() => onAlternativeReorder(i, i + 1)} />
          ))}
        </div>
      )}
      {question.checkItems && question.checkItems.length > 0 && (
        <div className="mt-2 rounded border border-gray-100 bg-gray-50 px-2 py-1.5">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">Caixas de seleção</div>
          {question.checkItems.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 py-0.5 text-xs text-gray-600">
              <span className="inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-sm border border-gray-400 text-[9px] font-bold">
                {item.checked ? "x" : ""}
              </span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      )}
      {question.tfItems && question.tfItems.length > 0 && (
        <div className="mt-2 rounded border border-gray-100 bg-gray-50 px-2 py-1.5">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">Verdadeiro / Falso</div>
          {question.tfItems.map((item, i) => {
            const mark = item.marked === true ? "V" : item.marked === false ? "F" : "";
            return (
              <div key={i} className="flex items-center gap-1.5 py-0.5 text-xs text-gray-600">
                <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-gray-400 text-[9px] font-bold">
                  {mark}
                </span>
                <span>{item.text}</span>
              </div>
            );
          })}
        </div>
      )}
      {question.matchPairs && question.matchPairs.length > 0 && (
        <div className="mt-2 rounded border border-gray-100 bg-gray-50 px-2 py-1.5">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">Associação</div>
          {question.matchPairs.map((pair, i) => (
            <div key={i} className="flex items-center gap-1 py-0.5 text-xs text-gray-600">
              <span className="flex-1 truncate font-medium">{pair.left}</span>
              <span className="shrink-0 text-gray-400">—</span>
              <span className="flex-1 truncate">{pair.right}</span>
            </div>
          ))}
        </div>
      )}
      {question.orderItems && question.orderItems.length > 0 && (
        <div className="mt-2 rounded border border-gray-100 bg-gray-50 px-2 py-1.5">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">Ordenação</div>
          {question.orderItems.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 py-0.5 text-xs text-gray-600">
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-gray-400 text-[9px]">
                {item.n}
              </span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      )}
      {question.tableRows && question.tableRows.length > 0 && (
        <div className="mt-2 overflow-x-auto rounded border border-gray-200 bg-gray-50">
          <div className="px-2 pt-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">Tabela</div>
          <table className="w-full border-collapse text-[11px]">
            <tbody>
              {question.tableRows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => {
                    const trimmed = cell.trim();
                    const isCircle = ri > 0 && ci > 0 && trimmed === "( )";
                    const isSquare = ri > 0 && ci > 0 && trimmed === "[ ]";
                    return (
                      <td key={ci} className={`border border-gray-200 px-1.5 py-0.5 text-gray-600 ${ri === 0 ? "bg-gray-100 font-medium" : ""} ${isCircle || isSquare ? "text-center" : ""}`}>
                        {isCircle ? (
                          <span className="inline-block h-3 w-3 rounded-full border border-gray-500" />
                        ) : isSquare ? (
                          <span className="inline-block h-3 w-3 rounded-sm border border-gray-500" />
                        ) : (
                          cell
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {question.answerLines != null && question.answerLines > 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
          <span className="rounded bg-gray-100 px-2 py-0.5 font-medium">{question.answerLines} linhas de resposta</span>
        </div>
      )}
      {question.trailingContent && question.trailingContent.length > 0 && (
        <div className="mt-2 space-y-1 rounded border border-dashed border-amber-300 bg-amber-50/40 px-2 py-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            Depois da resposta
          </div>
          {question.trailingContent.map((block) => {
            if (block.type === "scaffolding") {
              return (
                <div
                  key={block.id}
                  className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 mb-0.5">
                    Apoio ({block.items.length} passos)
                  </div>
                  <ol className="list-inside list-decimal space-y-0.5 pl-1 text-[11px] leading-snug text-amber-900">
                    {block.items.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              );
            }
            if (block.type === "image") {
              return (
                <div
                  key={block.id}
                  className="flex items-center gap-2 rounded border border-purple-200 bg-purple-50 px-2 py-1.5 text-xs text-purple-800"
                >
                  <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                  <img
                    src={block.src}
                    alt=""
                    className="h-8 w-12 shrink-0 rounded border border-purple-200 object-cover"
                  />
                  <span className="truncate">{block.src}</span>
                </div>
              );
            }
            if (block.type === "text") {
              return (
                <div
                  key={block.id}
                  className="rounded border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 whitespace-pre-wrap"
                >
                  {block.content}
                </div>
              );
            }
            if (block.type === "page_break") {
              return (
                <div
                  key={block.id}
                  className="flex items-center gap-2 rounded border border-amber-300 bg-amber-50 px-3 py-1 text-[10px] font-medium text-amber-800"
                >
                  <div className="h-px flex-1 bg-amber-400" />
                  <span>Quebra de página</span>
                  <div className="h-px flex-1 bg-amber-400" />
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
      <QuestionLayoutControls question={question} onUpdate={onQuestionUpdate} />
    </div>
  );
}

// Main Editor
export default function StructuralEditor({ activity, onChange, selectedQuestionId, onSelectQuestion }: Props) {
  const [draggedItem, setDraggedItem] = useState<
    | { kind: "block"; questionId: string; block: ContentBlock }
    | { kind: "question"; question: EditableQuestion }
    | null
  >(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    const qParsed = parseQuestionDraggableId(id);
    if (qParsed) {
      const q = activity.questions.find((q) => q.id === qParsed.questionId);
      if (q) setDraggedItem({ kind: "question", question: q });
      return;
    }
    const bParsed = parseDraggableId(id);
    if (bParsed) {
      const question = activity.questions.find((q) => q.id === bParsed.questionId);
      if (!question) return;
      const block = question.content.find((b) => b.id === bParsed.blockId);
      if (block) setDraggedItem({ kind: "block", questionId: bParsed.questionId, block });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggedItem(null);
    if (!event.over) return;
    const activeId = String(event.active.id);
    const overId = String(event.over.id);

    // Question reorder
    const qSource = parseQuestionDraggableId(activeId);
    const qTarget = parseQuestionSlotId(overId);
    if (qSource && qTarget) {
      const questions = [...activity.questions];
      const fromIdx = questions.findIndex((q) => q.id === qSource.questionId);
      if (fromIdx === -1) return;
      const [moved] = questions.splice(fromIdx, 1);
      let toIdx = qTarget.index;
      if (fromIdx < toIdx) toIdx -= 1;
      questions.splice(toIdx, 0, moved);
      const renumbered = questions.map((q, i) => ({ ...q, number: i + 1 }));
      onChange({ ...activity, questions: renumbered });
      return;
    }

    // Block reorder
    const source = parseDraggableId(activeId);
    const target = parseSlotId(overId);
    if (!source || !target) return;
    const next: EditableActivity = {
      ...activity,
      questions: activity.questions.map((q) => ({ ...q, content: [...q.content] })),
    };
    const sourceQ = next.questions.find((q) => q.id === source.questionId);
    if (!sourceQ) return;
    const sourceIdx = sourceQ.content.findIndex((b) => b.id === source.blockId);
    if (sourceIdx === -1) return;
    const [moved] = sourceQ.content.splice(sourceIdx, 1);
    const targetQ = next.questions.find((q) => q.id === target.questionId);
    if (!targetQ) return;
    let targetIdx = target.blockIndex;
    if (source.questionId === target.questionId && sourceIdx < targetIdx) targetIdx -= 1;
    targetQ.content.splice(targetIdx, 0, moved);
    onChange(next);
  }

  function updateQuestion(questionId: string, updater: (q: EditableQuestion) => EditableQuestion) {
    onChange({ ...activity, questions: activity.questions.map((q) => (q.id === questionId ? updater(q) : q)) });
  }

  function handleAlternativeReorder(questionId: string, fromIdx: number, toIdx: number) {
    if (toIdx < 0) return;
    updateQuestion(questionId, (q) => {
      if (!q.alternatives || toIdx >= q.alternatives.length) return q;
      const alts = [...q.alternatives];
      const [moved] = alts.splice(fromIdx, 1);
      alts.splice(toIdx, 0, moved);
      return { ...q, alternatives: alts };
    });
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-full overflow-y-auto bg-gray-50 p-4">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Estrutura do Documento</h2>
          <p className="text-xs text-gray-500">Arraste questoes, blocos e imagens. Clique no + entre blocos para quebra de pagina.</p>
        </div>
        <div className="mb-4">
          <HeaderEditor header={activity.header} onChange={(header) => onChange({ ...activity, header })} />
        </div>
        <div className="mb-4">
          <GlobalStylePanel
            onApply={(input: GlobalStyleInput) => onChange(applyGlobalStyle(activity, input))}
          />
        </div>
        <label className="mb-3 flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={activity.globalShowSeparators} onChange={(e) => onChange({ ...activity, globalShowSeparators: e.target.checked })} className="rounded" />
          <SeparatorHorizontal className="h-3.5 w-3.5 text-gray-400" />
          Separadores entre todas as questoes
        </label>
        {activity.generalInstructions && (
          <div className="mb-3 rounded-md border-l-4 border-gray-400 bg-gray-100 px-3 py-2 text-xs italic text-gray-700">
            {activity.generalInstructions}
          </div>
        )}
        <div className="space-y-1">
          <QuestionSlot index={0} />
          {activity.questions.map((q, i) => {
            const prevTitle = i > 0 ? activity.questions[i - 1].sectionTitle : undefined;
            const showTitle = q.sectionTitle && q.sectionTitle !== prevTitle;
            return (
            <div key={q.id}>
              {showTitle && (
                <div className="mb-2 mt-3 border-b border-blue-200 pb-1 text-[11px] font-bold uppercase tracking-wider text-blue-700">
                  {q.sectionTitle}
                </div>
              )}
              <QuestionBlock
                question={q} isSelected={selectedQuestionId === q.id}
                onSelect={() => onSelectQuestion(q.id)}
                onInsertPageBreak={(bi) => updateQuestion(q.id, (qq) => {
                  const c = [...qq.content];
                  c.splice(bi, 0, { id: `pb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type: "page_break" });
                  return { ...qq, content: c };
                })}
                onDeleteBlock={(bi) => updateQuestion(q.id, (qq) => ({ ...qq, content: qq.content.filter((_, j) => j !== bi) }))}
                onImageSizeChange={(bi, w) => updateQuestion(q.id, (qq) => ({ ...qq, content: qq.content.map((b, j) => j === bi && b.type === "image" ? { ...b, width: w } : b) }))}
                onImageAlignmentChange={(bi, a) => updateQuestion(q.id, (qq) => ({ ...qq, content: qq.content.map((b, j) => j === bi && b.type === "image" ? { ...b, alignment: a } : b) }))}
                onTextStyleChange={(bi, style) => updateQuestion(q.id, (qq) => ({
                  ...qq, content: qq.content.map((b, j) => j === bi && b.type === "text" ? { ...b, style: stripDefaults(style) } : b),
                }))}
                onTextContentChange={(bi, { content, richContent }) => updateQuestion(q.id, (qq) => ({
                  ...qq, content: qq.content.map((b, j) => j === bi && b.type === "text" ? { ...b, content, richContent } : b),
                }))}
                onQuestionUpdate={(patch) => updateQuestion(q.id, (qq) => ({ ...qq, ...patch }))}
                onAlternativeReorder={(from, to) => handleAlternativeReorder(q.id, from, to)}
              />
              <QuestionSlot index={i + 1} />
            </div>
            );
          })}
        </div>
      </div>
      <DragOverlay>
        {draggedItem?.kind === "block" && draggedItem.block.type === "image" && (
          <div className="flex items-center gap-2 rounded-md border-2 border-purple-500 bg-white px-2 py-2 shadow-lg">
            <ImageIcon className="h-4 w-4 text-purple-600" />
            <span className="text-xs text-gray-600">Movendo imagem...</span>
          </div>
        )}
        {draggedItem?.kind === "block" && draggedItem.block.type === "text" && (
          <div className="flex items-center gap-2 rounded-md border-2 border-blue-500 bg-white px-2 py-2 shadow-lg">
            <Type className="h-4 w-4 text-blue-600" />
            <span className="max-w-[200px] truncate text-xs text-gray-600">{draggedItem.block.content.slice(0, 50)}...</span>
          </div>
        )}
        {draggedItem?.kind === "question" && (
          <div className="rounded-lg border-2 border-green-500 bg-white px-3 py-2 shadow-lg">
            <span className="text-xs font-semibold text-green-700">Questao {draggedItem.question.number}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
