import { describe, it, expect } from "vitest";
import { BARRIER_DIMENSIONS } from "@/lib/barriers";

describe("BARRIER_DIMENSIONS", () => {
  it("exports an array of dimensions", () => {
    expect(Array.isArray(BARRIER_DIMENSIONS)).toBe(true);
    expect(BARRIER_DIMENSIONS.length).toBeGreaterThan(0);
  });

  it("each dimension has key, label, and barriers array", () => {
    BARRIER_DIMENSIONS.forEach((dim) => {
      expect(dim.key).toBeTruthy();
      expect(dim.label).toBeTruthy();
      expect(Array.isArray(dim.barriers)).toBe(true);
      expect(dim.barriers.length).toBeGreaterThan(0);
    });
  });

  it("each barrier has key and label", () => {
    BARRIER_DIMENSIONS.forEach((dim) => {
      dim.barriers.forEach((b) => {
        expect(b.key).toBeTruthy();
        expect(b.label).toBeTruthy();
      });
    });
  });

  it("has unique dimension keys", () => {
    const keys = BARRIER_DIMENSIONS.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has unique barrier keys across all dimensions", () => {
    const allKeys = BARRIER_DIMENSIONS.flatMap((d) => d.barriers.map((b) => b.key));
    expect(new Set(allKeys).size).toBe(allKeys.length);
  });

  it("contains expected dimensions (tea, tdah, dislexia)", () => {
    const keys = BARRIER_DIMENSIONS.map((d) => d.key);
    expect(keys).toContain("tea");
    expect(keys).toContain("tdah");
    expect(keys).toContain("dislexia");
  });
});
