/**
 * Chart: measured emissions against the NDC ceiling.
 *
 * A direct two-bar comparison of the latest measurement and the pledge limit —
 * the simplest statement of whether Uganda is inside its commitment.
 */
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
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs ">
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

  const maxVal = Math.max(measuredValue, ndcReference, 0);
  const xMax = maxVal * 1.12;
  // A net sink (negative AFOLU total) needs room left of zero, or its bar is clipped.
  const xMin = Math.min(measuredValue, ndcReference, 0) * 1.12;
  const gap = Math.abs(measuredValue - ndcReference);
  const onTrack = higherIsBetter ? measuredValue >= ndcReference : measuredValue <= ndcReference;

  const subtitle = higherIsBetter
    ? goalYear != null && goalValue != null
      ? `Compares the latest measured value with where Uganda started in its NDC — based on data collected so far. The ${goalYear} goal is ${formatValue(goalValue)} ${unit}.`
      : "Compares the latest measured value with the NDC starting baseline — based on data collected so far, not a forecast."
    : "Compares the latest measured emissions with Uganda's NDC commitment ceiling — based on data collected so far, not a forecast.";

  return (
    <div className="rounded-xl border border-border/80 bg-gradient-to-br from-muted/40 via-background to-muted/20 p-3  dash-card-hover dash-fade-up">
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
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border) / 0.6)" />
          <XAxis type="number" domain={[xMin, xMax]} hide />
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
          <Bar dataKey="value" radius={0} maxBarSize={22} isAnimationActive={false}>
            {rows.map((row) => (
              <Cell
                key={row.id}
                fill={row.id === "measured" ? "hsl(var(--chart-3))" : "hsl(var(--chart-2))"}
              />
            ))}
            <LabelList
              dataKey="value"
              content={({ x, y, width, height, value }) => {
                const nx = Number(x);
                const nw = Number(width);
                // Negative bars grow left from zero; keep the label clear of the category names.
                const labelX = Math.max(nx, nx + nw) + 5;
                return (
                  <text
                    x={labelX}
                    y={Number(y) + Number(height) / 2}
                    dominantBaseline="central"
                    fontSize={10}
                    fontWeight={600}
                    fill="hsl(var(--foreground))"
                  >
                    {`${formatValue(Number(value))} ${unit}`}
                  </text>
                );
              }}
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
                <span className="font-medium text-muted-foreground">
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
