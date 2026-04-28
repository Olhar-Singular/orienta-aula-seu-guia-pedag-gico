import { describe, it, expect } from "vitest";
import {
  buildFolderKey,
  resolveUnclassifiedLabel,
  mergeFoldersWithEmpty,
  sortFolders,
  type Folder,
  type FolderLevel,
  type FolderPref,
} from "@/lib/questionFolders";

describe("buildFolderKey", () => {
  it("builds grade key", () => {
    expect(buildFolderKey("grade", "9º ano")).toBe("grade:9º ano");
  });

  it("builds subject key with parent grade", () => {
    expect(buildFolderKey("subject", "Matemática", "9º ano")).toBe(
      "subject:9º ano/Matemática",
    );
  });

  it("uses sentinel for null values", () => {
    expect(buildFolderKey("grade", null)).toBe("grade:__UNCLASSIFIED__");
    expect(buildFolderKey("subject", null, "9º ano")).toBe(
      "subject:9º ano/__UNCLASSIFIED__",
    );
  });

  it("uses sentinel for null parent grade in subject", () => {
    expect(buildFolderKey("subject", "Matemática", null)).toBe(
      "subject:__UNCLASSIFIED__/Matemática",
    );
  });
});

describe("resolveUnclassifiedLabel", () => {
  it("returns 'Sem série' for grade level", () => {
    expect(resolveUnclassifiedLabel("grade")).toBe("Sem série");
  });

  it("returns 'Sem matéria' for subject level", () => {
    expect(resolveUnclassifiedLabel("subject")).toBe("Sem matéria");
  });
});

describe("mergeFoldersWithEmpty", () => {
  it("adds empty folders with count=0 when not present in data", () => {
    const data: Folder[] = [
      { key: "9º ano", label: "9º ano", count: 5, lastAt: "2026-04-01T00:00:00Z", isEmpty: false },
    ];
    const empty = ["1º ano", "9º ano"];
    const merged = mergeFoldersWithEmpty(data, empty);
    expect(merged).toHaveLength(2);
    const first = merged.find((f) => f.key === "1º ano");
    expect(first).toEqual({
      key: "1º ano",
      label: "1º ano",
      count: 0,
      lastAt: null,
      isEmpty: true,
    });
    // 9º ano stays as-is (already has questions)
    const second = merged.find((f) => f.key === "9º ano");
    expect(second?.count).toBe(5);
    expect(second?.isEmpty).toBe(false);
  });

  it("returns data unchanged when no empty folders", () => {
    const data: Folder[] = [
      { key: "A", label: "A", count: 1, lastAt: null, isEmpty: false },
    ];
    expect(mergeFoldersWithEmpty(data, [])).toEqual(data);
  });

  it("handles empty data + multiple empty folders", () => {
    const merged = mergeFoldersWithEmpty([], ["A", "B"]);
    expect(merged).toHaveLength(2);
    expect(merged.every((f) => f.isEmpty)).toBe(true);
  });
});

describe("sortFolders — grade level", () => {
  const folders: Folder[] = [
    { key: "3ª série EM", label: "3ª série EM", count: 1, lastAt: null, isEmpty: false },
    { key: "1º ano", label: "1º ano", count: 1, lastAt: null, isEmpty: false },
    { key: "9º ano", label: "9º ano", count: 1, lastAt: null, isEmpty: false },
  ];

  it("sorts by natural grade order when no prefs", () => {
    const sorted = sortFolders(folders, [], "grade");
    expect(sorted.map((f) => f.key)).toEqual(["1º ano", "9º ano", "3ª série EM"]);
  });

  it("sorts by prefs display_order when provided, unknown items go after in natural order", () => {
    const prefs: FolderPref[] = [
      { folder_key: "grade:9º ano", display_order: 0 },
      { folder_key: "grade:1º ano", display_order: 1 },
    ];
    const sorted = sortFolders(folders, prefs, "grade");
    expect(sorted.map((f) => f.key)).toEqual(["9º ano", "1º ano", "3ª série EM"]);
  });

  it("unclassified (null key) goes last with no prefs", () => {
    const withNull: Folder[] = [
      ...folders,
      { key: null, label: "Sem série", count: 1, lastAt: null, isEmpty: false },
    ];
    const sorted = sortFolders(withNull, [], "grade");
    expect(sorted[sorted.length - 1].key).toBeNull();
  });
});

describe("sortFolders — subject level", () => {
  const folders: Folder[] = [
    { key: "Português", label: "Português", count: 1, lastAt: null, isEmpty: false },
    { key: "Matemática", label: "Matemática", count: 1, lastAt: null, isEmpty: false },
    { key: "Física", label: "Física", count: 1, lastAt: null, isEmpty: false },
  ];

  it("sorts alphabetically (pt-BR) when no prefs", () => {
    const sorted = sortFolders(folders, [], "subject", "9º ano");
    expect(sorted.map((f) => f.key)).toEqual(["Física", "Matemática", "Português"]);
  });

  it("respects prefs with parent grade in key", () => {
    const prefs: FolderPref[] = [
      { folder_key: "subject:9º ano/Português", display_order: 0 },
    ];
    const sorted = sortFolders(folders, prefs, "subject", "9º ano");
    expect(sorted[0].key).toBe("Português");
  });

  it("ignores prefs for different parent grade", () => {
    const prefs: FolderPref[] = [
      { folder_key: "subject:1º ano/Português", display_order: 0 },
    ];
    const sorted = sortFolders(folders, prefs, "subject", "9º ano");
    // Falls back to alphabetical
    expect(sorted[0].key).toBe("Física");
  });
});
