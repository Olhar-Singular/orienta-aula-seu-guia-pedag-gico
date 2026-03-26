import type { WizardMode } from "./AdaptationWizard";

type StepChoiceProps = {
  onSelect: (mode: WizardMode) => void;
};

export function StepChoice({ onSelect }: StepChoiceProps) {
  return (
    <div className="flex flex-col gap-4 items-center py-8">
      <h2 className="text-xl font-semibold">Como deseja adaptar?</h2>
      <div className="flex gap-4">
        <button
          className="px-6 py-4 border rounded-lg hover:bg-accent"
          onClick={() => onSelect("ai")}
        >
          Adaptação com IA
        </button>
        <button
          className="px-6 py-4 border rounded-lg hover:bg-accent"
          onClick={() => onSelect("manual")}
        >
          Edição manual
        </button>
      </div>
    </div>
  );
}
