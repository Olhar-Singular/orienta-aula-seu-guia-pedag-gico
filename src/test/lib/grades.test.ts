import { describe, it, expect } from "vitest";
import {
  GRADE_CATEGORIES,
  isCanonicalGrade,
  getGradeCategory,
  compareGrades,
  getAllCanonicalGrades,
} from "@/lib/grades";

describe("GRADE_CATEGORIES", () => {
  it("contains the three main categories in order: infantil, fundamental, medio", () => {
    const types = GRADE_CATEGORIES.map((c) => c.type);
    expect(types.slice(0, 3)).toEqual(["infantil", "fundamental", "medio"]);
  });

  it("every category has at least one grade item", () => {
    for (const cat of GRADE_CATEGORIES) {
      expect(cat.items.length).toBeGreaterThan(0);
    }
  });

  it("fundamental has 9 anos (1º–9º)", () => {
    const fund = GRADE_CATEGORIES.find((c) => c.type === "fundamental");
    expect(fund?.items).toHaveLength(9);
    expect(fund?.items[0]).toBe("1º ano");
    expect(fund?.items[8]).toBe("9º ano");
  });

  it("medio has 3 séries", () => {
    const medio = GRADE_CATEGORIES.find((c) => c.type === "medio");
    expect(medio?.items).toHaveLength(3);
    expect(medio?.items[0]).toBe("1ª série EM");
    expect(medio?.items[2]).toBe("3ª série EM");
  });
});

describe("isCanonicalGrade", () => {
  it("returns true for canonical grade values", () => {
    expect(isCanonicalGrade("9º ano")).toBe(true);
    expect(isCanonicalGrade("1ª série EM")).toBe(true);
  });

  it("returns false for non-canonical values", () => {
    expect(isCanonicalGrade("Curso técnico")).toBe(false);
    expect(isCanonicalGrade("9 ano")).toBe(false);
    expect(isCanonicalGrade("")).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isCanonicalGrade(null)).toBe(false);
    expect(isCanonicalGrade(undefined)).toBe(false);
  });
});

describe("getGradeCategory", () => {
  it("returns the correct category for canonical grades", () => {
    expect(getGradeCategory("9º ano")).toBe("fundamental");
    expect(getGradeCategory("1ª série EM")).toBe("medio");
    expect(getGradeCategory("Maternal")).toBe("infantil");
  });

  it("returns 'outros' for non-canonical values", () => {
    expect(getGradeCategory("Curso técnico X")).toBe("outros");
    expect(getGradeCategory("EJA 1")).toBe("outros");
  });

  it("returns 'unclassified' for null/empty", () => {
    expect(getGradeCategory(null)).toBe("unclassified");
    expect(getGradeCategory("")).toBe("unclassified");
    expect(getGradeCategory(undefined)).toBe("unclassified");
  });
});

describe("compareGrades (natural sort)", () => {
  it("orders by category first: infantil < fundamental < medio < outros", () => {
    expect(compareGrades("Maternal", "1º ano")).toBeLessThan(0);
    expect(compareGrades("9º ano", "1ª série EM")).toBeLessThan(0);
    expect(compareGrades("1ª série EM", "Curso X")).toBeLessThan(0);
  });

  it("orders items naturally within fundamental (1º < 2º < ... < 9º)", () => {
    expect(compareGrades("1º ano", "2º ano")).toBeLessThan(0);
    expect(compareGrades("9º ano", "2º ano")).toBeGreaterThan(0);
  });

  it("orders items naturally within medio", () => {
    expect(compareGrades("1ª série EM", "3ª série EM")).toBeLessThan(0);
  });

  it("unclassified values (null/empty) sort last", () => {
    expect(compareGrades(null, "9º ano")).toBeGreaterThan(0);
    expect(compareGrades("9º ano", null)).toBeLessThan(0);
    expect(compareGrades(null, null)).toBe(0);
  });

  it("two 'outros' values sort alphabetically", () => {
    expect(compareGrades("Curso A", "Curso B")).toBeLessThan(0);
  });
});

describe("getAllCanonicalGrades", () => {
  it("returns a flat array of all canonical grade values in natural order", () => {
    const all = getAllCanonicalGrades();
    expect(all.length).toBeGreaterThan(10);
    expect(all[0]).toBe("Maternal");
    // fundamental comes before medio
    const idx9 = all.indexOf("9º ano");
    const idx1EM = all.indexOf("1ª série EM");
    expect(idx9).toBeLessThan(idx1EM);
  });
});
