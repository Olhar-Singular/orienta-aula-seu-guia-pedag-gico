import { Button } from "@/components/ui/button";
import type { WizardMode } from "./AdaptationWizard";

type StepChoiceProps = {
  onSelect: (mode: WizardMode) => void;
};

export function StepChoice({ onSelect }: StepChoiceProps) {
  return (
    <div className="flex flex-col gap-4 items-center py-8">
      <h2 className="text-xl font-semibold">Como deseja adaptar?</h2>
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          className="px-6 py-4 h-auto"
          onClick={() => onSelect("ai")}
        >
          Adaptação com IA
        </Button>
        <Button
          type="button"
          variant="outline"
          className="px-6 py-4 h-auto"
          onClick={() => onSelect("manual")}
        >
          Edição manual
        </Button>
      </div>
    </div>
  );
}
