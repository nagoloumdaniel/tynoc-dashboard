export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];

const DAY = 86_400_000;

export function parsePeriod(value: unknown): Period {
  const raw = Number(Array.isArray(value) ? value[0] : value);
  return PERIODS.includes(raw as Period) ? (raw as Period) : 30;
}

export type Range = { from: string; to: string };

/** The last `period` days, and the same length just before. */
export function periodRanges(period: Period, now = new Date()) {
  const end = now.getTime();
  const at = (ms: number) => new Date(ms).toISOString();
  return {
    current: { from: at(end - period * DAY), to: at(end) },
    previous: { from: at(end - 2 * period * DAY), to: at(end - period * DAY) },
  };
}

export const inRange = (iso: string, range: Range) =>
  iso >= range.from && iso < range.to;

/** UTC day key of a stats snapshot, e.g. "2026-09-30". */
export function snapshotDate(now: Date, daysAgo: number): string {
  return new Date(now.getTime() - daysAgo * DAY).toISOString().slice(0, 10);
}
