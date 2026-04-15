import { Bot, Pencil } from "lucide-react";
import type { WizardMode } from "../../AdaptationWizard";

type StepChoiceProps = {
  onSelect: (mode: WizardMode) => void;
};

type ModeOption = {
  mode: WizardMode;
  icon: React.ReactNode;
  title: string;
  description: string;
};

const MODE_OPTIONS: ModeOption[] = [
  {
    mode: "ai",
    icon: <Bot className="w-8 h-8 text-primary" />,
    title: "Gerar com IA",
    description: "A IA adapta a atividade com base nas barreiras do aluno.",
  },
  {
    mode: "manual",
    icon: <Pencil className="w-8 h-8 text-primary" />,
    title: "Adaptar manualmente",
    description: "Edite as questões diretamente, sem usar IA.",
  },
];

export function StepChoice({ onSelect }: StepChoiceProps) {
  return (
    <div className="flex flex-col gap-6 items-center py-8">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Como deseja adaptar?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Escolha o método de adaptação para este aluno.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl">
        {MODE_OPTIONS.map(({ mode, icon, title, description }) => (
          <button
            key={mode}
            type="button"
            onClick={() => onSelect(mode)}
            className="flex-1 flex flex-col items-center gap-3 p-6 border rounded-xl hover:border-primary hover:bg-accent transition-colors text-left cursor-pointer"
          >
            {icon}
            <div className="text-center">
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
