"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useUrlFilters } from "./use-url-filters";

const linkClass =
  "inline-flex h-9 items-center gap-1 rounded-md border bg-surface px-3 text-sm font-medium hover:bg-surface-muted";

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
}) {
  const { hrefWith } = useUrlFilters();
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const href = (target: number) =>
    hrefWith({ page: target > 1 ? String(target) : undefined });

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p className="text-sm text-muted-foreground tabular-nums">
        {from}–{to} sur {total}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={linkClass} scroll={false}>
            <ChevronLeftIcon className="size-4" aria-hidden />
            Précédent
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={cn(linkClass, "pointer-events-none opacity-50")}
          >
            <ChevronLeftIcon className="size-4" aria-hidden />
            Précédent
          </span>
        )}
        {page < pageCount ? (
          <Link href={href(page + 1)} className={linkClass} scroll={false}>
            Suivant
            <ChevronRightIcon className="size-4" aria-hidden />
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={cn(linkClass, "pointer-events-none opacity-50")}
          >
            Suivant
            <ChevronRightIcon className="size-4" aria-hidden />
          </span>
        )}
      </div>
    </nav>
  );
}
