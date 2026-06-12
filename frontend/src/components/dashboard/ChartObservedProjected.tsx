import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ExternalLink, Info } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

/** Plain-language chart labels for non-technical readers. */
export function pledgeLimitLabel(capTarget: boolean): string {
  return capTarget ? "2030 pledge limit" : "Path to 2030 goal";
}

export const WITHOUT_EXTRA_ACTION_LABEL = "2030 if no extra action";

/** SVG hatch pattern for projected series (45°, 4px spacing). */
export function ChartHatchPatternDef({ id = "chart-hatch-projected" }: { id?: string }) {
  return (
    <defs>
      <pattern
        id={id}
        patternUnits="userSpaceOnUse"
        width="8"
        height="8"
        patternTransform="rotate(45)"
      >
        <line x1="0" y1="0" x2="0" y2="8" stroke="hsl(var(--chart-1))" strokeWidth="2" opacity="0.55" />
      </pattern>
    </defs>
  );
}

export function ObservedProjectedLegend({
  className,
  showTarget = true,
  showBauPath = false,
  showProjected = true,
  capTarget = false,
  compareLines = false,
  dataSourceHref,
  dataSourceLabel = "Climate TRACE API",
}: {
  className?: string;
  showTarget?: boolean;
  showBauPath?: boolean;
  showProjected?: boolean;
  capTarget?: boolean;
  /** When true, observed series is drawn as a line (not bars). */
  compareLines?: boolean;
  /** Optional external link for measured-series data provenance. */
  dataSourceHref?: string;
  dataSourceLabel?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] text-muted-foreground",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex items-center gap-1">
        {compareLines ? (
          <span
            className="inline-block h-0.5 w-4 border-t-2 border-[hsl(var(--chart-4))]"
            aria-hidden
          />
        ) : (
          <span className="inline-block h-2 w-2 rounded-full bg-[hsl(var(--chart-4))]" aria-hidden />
        )}
        Measured
      </span>
      {showProjected && (
        <span className="inline-flex items-center gap-1">
          <span
            className="inline-block h-0.5 w-4 border-t-2 border-dashed border-[hsl(var(--chart-1))]"
            aria-hidden
          />
          Projected
        </span>
      )}
      {showBauPath && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:border-border transition-colors"
            >
              <span
                className="inline-block h-0.5 w-4 border-t-2 border-dashed border-[hsl(var(--chart-3))] shrink-0"
                aria-hidden
              />
              {WITHOUT_EXTRA_ACTION_LABEL}
              <Info className="h-2.5 w-2.5 shrink-0" aria-hidden />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="max-w-[260px] p-3 space-y-1">
            <p className="text-xs font-semibold">If no extra climate action</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              An estimate of emissions in 2030 if Uganda does not add new climate policies.
              It shows how much headroom the pledge creates compared with doing nothing extra.
            </p>
          </PopoverContent>
        </Popover>
      )}
      {showTarget && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:border-border transition-colors"
            >
              <span
                className="inline-block h-0.5 w-4 border-t-2 border-dashed border-[hsl(var(--chart-2))] shrink-0"
                aria-hidden
              />
              {pledgeLimitLabel(capTarget)}
              <Info className="h-2.5 w-2.5 shrink-0" aria-hidden />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="max-w-[260px] p-3 space-y-1">
            {capTarget ? (
              <>
                <p className="text-xs font-semibold">2030 pledge limit</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The highest emissions Uganda committed to stay under by 2030 in its climate pledge (NDC).
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold">Path to the 2030 goal</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The steady path from the starting year to the 2030 target in the climate pledge.
                </p>
              </>
            )}
          </PopoverContent>
        </Popover>
      )}
      </div>
      {dataSourceHref && (
        <span className="inline-flex items-center gap-1 shrink-0">
          <span>Where this data comes from:</span>
          <a
            href={dataSourceHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
          >
            {dataSourceLabel}
            <ExternalLink className="h-2.5 w-2.5" aria-hidden />
          </a>
        </span>
      )}
    </div>
  );
}

/** Normalize target unit for Y-axis label. */
export function chartYAxisUnit(unit: string): string {
  const u = unit.trim();
  if (/mtco/i.test(u.replace(/\s/g, ""))) return "MtCO₂e";
  if (u.includes("%")) return "%";
  return u || "Value";
}

