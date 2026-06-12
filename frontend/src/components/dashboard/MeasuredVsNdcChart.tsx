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

export interface MeasuredVsNdcChartProps {
  /** Latest measured value. */
  measuredValue: number;
  measuredYear: number;
  /** Reference value to compare against (ceiling for caps, baseline for growth targets). */
  ndcReference: number;
  ndcReferenceLabel: string;
  measuredLabel?: string;
  unit: string;
  formatValue: (value: number) => string;
  /** When true, a higher measured value means better progress (forest cover, access, etc.). */
  higherIsBetter?: boolean;
  /** Final NDC goal year — shown in subtitle for growth targets. */
  goalYear?: number;
  goalValue?: number;
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

/** Side-by-side comparison of measured reality vs the NDC reference (no forecasts). */
export function MeasuredVsNdcChart({
  measuredValue,
  measuredYear,
  ndcReference,
  ndcReferenceLabel,
  measuredLabel = "Measured",
  unit,
  formatValue,
  higherIsBetter = false,
  goalYear,
  goalValue,
}: MeasuredVsNdcChartProps) {
  const rows: CompareRow[] = [
    {
      id: "measured",
      label: `${measuredLabel} (${measuredYear})`,
      value: measuredValue,
      fill: "hsl(var(--chart-3))",
    },
    {
      id: "ndc",
      label: ndcReferenceLabel,
      value: ndcReference,
      fill: "hsl(var(--chart-2))",
    },
  ];

  const maxVal = Math.max(measuredValue, ndcReference);
  const xMax = maxVal * 1.12;
  const gap = Math.abs(measuredValue - ndcReference);
  const onTrack = higherIsBetter ? measuredValue >= ndcReference : measuredValue <= ndcReference;

  const subtitle = higherIsBetter
    ? goalYear != null && goalValue != null
      ? `Compares the latest measured value with where Uganda started in its NDC — based on data collected so far. The ${goalYear} goal is ${formatValue(goalValue)} ${unit}.`
      : "Compares the latest measured value with the NDC starting baseline — based on data collected so far, not a forecast."
    : "Compares the latest measured emissions with Uganda's NDC commitment ceiling — based on data collected so far, not a forecast.";

  return (
    <div className="rounded-xl border border-border/80 bg-gradient-to-br from-muted/40 via-background to-muted/20 p-3 shadow-sm dash-card-hover dash-fade-up">
      <div className="mb-3">
        <p className="text-[11px] font-semibold text-foreground tracking-tight">Reality vs NDC pledge</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug max-w-[320px]">{subtitle}</p>
      </div>

      <ResponsiveContainer width="100%" height={96}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 48, left: 4, bottom: 4 }}
          barCategoryGap="28%"
        >
          <defs>
            <linearGradient id="measured-bar-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.8} />
              <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={1} />
            </linearGradient>
            <linearGradient id="ndc-bar-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.85} />
              <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border) / 0.6)" />
          <XAxis type="number" domain={[0, xMax]} hide />
          <YAxis
            type="category"
            dataKey="label"
            width={148}
            tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
            content={<CompareTooltip formatValue={formatValue} unit={unit} />}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22} isAnimationActive animationDuration={700}>
            {rows.map((row) => (
              <Cell
                key={row.id}
                fill={row.id === "measured" ? "url(#measured-bar-grad)" : "url(#ndc-bar-grad)"}
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

      {gap > 0 && (
        <p className="text-[10px] text-muted-foreground mt-2 px-0.5 leading-relaxed">
          {higherIsBetter ? (
            onTrack ? (
              <>
                Measured value is{" "}
                <span className="font-medium text-on-track">
                  {formatValue(gap)} {unit} above
                </span>{" "}
                the NDC starting baseline — progress since the pledge was made.
              </>
            ) : (
              <>
                Measured value is{" "}
                <span className="font-medium text-at-risk">
                  {formatValue(gap)} {unit} below
                </span>{" "}
                the NDC starting baseline.
              </>
            )
          ) : onTrack ? (
            <>
              Measured emissions are{" "}
              <span className="font-medium text-on-track">
                {formatValue(gap)} {unit} below
              </span>{" "}
              the NDC pledge limit — within the committed ceiling.
            </>
          ) : (
            <>
              Measured emissions are{" "}
              <span className="font-medium text-off-track">
                {formatValue(gap)} {unit} above
              </span>{" "}
              the NDC pledge limit.
            </>
          )}
        </p>
      )}
    </div>
  );
}
