import { describe, it, expect } from "vitest";
import { BARRIER_DIMENSIONS } from "@/lib/barriers";

describe("Barrier dimensions", () => {
  it("has 5 dimensions", () => {
    expect(BARRIER_DIMENSIONS).toHaveLength(5);
  });

  it("each dimension has 4 barriers", () => {
    BARRIER_DIMENSIONS.forEach((dim) => {
      expect(dim.barriers).toHaveLength(4);
    });
  });

  it("all barrier keys are unique", () => {
    const keys = BARRIER_DIMENSIONS.flatMap((d) => d.barriers.map((b) => b.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has expected dimensions", () => {
    const dimKeys = BARRIER_DIMENSIONS.map((d) => d.key);
    expect(dimKeys).toContain("processamento");
    expect(dimKeys).toContain("atencao");
    expect(dimKeys).toContain("ritmo");
    expect(dimKeys).toContain("engajamento");
    expect(dimKeys).toContain("expressao");
  });
});
