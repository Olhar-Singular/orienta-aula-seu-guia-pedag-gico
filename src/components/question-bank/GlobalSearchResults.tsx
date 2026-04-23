import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, Trash2, Search } from "lucide-react";
import { renderMathToHtml } from "@/lib/latexRenderer";
import { resolveUnclassifiedLabel } from "@/lib/questionFolders";
import type { Question } from "./QuestionListView";

interface Props {
  query: string;
  results: Question[];
  loading: boolean;
  onEdit: (q: Question) => void;
  onDelete: (id: string) => void;
  onPreviewImage: (url: string) => void;
  deletingId: string | null;
}

export default function GlobalSearchResults({
  query,
  results,
  loading,
  onEdit,
  onDelete,
  onPreviewImage,
  deletingId,
}: Props) {
  const grouped = useMemo(() => {
    const map = new Map<string, Question[]>();
    for (const q of results) {
      const grade = q.grade ?? resolveUnclassifiedLabel("grade");
      const subj = q.subject || resolveUnclassifiedLabel("subject");
      const key = `${grade} · ${subj}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(q);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [results]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {loading
          ? "Buscando..."
          : `${results.length} resultado${results.length === 1 ? "" : "s"} para "${query}"`}
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : results.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma questão encontrada.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([key, qs]) => (
            <div key={key} className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Badge variant="secondary">{key}</Badge>
                <span className="text-muted-foreground font-normal">
                  {qs.length} questão{qs.length === 1 ? "" : "es"}
                </span>
              </h3>
              <div className="space-y-2">
                {qs.map((q) => (
                  <Card key={q.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-sm line-clamp-2"
                            dangerouslySetInnerHTML={{ __html: renderMathToHtml(q.text) }}
                          />
                          {q.image_url && (
                            <div
                              className="mt-1 inline-block cursor-zoom-in"
                              onClick={() => q.image_url && onPreviewImage(q.image_url)}
                            >
                              <img
                                src={q.image_url}
                                alt=""
                                className="max-h-16 rounded border"
                              />
                            </div>
                          )}
                          {q.topic && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {q.topic}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onEdit(q)}
                            aria-label="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onDelete(q.id)}
                            disabled={deletingId === q.id}
                            aria-label="Excluir"
                          >
                            {deletingId === q.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-destructive" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
