import { describe, expect, it } from "vitest";
import { EMPTY_STATS, sinceIso, sumAdaptationStats } from "@/lib/dashboardStats";

describe("sumAdaptationStats", () => {
  it("returns zero stats when no parts are passed", () => {
    expect(sumAdaptationStats()).toEqual(EMPTY_STATS);
  });

  it("sums totals, week and month across legacy + wizard sources", () => {
    const legacy = { total: 7, week: 2, month: 4 };
    const wizard = { total: 12, week: 3, month: 9 };

    expect(sumAdaptationStats(legacy, wizard)).toEqual({
      total: 19,
      week: 5,
      month: 13,
    });
  });

  it("ignores empty parts without breaking the sum", () => {
    const wizard = { total: 5, week: 1, month: 2 };
    expect(sumAdaptationStats(EMPTY_STATS, wizard)).toEqual(wizard);
  });
});

describe("sinceIso", () => {
  it("subtracts the given number of days and serialises to ISO", () => {
    const now = new Date("2026-04-14T12:00:00.000Z");
    expect(sinceIso(now, 7)).toBe("2026-04-07T12:00:00.000Z");
    expect(sinceIso(now, 30)).toBe("2026-03-15T12:00:00.000Z");
  });
});
