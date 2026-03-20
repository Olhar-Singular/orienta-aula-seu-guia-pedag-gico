import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ImagePreviewDialog from "@/components/ImagePreviewDialog";
import { Type, Database, FileUp, Crop, Search, Check, Loader2, X, Image as ImageIcon } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";
import type { SelectedQuestion } from "./AdaptationWizard";

type Props = {
  value: string;
  onChange: (text: string) => void;
  selectedQuestions: SelectedQuestion[];
  onSelectedQuestionsChange: (questions: SelectedQuestion[]) => void;
  onNext: () => void;
  onPrev: () => void;
};

type Tab = "manual" | "banco" | "arquivo" | "imagem";

type BankQuestion = {
  id: string;
  text: string;
  subject: string;
  topic: string | null;
  difficulty: string | null;
  image_url: string | null;
  options: any;
};

const subjects = [
  "Física", "Matemática", "Química", "Biologia", "Português",
  "História", "Geografia", "Inglês", "Ciências", "Arte", "Ed. Física", "Geral",
];

const difficulties = [
  { value: "facil", label: "Fácil" },
  { value: "medio", label: "Médio" },
  { value: "dificil", label: "Difícil" },
];

export default function StepActivityInput({ value, onChange, selectedQuestions, onSelectedQuestionsChange, onNext, onPrev }: Props) {
  const [tab, setTab] = useState<Tab>(() => (selectedQuestions.length > 0 ? "banco" : "manual"));
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [bankSearch, setBankSearch] = useState("");
  const [bankLoading, setBankLoading] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // File extraction state
  const [fileExtracting, setFileExtracting] = useState(false);

  // Debounce timer for bank search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tabs: { key: Tab; label: string; icon: typeof Type }[] = [
    { key: "manual", label: "Colar Texto", icon: Type },
    { key: "banco", label: "Banco de Questões", icon: Database },
  ];

  useEffect(() => {
    if (tab === "manual" && selectedQuestions.length > 0) {
      onSelectedQuestionsChange([]);
    }
  }, [tab, selectedQuestions.length, onSelectedQuestionsChange]);

  const fetchBankQuestions = useCallback(async () => {
    setBankLoading(true);
    let query = (supabase.from as any)("question_bank")
      .select("id, text, subject, topic, difficulty, image_url, options")
      .order("created_at", { ascending: false })
      .limit(50);
    if (bankSearch.trim()) {
      query = query.ilike("text", `%${bankSearch.trim()}%`);
    }
    if (filterSubject !== "all") query = query.eq("subject", filterSubject);
    if (filterDifficulty !== "all") query = query.eq("difficulty", filterDifficulty);
    const { data } = await query;
    setBankQuestions(data || []);
    setBankLoading(false);
  }, [bankSearch, filterSubject, filterDifficulty]);

  useEffect(() => {
    if (!showBankModal) return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchBankQuestions();
    }, 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [showBankModal, fetchBankQuestions]);

  const toggleQuestion = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmBankSelection = () => {
    const selected = bankQuestions.filter((q) => checkedIds.has(q.id));
    const newQuestions: SelectedQuestion[] = selected.map((q) => ({
      id: q.id,
      text: q.text,
      image_url: q.image_url,
      options: Array.isArray(q.options) ? q.options : null,
      subject: q.subject,
      topic: q.topic,
      difficulty: q.difficulty,
    }));
    // Merge with existing, avoiding duplicates
    const existingIds = new Set(selectedQuestions.map((q) => q.id));
    const merged = [...selectedQuestions, ...newQuestions.filter((q) => !existingIds.has(q.id))];
    onSelectedQuestionsChange(merged);
    // Also update text
    const text = merged
      .map((q, i) => {
        let questionText = `${i + 1}) ${q.text}`;
        if (q.options && Array.isArray(q.options)) {
          questionText += "\n" + q.options.map((o: string, j: number) => `   ${String.fromCharCode(65 + j)}) ${o}`).join("\n");
        }
        return questionText;
      })
      .join("\n\n");
    onChange(text);
    setShowBankModal(false);
    setCheckedIds(new Set());
    toast({ title: `${selected.length} questão(ões) adicionada(s)` });
  };

  const removeQuestion = (id: string) => {
    const updated = selectedQuestions.filter((q) => q.id !== id);
    onSelectedQuestionsChange(updated);
    const text = updated
      .map((q, i) => {
        let questionText = `${i + 1}) ${q.text}`;
        if (q.options && Array.isArray(q.options)) {
          questionText += "\n" + q.options.map((o: string, j: number) => `   ${String.fromCharCode(65 + j)}) ${o}`).join("\n");
        }
        return questionText;
      })
      .join("\n\n");
    onChange(text);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileExtracting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const session = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-questions`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.data.session?.access_token}` },
          body: formData,
        }
      );
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Falha na extração");
      }
      const data = await resp.json();
      const questions = data.questions || [];
      if (questions.length === 0) {
        toast({ title: "Nenhuma questão encontrada no arquivo.", variant: "destructive" });
        return;
      }
      const text = questions
        .map((q: any, i: number) => {
          let t = `${i + 1}) ${q.text}`;
          if (q.options?.length) {
            t += "\n" + q.options.map((o: string, j: number) => `   ${String.fromCharCode(65 + j)}) ${o}`).join("\n");
          }
          return t;
        })
        .join("\n\n");
      onChange(value ? value + "\n\n" + text : text);
      toast({ title: `${questions.length} questão(ões) extraída(s) do arquivo!` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setFileExtracting(false);
    }
  };

  const handleImageOcr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      toast({ title: "Selecione uma imagem", variant: "destructive" });
      return;
    }
    setFileExtracting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const session = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-questions`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.data.session?.access_token}` },
          body: formData,
        }
      );
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Falha no OCR");
      }
      const data = await resp.json();
      const questions = data.questions || [];
      if (questions.length === 0) {
        toast({ title: "Nenhuma questão identificada na imagem.", variant: "destructive" });
        return;
      }
      const text = questions.map((q: any, i: number) => `${i + 1}) ${q.text}`).join("\n\n");
      onChange(value ? value + "\n\n" + text : text);
      toast({ title: `${questions.length} questão(ões) extraída(s) da imagem!` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setFileExtracting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Insira a atividade para adaptar</h2>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(t.key)}
          >
            <t.icon className="w-4 h-4 mr-1" />
            {t.label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "manual" && (
        <div>
          <RichTextEditor
            content={value}
            onChange={onChange}
            placeholder="Cole ou digite o texto da atividade aqui... Você também pode colar imagens (Ctrl+V) ou inseri-las pelo botão na barra de ferramentas."
          />
        </div>
      )}

      {tab === "banco" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Selecione questões do seu banco para compor a atividade.
          </p>
          <Button onClick={() => setShowBankModal(true)} variant="outline">
            <Database className="w-4 h-4 mr-1" /> Abrir Banco de Questões
          </Button>
          {selectedQuestions.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-medium">
                {selectedQuestions.length} questão(ões) selecionada(s):
              </p>
              {selectedQuestions.map((q, i) => (
                <div key={q.id} className="border rounded-lg p-3 bg-muted/30 relative group">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeQuestion(q.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  <div className="flex gap-3">
                    <span className="text-xs font-bold text-primary shrink-0 mt-0.5">{i + 1})</span>
                    <div className="flex-1 min-w-0 space-y-2">
                      <p className="text-sm line-clamp-3">{q.text}</p>
                      {q.image_url && (
                        <div
                          className="inline-block cursor-zoom-in"
                          onClick={() => setPreviewImageUrl(q.image_url)}
                        >
                          <img
                            src={q.image_url}
                            alt="Imagem da questão"
                            className="max-h-28 rounded border border-border/50"
                            loading="lazy"
                          />
                        </div>
                      )}
                      {q.options && q.options.length > 0 && (
                        <div className="space-y-0.5 pl-2">
                          {q.options.map((o, j) => (
                            <p key={j} className="text-xs text-muted-foreground">
                              {String.fromCharCode(65 + j)}) {o}
                            </p>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">{q.subject}</Badge>
                        {q.topic && <Badge variant="outline" className="text-[10px]">{q.topic}</Badge>}
                        {q.image_url && (
                          <Badge variant="outline" className="text-[10px]">
                            <ImageIcon className="w-2.5 h-2.5 mr-0.5" /> Com imagem
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "arquivo" && (
        <div className="space-y-3">
          <label
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors block"
          >
            <FileUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {fileExtracting ? "Extraindo questões..." : "Arraste um PDF ou Word aqui"}
            </p>
            <input
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={handleFileUpload}
              disabled={fileExtracting}
            />
          </label>
          {value && (
            <div className="border rounded-lg p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Conteúdo extraído:</p>
              <p className="text-sm whitespace-pre-wrap line-clamp-6">{value}</p>
            </div>
          )}
        </div>
      )}

      {tab === "imagem" && (
        <div className="space-y-3">
          <label
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors block"
          >
            <Crop className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {fileExtracting ? "Extraindo texto da imagem..." : "Selecione uma imagem de prova ou atividade"}
            </p>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageOcr}
              disabled={fileExtracting}
            />
          </label>
          {value && (
            <div className="border rounded-lg p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Texto extraído:</p>
              <p className="text-sm whitespace-pre-wrap line-clamp-6">{value}</p>
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {value && tab === "manual" && (
        <p className="text-xs text-muted-foreground">{value.length} caracteres</p>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>Voltar</Button>
        <Button onClick={onNext} disabled={!value.trim()}>Próximo</Button>
      </div>

      {/* Bank Modal */}
      <Dialog open={showBankModal} onOpenChange={setShowBankModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Selecionar Questões</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 flex-1 flex flex-col min-h-0">
            {/* Search + Filters */}
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  placeholder="Buscar questões..."
                  className="pl-9"
                />
              </div>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Matéria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Dificuldade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {difficulties.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Question list */}
            {bankLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : bankQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma questão encontrada.</p>
            ) : (
              <div className="space-y-2 flex-1 overflow-y-auto px-1 py-1">
                {bankQuestions.map((q) => {
                  const isSelected = checkedIds.has(q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => toggleQuestion(q.id)}
                      className={`border rounded-lg p-3 cursor-pointer transition-all flex items-start gap-3 ${
                        isSelected ? "border-primary bg-primary/5 shadow-sm" : "hover:bg-accent/20"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <p className="text-sm line-clamp-2">{q.text}</p>

                      {q.image_url && (
                          <div
                            className="relative inline-block cursor-zoom-in"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImageUrl(q.image_url);
                            }}
                          >
                            <img
                              src={q.image_url}
                              alt="Imagem da questão"
                              className="max-h-24 rounded border"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors rounded">
                              <Search className="w-5 h-5 text-white opacity-0 hover:opacity-100 transition-opacity drop-shadow" />
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 mt-1.5">
                          <Badge variant="secondary" className="text-xs">{q.subject}</Badge>
                          {q.topic && <Badge variant="outline" className="text-xs">{q.topic}</Badge>}
                          {q.difficulty && (
                            <Badge variant="outline" className="text-xs">
                              {difficulties.find((d) => d.value === q.difficulty)?.label || q.difficulty}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Button
              onClick={confirmBankSelection}
              disabled={checkedIds.size === 0}
              className="w-full shrink-0"
            >
              Adicionar {checkedIds.size} questão(ões)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ImagePreviewDialog
        open={!!previewImageUrl}
        onOpenChange={(open) => { if (!open) setPreviewImageUrl(null); }}
        imageUrl={previewImageUrl}
        title="Prévia da imagem da questão"
      />
    </div>
  );
}
