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
import { Users, User, MessageSquare } from "lucide-react";

type ClassRow = { id: string; name: string };
type StudentRow = { id: string; name: string };
type BarrierRow = { barrier_key: string; dimension: string; is_active: boolean; notes: string | null };

type Props = {
  data: WizardData;
  updateData: (partial: Partial<WizardData>) => void;
  onNext: () => void;
  onPrev: () => void;
};

export default function StepBarrierSelection({ data, updateData, onNext, onPrev }: Props) {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

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
    setLoadingStudents(true);
    supabase
      .from("class_students")
      .select("id, name")
      .eq("class_id", data.classId)
      .order("name")
      .then(({ data: d }) => {
        setStudents(d || []);
        setLoadingStudents(false);
      });
  }, [data.classId]);

  // Load barriers and student notes when student changes
  useEffect(() => {
    if (!data.studentId) return;

    // Fetch student notes to pre-fill observations
    supabase
      .from("class_students")
      .select("notes")
      .eq("id", data.studentId)
      .single()
      .then(({ data: studentData }) => {
        if (studentData?.notes && !data.observationNotes) {
          updateData({ observationNotes: studentData.notes });
        }
      });

    (supabase.from as any)("student_barriers")
      .select("barrier_key, dimension, is_active, notes")
      .eq("student_id", data.studentId)
      .eq("is_active", true)
      .then(({ data: barriers }: { data: BarrierRow[] | null }) => {
        if (!barriers || barriers.length === 0) {
          // Initialize with all barriers inactive
          const allBarriers: BarrierItem[] = BARRIER_DIMENSIONS.flatMap((dim) =>
            dim.barriers.map((b) => ({
              dimension: dim.key,
              barrier_key: b.key,
              label: b.label,
              is_active: false,
            }))
          );
          updateData({ barriers: allBarriers });
          return;
        }
        const activeKeys = new Set(barriers.map((b: BarrierRow) => b.barrier_key));
        const notesMap = new Map(barriers.map((b: BarrierRow) => [b.barrier_key, b.notes || undefined]));
        const allBarriers: BarrierItem[] = BARRIER_DIMENSIONS.flatMap((dim) =>
          dim.barriers.map((b) => ({
            dimension: dim.key,
            barrier_key: b.key,
            label: b.label,
            is_active: activeKeys.has(b.key),
            notes: notesMap.get(b.key),
          }))
        );
        updateData({ barriers: allBarriers });
        const student = students.find((s) => s.id === data.studentId);
        if (student) updateData({ studentName: student.name });
      });
  }, [data.studentId]);

  // Initialize barriers for whole class mode
  useEffect(() => {
    if (data.adaptForWholeClass && data.barriers.length === 0) {
      const allBarriers: BarrierItem[] = BARRIER_DIMENSIONS.flatMap((dim) =>
        dim.barriers.map((b) => ({
          dimension: dim.key,
          barrier_key: b.key,
          label: b.label,
          is_active: false,
        }))
      );
      updateData({ barriers: allBarriers });
    }
  }, [data.adaptForWholeClass]);

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
              studentId: checked ? null : data.studentId,
              studentName: checked ? null : data.studentName,
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
                updateData({ classId: v, studentId: null, studentName: null, barriers: [] })
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
              onValueChange={(v) => updateData({ studentId: v })}
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
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              Barreiras observáveis
              {activeCount > 0 && (
                <Badge variant="secondary" className="ml-2">{activeCount} selecionada(s)</Badge>
              )}
            </p>
          </div>

          {BARRIER_DIMENSIONS.map((dim) => {
            const dimBarriers = data.barriers.filter((b) => b.dimension === dim.key);
            const dimActive = dimBarriers.filter((b) => b.is_active).length;
            return (
              <Card key={dim.key}>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold text-foreground mb-3">
                    {dim.label}
                    {dimActive > 0 && (
                      <Badge variant="default" className="ml-2 text-xs">{dimActive}</Badge>
                    )}
                  </p>
                  <div className="space-y-2">
                    {dimBarriers.map((b) => (
                      <label
                        key={b.barrier_key}
                        className="flex items-start gap-3 cursor-pointer group"
                      >
                        <Checkbox
                          checked={b.is_active}
                          onCheckedChange={() => toggleBarrier(b.barrier_key)}
                          className="mt-0.5"
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
            <p className="text-xs text-muted-foreground text-right mt-1">
              {data.observationNotes.length}/2000
            </p>
          </CardContent>
        </Card>
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
    </div>
  );
}
