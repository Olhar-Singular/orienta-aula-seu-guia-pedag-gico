import { describe, expect, it } from "vitest";
import {
  filterByPeriod,
  presetRange,
  type AdaptationWithDate,
} from "@/lib/studentReport/periodFilter";

const now = new Date("2026-04-21T12:00:00Z");

function entry(id: string, created_at: string): AdaptationWithDate {
  return { id, created_at };
}

describe("filterByPeriod", () => {
  it("returns empty array when input is empty", () => {
    expect(filterByPeriod([], { start: new Date(), end: new Date() })).toEqual([]);
  });

  it("includes entries inside the range (inclusive of start, exclusive of end)", () => {
    const entries = [
      entry("a", "2026-04-01T00:00:00Z"),
      entry("b", "2026-04-15T10:00:00Z"),
      entry("c", "2026-04-21T12:00:00Z"),
    ];
    const range = {
      start: new Date("2026-04-01T00:00:00Z"),
      end: new Date("2026-04-21T12:00:00Z"),
    };
    const result = filterByPeriod(entries, range);
    expect(result.map((e) => e.id)).toEqual(["a", "b"]);
  });
});

describe("presetRange", () => {
  it("computes LAST_30_DAYS ending at now", () => {
    const range = presetRange("LAST_30_DAYS", now);
    expect(range.end.toISOString()).toBe(now.toISOString());
    expect(range.start.toISOString()).toBe("2026-03-22T12:00:00.000Z");
  });

  it("computes PREV_30_DAYS (30 to 60 days ago)", () => {
    const range = presetRange("PREV_30_DAYS", now);
    expect(range.end.toISOString()).toBe("2026-03-22T12:00:00.000Z");
    expect(range.start.toISOString()).toBe("2026-02-20T12:00:00.000Z");
  });

  it("computes LAST_60_DAYS and PREV_60_DAYS", () => {
    const last60 = presetRange("LAST_60_DAYS", now);
    const prev60 = presetRange("PREV_60_DAYS", now);
    expect(last60.end.toISOString()).toBe(now.toISOString());
    expect(last60.start.toISOString()).toBe("2026-02-20T12:00:00.000Z");
    expect(prev60.end.toISOString()).toBe(last60.start.toISOString());
    expect(prev60.start.toISOString()).toBe("2025-12-22T12:00:00.000Z");
  });
});