/** Bar charts show observed history only — never 2030 or other forecast horizon years. */
export function filterBarChartYears<T extends { year: number }>(
  rows: T[],
  getObserved?: (row: T) => number | null | undefined,
): T[] {
  const without2030 = rows.filter((r) => r.year < 2030);
  if (!getObserved) return without2030;

  const latestYear = without2030.reduce((max, r) => {
    const v = getObserved(r);
    return v != null && Number.isFinite(v) ? Math.max(max, r.year) : max;
  }, -Infinity);

  if (!Number.isFinite(latestYear) || latestYear < 0) return without2030;
  return without2030.filter((r) => r.year <= latestYear);
}

/** Y-axis domain with padding so bars, projection, and NDC reference lines aren't clipped. */
export function chartValueExtent(
  rows: ObservedProjectedRow[],
  includeReference = false,
): [number, number] {
  const values = rows.flatMap((r) => {
    const base = [r.observedValue, r.projectedValue];
    if (includeReference) base.push(r.target ?? null, r.bauPath ?? null);
    return base.filter((v): v is number => v != null && Number.isFinite(v));
  });
  const positive = values.filter((v) => v > 0);
  const usable = positive.length > 0 ? positive : values;
  if (usable.length === 0) return [0, 1];

  const min = Math.min(...usable);
  const max = Math.max(...usable);
  const span = max - min;
  const pad = span > 0 ? span * 0.12 : Math.max(max * 0.15, max === 0 ? 1 : 1);
  const yMin = positive.length > 0 ? Math.max(0, min - pad) : min - pad;
  const yMax = max + pad;
  return yMin === yMax ? [0, Math.max(yMax, 1)] : [yMin, yMax];
}

/** Estimate Y-axis width from formatted tick labels so they don't clip. */
export function estimateYAxisWidth(
  rows: ObservedProjectedRow[],
  formatTick: (value: number) => string,
  includeReference = false,
): number {
  const [yMin, yMax] = chartValueExtent(rows, includeReference);
  const mid = (yMin + yMax) / 2;
  const longest = [yMin, mid, yMax]
    .map((v) => formatTick(v))
    .reduce((a, b) => (a.length >= b.length ? a : b), "");
  return Math.min(72, Math.max(40, longest.length * 7 + 12));
}

export function formatChartAxisTick(value: number): string {
  if (!Number.isFinite(value)) return "";
  const abs = Math.abs(value);
  if (abs >= 1000) return Math.round(value).toLocaleString();
  if (abs >= 100) return Math.round(value).toString();
  if (abs >= 10) return value.toFixed(1);
  if (abs >= 1) return value.toFixed(1);
  return value.toFixed(2);
}

export type ObservedProjectedRow = {
  year: number;
  observedValue: number | null;
  projectedValue: number | null;
  target: number | null;
  bauPath?: number | null;
};

/** Merge historical bars with a projection line anchored at the latest observation. */
export function buildObservedProjectedRows(
  historical: { year: number; value: number | null; target?: number | null; bauPath?: number | null }[],
  projection: { year: number; value: number | null; target?: number | null; bauPath?: number | null }[],
): ObservedProjectedRow[] {
  const observedOnly = historical.filter((p) => p.value != null);
  const lastObservedYear = observedOnly[observedOnly.length - 1]?.year ?? null;

  const rows: ObservedProjectedRow[] = observedOnly.map((p) => ({
    year: p.year,
    observedValue: p.value,
    projectedValue: p.year === lastObservedYear ? p.value : null,
    target: p.target ?? null,
    bauPath: p.bauPath ?? null,
  }));

  const seenYears = new Set(rows.map((r) => r.year));

  for (const p of projection) {
    if (p.value == null) continue;
    if (lastObservedYear != null && p.year <= lastObservedYear) continue;
    if (seenYears.has(p.year)) continue;
    rows.push({
      year: p.year,
      observedValue: null,
      projectedValue: p.value,
      target: p.target ?? null,
      bauPath: p.bauPath ?? null,
    });
    seenYears.add(p.year);
  }

  return rows.sort((a, b) => a.year - b.year);
}

export function lastObservedYearFromRows(rows: ObservedProjectedRow[]): number | null {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (rows[i]?.observedValue != null) return rows[i]!.year;
  }
  return null;
}

export function focusProjectionChartWindow(
  rows: ObservedProjectedRow[],
  observedContextYears = 3,
): ObservedProjectedRow[] {
  const anchorYear = lastObservedYearFromRows(rows);
  if (anchorYear == null) return rows;
  const minYear = anchorYear - observedContextYears + 1;
  return rows.filter((row) => row.year >= minYear);
}

