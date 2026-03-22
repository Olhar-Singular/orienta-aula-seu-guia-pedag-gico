import { z } from "zod";
import type { StructuredActivity, StructuredAdaptationResult } from "@/types/adaptation";

const alternativeSchema = z.object({
  letter: z.string().min(1),
  text: z.string().min(1),
  is_correct: z.boolean().optional(),
});

const questionSchema = z.object({
  number: z.number().int().positive(),
  type: z.enum(["multiple_choice", "open_ended", "fill_blank", "true_false"]),
  statement: z.string().min(1),
  instruction: z.string().optional(),
  alternatives: z.array(alternativeSchema).optional(),
  blank_placeholder: z.string().optional(),
  scaffolding: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
});

const sectionSchema = z.object({
  title: z.string().optional(),
  introduction: z.string().optional(),
  questions: z.array(questionSchema).min(1),
});

const structuredActivitySchema = z.object({
  sections: z.array(sectionSchema).min(1),
  general_instructions: z.string().optional(),
  visual_supports: z.array(z.string()).optional(),
});

export const structuredAdaptationSchema = z.object({
  version_universal: structuredActivitySchema,
  version_directed: structuredActivitySchema,
  strategies_applied: z.array(z.string()),
  pedagogical_justification: z.string(),
  implementation_tips: z.array(z.string()),
});

export function validateStructuredActivity(data: unknown): {
  success: boolean;
  data?: StructuredActivity;
  errors?: string[];
} {
  const result = structuredActivitySchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as StructuredActivity };
  }
  return {
    success: false,
    errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
  };
}

export function validateStructuredAdaptation(data: unknown): {
  success: boolean;
  data?: StructuredAdaptationResult;
  errors?: string[];
} {
  const result = structuredAdaptationSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as StructuredAdaptationResult };
  }
  return {
    success: false,
    errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
  };
}

/**
 * Post-process AI output to fix common issues:
 * - multiple_choice questions without alternatives
 * - alternatives on non-multiple_choice questions
 */
export function fixStructuredResult(data: StructuredAdaptationResult): StructuredAdaptationResult {
  const fixActivity = (activity: StructuredActivity): StructuredActivity => ({
    ...activity,
    sections: activity.sections.map((s) => ({
      ...s,
      questions: s.questions.map((q) => {
        // If multiple_choice but no alternatives, change to open_ended
        if (q.type === "multiple_choice" && (!q.alternatives || q.alternatives.length < 2)) {
          return { ...q, type: "open_ended" as const, alternatives: undefined };
        }
        // If not multiple_choice but has alternatives, remove them
        if (q.type !== "multiple_choice" && q.alternatives && q.alternatives.length > 0) {
          return { ...q, alternatives: undefined };
        }
        return q;
      }),
    })),
  });

  return {
    ...data,
    version_universal: fixActivity(data.version_universal),
    version_directed: fixActivity(data.version_directed),
  };
}
