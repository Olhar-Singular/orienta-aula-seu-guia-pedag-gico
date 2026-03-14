import { useState, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Upload, FileText, Sparkles, Copy, Printer, Edit, Save, MessageSquare, Star, BookOpen, Loader2, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { streamAI } from "@/lib/streamAI";
import { useSubscription } from "@/hooks/useSubscription";
import CreditGuard from "@/components/CreditGuard";

const STEPS = ["Contexto", "Questionário", "Modo", "Configurações", "Gerar"];

const activityTypes = ["Prova/Avaliação", "Exercício em sala", "Lista de exercícios", "Atividade de treino", "Trabalho em grupo", "Atividade interdisciplinar", "Projeto", "Lição de casa", "Resumo"];
const subjects = ["Matemática", "Português", "Ciências", "História", "Geografia", "Física", "Química", "Biologia", "Inglês", "Artes", "Ed. Física", "Outra"];
const grades = ["1º ano", "2º ano", "3º ano", "4º ano", "5º ano", "6º ano", "7º ano", "8º ano", "9º ano", "1ª série EM", "2ª série EM", "3ª série EM"];
const neurodivergences = ["TEA", "TDAH", "Dislexia", "Discalculia", "Tourette", "Dispraxia", "TOC", "Altas Habilidades/Superdotação", "Outro"];

const questionnaireQuestions = [
  { id: "attention", label: "Como o aluno mantém atenção em tarefas longas?", placeholder: "Ex: Perde o foco após 10 minutos..." },
  { id: "organization", label: "Como se organiza em atividades com muitos passos?", placeholder: "Ex: Precisa de apoio para seguir a sequência..." },
  { id: "reading", label: "Como lida com leitura de textos?", placeholder: "Ex: Leitura lenta, dificuldade com textos longos..." },
  { id: "math", label: "Como lida com cálculos e números?", placeholder: "Ex: Confunde sinais, dificuldade com frações..." },
  { id: "assessment", label: "Como se comporta em avaliações?", placeholder: "Ex: Ansiedade, não termina a prova..." },
  { id: "helps", label: "O que ajuda esse aluno?", placeholder: "Ex: Instruções visuais, tempo extra..." },
  { id: "hinders", label: "O que atrapalha?", placeholder: "Ex: Barulho, muitas instruções de uma vez..." },
  { id: "goal", label: "Qual o objetivo da adaptação?", placeholder: "Ex: Permitir que demonstre o que sabe..." },
];

const adaptationSettings = [
  { id: "fragment", label: "Fragmentar em blocos" },
  { id: "language", label: "Ajustar linguagem" },
  { id: "reduce_items", label: "Reduzir itens por página" },
  { id: "step_by_step", label: "Passo a passo explícito" },
  { id: "visual", label: "Apoio visual" },
  { id: "checkpoints", label: "Checkpoints" },
  { id: "guided_calc", label: "Cálculo guiado" },
];

const settingsLabels: Record<string, string> = {
  fragment: "Fragmentar em blocos",
  language: "Ajustar linguagem",
  reduce_items: "Reduzir itens por página",
  step_by_step: "Passo a passo explícito",
  visual: "Apoio visual",
  checkpoints: "Checkpoints",
  guided_calc: "Cálculo guiado",
};

export default function Create() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasCredits, creditsRemaining } = useSubscription();
  const [step, setStep] = useState(0);
  const [context, setContext] = useState({
    type: "", subject: "", grade: "", topic: "", objective: "", neurodivergence: [] as string[],
  });
  const [questionnaire, setQuestionnaire] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<"adapt" | "create">(
    (searchParams.get("mode") as "adapt" | "create") || "adapt"
  );
  const [originalText, setOriginalText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [textConfirmed, setTextConfirmed] = useState(false);
  const [createParams, setCreateParams] = useState({
    difficulty: "Médio", questionCount: "5", includeExample: false, includeAnswer: false, notes: "",
  });
  const [settings, setSettings] = useState<string[]>(["fragment", "language"]);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ adapted: string; guidance: string; justification: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [resolutionText, setResolutionText] = useState("");
  const [resolutionLoading, setResolutionLoading] = useState(false);
  const [pastedImages, setPastedImages] = useState<{ file: File; preview: string }[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handleImageFiles = useCallback((files: FileList | File[]) => {
    const validTypes = ["image/png", "image/jpeg", "image/gif"];
    const newImages: { file: File; preview: string }[] = [];
    Array.from(files).forEach((f) => {
      if (validTypes.includes(f.type) && pastedImages.length + newImages.length < 5) {
        newImages.push({ file: f, preview: URL.createObjectURL(f) });
      }
    });
    if (newImages.length > 0) {
      setPastedImages((prev) => [...prev, ...newImages]);
      toast.success(`${newImages.length} imagem(ns) adicionada(s)`);
    }
  }, [pastedImages.length]);

  const handleTextareaPaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const f = items[i].getAsFile();
        if (f) imageFiles.push(f);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      handleImageFiles(imageFiles);
    }
  }, [handleImageFiles]);

  const removeImage = (index: number) => {
    setPastedImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    if (f.type.includes("text") || f.name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") setOriginalText(reader.result);
      };
      reader.readAsText(f);
    } else {
      // For PDF/Word, upload to storage and set a placeholder
      if (user) {
        const path = `${user.id}/${Date.now()}-${f.name}`;
        const { error } = await supabase.storage.from("activity-files").upload(path, f);
        if (error) {
          toast.error("Erro ao enviar arquivo: " + error.message);
        } else {
          toast.success("Arquivo enviado! Cole o texto extraído abaixo ou digite manualmente.");
          setOriginalText(`[Arquivo enviado: ${f.name}. Por favor, cole o texto da atividade manualmente para melhor resultado.]`);
        }
      }
    }
  };

  const handleGenerate = async () => {
    if (!user) return;
    if (!hasCredits) {
      toast.error("Seus créditos acabaram. Faça upgrade para continuar.");
      return;
    }
    setGenerating(true);
    setResult(null);
    setSaved(false);

    let fullText = "";
    const userPrompt = mode === "adapt"
      ? `Adapte a seguinte atividade:\n\n${originalText}`
      : `Crie uma atividade do zero sobre "${context.topic}" para ${context.grade}, disciplina ${context.subject}. Nível: ${createParams.difficulty}. Quantidade de questões: ${createParams.questionCount}.${createParams.notes ? ` Observações: ${createParams.notes}` : ""}`;

    await streamAI({
      endpoint: "generate-adaptation",
      body: {
        action: "generate",
        messages: [{ role: "user", content: userPrompt }],
        context: {
          mode: mode === "adapt" ? "adaptar" : "criar_do_zero",
          type: context.type,
          subject: context.subject,
          grade: context.grade,
          topic: context.topic,
          objective: context.objective,
          neurodivergence: context.neurodivergence,
          questionnaireAnswers: questionnaire,
          strategySettings: settings.map(s => settingsLabels[s] || s),
          originalText: mode === "adapt" ? originalText : undefined,
          difficulty: createParams.difficulty,
          questionCount: createParams.questionCount,
          includeExample: createParams.includeExample,
          includeAnswer: createParams.includeAnswer,
          notes: createParams.notes,
        },
      },
      onDelta: (chunk) => {
        fullText += chunk;
        // Parse sections as they come in
        const sections = parseResult(fullText);
        setResult(sections);
      },
      onDone: async () => {
        setGenerating(false);
        const sections = parseResult(fullText);
        setResult(sections);

        // Save to database
        const { error } = await supabase.from("adaptations").insert({
          user_id: user.id,
          mode: mode === "adapt" ? "adaptar" : "criar_do_zero",
          type: context.type,
          subject: context.subject,
          grade: context.grade,
          topic: context.topic,
          objective: context.objective,
          neurodivergence: context.neurodivergence.length > 0 ? context.neurodivergence : null,
          questionnaire_answers: questionnaire,
          strategy_settings: settings,
          original_text: mode === "adapt" ? originalText : null,
          adapted_text: sections.adapted,
          teacher_guidance: sections.guidance,
          justification: sections.justification,
          difficulty: createParams.difficulty,
          question_count: parseInt(createParams.questionCount) || null,
          include_example: createParams.includeExample,
          include_answer: createParams.includeAnswer,
          notes: createParams.notes || null,
        });

        if (error) {
          console.error("Save error:", error);
          toast.error("Erro ao salvar adaptação.");
        } else {
          // Consume 1 credit
          await supabase.from("credit_usage").insert({
            user_id: user.id,
            action: "adaptation",
            credits_used: 1,
          });
          setSaved(true);
          toast.success("Adaptação gerada e salva!");
        }
      },
      onError: (err) => {
        setGenerating(false);
        toast.error(err);
      },
    });
  };

  const parseResult = (text: string) => {
    const adapted = extractSection(text, "ATIVIDADE ADAPTADA", "ORIENTAÇÕES AO PROFISSIONAL") || text;
    const guidance = extractSection(text, "ORIENTAÇÕES AO PROFISSIONAL", "JUSTIFICATIVA PEDAGÓGICA") || "";
    const justification = extractSection(text, "JUSTIFICATIVA PEDAGÓGICA", null) || "";
    return { adapted, guidance, justification };
  };

  const extractSection = (text: string, start: string, end: string | null) => {
    const startIdx = text.indexOf(start);
    if (startIdx === -1) return "";
    const contentStart = text.indexOf("\n", startIdx);
    if (contentStart === -1) return "";
    if (end) {
      const endIdx = text.indexOf(end, contentStart);
      if (endIdx === -1) return text.slice(contentStart).trim();
      return text.slice(contentStart, endIdx).trim();
    }
    return text.slice(contentStart).trim();
  };

  const canAdvance = () => {
    if (step === 0) return context.type && context.subject && context.grade && context.topic;
    if (step === 2 && mode === "adapt") return (originalText.length > 0 || file || pastedImages.length > 0) && textConfirmed;
    return true;
  };

  // Show result view
  if (result && !generating) {
    return (
      <>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">Resultado da Adaptação</h1>
            <Button variant="outline" onClick={() => { setResult(null); setStep(0); }}>
              Nova adaptação
            </Button>
          </div>

          <Tabs defaultValue="adapted" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="adapted">Atividade</TabsTrigger>
              <TabsTrigger value="guidance">Orientações</TabsTrigger>
              <TabsTrigger value="justification">Justificativa</TabsTrigger>
              {mode === "adapt" && <TabsTrigger value="original">Original</TabsTrigger>}
            </TabsList>
            <TabsContent value="adapted">
              <Card>
                <CardContent className="p-6 prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-foreground text-sm leading-relaxed">{result.adapted}</div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="guidance">
              <Card>
                <CardContent className="p-6">
                  <div className="whitespace-pre-wrap text-foreground text-sm leading-relaxed">{result.guidance}</div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="justification">
              <Card>
                <CardContent className="p-6">
                  <div className="whitespace-pre-wrap text-foreground text-sm leading-relaxed">{result.justification}</div>
                </CardContent>
              </Card>
            </TabsContent>
            {mode === "adapt" && (
              <TabsContent value="original">
                <Card>
                  <CardContent className="p-6">
                    <div className="whitespace-pre-wrap text-foreground text-sm leading-relaxed">{originalText}</div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>

          <p className="text-xs text-muted-foreground text-center italic">
            "A decisão final é sempre do profissional. Você pode ajustar ou ignorar qualquer sugestão."
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-center pt-2 pb-4">
            <Button
              variant="outline"
              onClick={() => {
                const text = `ATIVIDADE:\n${result.adapted}\n\nORIENTAÇÕES:\n${result.guidance}\n\nJUSTIFICATIVA:\n${result.justification}`;
                navigator.clipboard.writeText(text);
                toast.success("Copiado para a área de transferência!");
              }}
            >
              <Copy className="w-4 h-4 mr-2" /> Copiar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const printWindow = window.open("", "_blank");
                if (printWindow) {
                  printWindow.document.write(`
                    <html><head><title>Adaptação</title>
                    <style>body{font-family:sans-serif;padding:2rem;line-height:1.6}h2{margin-top:1.5rem;color:#333}pre{white-space:pre-wrap;font-family:inherit}</style>
                    </head><body>
                    <h1>${context.topic} — ${context.grade}</h1>
                    <p><strong>${context.subject} · ${context.type}</strong></p>
                    <h2>Atividade Adaptada</h2><pre>${result.adapted}</pre>
                    <h2>Orientações ao Profissional</h2><pre>${result.guidance}</pre>
                    <h2>Justificativa Pedagógica</h2><pre>${result.justification}</pre>
                    </body></html>
                  `);
                  printWindow.document.close();
                  printWindow.print();
                }
              }}
            >
              <Printer className="w-4 h-4 mr-2" /> Imprimir
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setSaved(false);
                setStep(4);
                toast.info("Ajuste os parâmetros e gere uma nova versão.");
              }}
            >
              <Edit className="w-4 h-4 mr-2" /> Editar (nova versão)
            </Button>
            <Button
              variant={saved ? "secondary" : "default"}
              onClick={() => {
                if (saved) {
                  navigate("/my-adaptations");
                } else {
                  toast.info("A adaptação já foi salva automaticamente!");
                  navigate("/my-adaptations");
                }
              }}
            >
              <Save className="w-4 h-4 mr-2" /> {saved ? "Ver em Minhas Adaptações" : "Salvar em Minhas Adaptações"}
            </Button>
            <Button
              variant="outline"
              disabled={resolutionLoading}
              onClick={async () => {
                setResolutionOpen(true);
                setResolutionText("");
                setResolutionLoading(true);
                let full = "";
                await streamAI({
                  endpoint: "generate-adaptation",
                  body: {
                    action: "resolution",
                    messages: [{ role: "user", content: `Gere a resolução passo a passo, detalhada e didática, de TODA a atividade a seguir. Resolva cada questão individualmente, mostrando cada etapa do raciocínio.\n\nATIVIDADE:\n${result.adapted}` }],
                    context: {
                      mode: "resolucao",
                      type: context.type,
                      subject: context.subject,
                      grade: context.grade,
                      topic: context.topic,
                      objective: context.objective,
                    },
                  },
                  onDelta: (chunk) => {
                    full += chunk;
                    setResolutionText(full);
                  },
                  onDone: () => setResolutionLoading(false),
                  onError: (err) => {
                    setResolutionLoading(false);
                    toast.error(err);
                  },
                });
              }}
            >
              <BookOpen className="w-4 h-4 mr-2" /> Gerar Resolução
            </Button>
            <Button variant="outline" onClick={() => setFeedbackOpen(true)}>
              <MessageSquare className="w-4 h-4 mr-2" /> Feedback rápido
            </Button>
          </div>
        </div>

        {/* Resolution Dialog */}
        <Dialog open={resolutionOpen} onOpenChange={setResolutionOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" /> Resolução Passo a Passo
              </DialogTitle>
              <DialogDescription>Resolução detalhada de cada questão da atividade.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              {resolutionText ? (
                <div className="whitespace-pre-wrap text-foreground text-sm leading-relaxed">{resolutionText}</div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <DialogFooter>
              {resolutionText && !resolutionLoading && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(resolutionText);
                    toast.success("Resolução copiada!");
                  }}
                >
                  <Copy className="w-4 h-4 mr-1" /> Copiar
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setResolutionOpen(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Feedback Dialog */}
        <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Feedback rápido</DialogTitle>
              <DialogDescription>Nos ajude a melhorar! Como foi a qualidade dessa adaptação?</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setFeedbackRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${star <= feedbackRating ? "fill-primary text-primary" : "text-muted-foreground"}`}
                    />
                  </button>
                ))}
              </div>
              <Textarea
                placeholder="Comentário opcional..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFeedbackOpen(false)}>Cancelar</Button>
              <Button onClick={() => {
                toast.success("Obrigado pelo feedback!");
                setFeedbackOpen(false);
                setFeedbackRating(0);
                setFeedbackText("");
              }}>
                Enviar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground mb-1">Criar Adaptação</h1>
          <p className="text-sm text-muted-foreground">Siga as etapas para gerar sua adaptação personalizada.</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs whitespace-nowrap ${i === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="w-6 h-px bg-border shrink-0" />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

            {step === 0 && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h2 className="font-semibold text-foreground">Contexto Geral</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de atividade *</Label>
                      <Select value={context.type} onValueChange={(v) => setContext({ ...context, type: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{activityTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Disciplina *</Label>
                      <Select value={context.subject} onValueChange={(v) => setContext({ ...context, subject: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Série/Ano *</Label>
                      <Select value={context.grade} onValueChange={(v) => setContext({ ...context, grade: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{grades.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Assunto/Conteúdo *</Label>
                      <Input value={context.topic} onChange={(e) => setContext({ ...context, topic: e.target.value })} placeholder="Ex: Frações, Verbos irregulares..." />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Objetivo pedagógico (opcional)</Label>
                    <Textarea value={context.objective} onChange={(e) => setContext({ ...context, objective: e.target.value })} placeholder="Ex: Que o aluno demonstre compreensão de frações equivalentes" rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>Neurodivergência (opcional — contexto secundário)</Label>
                    <div className="flex flex-wrap gap-3">
                      {neurodivergences.map((n) => (
                        <label key={n} className="flex items-center gap-2 text-sm">
                          <Checkbox checked={context.neurodivergence.includes(n)} onCheckedChange={(checked) => {
                            setContext({ ...context, neurodivergence: checked ? [...context.neurodivergence, n] : context.neurodivergence.filter((x) => x !== n) });
                          }} />
                          {n}
                        </label>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 1 && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h2 className="font-semibold text-foreground">Questionário Pedagógico</h2>
                  <div className="bg-secondary/50 rounded-lg p-3 text-xs text-secondary-foreground">⚠️ Questionário pedagógico. Não realiza diagnóstico.</div>
                  <div className="space-y-4">
                    {questionnaireQuestions.map((q) => (
                      <div key={q.id} className="space-y-1.5">
                        <Label className="text-sm">{q.label}</Label>
                        <Textarea value={questionnaire[q.id] || ""} onChange={(e) => setQuestionnaire({ ...questionnaire, [q.id]: e.target.value })} placeholder={q.placeholder} rows={2} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardContent className="p-6 space-y-5">
                  <h2 className="font-semibold text-foreground">Modo de Criação</h2>
                  <RadioGroup value={mode} onValueChange={(v) => setMode(v as "adapt" | "create")} className="grid sm:grid-cols-2 gap-4">
                    <label className={`cursor-pointer rounded-xl border-2 p-5 transition-colors ${mode === "adapt" ? "border-primary bg-secondary/30" : "border-border"}`}>
                      <RadioGroupItem value="adapt" className="sr-only" />
                      <FileText className="w-8 h-8 text-primary mb-2" />
                      <p className="font-semibold text-foreground text-sm">Adaptar atividade existente</p>
                      <p className="text-xs text-muted-foreground mt-1">Cole ou envie a atividade original</p>
                    </label>
                    <label className={`cursor-pointer rounded-xl border-2 p-5 transition-colors ${mode === "create" ? "border-primary bg-secondary/30" : "border-border"}`}>
                      <RadioGroupItem value="create" className="sr-only" />
                      <Sparkles className="w-8 h-8 text-accent mb-2" />
                      <p className="font-semibold text-foreground text-sm">Criar atividade do zero</p>
                      <p className="text-xs text-muted-foreground mt-1">IA gera atividade original adaptada</p>
                    </label>
                  </RadioGroup>

                  {mode === "adapt" && (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>Cole o texto da atividade (pode colar imagens também)</Label>
                        <Textarea value={originalText} onChange={(e) => setOriginalText(e.target.value)} onPaste={handleTextareaPaste} placeholder="Cole aqui o texto completo da atividade ou cole/anexe imagens (PNG, JPEG, GIF)..." rows={6} />
                        <div className="flex items-center gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => imageInputRef.current?.click()}>
                            <ImagePlus className="w-4 h-4 mr-1" /> Adicionar imagem
                          </Button>
                          <span className="text-xs text-muted-foreground">PNG, JPEG ou GIF (máx. 5)</span>
                          <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/gif" multiple className="hidden" onChange={(e) => { if (e.target.files) handleImageFiles(e.target.files); e.target.value = ""; }} />
                        </div>
                        {pastedImages.length > 0 && (
                          <div className="flex flex-wrap gap-3 mt-2">
                            {pastedImages.map((img, i) => (
                              <div key={i} className="relative group">
                                <img src={img.preview} alt={`Imagem ${i + 1}`} className="w-24 h-24 object-cover rounded-lg border border-border" />
                                <button type="button" onClick={() => removeImage(i)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-center text-xs text-muted-foreground">ou</div>
                      <div>
                        <Label htmlFor="file-upload" className="cursor-pointer">
                          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary transition-colors">
                            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">{file ? file.name : "Clique para enviar PDF ou Word"}</p>
                          </div>
                        </Label>
                        <input id="file-upload" type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={handleFileUpload} />
                      </div>
                      {(originalText || file) && (
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={textConfirmed} onCheckedChange={(c) => setTextConfirmed(!!c)} />
                          Conferi o texto e está correto
                        </label>
                      )}
                    </div>
                  )}

                  {mode === "create" && (
                    <div className="space-y-4 pt-2">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nível de dificuldade</Label>
                          <Select value={createParams.difficulty} onValueChange={(v) => setCreateParams({ ...createParams, difficulty: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Básico">Básico</SelectItem>
                              <SelectItem value="Médio">Médio</SelectItem>
                              <SelectItem value="Desafiador">Desafiador</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Quantidade de questões</Label>
                          <Input type="number" min={1} max={20} value={createParams.questionCount} onChange={(e) => setCreateParams({ ...createParams, questionCount: e.target.value })} />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={createParams.includeExample} onCheckedChange={(c) => setCreateParams({ ...createParams, includeExample: !!c })} />
                          Incluir exemplo resolvido
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={createParams.includeAnswer} onCheckedChange={(c) => setCreateParams({ ...createParams, includeAnswer: !!c })} />
                          Incluir gabarito
                        </label>
                      </div>
                      <div className="space-y-2">
                        <Label>Observações (opcional)</Label>
                        <Textarea value={createParams.notes} onChange={(e) => setCreateParams({ ...createParams, notes: e.target.value })} placeholder="Ex: Usar contextos do cotidiano..." rows={2} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h2 className="font-semibold text-foreground">Configurações de Adaptação</h2>
                  <p className="text-sm text-muted-foreground">Selecione as estratégias que deseja aplicar.</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {adaptationSettings.map((s) => (
                      <label key={s.id} className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${settings.includes(s.id) ? "border-primary bg-secondary/30" : "border-border"}`}>
                        <Checkbox checked={settings.includes(s.id)} onCheckedChange={(checked) => {
                          setSettings(checked ? [...settings, s.id] : settings.filter((x) => x !== s.id));
                        }} />
                        <span className="text-sm font-medium text-foreground">{s.label}</span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 4 && (
              <Card>
                <CardContent className="p-6 space-y-6 text-center">
                  {!generating ? (
                    <>
                      <Sparkles className="w-12 h-12 text-accent mx-auto" />
                      <h2 className="text-xl font-bold text-foreground">Tudo pronto!</h2>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Vamos gerar sua adaptação com base nas informações fornecidas.
                      </p>
                      <Button size="lg" onClick={handleGenerate} className="gap-2">
                        <Sparkles className="w-4 h-4" /> Gerar Adaptação
                      </Button>
                      <p className="text-xs text-muted-foreground">"Você pode ajustar ou ignorar qualquer sugestão."</p>
                    </>
                  ) : (
                    <div className="py-4 space-y-4">
                      <div className="w-16 h-16 mx-auto rounded-full gradient-hero flex items-center justify-center animate-pulse">
                        <Sparkles className="w-8 h-8 text-primary-foreground" />
                      </div>
                      <h2 className="text-lg font-semibold text-foreground">Gerando adaptação...</h2>
                      <p className="text-sm text-muted-foreground">Analisando barreiras pedagógicas e aplicando estratégias</p>
                      {result && (
                        <div className="text-left mt-4">
                          <Card>
                            <CardContent className="p-4">
                              <div className="whitespace-pre-wrap text-foreground text-sm leading-relaxed max-h-60 overflow-y-auto">
                                {result.adapted}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          {step < 4 && (
            <Button onClick={() => setStep(step + 1)} disabled={!canAdvance()} className="gap-1">
              Próximo <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}
