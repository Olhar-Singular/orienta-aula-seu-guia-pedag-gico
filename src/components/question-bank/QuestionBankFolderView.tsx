import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, X, FolderPlus, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserSchool } from "@/hooks/useUserSchool";
import { useQueryClient } from "@tanstack/react-query";

import QuestionForm from "@/components/QuestionForm";
import ImagePreviewDialog from "@/components/ImagePreviewDialog";
import QuestionFolderGrid from "./QuestionFolderGrid";
import QuestionFolderBreadcrumb, { type Crumb } from "./QuestionFolderBreadcrumb";
import QuestionListView, { type Question } from "./QuestionListView";
import GlobalSearchResults from "./GlobalSearchResults";
import RenameFolderDialog from "./RenameFolderDialog";
import MoveQuestionDialog from "./MoveQuestionDialog";
import CreateEmptyFolderDialog from "./CreateEmptyFolderDialog";

import { useQuestionFolders } from "@/hooks/useQuestionFolders";
import { useQuestionFolderPrefs } from "@/hooks/useQuestionFolderPrefs";
import { useQuestions } from "@/hooks/useQuestions";
import { useQuestionSearch } from "@/hooks/useQuestionSearch";
import { resolveUnclassifiedLabel, type Folder as FolderType } from "@/lib/questionFolders";

type FolderView =
  | { level: "grades" }
  | { level: "subjects"; grade: string | null }
  | { level: "questions"; grade: string | null; subject: string | null }
  | { level: "global-search"; query: string };

