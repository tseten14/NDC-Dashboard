import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { pledgeLimitLabel, WITHOUT_EXTRA_ACTION_LABEL } from "./ChartObservedProjected";

export interface Ndc2030CompareChartProps {
  pledgeLimit: number;
  withoutAction: number;
  unit: string;
  formatValue: (value: number) => string;
  latestValue?: number | null;
  latestYear?: number | null;
  capTarget?: boolean;
}

type CompareRow = {
  id: string;
  label: string;
  value: number;
  fill: string;
};

function CompareTooltip({
  active,
  payload,
  formatValue,
  unit,
}: {
  active?: boolean;
  payload?: { payload?: CompareRow }[];
  formatValue: (v: number) => string;
  unit: string;
}) {
  if (!active || !payload?.[0]?.payload) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{row.label}</p>
      <p className="text-muted-foreground mt-0.5">
        {formatValue(row.value)} {unit}
      </p>
    </div>
  );
}

/** Audience-friendly 2030 pledge vs no-extra-action comparison (solid bars). */
export function Ndc2030CompareChart({
  pledgeLimit,
  withoutAction,
  unit,
  formatValue,
  latestValue,
  latestYear,
  capTarget = true,
}: Ndc2030CompareChartProps) {
  const rows: CompareRow[] = [
    {
      id: "pledge",
      label: pledgeLimitLabel(capTarget),
      value: pledgeLimit,
      fill: "hsl(var(--chart-2))",
    },
    {
      id: "no-action",
      label: WITHOUT_EXTRA_ACTION_LABEL,
      value: withoutAction,
      fill: "hsl(var(--chart-3))",
    },
  ];

  const maxVal = Math.max(pledgeLimit, withoutAction, latestValue ?? 0);
  const xMax = maxVal * 1.12;

  const headroom = withoutAction - pledgeLimit;
  const headroomPct = pledgeLimit > 0 ? Math.round((headroom / pledgeLimit) * 100) : null;

  return (
    <div className="rounded-xl border border-border/80 bg-gradient-to-br from-muted/40 via-background to-muted/20 p-3 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold text-foreground tracking-tight">2030 at a glance</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug max-w-[280px]">
            How high emissions could be by 2030 — with Uganda&apos;s pledge, and without extra climate action.
          </p>
        </div>
        {latestValue != null && latestYear != null && (
          <div className="rounded-lg bg-[hsl(var(--chart-4)/0.12)] border border-[hsl(var(--chart-4)/0.25)] px-2.5 py-1.5 text-right shrink-0">
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Measured today</p>
            <p className="text-sm font-bold text-[hsl(var(--chart-4))] tabular-nums">
              {formatValue(latestValue)} <span className="text-[10px] font-normal text-muted-foreground">{unit}</span>
            </p>
            <p className="text-[9px] text-muted-foreground">{latestYear}</p>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={108}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 48, left: 4, bottom: 4 }}
          barCategoryGap="28%"
        >
          <defs>
            <linearGradient id="pledge-bar-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.85} />
              <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={1} />
            </linearGradient>
            <linearGradient id="no-action-bar-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.75} />
              <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0.95} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border) / 0.6)" />
          <XAxis type="number" domain={[0, xMax]} hide />
          <YAxis
            type="category"
            dataKey="label"
            width={118}
            tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
            content={<CompareTooltip formatValue={formatValue} unit={unit} />}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22} isAnimationActive={false}>
            {rows.map((row) => (
              <Cell
                key={row.id}
                fill={row.id === "pledge" ? "url(#pledge-bar-grad)" : "url(#no-action-bar-grad)"}
              />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v: number) => `${formatValue(v)} ${unit}`}
              style={{ fontSize: 10, fontWeight: 600, fill: "hsl(var(--foreground))" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {headroomPct != null && headroomPct > 0 && (
        <p className="text-[10px] text-muted-foreground mt-2 px-0.5 leading-relaxed">
          The pledge allows{" "}
          <span className="font-medium text-foreground">{formatValue(headroom)} {unit}</span> less than the
          no-extra-action level — room for policy to make a difference.
        </p>
      )}
    </div>
  );

}
