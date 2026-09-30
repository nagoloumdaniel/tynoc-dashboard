import Link from "next/link";
import { cn } from "@/lib/utils";
import { PERIODS, type Period } from "../period";

/** Plain links: the period lives in the URL and works without JavaScript. */
export function PeriodSelector({
  value,
  basePath,
}: {
  value: Period;
  basePath: string;
}) {
  return (
    <nav
      aria-label="Période"
      className="inline-flex rounded-md border bg-surface p-0.5"
    >
      {PERIODS.map((period) => (
        <Link
          key={period}
          href={period === 30 ? basePath : `${basePath}?period=${period}`}
          aria-current={period === value ? "page" : undefined}
          scroll={false}
          className={cn(
            "rounded-sm px-3 py-1.5 text-sm text-muted-foreground tabular-nums transition-colors hover:text-foreground",
            period === value &&
              "bg-surface-muted font-medium text-foreground shadow-xs",
          )}
        >
          {period} jours
        </Link>
      ))}
    </nav>
  );
}
