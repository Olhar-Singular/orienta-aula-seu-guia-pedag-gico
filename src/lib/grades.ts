export type GradeCategoryType =
  | "infantil"
  | "fundamental"
  | "medio"
  | "outros"
  | "unclassified";

export interface GradeCategory {
  type: GradeCategoryType;
  label: string;
  items: string[];
}

export const GRADE_CATEGORIES: GradeCategory[] = [
  {
    type: "infantil",
    label: "Educação Infantil",
    items: ["Maternal", "Pré 1", "Pré 2"],
  },
  {
    type: "fundamental",
    label: "Ensino Fundamental",
    items: [
      "1º ano",
      "2º ano",
      "3º ano",
      "4º ano",
      "5º ano",
      "6º ano",
      "7º ano",
      "8º ano",
      "9º ano",
    ],
  },
  {
    type: "medio",
    label: "Ensino Médio",
    items: ["1ª série EM", "2ª série EM", "3ª série EM"],
  },
];

const CATEGORY_ORDER: Record<GradeCategoryType, number> = {
  infantil: 0,
  fundamental: 1,
  medio: 2,
  outros: 3,
  unclassified: 4,
};

export function getAllCanonicalGrades(): string[] {
  return GRADE_CATEGORIES.flatMap((c) => c.items);
}

export function isCanonicalGrade(value: string | null | undefined): boolean {
  if (!value) return false;
  return getAllCanonicalGrades().includes(value);
}

export function getGradeCategory(
  value: string | null | undefined,
): GradeCategoryType {
  if (!value) return "unclassified";
  for (const cat of GRADE_CATEGORIES) {
    if (cat.items.includes(value)) return cat.type;
  }
  return "outros";
}

function getItemIndexInCategory(value: string): number {
  for (const cat of GRADE_CATEGORIES) {
    const idx = cat.items.indexOf(value);
    if (idx >= 0) return idx;
  }
  return -1;
}

export function compareGrades(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const catA = getGradeCategory(a);
  const catB = getGradeCategory(b);
  if (catA !== catB) return CATEGORY_ORDER[catA] - CATEGORY_ORDER[catB];

  if (catA === "unclassified") return 0;
  if (catA === "outros") return (a ?? "").localeCompare(b ?? "", "pt-BR");

  const ia = getItemIndexInCategory(a!);
  const ib = getItemIndexInCategory(b!);
  return ia - ib;
}
