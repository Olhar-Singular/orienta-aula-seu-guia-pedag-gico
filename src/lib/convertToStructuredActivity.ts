import type { StructuredActivity, StructuredQuestion, Alternative } from "@/types/adaptation";
import type { SelectedQuestion } from "@/components/adaptation/AdaptationWizard";

function toAlternatives(options: string[]): Alternative[] {
  return options.map((text, i) => ({
    letter: String.fromCharCode(97 + i),
    text,
  }));
}

function toStructuredQuestion(q: SelectedQuestion, index: number): StructuredQuestion {
  const hasOptions = Array.isArray(q.options) && q.options.length > 0;
  return {
    number: index + 1,
    type: hasOptions ? "multiple_choice" : "open_ended",
    statement: q.text,
    ...(hasOptions && { alternatives: toAlternatives(q.options!) }),
    ...(q.image_url && { images: [q.image_url] }),
  };
}

export function convertToStructuredActivity(questions: SelectedQuestion[]): StructuredActivity {
  return {
    sections: [{ questions: questions.map(toStructuredQuestion) }],
  };
}
