const DAY = 86_400_000;

export type DayCount = { date: string; label: string; count: number };

/** One entry per UTC day ending today, days without events included. */
export function countByDay(
  dates: string[],
  now: Date,
  days: number,
): DayCount[] {
  const counts = new Map<string, number>();
  for (const date of dates) {
    const day = date.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(now.getTime() - (days - 1 - i) * DAY)
      .toISOString()
      .slice(0, 10);
    return {
      date,
      label: `${date.slice(8, 10)}/${date.slice(5, 7)}`,
      count: counts.get(date) ?? 0,
    };
  });
}

export type Ranked = { id: string; label: string; count: number };

/** Products saved in the most wishlists; deleted products are skipped. */
export function topWishlisted(
  lines: { productId: string }[],
  names: Map<string, string>,
  limit = 5,
): Ranked[] {
  const counts = new Map<string, number>();
  for (const { productId } of lines) {
    if (names.has(productId)) {
      counts.set(productId, (counts.get(productId) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([id, count]) => ({ id, label: names.get(id)!, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "fr"))
    .slice(0, limit);
}
