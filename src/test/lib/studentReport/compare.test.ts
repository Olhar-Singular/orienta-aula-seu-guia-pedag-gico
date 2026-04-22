import { describe, expect, it } from "vitest";
import { diffPeriods, type PeriodAggregate } from "@/lib/studentReport/compare";

function aggregate(overrides: Partial<PeriodAggregate> = {}): PeriodAggregate {
  return {
    adaptations: 0,
    distinctBarriers: 0,
    strategies: 0,
    ...overrides,
  };
}

describe("diffPeriods", () => {
  it("returns zeros when both periods are empty", () => {
    expect(diffPeriods(aggregate(), aggregate())).toEqual({
      adaptationsDelta: 0,
      distinctBarriersDelta: 0,
      strategiesDelta: 0,
      adaptationsPercent: null,
      distinctBarriersPercent: null,
      strategiesPercent: null,
    });
  });

  it("computes positive and negative deltas", () => {
    const current = aggregate({ adaptations: 10, distinctBarriers: 4, strategies: 8 });
    const previous = aggregate({ adaptations: 6, distinctBarriers: 5, strategies: 8 });
    const diff = diffPeriods(current, previous);
    expect(diff.adaptationsDelta).toBe(4);
    expect(diff.distinctBarriersDelta).toBe(-1);
    expect(diff.strategiesDelta).toBe(0);
    expect(diff.adaptationsPercent).toBeCloseTo(66.67, 1);
    expect(diff.distinctBarriersPercent).toBeCloseTo(-20, 1);
    expect(diff.strategiesPercent).toBe(0);
  });

  it("returns null percent when previous is zero (avoids divide-by-zero)", () => {
    const diff = diffPeriods(aggregate({ adaptations: 5 }), aggregate({ adaptations: 0 }));
    expect(diff.adaptationsDelta).toBe(5);
    expect(diff.adaptationsPercent).toBeNull();
  });
});
