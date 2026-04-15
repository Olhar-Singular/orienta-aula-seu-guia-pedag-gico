import { STEP_REGISTRY, type StepContext } from "./steps";

type Props = StepContext & {
  currentStepKey: string;
};

/**
 * Registry-driven dispatcher. Looks up the current step in STEP_REGISTRY and
 * renders its Component with the shared StepContext. The orchestrator stays
 * ignorant of which steps exist.
 */
export function WizardStepRenderer({ currentStepKey, ...ctx }: Props) {
  const step = STEP_REGISTRY[currentStepKey];
  if (!step) return null;
  const Component = step.Component;
  return <Component {...ctx} />;
}
