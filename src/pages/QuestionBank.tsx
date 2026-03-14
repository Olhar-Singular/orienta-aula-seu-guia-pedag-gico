import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, FileUp, Crop, Trash2, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import QuestionForm from "@/components/QuestionForm";
import QuestionExtractModal from "@/components/QuestionExtractModal";
import ImageCropperModal from "@/components/ImageCropperModal";

type Question = {
  id: string;
  text: string;
  subject: string;
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

const subjects = [
  "Matemática",
  "Português",
  "Ciências",
  "História",
  "Geografia",
  "Inglês",
  "Arte",
  "Ed. Física",
];

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

export default function QuestionBank() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showExtract, setShowExtract] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const fetchQuestions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = (supabase.from as any)("question_bank")
      .select("*")
      .order("created_at", { ascending: false });

    if (filterSubject !== "all") query = query.eq("subject", filterSubject);
    if (filterDifficulty !== "all") query = query.eq("difficulty", filterDifficulty);
    if (filterSource !== "all") query = query.eq("source", filterSource);

    const { data, error } = await query;
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else setQuestions(data || []);
    setLoading(false);
  }, [user, filterSubject, filterDifficulty, filterSource]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleDelete = async (id: string) => {
    const { error } = await (supabase.from as any)("question_bank").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Questão removida" });
      fetchQuestions();
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">Banco de Questões</h1>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setEditingQuestion(null);
                setShowForm(true);
              }}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" /> Adicionar
            </Button>
            <Button onClick={() => setShowExtract(true)} size="sm" variant="outline">
              <FileUp className="w-4 h-4 mr-1" /> Extrair de Arquivo
            </Button>
            <Button onClick={() => setShowCropper(true)} size="sm" variant="outline">
              <Crop className="w-4 h-4 mr-1" /> Recortar Imagem
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Matéria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
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
          <Select value={filterSource} onValueChange={setFilterSource}>
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
          <p className="text-muted-foreground">Carregando...</p>
        ) : questions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhuma questão encontrada. Comece adicionando!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {questions.map((q) => (
              <Card key={q.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground line-clamp-3">{q.text}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
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
                      {q.image_url && (
                        <img
                          src={q.image_url}
                          alt="Imagem da questão"
                          className="mt-2 max-h-32 rounded border"
                        />
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingQuestion(q);
                          setShowForm(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(q.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
            ))}
          </div>
        )}
      </div>

      <QuestionForm
        open={showForm}
        onOpenChange={setShowForm}
        question={editingQuestion}
        onSaved={fetchQuestions}
      />
      <QuestionExtractModal
        open={showExtract}
        onOpenChange={setShowExtract}
        onSaved={fetchQuestions}
      />
      <ImageCropperModal
        open={showCropper}
        onOpenChange={setShowCropper}
        onSaved={fetchQuestions}
      />
    </Layout>
  );
}
