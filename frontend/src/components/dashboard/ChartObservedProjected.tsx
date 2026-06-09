import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

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
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 cursor-help">
              <span
                className="inline-block h-0.5 w-4 border-t-2 border-dashed border-[hsl(var(--chart-3))]"
                aria-hidden
              />
              2030 no-policy level
              <Info className="h-2.5 w-2.5 text-muted-foreground/50" aria-hidden />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[260px] p-3 space-y-1">
            <p className="text-xs font-semibold">Business-As-Usual (BAU) Baseline</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The projected emissions trajectory if no additional climate policies or
              interventions are implemented beyond those already in place. This
              counterfactual "no-extra-policy" path shows what unconstrained emissions
              growth looks like by 2030, and is the reference point for measuring NDC ambition.
            </p>
          </TooltipContent>
        </Tooltip>
      )}
      {showTarget && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 cursor-help">
              <span
                className="inline-block h-0.5 w-4 border-t-2 border-dashed border-[hsl(var(--chart-2))]"
                aria-hidden
              />
              {capTarget ? "2030 NDC ceiling" : "NDC target path"}
              <Info className="h-2.5 w-2.5 text-muted-foreground/50" aria-hidden />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[260px] p-3 space-y-1">
            {capTarget ? (
              <>
                <p className="text-xs font-semibold">NDC Emissions Ceiling</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The maximum allowable emissions level under the country's Nationally
                  Determined Contributions (NDC) commitment. This is an absolute cap —
                  emissions must stay at or below this value by 2030 to be considered
                  on track with the national climate pledge.
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
          </TooltipContent>
        </Tooltip>
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

export type ObservedProjectedRow = {
  year: number;
  observedValue: number | null;
  projectedValue: number | null;
  target: number | null;
  bauPath?: number | null;
};

/** Split historical + projection bridge rows for dual-style charts. */
export function buildObservedProjectedRows(
  historical: { year: number; value: number | null; target?: number | null; bauPath?: number | null }[],
  projection: { year: number; value: number | null; target?: number | null; bauPath?: number | null }[],
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
    bauPath: p.bauPath ?? null,
  }));
}
