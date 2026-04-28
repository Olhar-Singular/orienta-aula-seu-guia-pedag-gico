import { compareGrades } from "@/lib/grades";

export type FolderLevel = "grade" | "subject";

export interface Folder {
  key: string | null;
  label: string;
  count: number;
  lastAt: string | null;
  isEmpty: boolean;
}

export interface FolderPref {
  folder_key: string;
  display_order: number;
}

const UNCLASSIFIED_SENTINEL = "__UNCLASSIFIED__";

export function buildFolderKey(
  level: FolderLevel,
  value: string | null,
  parentGrade?: string | null,
): string {
  const v = value ?? UNCLASSIFIED_SENTINEL;
  if (level === "grade") return `grade:${v}`;
  const parent = parentGrade ?? UNCLASSIFIED_SENTINEL;
  return `subject:${parent}/${v}`;
}

export function resolveUnclassifiedLabel(level: FolderLevel): string {
  return level === "grade" ? "Sem série" : "Sem matéria";
}

export function mergeFoldersWithEmpty(
  data: Folder[],
  emptyKeys: string[],
): Folder[] {
  const existing = new Set(data.map((f) => f.key));
  const extras: Folder[] = emptyKeys
    .filter((k) => !existing.has(k))
    .map((k) => ({
      key: k,
      label: k,
      count: 0,
      lastAt: null,
      isEmpty: true,
    }));
  return [...data, ...extras];
}

export function sortFolders(
  folders: Folder[],
  prefs: FolderPref[],
  level: FolderLevel,
  parentGrade?: string | null,
): Folder[] {
  const prefMap = new Map<string, number>();
  for (const p of prefs) prefMap.set(p.folder_key, p.display_order);

  const getPrefOrder = (f: Folder): number | undefined => {
    const key = buildFolderKey(level, f.key, parentGrade);
    return prefMap.get(key);
  };

  const naturalCompare = (a: Folder, b: Folder): number => {
    if (level === "grade") return compareGrades(a.key, b.key);
    // subject: unclassified last, else alphabetical pt-BR
    if (a.key === null && b.key === null) return 0;
    if (a.key === null) return 1;
    if (b.key === null) return -1;
    return a.key.localeCompare(b.key, "pt-BR");
  };

  return [...folders].sort((a, b) => {
    const pa = getPrefOrder(a);
    const pb = getPrefOrder(b);
    if (pa !== undefined && pb !== undefined) return pa - pb;
    if (pa !== undefined) return -1;
    if (pb !== undefined) return 1;
    return naturalCompare(a, b);
  });
}
