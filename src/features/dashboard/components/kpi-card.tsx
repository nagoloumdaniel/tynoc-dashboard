import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { type Comparison, describeComparison } from "../comparison";
import type { Period } from "../period";

const number = new Intl.NumberFormat("fr-FR");

/**
 * A figure, its change in words and an arrow. `rising` says whether going up
 * is good news (customers) or bad news (stock-outs); it only tints the arrow,
 * the text keeps text colours.
 */
export function KpiCard({
  label,
  comparison,
  period,
  href,
  rising = "good",
}: {
  label: string;
  comparison: Comparison;
  period: Period;
  href: string;
  rising?: "good" | "bad" | "neutral";
}) {
  const { direction } = comparison;
  const Icon =
    direction === "up"
      ? ArrowUpRightIcon
      : direction === "down"
        ? ArrowDownRightIcon
        : MinusIcon;
  const tone =
    direction === null || direction === "flat" || rising === "neutral"
      ? "text-muted-foreground"
      : (direction === "up") === (rising === "good")
        ? "text-success"
        : "text-danger";

  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-lg border bg-surface p-4 transition-colors hover:border-primary/40"
    >
      <span className="text-sm text-muted-foreground group-hover:text-foreground">
        {label}
      </span>
      <span className="text-2xl font-semibold tabular-nums">
        {number.format(comparison.current)}
      </span>
      <span className="flex items-start gap-1 text-xs text-muted-foreground">
        {direction === null ? null : (
          <Icon className={cn("mt-px size-3.5 shrink-0", tone)} aria-hidden />
        )}
        {describeComparison(comparison, period)}
      </span>
    </Link>
  );
}
