import type { StructuredActivity, StructuredQuestion } from "@/types/adaptation";

const QUESTION_REGEX = /^(\d+)\s*[.)]\s*/;
const ALT_REGEX = /^([a-zA-Z])\s*[.)]\s*/;

export function parseActivityText(text: string): StructuredActivity {
  const lines = text.split("\n");
  const questions: StructuredQuestion[] = [];
  let currentQuestion: StructuredQuestion | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const questionMatch = line.match(QUESTION_REGEX);
    if (questionMatch) {
      if (currentQuestion) questions.push(currentQuestion);
      currentQuestion = {
        number: parseInt(questionMatch[1], 10),
        type: "open_ended",
        statement: line.replace(QUESTION_REGEX, "").trim(),
      };
      continue;
    }

    const altMatch = line.match(ALT_REGEX);
    if (altMatch && currentQuestion) {
      if (!currentQuestion.alternatives) {
        currentQuestion.alternatives = [];
        currentQuestion.type = "multiple_choice";
      }
      currentQuestion.alternatives.push({
        letter: altMatch[1].toLowerCase(),
        text: line.replace(ALT_REGEX, "").trim(),
      });
      continue;
    }

    // Append to current question statement if it's a continuation
    if (currentQuestion) {
      currentQuestion.statement += " " + line;
    }
  }

  if (currentQuestion) questions.push(currentQuestion);

  return {
    sections: [{ questions }],
  };
}
