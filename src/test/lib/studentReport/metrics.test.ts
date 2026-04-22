import { describe, expect, it } from "vitest";
import {
  summarize,
  barrierFrequency,
  activityTypeDistribution,
  dimensionBreakdown,
  adaptationsByMonth,
  topStrategies,
  type AdaptationHistoryEntry,
} from "@/lib/studentReport/metrics";

function makeEntry(overrides: Partial<AdaptationHistoryEntry> = {}): AdaptationHistoryEntry {
  const defaults: AdaptationHistoryEntry = {
    id: "a1",
    activity_type: "exercicio",
    created_at: "2026-03-14T10:00:00Z",
    barriers_used: [{ dimension: "tdah", barrier_key: "tdah_atencao_sustentada" }],
    adaptation_result: { strategies_applied: ["Fragmentação de enunciados"] },
  };
  return { ...defaults, ...overrides };
}

describe("summarize", () => {
  it("returns zeros for empty history and no barriers", () => {
    expect(summarize([], [])).toEqual({
      totalAdaptations: 0,
      distinctActivityTypes: 0,
      activeBarriers: 0,
      topBarrierKey: null,
    });
  });

  it("counts totals and finds the top barrier", () => {
    const history: AdaptationHistoryEntry[] = [
      makeEntry({
        id: "a1",
        activity_type: "exercicio",
        barriers_used: [
          { dimension: "tdah", barrier_key: "tdah_atencao_sustentada" },
          { dimension: "dislexia", barrier_key: "dislexia_leitura" },
        ],
      }),
      makeEntry({
        id: "a2",
        activity_type: "avaliacao",
        barriers_used: [
          { dimension: "tdah", barrier_key: "tdah_atencao_sustentada" },
        ],
      }),
      makeEntry({
        id: "a3",
        activity_type: "exercicio",
        barriers_used: [],
      }),
    ];
    const activeBarriers = [
      { barrier_key: "tdah_atencao_sustentada", is_active: true },
      { barrier_key: "dislexia_leitura", is_active: true },
      { barrier_key: "tea_abstracao", is_active: false },
    ];

    const summary = summarize(history, activeBarriers);

    expect(summary.totalAdaptations).toBe(3);
    expect(summary.distinctActivityTypes).toBe(2);
    expect(summary.activeBarriers).toBe(2);
    expect(summary.topBarrierKey).toBe("tdah_atencao_sustentada");
  });

  it("excludes 'desconhecido' (null/empty activity_type) from distinctActivityTypes", () => {
    const history: AdaptationHistoryEntry[] = [
      makeEntry({ id: "a1", activity_type: "exercicio", barriers_used: [] }),
      makeEntry({ id: "a2", activity_type: null, barriers_used: [] }),
      makeEntry({ id: "a3", activity_type: "", barriers_used: [] }),
    ];
    const summary = summarize(history, []);
    expect(summary.distinctActivityTypes).toBe(1);
  });
});

describe("barrierFrequency", () => {
  it("returns empty array when history is empty", () => {
    expect(barrierFrequency([])).toEqual([]);
  });

  it("counts how many times each barrier_key appears", () => {
    const history: AdaptationHistoryEntry[] = [
      makeEntry({
        id: "a1",
        barriers_used: [
          { dimension: "tdah", barrier_key: "tdah_atencao_sustentada" },
          { dimension: "dislexia", barrier_key: "dislexia_leitura" },
        ],
      }),
      makeEntry({
        id: "a2",
        barriers_used: [
          { dimension: "tdah", barrier_key: "tdah_atencao_sustentada" },
        ],
      }),
    ];
    const freq = barrierFrequency(history);

    expect(freq).toEqual([
      { barrierKey: "tdah_atencao_sustentada", dimension: "tdah", count: 2 },
      { barrierKey: "dislexia_leitura", dimension: "dislexia", count: 1 },
    ]);
  });
});

