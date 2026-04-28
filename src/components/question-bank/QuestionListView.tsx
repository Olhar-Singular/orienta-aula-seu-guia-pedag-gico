import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Loader2, Search, FolderInput } from "lucide-react";
import "katex/dist/katex.min.css";
import { renderMathToHtml } from "@/lib/latexRenderer";

export type Question = {
  id: string;
  text: string;
  subject: string;
  grade: string | null;
  topic: string | null;
  difficulty: string;
  options: any;
  correct_answer: number | null;
  resolution: string | null;
  image_url: string | null;
  source: string | null;
  source_file_name: string | null;
  is_public: boolean;
  created_at: string;
};

interface Props {
  questions: Question[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterDifficulty: string;
  onFilterDifficultyChange: (value: string) => void;
  filterSource: string;
  onFilterSourceChange: (value: string) => void;
  onEdit: (q: Question) => void;
  onDelete: (id: string) => void;
  onMove?: (q: Question) => void;
  onPreviewImage: (url: string) => void;
  deletingId: string | null;
  emptyLabel?: string;
}

const difficulties = [
  { value: "facil", label: "Fácil" },
  { value: "medio", label: "Médio" },
  { value: "dificil", label: "Difícil" },
];

const sourceLabels: Record<string, string> = {
  manual: "Manual",
  pdf_extract: "PDF",
  docx_extract: "Word",
  image_crop: "Imagem",
};

export default function QuestionListView({
  questions,
  loading,
  searchQuery,
  onSearchChange,
  filterDifficulty,
  onFilterDifficultyChange,
  filterSource,
  onFilterSourceChange,
  onEdit,
  onDelete,
  onMove,
  onPreviewImage,
  deletingId,
  emptyLabel,
}: Props) {
  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (filterDifficulty !== "all" && q.difficulty !== filterDifficulty) return false;
      if (filterSource !== "all" && q.source !== filterSource) return false;
      if (searchQuery) {
        const n = searchQuery.toLowerCase();
        return (
          q.text.toLowerCase().includes(n) ||
          (q.topic ?? "").toLowerCase().includes(n) ||
          q.subject.toLowerCase().includes(n)
        );
      }
      return true;
    });
  }, [questions, filterDifficulty, filterSource, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar questão..."
            className="pl-9"
          />
        </div>
        <Select value={filterDifficulty} onValueChange={onFilterDifficultyChange}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Dificuldade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {difficulties.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={onFilterSourceChange}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Fonte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="pdf_extract">PDF</SelectItem>
            <SelectItem value="docx_extract">Word</SelectItem>
            <SelectItem value="image_crop">Imagem</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {searchQuery
              ? "Nenhuma questão encontrada para esta busca."
              : emptyLabel || "Nenhuma questão nesta pasta."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => (
            <QuestionRow
              key={q.id}
              q={q}
              onEdit={() => onEdit(q)}
              onDelete={() => onDelete(q.id)}
              onMove={onMove ? () => onMove(q) : undefined}
              onPreviewImage={onPreviewImage}
              deleting={deletingId === q.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RowProps {
  q: Question;
  onEdit: () => void;
  onDelete: () => void;
  onMove?: () => void;
  onPreviewImage: (url: string) => void;
  deleting: boolean;
}

function QuestionRow({ q, onEdit, onDelete, onMove, onPreviewImage, deleting }: RowProps) {
  const [confirming, setConfirming] = useState(false);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <div
              className="text-sm text-foreground line-clamp-3"
              dangerouslySetInnerHTML={{ __html: renderMathToHtml(q.text) }}
            />
            {q.image_url && (
              <div
                className="mt-2 relative inline-block cursor-zoom-in group"
                onClick={() => q.image_url && onPreviewImage(q.image_url)}
              >
                <img
                  src={q.image_url}
                  alt="Imagem da questão"
                  className="max-h-32 rounded border"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors rounded">
                  <Search className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {q.grade && <Badge variant="secondary">{q.grade}</Badge>}
              <Badge variant="secondary">{q.subject}</Badge>
              {q.topic && <Badge variant="outline">{q.topic}</Badge>}
              <Badge variant="outline">
                {difficulties.find((d) => d.value === q.difficulty)?.label || q.difficulty}
              </Badge>
              {q.source && (
                <Badge variant="outline" className="text-xs">
                  {sourceLabels[q.source] || q.source}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            {onMove && (
              <Button size="icon" variant="ghost" onClick={onMove} aria-label="Mover questão">
                <FolderInput className="w-4 h-4" />
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Editar questão">
              <Pencil className="w-4 h-4" />
            </Button>
            {confirming ? (
              <>
                <Button size="sm" variant="destructive" onClick={onDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                  Cancelar
                </Button>
              </>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setConfirming(true)}
                aria-label="Excluir questão"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
        {q.options && Array.isArray(q.options) && (
          <div className="mt-3 space-y-1">
            {(q.options as string[]).map((opt, i) => (
              <p
                key={i}
                className={`text-sm pl-2 ${
                  i === q.correct_answer
                    ? "font-semibold text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {String.fromCharCode(65 + i)}) {opt}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
