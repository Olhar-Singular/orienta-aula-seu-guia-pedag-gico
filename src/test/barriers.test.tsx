import { describe, it, expect } from "vitest";
import { BARRIER_DIMENSIONS } from "@/lib/barriers";

describe("Barrier dimensions", () => {
  it("has 11 neurodivergence dimensions", () => {
    expect(BARRIER_DIMENSIONS).toHaveLength(11);
  });

  it("each dimension has at least 2 barriers", () => {
    BARRIER_DIMENSIONS.forEach((dim) => {
      expect(dim.barriers.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("all barrier keys are unique", () => {
    const keys = BARRIER_DIMENSIONS.flatMap((d) => d.barriers.map((b) => b.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has expected dimensions", () => {
    const dimKeys = BARRIER_DIMENSIONS.map((d) => d.key);
    expect(dimKeys).toContain("tea");
    expect(dimKeys).toContain("tdah");
    expect(dimKeys).toContain("tod");
    expect(dimKeys).toContain("sindrome_down");
    expect(dimKeys).toContain("altas_habilidades");
    expect(dimKeys).toContain("dislexia");
    expect(dimKeys).toContain("discalculia");
    expect(dimKeys).toContain("disgrafia");
    expect(dimKeys).toContain("tourette");
    expect(dimKeys).toContain("dispraxia");
    expect(dimKeys).toContain("toc");
  });
});
