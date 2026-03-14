export type ExtractedQuestion = {
  text: string;
  options?: string[];
  correct_answer?: number | null;
  subject: string;
  topic?: string;
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
        q.subject.trim() !== ""
    )
    .map((q: any) => ({
      text: q.text.trim(),
      options: Array.isArray(q.options) ? q.options : undefined,
      correct_answer: typeof q.correct_answer === "number" ? q.correct_answer : null,
      subject: q.subject.trim(),
      topic: typeof q.topic === "string" ? q.topic.trim() : undefined,
    }));
}
