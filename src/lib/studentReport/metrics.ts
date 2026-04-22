export type BarrierUsed = {
  dimension: string;
  barrier_key: string;
};

export type AdaptationHistoryEntry = {
  id: string;
  activity_type: string | null;
  created_at: string;
  barriers_used: BarrierUsed[] | null;
  adaptation_result: { strategies_applied?: string[] | null } | null;
};

export type StudentBarrierRecord = {
  barrier_key: string;
  is_active: boolean;
};

export type ReportSummary = {
  totalAdaptations: number;
  distinctActivityTypes: number;
  activeBarriers: number;
  topBarrierKey: string | null;
};

export type BarrierFrequencyItem = {
  barrierKey: string;
  dimension: string;
  count: number;
};

export type ActivityTypeCount = {
  activityType: string;
  count: number;
};

export type DimensionCount = {
  dimension: string;
  count: number;
};

export type MonthCount = {
  month: string;
  count: number;
};

export type StrategyCount = {
  name: string;
  count: number;
};

const UNKNOWN_ACTIVITY_TYPE = "desconhecido";

function normalizeBarriersUsed(entry: AdaptationHistoryEntry): BarrierUsed[] {
  return Array.isArray(entry.barriers_used) ? entry.barriers_used : [];
}

function normalizeActivityType(entry: AdaptationHistoryEntry): string {
  const type = entry.activity_type;
  if (typeof type === "string" && type.trim().length > 0) return type;
  return UNKNOWN_ACTIVITY_TYPE;
}

export function barrierFrequency(history: AdaptationHistoryEntry[]): BarrierFrequencyItem[] {
  const counts = new Map<string, BarrierFrequencyItem>();
  for (const entry of history) {
    for (const b of normalizeBarriersUsed(entry)) {
      const existing = counts.get(b.barrier_key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(b.barrier_key, {
          barrierKey: b.barrier_key,
          dimension: b.dimension,
          count: 1,
        });
      }
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

export function activityTypeDistribution(
  history: AdaptationHistoryEntry[]
): ActivityTypeCount[] {
  const counts = new Map<string, number>();
  for (const entry of history) {
    const key = normalizeActivityType(entry);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([activityType, count]) => ({ activityType, count }))
    .sort((a, b) => b.count - a.count);
}

export function dimensionBreakdown(
  history: AdaptationHistoryEntry[]
): DimensionCount[] {
  const counts = new Map<string, number>();
  for (const entry of history) {
    for (const b of normalizeBarriersUsed(entry)) {
      counts.set(b.dimension, (counts.get(b.dimension) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([dimension, count]) => ({ dimension, count }))
    .sort((a, b) => b.count - a.count);
}

export function adaptationsByMonth(
  history: AdaptationHistoryEntry[]
): MonthCount[] {
  const counts = new Map<string, number>();
  for (const entry of history) {
    const d = new Date(entry.created_at);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
}

const MAX_TOP_STRATEGIES = 5;

export function topStrategies(history: AdaptationHistoryEntry[]): StrategyCount[] {
  const counts = new Map<string, number>();
  for (const entry of history) {
    const strategies = entry.adaptation_result?.strategies_applied;
    if (!Array.isArray(strategies)) continue;
    for (const s of strategies) {
      if (typeof s !== "string" || s.length === 0) continue;
      counts.set(s, (counts.get(s) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_TOP_STRATEGIES);
}

export function summarize(
  history: AdaptationHistoryEntry[],
  barriers: StudentBarrierRecord[]
): ReportSummary {
  const freq = barrierFrequency(history);
  const distinctActivityTypes = activityTypeDistribution(history).filter(
    (a) => a.activityType !== UNKNOWN_ACTIVITY_TYPE
  ).length;
  const activeBarriers = barriers.filter((b) => b.is_active).length;
  return {
    totalAdaptations: history.length,
    distinctActivityTypes,
    activeBarriers,
    topBarrierKey: freq.length > 0 ? freq[0].barrierKey : null,
  };
}
