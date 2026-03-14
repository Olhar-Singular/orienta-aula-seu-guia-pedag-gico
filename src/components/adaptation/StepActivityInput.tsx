import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Type, Database, FileUp, Crop, Search, Check } from "lucide-react";

type Props = {
  value: string;
  onChange: (text: string) => void;
  onNext: () => void;
  onPrev: () => void;
};

type Tab = "manual" | "banco" | "arquivo" | "imagem";

type BankQuestion = {
  id: string;
  text: string;
  subject: string;
  topic: string | null;
  options: any;
};

export default function StepActivityInput({ value, onChange, onNext, onPrev }: Props) {
  const [tab, setTab] = useState<Tab>("manual");
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [bankSearch, setBankSearch] = useState("");
  const [bankLoading, setBankLoading] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());

  // File extraction state
  const [fileExtracting, setFileExtracting] = useState(false);

  const tabs: { key: Tab; label: string; icon: typeof Type }[] = [
    { key: "manual", label: "Colar Texto", icon: Type },
    { key: "banco", label: "Banco de Questões", icon: Database },
    { key: "arquivo", label: "Upload de Arquivo", icon: FileUp },
    { key: "imagem", label: "Recortar Imagem", icon: Crop },
  ];

  const fetchBankQuestions = useCallback(async () => {
    setBankLoading(true);
    let query = (supabase.from as any)("question_bank")
      .select("id, text, subject, topic, options")
      .order("created_at", { ascending: false })
      .limit(50);
    if (bankSearch.trim()) {
      query = query.ilike("text", `%${bankSearch.trim()}%`);
    }
    const { data } = await query;
    setBankQuestions(data || []);
    setBankLoading(false);
  }, [bankSearch]);

  useEffect(() => {
    if (showBankModal) fetchBankQuestions();
  }, [showBankModal, fetchBankQuestions]);

  const toggleQuestion = (id: string) => {
    setSelectedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmBankSelection = () => {
    const selected = bankQuestions.filter((q) => selectedQuestions.has(q.id));
    const text = selected
      .map((q, i) => {
        let questionText = `${i + 1}) ${q.text}`;
        if (q.options && Array.isArray(q.options)) {
          questionText += "\n" + q.options.map((o: string, j: number) => `   ${String.fromCharCode(65 + j)}) ${o}`).join("\n");
        }
        return questionText;
      })
      .join("\n\n");
    onChange(value ? value + "\n\n" + text : text);
    setShowBankModal(false);
    setSelectedQuestions(new Set());
    toast({ title: `${selected.length} questão(ões) adicionada(s)` });
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
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={10}
          placeholder="Cole ou digite o texto da atividade aqui..."
          className="font-mono text-sm"
        />
      )}

      {tab === "banco" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Selecione questões do seu banco para compor a atividade.
          </p>
          <Button onClick={() => setShowBankModal(true)} variant="outline">
            <Database className="w-4 h-4 mr-1" /> Abrir Banco de Questões
          </Button>
          {value && (
            <div className="border rounded-lg p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Conteúdo selecionado:</p>
              <p className="text-sm whitespace-pre-wrap line-clamp-6">{value}</p>
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Selecionar Questões</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                placeholder="Buscar questões..."
                className="flex-1"
              />
              <Button size="icon" variant="outline" onClick={fetchBankQuestions}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
            {bankLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : bankQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma questão encontrada.</p>
            ) : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {bankQuestions.map((q) => (
                  <div
                    key={q.id}
                    onClick={() => toggleQuestion(q.id)}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedQuestions.has(q.id) ? "ring-2 ring-primary bg-primary/5" : "hover:bg-accent/50"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <p className="text-sm line-clamp-2 flex-1">{q.text}</p>
                      {selectedQuestions.has(q.id) && (
                        <Check className="w-4 h-4 text-primary shrink-0 ml-2" />
                      )}
                    </div>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">{q.subject}</Badge>
                      {q.topic && <Badge variant="outline" className="text-xs">{q.topic}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button
              onClick={confirmBankSelection}
              disabled={selectedQuestions.size === 0}
              className="w-full"
            >
              Adicionar {selectedQuestions.size} questão(ões)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