function ObservedProjectedTooltip({
  active,
  payload,
  label,
  observedLabel,
  formatValue = formatChartAxisTick,
  showTarget = false,
  showBauPath = false,
  capTarget = false,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | null; dataKey?: string; color?: string }[];
  label?: string | number;
  observedLabel: string;
  formatValue?: (value: number) => string;
  showTarget?: boolean;
  showBauPath?: boolean;
  capTarget?: boolean;
}) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload as ObservedProjectedRow | undefined;
  const observed = row?.observedValue;
  const projected = row?.projectedValue;
  const target = row?.target;
  const bauPath = row?.bauPath;

  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-2 text-[11px] shadow-sm">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {observed != null && (
        <p className="text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-[hsl(var(--chart-4))] mr-1.5 align-middle" />
          {observedLabel}: <span className="text-foreground font-medium">{formatValue(observed)}</span>
        </p>
      )}
      {projected != null && observed == null && (
        <p className="text-muted-foreground">
          <span
            className="inline-block h-0.5 w-3 border-t-2 border-dashed border-[hsl(var(--chart-1))] mr-1.5 align-middle"
            aria-hidden
          />
          Projected: <span className="text-foreground font-medium">{formatValue(projected)}</span>
        </p>
      )}
      {projected != null && observed != null && (
        <p className="text-muted-foreground">
          <span
            className="inline-block h-0.5 w-3 border-t-2 border-dashed border-[hsl(var(--chart-1))] mr-1.5 align-middle"
            aria-hidden
          />
          Projection starts: <span className="text-foreground font-medium">{formatValue(projected)}</span>
        </p>
      )}
      {showTarget && target != null && (
        <p className="text-muted-foreground">
          <span
            className="inline-block h-0.5 w-3 border-t-2 border-dashed border-[hsl(var(--chart-2))] mr-1.5 align-middle"
            aria-hidden
          />
          {capTarget ? pledgeLimitLabel(true) : pledgeLimitLabel(false)}:{" "}
          <span className="text-foreground font-medium">{formatValue(target)}</span>
        </p>
      )}
      {showBauPath && bauPath != null && (
        <p className="text-muted-foreground">
          <span
            className="inline-block h-0.5 w-3 border-t-2 border-dashed border-[hsl(var(--chart-3))] mr-1.5 align-middle"
            aria-hidden
          />
          {WITHOUT_EXTRA_ACTION_LABEL}:{" "}
          <span className="text-foreground font-medium">{formatValue(bauPath)}</span>
        </p>
      )}
    </div>
  );
}

