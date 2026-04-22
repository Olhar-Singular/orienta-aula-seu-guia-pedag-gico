export type DateRange = {
  start: Date;
  end: Date;
};

export type AdaptationWithDate = {
  id: string;
  created_at: string;
};

export type PeriodPreset =
  | "LAST_30_DAYS"
  | "PREV_30_DAYS"
  | "LAST_60_DAYS"
  | "PREV_60_DAYS";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function filterByPeriod<T extends AdaptationWithDate>(
  entries: T[],
  range: DateRange
): T[] {
  const startMs = range.start.getTime();
  const endMs = range.end.getTime();
  return entries.filter((e) => {
    const t = new Date(e.created_at).getTime();
    return t >= startMs && t < endMs;
  });
}

function shiftDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function presetRange(preset: PeriodPreset, now: Date = new Date()): DateRange {
  switch (preset) {
    case "LAST_30_DAYS":
      return { start: shiftDays(now, -30), end: now };
    case "PREV_30_DAYS":
      return { start: shiftDays(now, -60), end: shiftDays(now, -30) };
    case "LAST_60_DAYS":
      return { start: shiftDays(now, -60), end: now };
    case "PREV_60_DAYS":
      return { start: shiftDays(now, -120), end: shiftDays(now, -60) };
  }
}
