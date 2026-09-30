"use client";

import {
  Bar,
  CartesianGrid,
  BarChart as RechartsBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type BarDatum = { label: string; count: number };

const number = new Intl.NumberFormat("fr-FR");
const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;
const axisTick = { fill: "var(--muted-foreground)", fontSize: 12 };

// Recharts wraps long tick labels; a single truncated line reads better.
function LabelTick({
  x,
  y,
  payload,
}: {
  x?: number | string;
  y?: number | string;
  payload?: { value?: unknown };
}) {
  const value = String(payload?.value ?? "");
  return (
    <text x={x} y={y} dy={4} textAnchor="end" {...axisTick}>
      <title>{value}</title>
      {truncate(value, 18)}
    </text>
  );
}

function ChartTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: readonly { payload?: BarDatum }[];
  unit: string;
}) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) return null;
  return (
    <div className="rounded-md border bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{datum.label}</p>
      <p className="text-muted-foreground tabular-nums">
        {number.format(datum.count)} {unit}
      </p>
    </div>
  );
}

/**
 * One series, one hue. `orientation="horizontal"` suits ranked labels,
 * `"vertical"` suits days. Rounded ends sit away from the baseline.
 */
export default function BarChart({
  data,
  orientation,
  unit,
  height = 240,
}: {
  data: BarDatum[];
  orientation: "horizontal" | "vertical";
  unit: string;
  height?: number;
}) {
  const horizontal = orientation === "horizontal";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
        barCategoryGap={2}
        // The chart is aria-hidden (the data table carries the content), so
        // it must not take keyboard focus either.
        accessibilityLayer={false}
      >
        <CartesianGrid
          stroke="var(--border)"
          horizontal={!horizontal}
          vertical={horizontal}
        />
        {horizontal ? (
          <>
            <XAxis
              type="number"
              allowDecimals={false}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={128}
              tick={(props) => <LabelTick {...props} />}
              axisLine={false}
              tickLine={false}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey="label"
              tick={axisTick}
              minTickGap={16}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              width={32}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
            />
          </>
        )}
        <Tooltip
          cursor={{ fill: "var(--surface-muted)" }}
          content={(props) => (
            <ChartTooltip
              active={props.active}
              payload={props.payload as readonly { payload?: BarDatum }[]}
              unit={unit}
            />
          )}
        />
        <Bar
          dataKey="count"
          fill="var(--chart-1)"
          maxBarSize={horizontal ? 14 : 24}
          radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
          isAnimationActive={false}
        />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
