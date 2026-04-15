import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, PenTool, Home, Briefcase } from "lucide-react";
import type { ActivityType } from "../../AdaptationWizard";

const TYPES: { value: ActivityType; label: string; description: string; icon: typeof FileText }[] = [
  { value: "prova", label: "Prova", description: "Avaliação formal com questões", icon: FileText },
  { value: "exercicio", label: "Exercícios", description: "Atividade prática em sala", icon: PenTool },
  { value: "atividade_casa", label: "Atividade de Casa", description: "Tarefa para fazer em casa", icon: Home },
  { value: "trabalho", label: "Trabalho", description: "Projeto ou trabalho avaliativo", icon: Briefcase },
];

type Props = {
  value: ActivityType | null;
  onChange: (type: ActivityType) => void;
  onNext: () => void;
};

export default function StepActivityType({ value, onChange, onNext }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Qual tipo de atividade você quer adaptar?</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-1">
        {TYPES.map((t) => {
          const selected = value === t.value;
          return (
            <Card
              key={t.value}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selected ? "ring-2 ring-primary bg-primary/5" : "hover:bg-accent/50"
              }`}
              onClick={() => onChange(t.value)}
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div
                  className={`p-3 rounded-lg ${
                    selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <t.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{t.label}</p>
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!value}>
          Próximo
        </Button>
      </div>
    </div>
  );
}