export default function QuestionBankFolderView() {
  const { user } = useAuth();
  const { schoolId } = useUserSchool();
  const queryClient = useQueryClient();

  const [view, setView] = useState<FolderView>({ level: "grades" });
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<
    | null
    | { level: "grade"; current: string | null }
    | { level: "subject"; current: string | null; grade: string | null }
  >(null);
  const [movingQuestion, setMovingQuestion] = useState<Question | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);

  const gradeLevel = view.level === "grades";
  const subjectLevel = view.level === "subjects";
  const questionsLevel = view.level === "questions";
  const globalSearchLevel = view.level === "global-search";

  const { prefs, reorder } = useQuestionFolderPrefs();

  const gradesQuery = useQuestionFolders("grade", { enabled: gradeLevel });
  const subjectsQuery = useQuestionFolders("subject", {
    enabled: subjectLevel,
    grade: subjectLevel ? (view as any).grade : undefined,
  });
  const questionsQuery = useQuestions({
    grade: questionsLevel ? (view as any).grade : undefined,
    subject: questionsLevel ? (view as any).subject : undefined,
    enabled: questionsLevel,
  });
  const globalSearchQuery = useQuestionSearch({
    query: globalSearchLevel ? (view as any).query : "",
    enabled: globalSearchLevel,
  });

  const invalidateFolders = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["question-folders"] });
    queryClient.invalidateQueries({ queryKey: ["questions"] });
  }, [queryClient]);

  const crumbs: Crumb[] = useMemo(() => {
    const base: Crumb[] = [{ kind: "root" }];
    if (view.level === "subjects" || view.level === "questions") {
      base.push({ kind: "grade", grade: view.grade });
    }
    if (view.level === "questions") {
      base.push({ kind: "subject", grade: view.grade, subject: view.subject });
    }
    if (view.level === "global-search") {
      base.push({ kind: "grade", grade: null });
    }
    return base;
  }, [view]);

  const handleCrumbNavigate = (c: Crumb) => {
    if (c.kind === "root") {
      setView({ level: "grades" });
      setGlobalSearch("");
    } else if (c.kind === "grade") {
      setView({ level: "subjects", grade: c.grade });
    }
  };

  const handleOpenGrade = (f: FolderType) => {
    setView({ level: "subjects", grade: f.key });
    setSearchQuery("");
  };

  const handleOpenSubject = (f: FolderType) => {
    if (view.level !== "subjects") return;
    setView({ level: "questions", grade: view.grade, subject: f.key });
    setSearchQuery("");
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await (supabase.from as any)("question_bank").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Questão removida" });
      invalidateFolders();
    }
    setDeletingId(null);
  };

  const handleEdit = (q: Question) => {
    setEditingQuestion(q);
    setShowForm(true);
  };

  const handleMove = (q: Question) => setMovingQuestion(q);

  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = globalSearch.trim();
    if (q.length < 2) return;
    setView({ level: "global-search", query: q });
  };

  const clearGlobalSearch = () => {
    setGlobalSearch("");
    setView({ level: "grades" });
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header: breadcrumb + global search + add buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <QuestionFolderBreadcrumb crumbs={crumbs} onNavigate={handleCrumbNavigate} />
          <div className="flex gap-2 flex-wrap">
            <form onSubmit={handleGlobalSearchSubmit} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Buscar no banco todo..."
                className="pl-9 pr-8 w-56"
              />
              {globalSearch && (
                <button
                  type="button"
                  onClick={clearGlobalSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Limpar busca"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>
            {gradeLevel && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCreateFolder(true)}
              >
                <FolderPlus className="w-4 h-4 mr-1" /> Nova pasta
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                setEditingQuestion(null);
                setShowForm(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" /> Adicionar Questão
            </Button>
          </div>
        </div>

        {/* Filters indicator */}
        {(filterDifficulty !== "all" || filterSource !== "all") && !gradeLevel && !globalSearchLevel && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Filtros ativos:</span>
            {filterDifficulty !== "all" && (
              <Badge variant="secondary">Dificuldade: {filterDifficulty}</Badge>
            )}
            {filterSource !== "all" && <Badge variant="secondary">Fonte: {filterSource}</Badge>}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setFilterDifficulty("all");
                setFilterSource("all");
              }}
            >
              Limpar filtros
            </Button>
          </div>
        )}

        {/* Content per level */}
        {gradeLevel && (
          <GradeLevelContent
            folders={gradesQuery.folders}
            loading={gradesQuery.loading}
            prefs={prefs}
            onOpen={handleOpenGrade}
            onRename={(f) => setRenameTarget({ level: "grade", current: f.key })}
            onReorder={reorder}
          />
        )}

        {subjectLevel && (
          <SubjectLevelContent
            grade={(view as any).grade}
            folders={subjectsQuery.folders}
            loading={subjectsQuery.loading}
            prefs={prefs}
            onOpen={handleOpenSubject}
            onRename={(f) =>
              setRenameTarget({ level: "subject", current: f.key, grade: (view as any).grade })
            }
            onReorder={reorder}
          />
        )}

        {questionsLevel && (
          <QuestionListView
            questions={questionsQuery.questions}
            loading={questionsQuery.loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterDifficulty={filterDifficulty}
            onFilterDifficultyChange={setFilterDifficulty}
            filterSource={filterSource}
            onFilterSourceChange={setFilterSource}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onMove={handleMove}
            onPreviewImage={setPreviewImageUrl}
            deletingId={deletingId}
            emptyLabel={emptyMessage(view)}
          />
        )}

        {globalSearchLevel && (
          <GlobalSearchResults
            query={(view as any).query}
            results={globalSearchQuery.results}
            loading={globalSearchQuery.loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPreviewImage={setPreviewImageUrl}
            deletingId={deletingId}
          />
        )}
      </div>

      <QuestionForm
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingQuestion(null);
        }}
        question={editingQuestion}
        defaultGrade={questionsLevel ? (view as any).grade : null}
        defaultSubject={questionsLevel ? (view as any).subject : null}
        onSaved={invalidateFolders}
      />

      <ImagePreviewDialog
        open={!!previewImageUrl}
        onOpenChange={(open) => {
          if (!open) setPreviewImageUrl(null);
        }}
        imageUrl={previewImageUrl}
        title="Prévia da imagem da questão"
      />

      <RenameFolderDialog
        target={renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
        onRenamed={() => {
          setRenameTarget(null);
          invalidateFolders();
        }}
      />

      <MoveQuestionDialog
        question={movingQuestion}
        onOpenChange={(open) => !open && setMovingQuestion(null)}
        onMoved={() => {
          setMovingQuestion(null);
          invalidateFolders();
        }}
      />

      <CreateEmptyFolderDialog
        open={showCreateFolder}
        onOpenChange={setShowCreateFolder}
        schoolId={schoolId}
        userId={user?.id ?? null}
        onCreated={() => {
          setShowCreateFolder(false);
          invalidateFolders();
        }}
      />
    </>
  );
}

function emptyMessage(view: FolderView): string {
  if (view.level !== "questions") return "Nenhuma questão.";
  const g = view.grade ?? resolveUnclassifiedLabel("grade");
  const s = view.subject ?? resolveUnclassifiedLabel("subject");
  return `Nenhuma questão em ${g} > ${s}.`;
}

interface GradeContentProps {
  folders: FolderType[];
  loading: boolean;
  prefs: any[];
  onOpen: (f: FolderType) => void;
  onRename: (f: FolderType) => void;
  onReorder: (next: any[]) => Promise<void>;
}

function GradeLevelContent({
  folders,
  loading,
  prefs,
  onOpen,
  onRename,
  onReorder,
}: GradeContentProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (folders.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nenhuma questão no banco ainda. Adicione manualmente ou envie uma prova na aba Provas!
        </CardContent>
      </Card>
    );
  }
  return (
    <QuestionFolderGrid
      folders={folders}
      prefs={prefs}
      level="grade"
      onOpen={onOpen}
      onRename={onRename}
      onReorder={(next) => {
        void onReorder(next);
      }}
    />
  );
}

interface SubjectContentProps extends GradeContentProps {
  grade: string | null;
}

function SubjectLevelContent({
  grade,
  folders,
  loading,
  prefs,
  onOpen,
  onRename,
  onReorder,
}: SubjectContentProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (folders.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nenhuma matéria em {grade ?? "Sem série"}.
        </CardContent>
      </Card>
    );
  }
  return (
    <QuestionFolderGrid
      folders={folders}
      prefs={prefs}
      level="subject"
      parentGrade={grade}
      onOpen={onOpen}
      onRename={onRename}
      onReorder={(next) => {
        void onReorder(next);
      }}
    />
  );
}
