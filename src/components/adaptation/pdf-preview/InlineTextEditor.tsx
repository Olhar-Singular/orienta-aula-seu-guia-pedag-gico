import { useEditor, EditorContent } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import TextNode from "@tiptap/extension-text";
import HardBreak from "@tiptap/extension-hard-break";
import History from "@tiptap/extension-history";
import TextStyle from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { useEffect } from "react";
import { Palette, X } from "lucide-react";
import type { InlineRun } from "@/types/adaptation";
import {
  buildInitialHtml,
  extractRuns,
  hasAnyColor,
  normalizeColor,
} from "@/lib/pdf/inlineRunUtils";

const COLOR_PALETTE: { value: string; label: string }[] = [
  { value: "#dc2626", label: "Vermelho" },
  { value: "#d97706", label: "Laranja" },
  { value: "#16a34a", label: "Verde" },
  { value: "#2563eb", label: "Azul" },
  { value: "#7c3aed", label: "Roxo" },
  { value: "#0f172a", label: "Preto" },
];

type EmitShape = { content: string; richContent?: InlineRun[] };

type Props = {
  content: string;
  richContent?: InlineRun[];
  onChange: (value: EmitShape) => void;
};

export default function InlineTextEditor({ content, richContent, onChange }: Props) {
  const editor = useEditor({
    // Read-only text: edição de conteúdo mora no step do editor textual.
    // Aqui só aplicamos estilo (cor) sobre seleções.
    editable: false,
    extensions: [
      Document,
      Paragraph,
      TextNode,
      HardBreak,
      History,
      TextStyle,
      Color,
    ],
    content: buildInitialHtml(content, richContent),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[60px] px-2 py-1.5",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const json = ed.getJSON();
      const { runs, plain } = extractRuns(json);
      onChange({
        content: plain,
        richContent: hasAnyColor(runs) ? runs : undefined,
      });
    },
  });

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  if (!editor) return null;

  const hasSelection = !editor.state.selection.empty;
  const activeColor = normalizeColor(
    (editor.getAttributes("textStyle") as { color?: string }).color,
  );

  return (
    <div className="rounded border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 bg-gray-50 px-1.5 py-1">
        <Palette className="h-3 w-3 text-gray-400" />
        <span className="text-[10px] text-gray-500">Cor:</span>
        {COLOR_PALETTE.map((c) => {
          const isActive = activeColor === normalizeColor(c.value);
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => editor.chain().focus().setColor(c.value).run()}
              disabled={!hasSelection && !isActive}
              className={`h-4 w-4 rounded-full border transition-all disabled:opacity-40 ${
                isActive ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-300 hover:border-gray-500"
              }`}
              style={{ backgroundColor: c.value }}
              title={hasSelection ? `Pintar de ${c.label}` : `Selecione texto para pintar de ${c.label}`}
              aria-label={`Pintar de ${c.label}`}
            />
          );
        })}
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetColor().run()}
          disabled={!activeColor && !hasSelection}
          className="ml-1 inline-flex items-center gap-0.5 rounded border border-gray-200 bg-white px-1 py-0.5 text-[10px] text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          title="Remover cor"
        >
          <X className="h-2.5 w-2.5" /> Sem cor
        </button>
        <span className="ml-auto text-[10px] text-gray-400">
          {hasSelection ? "Clique numa cor" : "Selecione um trecho"}
        </span>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
