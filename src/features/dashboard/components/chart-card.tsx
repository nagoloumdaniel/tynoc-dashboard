"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { BarDatum } from "./bar-chart";

const HEIGHT = 240;

// Recharts measures the DOM: load it in the browser, after the page.
const BarChart = dynamic(() => import("./bar-chart"), {
  ssr: false,
  loading: () => <Skeleton style={{ height: HEIGHT }} />,
});

const number = new Intl.NumberFormat("fr-FR");

/** The chart is decoration over the data table, which carries the content. */
export function ChartCard({
  title,
  description,
  data,
  orientation,
  unit,
  labelHeader,
  emptyText,
}: {
  title: string;
  description: string;
  data: BarDatum[];
  orientation: "horizontal" | "vertical";
  unit: string;
  labelHeader: string;
  emptyText: string;
}) {
  const empty = data.every((d) => d.count === 0);
  return (
    <figure className="flex min-w-0 flex-col gap-3 rounded-lg border bg-surface p-4">
      <figcaption>
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </figcaption>
      {empty ? (
        <p className="flex items-center justify-center rounded-md bg-surface-muted px-4 py-12 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <>
          <div aria-hidden>
            <BarChart
              data={data}
              orientation={orientation}
              unit={unit}
              height={HEIGHT}
            />
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              Voir les données
            </summary>
            <table className="mt-2 w-full text-left text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th scope="col" className="py-1 font-medium">
                    {labelHeader}
                  </th>
                  <th scope="col" className="py-1 text-right font-medium">
                    Nombre
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.label} className="border-t">
                    <td className="py-1">{d.label}</td>
                    <td className="py-1 text-right tabular-nums">
                      {number.format(d.count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </figure>
  );
}
