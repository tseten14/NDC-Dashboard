import { cn } from "@/lib/utils";

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

export function ObservedProjectedLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground", className)}>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-full bg-[hsl(var(--chart-4))]" aria-hidden />
        Observed
      </span>
      <span className="inline-flex items-center gap-1">
        <span
          className="inline-block h-0.5 w-4 border-t-2 border-dashed border-[hsl(var(--chart-1))]"
          aria-hidden
        />
        Projected
      </span>
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

export type ObservedProjectedRow = {
  year: number;
  observedValue: number | null;
  projectedValue: number | null;
  target: number | null;
};

/** Split historical + projection bridge rows for dual-style charts. */
export function buildObservedProjectedRows(
  historical: { year: number; value: number | null; target?: number | null }[],
  projection: { year: number; value: number | null; target?: number | null }[],
): ObservedProjectedRow[] {
  const observedOnly = historical.filter((p) => p.value != null);
  const lastObservedYear = observedOnly[observedOnly.length - 1]?.year ?? null;

  const bridge = [
    ...observedOnly.slice(-2),
    ...projection,
  ];

  return bridge.map((p) => ({
    year: p.year,
    observedValue: lastObservedYear != null && p.year <= lastObservedYear ? p.value : null,
    projectedValue: lastObservedYear != null && p.year >= lastObservedYear ? p.value : null,
    target: p.target ?? null,
  }));
}
