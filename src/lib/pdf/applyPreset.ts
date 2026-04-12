import type { StylePreset } from "@/types/adaptation";
import type { EditableActivity } from "./editableActivity";

export function applyPreset(
  activity: EditableActivity,
  preset: StylePreset,
): EditableActivity {
  return {
    ...activity,
    questions: activity.questions.map((q) => ({
      ...q,
      spacingAfter: preset.questionSpacing,
      alternativeIndent: preset.alternativeIndent,
      content: q.content.map((b) =>
        b.type === "text" ? { ...b, style: { ...preset.textStyle } } : b,
      ),
    })),
  };
}
