import { inRange, type Period, type periodRanges } from "./period";

export type Comparison = {
  current: number;
  previous: number | null;
  delta: number | null;
  percent: number | null;
  direction: "up" | "down" | "flat" | null;
};

export function compare(current: number, previous: number | null): Comparison {
  if (previous === null) {
    return { current, previous, delta: null, percent: null, direction: null };
  }
  const delta = current - previous;
  return {
    current,
    previous,
    delta,
    percent: previous === 0 ? null : Math.round((delta / previous) * 100),
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
  };
}

// True minus sign: a hyphen reads as a dash to screen readers.
const signed = (value: number) =>
  value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "0";

/** The change in words, so the colour is never the only signal. */
export function describeComparison(c: Comparison, period: Period): string {
  const reference = `les ${period} jours précédents`;
  if (c.direction === null || c.delta === null)
    return "Pas encore d'historique";
  if (c.direction === "flat")
    return `Stable par rapport aux ${period} jours précédents`;
  if (c.percent === null) return `${signed(c.delta)} (aucun ${reference})`;
  return `${signed(c.percent)} % par rapport aux ${period} jours précédents`;
}

export function countInRanges(
  dates: string[],
  ranges: ReturnType<typeof periodRanges>,
) {
  let current = 0;
  let previous = 0;
  for (const date of dates) {
    if (inRange(date, ranges.current)) current++;
    else if (inRange(date, ranges.previous)) previous++;
  }
  return { current, previous };
}
