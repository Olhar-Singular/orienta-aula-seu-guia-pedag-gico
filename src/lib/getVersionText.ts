import type { StructuredActivity } from "@/types/adaptation";

export function getVersionText(activity: StructuredActivity | string): string {
  if (typeof activity === "string") return activity;

  const lines: string[] = [];

  for (const section of activity.sections) {
    if (section.title) lines.push(section.title);
    if (section.introduction) lines.push(section.introduction);

    for (const q of section.questions) {
      lines.push(`${q.number}) ${q.statement}`);

      if (q.alternatives) {
        for (const alt of q.alternatives) {
          lines.push(`${alt.letter}) ${alt.text}`);
        }
      }

      if (q.scaffolding && q.scaffolding.length > 0) {
        lines.push("Apoio:");
        for (const step of q.scaffolding) {
          lines.push(`- ${step}`);
        }
      }

      lines.push("");
    }
  }

  return lines.join("\n").trim();
}
