export type AdaptationStats = {
  total: number;
  week: number;
  month: number;
};

export const EMPTY_STATS: AdaptationStats = { total: 0, week: 0, month: 0 };

export function sumAdaptationStats(...parts: AdaptationStats[]): AdaptationStats {
  return parts.reduce<AdaptationStats>(
    (acc, p) => ({
      total: acc.total + p.total,
      week: acc.week + p.week,
      month: acc.month + p.month,
    }),
    EMPTY_STATS,
  );
}

export function sinceIso(now: Date, days: number): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}