export function ObservedProjectedComposedChart({
  data,
  yUnit,
  observedSeriesLabel,
  showProjection = false,
  showTarget = false,
  showBauPath = false,
  capTarget = false,
  onBarClick,
  onPointClick,
  height = 220,
  formatTick = formatChartAxisTick,
  xAxisLabel = "Year",
  compareLines = false,
}: {
  data: ObservedProjectedRow[];
  yUnit: string;
  observedSeriesLabel: string;
  showProjection?: boolean;
  showTarget?: boolean;
  showBauPath?: boolean;
  capTarget?: boolean;
  /** @deprecated use onPointClick */
  onBarClick?: (point: { year: number; value: number }) => void;
  onPointClick?: (point: { year: number; value: number }) => void;
  height?: number;
  formatTick?: (value: number) => string;
  xAxisLabel?: string;
  compareLines?: boolean;
}) {
  const handlePointClick = onPointClick ?? onBarClick;
  const includeReference = showTarget || showBauPath;
  const useLines = compareLines || includeReference;
  const plotData = useLines
    ? data
    : filterBarChartYears(data, (row) => row.observedValue);
  const [yMin, yMax] = chartValueExtent(plotData, includeReference);
  const yAxisWidth = estimateYAxisWidth(plotData, formatTick, includeReference);
  const anchorYear = lastObservedYearFromRows(plotData);
  const lastYear = plotData[plotData.length - 1]?.year ?? null;
  const hasPositiveValues = plotData.some(
    (row) => (row.observedValue ?? 0) > 0 || (row.projectedValue ?? 0) > 0,
  );

  return (
    <div className="flex items-stretch gap-2 min-w-0">
      <div
        className="flex shrink-0 items-center justify-center self-center"
        style={{ width: 14, minHeight: height - 24 }}
        aria-hidden
      >
        <span className="block origin-center -rotate-90 whitespace-nowrap text-[10px] font-medium text-muted-foreground">
          {yUnit}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={plotData}
            margin={{ top: 10, right: 8, left: 4, bottom: xAxisLabel ? 18 : 6 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              stroke="hsl(var(--border))"
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickMargin={6}
              interval="preserveStartEnd"
              label={
                xAxisLabel
                  ? {
                      value: xAxisLabel,
                      position: "insideBottom",
                      offset: -2,
                      style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
                    }
                  : undefined
              }
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={formatTick}
              stroke="hsl(var(--border))"
              tickLine={false}
              axisLine={false}
              width={yAxisWidth}
              tickMargin={4}
              tickCount={5}
              allowDecimals
            />
            <RTooltip
              content={
                <ObservedProjectedTooltip
                  observedLabel={observedSeriesLabel}
                  formatValue={formatTick}
                  showTarget={showTarget}
                  showBauPath={showBauPath}
                  capTarget={capTarget}
                />
              }
              cursor={useLines ? { stroke: "hsl(var(--muted-foreground) / 0.35)" } : { fill: "hsl(var(--muted) / 0.25)" }}
            />
            {showTarget && (
              <Line
                dataKey="target"
                name={pledgeLimitLabel(capTarget)}
                type="linear"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                strokeDasharray="6 4"
                connectNulls
                isAnimationActive={false}
                dot={false}
                activeDot={false}
              />
            )}
            {showBauPath && (
              <Line
                dataKey="bauPath"
                name={WITHOUT_EXTRA_ACTION_LABEL}
                type="linear"
                stroke="hsl(var(--chart-3))"
                strokeWidth={2}
                strokeDasharray="4 4"
                connectNulls
                isAnimationActive={false}
                dot={false}
                activeDot={false}
              />
            )}
            {useLines ? (
              <Line
                dataKey="observedValue"
                name={observedSeriesLabel}
                type="monotone"
                stroke="hsl(var(--chart-4))"
                strokeWidth={2.5}
                connectNulls
                isAnimationActive={false}
                dot={{
                  r: 3,
                  fill: "hsl(var(--chart-4))",
                  stroke: "hsl(var(--background))",
                  strokeWidth: 2,
                }}
                activeDot={
                  handlePointClick
                    ? {
                        r: 5,
                        strokeWidth: 2,
                        fill: "hsl(var(--chart-4))",
                        cursor: "pointer",
                        onClick: (_e, dot) => {
                          const row = dot?.payload as ObservedProjectedRow | undefined;
                          if (row?.observedValue != null) {
                            handlePointClick({ year: row.year, value: row.observedValue });
                          }
                        },
                      }
                    : { r: 5, strokeWidth: 2, fill: "hsl(var(--chart-4))" }
                }
              />
            ) : (
              <Bar
                dataKey="observedValue"
                name={observedSeriesLabel}
                fill="hsl(var(--chart-4))"
                radius={[2, 2, 0, 0]}
                maxBarSize={showProjection ? 28 : 36}
                minPointSize={2}
                cursor={handlePointClick ? "pointer" : undefined}
                onClick={
                  handlePointClick
                    ? (bar: { year?: number; observedValue?: number | null }) => {
                        if (bar?.observedValue != null && bar?.year != null) {
                          handlePointClick({ year: bar.year, value: bar.observedValue });
                        }
                      }
                    : undefined
                }
              />
            )}
            {showProjection && (
              <Line
                dataKey="projectedValue"
                name="Projected"
                type="linear"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                connectNulls
                isAnimationActive={false}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (cx == null || cy == null || !payload) return null;
                  const year = (payload as ObservedProjectedRow).year;
                  const isAnchor = year === anchorYear;
                  const isEnd = year === lastYear;
                  if (!isAnchor && !isEnd) return null;
                  return (
                    <circle
                      key={`projected-dot-${year}`}
                      cx={cx}
                      cy={cy}
                      r={isAnchor ? 4 : 3}
                      fill="hsl(var(--chart-1))"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  );
                }}
                activeDot={{ r: 5, strokeWidth: 2, fill: "hsl(var(--chart-1))" }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
        {!hasPositiveValues && (
          <p className="text-[10px] text-muted-foreground text-center -mt-1 px-2">
            Values are zero or below the display threshold for this district and sector.
          </p>
        )}
      </div>
    </div>
  );
}
