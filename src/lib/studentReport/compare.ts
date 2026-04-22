export type PeriodAggregate = {
  adaptations: number;
  distinctBarriers: number;
  strategies: number;
};

export type PeriodDiff = {
  adaptationsDelta: number;
  distinctBarriersDelta: number;
  strategiesDelta: number;
  adaptationsPercent: number | null;
  distinctBarriersPercent: number | null;
  strategiesPercent: number | null;
};

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function diffPeriods(
  current: PeriodAggregate,
  previous: PeriodAggregate
): PeriodDiff {
  return {
    adaptationsDelta: current.adaptations - previous.adaptations,
    distinctBarriersDelta: current.distinctBarriers - previous.distinctBarriers,
    strategiesDelta: current.strategies - previous.strategies,
    adaptationsPercent: percentChange(current.adaptations, previous.adaptations),
    distinctBarriersPercent: percentChange(current.distinctBarriers, previous.distinctBarriers),
    strategiesPercent: percentChange(current.strategies, previous.strategies),
  };
}
