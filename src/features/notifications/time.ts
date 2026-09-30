const relative = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** "il y a 5 minutes", "hier"… A clock slightly ahead reads as now. */
export function timeAgo(iso: string, now = new Date()): string {
  const elapsed = now.getTime() - new Date(iso).getTime();
  for (const [unit, ms] of STEPS) {
    if (elapsed >= ms) return relative.format(-Math.floor(elapsed / ms), unit);
  }
  return "à l'instant";
}