describe("activityTypeDistribution", () => {
  it("returns empty array when history is empty", () => {
    expect(activityTypeDistribution([])).toEqual([]);
  });

  it("groups and sorts activity types by count desc", () => {
    const history: AdaptationHistoryEntry[] = [
      makeEntry({ id: "a1", activity_type: "exercicio" }),
      makeEntry({ id: "a2", activity_type: "exercicio" }),
      makeEntry({ id: "a3", activity_type: "avaliacao" }),
      makeEntry({ id: "a4", activity_type: "projeto" }),
    ];
    expect(activityTypeDistribution(history)).toEqual([
      { activityType: "exercicio", count: 2 },
      { activityType: "avaliacao", count: 1 },
      { activityType: "projeto", count: 1 },
    ]);
  });

  it("treats null/empty activity_type as 'desconhecido'", () => {
    const history: AdaptationHistoryEntry[] = [
      makeEntry({ id: "a1", activity_type: null as unknown as string }),
    ];
    expect(activityTypeDistribution(history)).toEqual([
      { activityType: "desconhecido", count: 1 },
    ]);
  });
});

describe("dimensionBreakdown", () => {
  it("returns empty array when history is empty", () => {
    expect(dimensionBreakdown([])).toEqual([]);
  });

  it("aggregates barrier occurrences by dimension", () => {
    const history: AdaptationHistoryEntry[] = [
      makeEntry({
        id: "a1",
        barriers_used: [
          { dimension: "tdah", barrier_key: "tdah_atencao_sustentada" },
          { dimension: "tdah", barrier_key: "tdah_impulsividade" },
        ],
      }),
      makeEntry({
        id: "a2",
        barriers_used: [
          { dimension: "dislexia", barrier_key: "dislexia_leitura" },
        ],
      }),
    ];
    expect(dimensionBreakdown(history)).toEqual([
      { dimension: "tdah", count: 2 },
      { dimension: "dislexia", count: 1 },
    ]);
  });
});

describe("adaptationsByMonth", () => {
  it("returns empty array when history is empty", () => {
    expect(adaptationsByMonth([])).toEqual([]);
  });

  it("groups adaptations by YYYY-MM and sorts ascending", () => {
    const history: AdaptationHistoryEntry[] = [
      makeEntry({ id: "a1", created_at: "2026-02-10T10:00:00Z" }),
      makeEntry({ id: "a2", created_at: "2026-03-14T10:00:00Z" }),
      makeEntry({ id: "a3", created_at: "2026-03-20T10:00:00Z" }),
      makeEntry({ id: "a4", created_at: "2026-01-05T10:00:00Z" }),
    ];
    expect(adaptationsByMonth(history)).toEqual([
      { month: "2026-01", count: 1 },
      { month: "2026-02", count: 1 },
      { month: "2026-03", count: 2 },
    ]);
  });
});

describe("topStrategies", () => {
  it("returns empty array when history is empty", () => {
    expect(topStrategies([])).toEqual([]);
  });

  it("counts strategies_applied across entries, sorted desc, limited to 5", () => {
    const mk = (strategies: string[]) =>
      makeEntry({
        adaptation_result: { strategies_applied: strategies },
      });
    const history: AdaptationHistoryEntry[] = [
      mk(["A", "B"]),
      mk(["A", "C"]),
      mk(["A", "D", "E", "F"]),
    ];
    const result = topStrategies(history);
    expect(result.length).toBeLessThanOrEqual(5);
    expect(result[0]).toEqual({ name: "A", count: 3 });
  });

  it("ignores entries without strategies_applied", () => {
    const history: AdaptationHistoryEntry[] = [
      makeEntry({ adaptation_result: { strategies_applied: undefined } }),
      makeEntry({ adaptation_result: null as unknown as { strategies_applied: string[] } }),
      makeEntry({ adaptation_result: { strategies_applied: ["X"] } }),
    ];
    expect(topStrategies(history)).toEqual([{ name: "X", count: 1 }]);
  });
});
