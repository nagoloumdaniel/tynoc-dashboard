import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
};

/**
 * Table from `md` up, cards below: wide tables do not fit a phone and
 * horizontal scrolling hides columns.
 */
export function DataTable<T>({
  caption,
  rows,
  columns,
  rowKey,
  renderCard,
  busy = false,
}: {
  caption: string;
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  renderCard: (row: T) => ReactNode;
  busy?: boolean;
}) {
  return (
    <div
      aria-busy={busy}
      className={cn("transition-opacity", busy && "opacity-60")}
    >
      <div className="hidden overflow-x-auto rounded-lg border bg-surface md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b bg-surface-muted/60 text-left text-xs text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn("px-4 py-2.5 font-medium", column.className)}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-surface-muted/40">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn("px-4 py-3 align-middle", column.className)}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li key={rowKey(row)}>{renderCard(row)}</li>
        ))}
      </ul>
    </div>
  );
}
