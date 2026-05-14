import {
  isBankQuestionType,
  parsePayload,
  refineTypeHeuristic,
  type BankQuestionType,
  type QuestionPayload,
} from "./questionType";

export type ExtractedQuestion = {
  text: string;
  options?: string[];
  correct_answer?: number | null;
  subject: string;
  topic?: string;
  type?: BankQuestionType;
  payload?: QuestionPayload | null;
};

export function validateExtractedQuestions(data: any): ExtractedQuestion[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter(
      (q: any) =>
        q &&
        typeof q.text === "string" &&
        q.text.trim() !== "" &&
        typeof q.subject === "string" &&
        q.subject.trim() !== "",
    )
    .map((q: any) => {
      const text = q.text.trim();
      const options = Array.isArray(q.options) ? q.options : undefined;
      const rawType = isBankQuestionType(q.type) ? q.type : undefined;
      const inferredType = refineTypeHeuristic({ type: rawType, text, options });
      const payload = parsePayload(inferredType, q.payload ?? null);
      return {
        text,
        options,
        correct_answer: typeof q.correct_answer === "number" ? q.correct_answer : null,
        subject: q.subject.trim(),
        topic: typeof q.topic === "string" ? q.topic.trim() : undefined,
        type: inferredType,
        payload,
      };
    });
}
