import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info } from "lucide-react";
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
}: {
  className?: string;
  /** When false, hide the NDC target line (e.g. district view with no national target overlay). */
  showTarget?: boolean;
  /** When true, show the 2030 no-policy (BAU) reference line. */
  showBauPath?: boolean;
  /** When false, hide projected series (historical-only charts). */
  showProjected?: boolean;
  /** When true, label the target line as a ceiling cap rather than a reduction path. */
  capTarget?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground", className)}>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-full bg-[hsl(var(--chart-4))]" aria-hidden />
        Observed
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
              2030 no-policy level
              <Info className="h-2.5 w-2.5 shrink-0" aria-hidden />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="max-w-[260px] p-3 space-y-1">
            <p className="text-xs font-semibold">No New Policies Scenario</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              How much this country would emit by 2030 if no new climate actions are taken.
              It's a "what if nothing changes" reference line, useful for seeing how much
              difference climate policies actually make.
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
              {capTarget ? "2030 NDC ceiling" : "NDC target path"}
              <Info className="h-2.5 w-2.5 shrink-0" aria-hidden />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="max-w-[260px] p-3 space-y-1">
            {capTarget ? (
              <>
                <p className="text-xs font-semibold">NDC Emissions Ceiling</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The highest amount of greenhouse gases this country is allowed to produce.
                  To meet its climate promise, emissions must stay at or below this level by 2030.
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold">NDC Target Path</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The linear emissions reduction pathway consistent with the NDC pledge,
                  showing the expected trajectory from the baseline year to the 2030
                  target value.
                </p>
              </>
            )}
          </PopoverContent>
        </Popover>
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

/** Y-axis domain with padding so bars and projection line aren't clipped. */
export function chartValueExtent(rows: ObservedProjectedRow[]): [number, number] {
  const values = rows.flatMap((r) =>
    [r.observedValue, r.projectedValue].filter((v): v is number => v != null && Number.isFinite(v)),
  );
  if (values.length === 0) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const pad = span > 0 ? span * 0.1 : Math.max(max * 0.08, 1);
  return [Math.max(0, min - pad), max + pad];
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
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | null; dataKey?: string; color?: string }[];
  label?: string | number;
  observedLabel: string;
}) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload as ObservedProjectedRow | undefined;
  const observed = row?.observedValue;
  const projected = row?.projectedValue;

  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-2 text-[11px] shadow-sm">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {observed != null && (
        <p className="text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-[hsl(var(--chart-4))] mr-1.5 align-middle" />
          {observedLabel}: <span className="text-foreground font-medium">{observed}</span>
        </p>
      )}
      {projected != null && observed == null && (
        <p className="text-muted-foreground">
          <span
            className="inline-block h-0.5 w-3 border-t-2 border-dashed border-[hsl(var(--chart-1))] mr-1.5 align-middle"
            aria-hidden
          />
          Projected: <span className="text-foreground font-medium">{projected}</span>
        </p>
      )}
      {projected != null && observed != null && (
        <p className="text-muted-foreground">
          <span
            className="inline-block h-0.5 w-3 border-t-2 border-dashed border-[hsl(var(--chart-1))] mr-1.5 align-middle"
            aria-hidden
          />
          Projection starts: <span className="text-foreground font-medium">{projected}</span>
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
  onBarClick,
  height = 180,
}: {
  data: ObservedProjectedRow[];
  yUnit: string;
  observedSeriesLabel: string;
  showProjection?: boolean;
  onBarClick?: (point: { year: number; value: number }) => void;
  height?: number;
}) {
  const [yMin, yMax] = chartValueExtent(data);
  const anchorYear = lastObservedYearFromRows(data);
  const lastYear = data[data.length - 1]?.year ?? null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 11 }}
          stroke="hsl(var(--muted-foreground))"
          tickLine={false}
          axisLine={{ stroke: "hsl(var(--border))" }}
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fontSize: 11 }}
          tickFormatter={formatChartAxisTick}
          stroke="hsl(var(--muted-foreground))"
          tickLine={false}
          axisLine={false}
          width={44}
          label={{
            value: yUnit,
            angle: -90,
            position: "insideLeft",
            offset: 10,
            style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
          }}
        />
        <RTooltip
          content={<ObservedProjectedTooltip observedLabel={observedSeriesLabel} />}
          cursor={{ fill: "hsl(var(--muted) / 0.25)" }}
        />
        <Bar
          dataKey="observedValue"
          name={observedSeriesLabel}
          fill="hsl(var(--chart-4))"
          radius={[2, 2, 0, 0]}
          maxBarSize={showProjection ? 28 : 36}
          cursor={onBarClick ? "pointer" : undefined}
          onClick={
            onBarClick
              ? (bar: { year?: number; observedValue?: number | null }) => {
                  if (bar?.observedValue != null && bar?.year != null) {
                    onBarClick({ year: bar.year, value: bar.observedValue });
                  }
                }
              : undefined
          }
        />
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
  );
}
