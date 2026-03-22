import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { BARRIER_DIMENSIONS } from "@/lib/barriers";
import type { WizardData, BarrierItem } from "./AdaptationWizard";
import { Users, User, MessageSquare, ShieldAlert, Pencil, X, Save } from "lucide-react";

type ClassRow = { id: string; name: string };
type StudentRow = { id: string; name: string };
type BarrierRow = { barrier_key: string; dimension: string; is_active: boolean; notes: string | null };

type Props = {
  data: WizardData;
  updateData: (partial: Partial<WizardData>) => void;
  onNext: () => void;
  onPrev: () => void;
};

const buildBarrierTemplate = (): BarrierItem[] =>
  BARRIER_DIMENSIONS.flatMap((dim) =>
    dim.barriers.map((barrier) => ({
      dimension: dim.key,
      barrier_key: barrier.key,
      label: barrier.label,
      is_active: false,
    }))
  );

export default function StepBarrierSelection({ data, updateData, onNext, onPrev }: Props) {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [barriersLocked, setBarriersLocked] = useState(false);
  const [showUnlockAlert, setShowUnlockAlert] = useState(false);
  const [originalBarriers, setOriginalBarriers] = useState<BarrierItem[]>([]);
  const [isEditingBarriers, setIsEditingBarriers] = useState(false);
  const [savingBarriers, setSavingBarriers] = useState(false);

  // Reset lock when student changes
  useEffect(() => {
    setBarriersLocked(false);
    setIsEditingBarriers(false);
    setOriginalBarriers([]);
  }, [data.studentId]);

  // Load classes
  useEffect(() => {
    if (!user) return;
    supabase
      .from("classes")
      .select("id, name")
      .order("name")
      .then(({ data: d }) => setClasses(d || []));
  }, [user]);

  // Load students when class changes
  useEffect(() => {
    if (!data.classId) {
      setStudents([]);
      return;
    }
    let cancelled = false;
    setLoadingStudents(true);
    supabase
      .from("class_students")
      .select("id, name")
      .eq("class_id", data.classId)
      .order("name")
      .then(({ data: d }) => {
        if (cancelled) return;
        setStudents(d || []);
        setLoadingStudents(false);
      });
    return () => { cancelled = true; };
  }, [data.classId]);

  // Sync studentName when students list loads after studentId is already set
  useEffect(() => {
    if (!data.studentId || students.length === 0) return;
    const selectedStudent = students.find((s) => s.id === data.studentId);
    if (selectedStudent && data.studentName !== selectedStudent.name) {
      updateData({ studentName: selectedStudent.name });
    }
    // Only depend on studentId and students list — not studentName (avoids loop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.studentId, students]);

  // Load barriers and notes for the selected student.
  // Keep local edits when returning from a later step (barriers already in state).
  useEffect(() => {
    if (!data.studentId || data.barriers.length > 0) return;

    let cancelled = false;
    const studentId = data.studentId;

    const hydrateStudentContext = async () => {
      const [studentResponse, barriersResponse] = await Promise.all([
        supabase.from("class_students").select("notes").eq("id", studentId).single(),
        (supabase.from as any)("student_barriers")
          .select("barrier_key, dimension, is_active, notes")
          .eq("student_id", studentId)
          .eq("is_active", true),
      ]);

      if (cancelled) return;

      const persistedBarriers = (barriersResponse.data as BarrierRow[] | null) || [];
      const activeKeys = new Set(persistedBarriers.map((b) => b.barrier_key));
      const notesMap = new Map(persistedBarriers.map((b) => [b.barrier_key, b.notes || undefined]));

      const mergedBarriers: BarrierItem[] = buildBarrierTemplate().map((item) => ({
        ...item,
        is_active: activeKeys.has(item.barrier_key),
        notes: notesMap.get(item.barrier_key),
      }));

      updateData({
        barriers: mergedBarriers,
        observationNotes: studentResponse.data?.notes || "",
      });
      setBarriersLocked(persistedBarriers.length > 0);
    };

    hydrateStudentContext();

    return () => {
      cancelled = true;
    };
    // Only re-run when studentId changes or barriers are cleared (length becomes 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.studentId, data.barriers.length]);

  // Initialize barriers for whole class mode
  useEffect(() => {
    if (data.adaptForWholeClass && data.barriers.length === 0) {
      updateData({ barriers: buildBarrierTemplate() });
    }
  }, [data.adaptForWholeClass, data.barriers.length, updateData]);

  const toggleBarrier = (key: string) => {
    updateData({
      barriers: data.barriers.map((b) =>
        b.barrier_key === key ? { ...b, is_active: !b.is_active } : b
      ),
    });
  };

  const activeCount = data.barriers.filter((b) => b.is_active).length;
  const canProceed = activeCount > 0;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Selecione o aluno e as barreiras</h2>

      {/* Whole class toggle */}
      <div className="flex items-center gap-3">
        <Switch
          checked={data.adaptForWholeClass}
          onCheckedChange={(checked) =>
            updateData({
              adaptForWholeClass: checked,
              classId: checked ? null : data.classId,
              studentId: null,
              studentName: null,
              barriers: [],
              observationNotes: "",
              result: null,
              contextPillars: null,
              questionImages: { version_universal: {}, version_directed: {} },
            })
          }
        />
        <Label className="text-sm">
          <Users className="w-4 h-4 inline mr-1" />
          Adaptar para turma inteira (Design Universal)
        </Label>
      </div>

      {!data.adaptForWholeClass && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-2 block">Turma</Label>
            <Select
              value={data.classId || ""}
              onValueChange={(v) =>
                updateData({
                  classId: v,
                  studentId: null,
                  studentName: null,
                  barriers: [],
                  observationNotes: "",
                  result: null,
                  contextPillars: null,
                  questionImages: { version_universal: {}, version_directed: {} },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a turma" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block">Aluno</Label>
            <Select
              value={data.studentId || ""}
              onValueChange={(v) =>
                updateData({
                  studentId: v,
                  studentName: students.find((s) => s.id === v)?.name || null,
                  barriers: [],
                  observationNotes: "",
                  result: null,
                  contextPillars: null,
                  questionImages: { version_universal: {}, version_directed: {} },
                })
              }
              disabled={!data.classId || loadingStudents}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingStudents ? "Carregando..." : "Selecione o aluno"} />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <User className="w-3 h-3 inline mr-1" />{s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Barriers checklist */}
      {data.barriers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm font-medium text-foreground flex items-center">
              Barreiras observáveis
              {activeCount > 0 && (
                <Badge variant="secondary" className="ml-2">{activeCount} selecionada(s)</Badge>
              )}
            </div>
            {barriersLocked && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUnlockAlert(true)}
                className="gap-1.5 text-xs"
              >
                <Pencil className="w-3.5 h-3.5" />
                Editar barreiras
              </Button>
            )}
            {isEditingBarriers && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  updateData({ barriers: originalBarriers });
                  setBarriersLocked(true);
                  setIsEditingBarriers(false);
                }}
                className="gap-1.5 text-xs text-destructive hover:text-destructive"
              >
                <X className="w-3.5 h-3.5" />
                Cancelar edição
              </Button>
            )}
          </div>

          {BARRIER_DIMENSIONS.map((dim) => {
            const dimBarriers = data.barriers.filter((b) => b.dimension === dim.key);
            const dimActive = dimBarriers.filter((b) => b.is_active).length;
            return (
              <Card key={dim.key}>
                <CardContent className="p-4">
                  <div className="text-sm font-semibold text-foreground mb-3 flex items-center">
                    {dim.label}
                    {dimActive > 0 && (
                      <Badge variant="default" className="ml-2 text-xs">{dimActive}</Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    {dimBarriers.map((b) => (
                      <label
                        key={b.barrier_key}
                        className={`flex items-start gap-3 group ${barriersLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                      >
                        <Checkbox
                          checked={b.is_active}
                          onCheckedChange={() => toggleBarrier(b.barrier_key)}
                          className="mt-0.5"
                          disabled={barriersLocked}
                        />
                        <span className={`text-sm ${b.is_active ? "text-foreground" : "text-muted-foreground"} group-hover:text-foreground transition-colors`}>
                          {b.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Observation notes */}
      {data.barriers.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Observações do professor
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Descreva contextos, comportamentos ou necessidades específicas do aluno. Estas informações serão usadas pela IA para personalizar a adaptação.
            </p>
            <Textarea
              placeholder="Ex: O aluno responde melhor com apoio visual, precisa de tempo extra nas avaliações, tem dificuldade em copiar do quadro..."
              value={data.observationNotes}
              onChange={(e) => updateData({ observationNotes: e.target.value })}
              className="min-h-[100px] resize-y"
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {data.observationNotes.length}/2000
            </p>
          </CardContent>
        </Card>
      )}

      {/* Save barriers + observations to student profile */}
      {data.studentId && data.barriers.length > 0 && activeCount > 0 && (
        <Button
          variant="secondary"
          size="sm"
          disabled={savingBarriers}
          onClick={async () => {
            if (!data.studentId) return;
            setSavingBarriers(true);
            try {
              // Delete existing barriers for this student
              await (supabase.from as any)("student_barriers")
                .delete()
                .eq("student_id", data.studentId);

              // Insert active barriers
              const activeBarriers = data.barriers
                .filter((b) => b.is_active)
                .map((b) => ({
                  student_id: data.studentId,
                  dimension: b.dimension,
                  barrier_key: b.barrier_key,
                  is_active: true,
                  notes: b.notes || null,
                }));

              if (activeBarriers.length > 0) {
                const { error: insertErr } = await (supabase.from as any)("student_barriers")
                  .insert(activeBarriers);
                if (insertErr) throw insertErr;
              }

              // Save observation notes to student profile
              if (data.observationNotes.trim()) {
                const { error: notesErr } = await supabase
                  .from("class_students")
                  .update({ notes: data.observationNotes })
                  .eq("id", data.studentId);
                if (notesErr) throw notesErr;
              }

              setBarriersLocked(true);
              setIsEditingBarriers(false);
              toast({ title: "Perfil salvo", description: "Barreiras e observações foram salvas no perfil do aluno." });
            } catch (err: any) {
              toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
            } finally {
              setSavingBarriers(false);
            }
          }}
          className="gap-1.5 w-full sm:w-auto"
        >
          <Save className="w-3.5 h-3.5" />
          {savingBarriers ? "Salvando..." : "Salvar barreiras no perfil do aluno"}
        </Button>
      )}

      {(data.adaptForWholeClass || data.studentId) && data.barriers.length > 0 && !canProceed && (
        <p className="text-sm text-destructive">Selecione pelo menos uma barreira para continuar.</p>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>Voltar</Button>
        <Button onClick={onNext} disabled={!canProceed}>
          Gerar Adaptação
        </Button>
      </div>

      {/* Alert dialog for unlocking barriers */}
      <AlertDialog open={showUnlockAlert} onOpenChange={setShowUnlockAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Editar barreiras do aluno
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              As barreiras deste aluno já foram definidas no perfil. Alterá-las aqui pode impactar consideravelmente na geração e personalização das questões adaptadas.
              <br /><br />
              Deseja continuar e editar as barreiras?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setOriginalBarriers([...data.barriers]);
              setBarriersLocked(false);
              setIsEditingBarriers(true);
            }}>
              Sim, editar barreiras
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
