// Shared mapping of AI usage action_type values to Portuguese labels.
// Keep keys in sync with what edge functions write to ai_usage_logs.action_type
// (see supabase/functions/*/index.ts).

export const AI_USAGE_ACTION_LABELS: Record<string, string> = {
  adaptation: "Adaptação",
  adaptation_wizard: "Wizard",
  chat: "Chat",
  barrier_analysis: "Barreiras",
  question_extraction: "Extração",
  pei_generation: "PEI",
  regenerate_question: "Regenerar Questão",
  image_generation: "Geração de Imagem",
};

export function labelForActionType(actionType: string): string {
  return AI_USAGE_ACTION_LABELS[actionType] ?? actionType;
}
