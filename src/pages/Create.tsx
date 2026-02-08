import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Upload, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Layout from "@/components/Layout";
import { toast } from "sonner";

const STEPS = [
  "Contexto",
  "Questionário",
  "Modo",
  "Configurações",
  "Gerar",
];

const activityTypes = [
  "Prova/Avaliação",
  "Exercício em sala",
  "Lista de exercícios",
  "Atividade de treino",
];

const subjects = [
  "Matemática", "Português", "Ciências", "História", "Geografia",
  "Física", "Química", "Biologia", "Inglês", "Artes", "Ed. Física", "Outra",
];

const grades = [
  "1º ano", "2º ano", "3º ano", "4º ano", "5º ano",
  "6º ano", "7º ano", "8º ano", "9º ano",
  "1ª série EM", "2ª série EM", "3ª série EM",
];

const neurodivergences = ["TEA", "TDAH", "Dislexia", "Discalculia", "Outro"];

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

export default function Create() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [context, setContext] = useState({
    type: "",
    subject: "",
    grade: "",
    topic: "",
    objective: "",
    neurodivergence: [] as string[],
  });
  const [questionnaire, setQuestionnaire] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<"adapt" | "create">(
    (searchParams.get("mode") as "adapt" | "create") || "adapt"
  );
  const [originalText, setOriginalText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [textConfirmed, setTextConfirmed] = useState(false);
  const [createParams, setCreateParams] = useState({
    difficulty: "Médio",
    questionCount: "5",
    includeExample: false,
    includeAnswer: false,
    notes: "",
  });
  const [settings, setSettings] = useState<string[]>(["fragment", "language"]);
  const [generating, setGenerating] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      // Simple text extraction placeholder
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setOriginalText(reader.result);
        } else {
          toast.info("Arquivo carregado. A extração de texto será processada pelo backend.");
          setOriginalText(`[Arquivo: ${f.name}]`);
        }
      };
      if (f.type.includes("text")) {
        reader.readAsText(f);
      } else {
        setOriginalText(`[Arquivo: ${f.name} — extração requer backend]`);
      }
    }
  };

  const handleGenerate = () => {
    setGenerating(true);
    // Placeholder for AI generation
    setTimeout(() => {
      setGenerating(false);
      toast.success("Adaptação gerada! (Backend necessário para IA real)");
    }, 2500);
  };

  const canAdvance = () => {
    if (step === 0) return context.type && context.subject && context.grade && context.topic && context.objective;
    if (step === 2 && mode === "adapt") return (originalText.length > 0 || file) && textConfirmed;
    return true;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground mb-1">Criar Adaptação</h1>
          <p className="text-sm text-muted-foreground">Siga as etapas para gerar sua adaptação personalizada.</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                  i < step
                    ? "bg-primary text-primary-foreground"
                    : i === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs whitespace-nowrap ${i === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {s}
              </span>
              {i < STEPS.length - 1 && <div className="w-6 h-px bg-border shrink-0" />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* STEP 0: Context */}
            {step === 0 && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h2 className="font-semibold text-foreground">Contexto Geral</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de atividade *</Label>
                      <Select value={context.type} onValueChange={(v) => setContext({ ...context, type: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {activityTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Disciplina *</Label>
                      <Select value={context.subject} onValueChange={(v) => setContext({ ...context, subject: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Série/Ano *</Label>
                      <Select value={context.grade} onValueChange={(v) => setContext({ ...context, grade: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {grades.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Assunto/Conteúdo *</Label>
                      <Input
                        value={context.topic}
                        onChange={(e) => setContext({ ...context, topic: e.target.value })}
                        placeholder="Ex: Frações, Verbos irregulares..."
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Objetivo pedagógico *</Label>
                    <Textarea
                      value={context.objective}
                      onChange={(e) => setContext({ ...context, objective: e.target.value })}
                      placeholder="Ex: Que o aluno demonstre compreensão de frações equivalentes"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Neurodivergência (opcional — contexto secundário)</Label>
                    <div className="flex flex-wrap gap-3">
                      {neurodivergences.map((n) => (
                        <label key={n} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={context.neurodivergence.includes(n)}
                            onCheckedChange={(checked) => {
                              setContext({
                                ...context,
                                neurodivergence: checked
                                  ? [...context.neurodivergence, n]
                                  : context.neurodivergence.filter((x) => x !== n),
                              });
                            }}
                          />
                          {n}
                        </label>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 1: Questionnaire */}
            {step === 1 && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-foreground">Questionário Pedagógico</h2>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-3 text-xs text-secondary-foreground">
                    ⚠️ Questionário pedagógico. Não realiza diagnóstico.
                  </div>
                  <div className="space-y-4">
                    {questionnaireQuestions.map((q) => (
                      <div key={q.id} className="space-y-1.5">
                        <Label className="text-sm">{q.label}</Label>
                        <Textarea
                          value={questionnaire[q.id] || ""}
                          onChange={(e) => setQuestionnaire({ ...questionnaire, [q.id]: e.target.value })}
                          placeholder={q.placeholder}
                          rows={2}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 2: Mode */}
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
                        <Label>Cole o texto da atividade</Label>
                        <Textarea
                          value={originalText}
                          onChange={(e) => setOriginalText(e.target.value)}
                          placeholder="Cole aqui o texto completo da atividade..."
                          rows={6}
                        />
                      </div>
                      <div className="text-center text-xs text-muted-foreground">ou</div>
                      <div>
                        <Label htmlFor="file-upload" className="cursor-pointer">
                          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary transition-colors">
                            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                              {file ? file.name : "Clique para enviar PDF ou Word"}
                            </p>
                          </div>
                        </Label>
                        <input
                          id="file-upload"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
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
                          <Input
                            type="number"
                            min={1}
                            max={20}
                            value={createParams.questionCount}
                            onChange={(e) => setCreateParams({ ...createParams, questionCount: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={createParams.includeExample}
                            onCheckedChange={(c) => setCreateParams({ ...createParams, includeExample: !!c })}
                          />
                          Incluir exemplo resolvido
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={createParams.includeAnswer}
                            onCheckedChange={(c) => setCreateParams({ ...createParams, includeAnswer: !!c })}
                          />
                          Incluir gabarito
                        </label>
                      </div>
                      <div className="space-y-2">
                        <Label>Observações (opcional)</Label>
                        <Textarea
                          value={createParams.notes}
                          onChange={(e) => setCreateParams({ ...createParams, notes: e.target.value })}
                          placeholder="Ex: Usar contextos do cotidiano..."
                          rows={2}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* STEP 3: Settings */}
            {step === 3 && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h2 className="font-semibold text-foreground">Configurações de Adaptação</h2>
                  <p className="text-sm text-muted-foreground">Selecione as estratégias que deseja aplicar.</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {adaptationSettings.map((s) => (
                      <label
                        key={s.id}
                        className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                          settings.includes(s.id) ? "border-primary bg-secondary/30" : "border-border"
                        }`}
                      >
                        <Checkbox
                          checked={settings.includes(s.id)}
                          onCheckedChange={(checked) => {
                            setSettings(
                              checked ? [...settings, s.id] : settings.filter((x) => x !== s.id)
                            );
                          }}
                        />
                        <span className="text-sm font-medium text-foreground">{s.label}</span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 4: Generate */}
            {step === 4 && (
              <Card>
                <CardContent className="p-6 space-y-6 text-center">
                  {!generating ? (
                    <>
                      <Sparkles className="w-12 h-12 text-accent mx-auto" />
                      <h2 className="text-xl font-bold text-foreground">Tudo pronto!</h2>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Vamos gerar sua adaptação com base nas informações fornecidas. A IA irá criar uma versão
                        {mode === "adapt" ? " adaptada da sua atividade" : " original já adaptada"}.
                      </p>
                      <Button size="lg" onClick={handleGenerate} className="gap-2">
                        <Sparkles className="w-4 h-4" /> Gerar Adaptação
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        "Você pode ajustar ou ignorar qualquer sugestão."
                      </p>
                    </>
                  ) : (
                    <div className="py-8 space-y-4">
                      <div className="w-16 h-16 mx-auto rounded-full gradient-hero flex items-center justify-center animate-pulse">
                        <Sparkles className="w-8 h-8 text-primary-foreground" />
                      </div>
                      <h2 className="text-lg font-semibold text-foreground">Gerando adaptação...</h2>
                      <p className="text-sm text-muted-foreground">
                        Analisando barreiras pedagógicas e aplicando estratégias
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between pt-2">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          {step < 4 && (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance()}
              className="gap-1"
            >
              Próximo <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}
