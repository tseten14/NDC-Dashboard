/**
 * Dashboard column: progress (column 3 of 3).
 *
 * The right-hand column — how far the observed figures leave Uganda from the
 * pledge, as a percentage and an on-track judgement.
 *
 * The formula is printed on the panel rather than hidden, because a progress
 * percentage is meaningless unless the reader can see how it was calculated.
 */
import { useMemo, type ReactNode } from "react";
import { type NDCTarget, type ProgressStatus } from "@/data/uganda-ndc-data";
import { useEmissionsData } from "@/context/EmissionsDataContext";
import {
  getClimateTraceSectorForTarget,
  getLiveLatestForTarget,
  isDistrictProgressBlocked,
  isIndicatorPanelTarget,
  resolveObservedDataSetForTarget,
} from "@/lib/emissions-integration";
import { ColumnLoadingState, NoDataPlaceholder, SelectTargetPlaceholder } from "@/components/dashboard/DashboardStates";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { bau2030ForTarget } from "@/data/uganda-ndc-data";
import { CountUpNumber } from "@/components/dashboard/CountUpNumber";
import { capTargetPosition } from "@/lib/progress";

interface ProgressProps {
  selectedTarget: NDCTarget | null;
  /** Rendered at the end of the scroll content (e.g. Data & insights list). */
  footer?: ReactNode;
  /** When false, render at natural height (no internal scroll) for a shared page scroll. */
  scroll?: boolean;
}

const statusConfig: Record<ProgressStatus, { label: string; color: string; bg: string; ring: string }> = {
  "on-track": { label: "On Track", color: "text-on-track", bg: "bg-on-track", ring: "ring-on-track/30" },
  "at-risk": { label: "At Risk", color: "text-at-risk", bg: "bg-at-risk", ring: "ring-at-risk/30" },
  "off-track": { label: "Off Track", color: "text-off-track", bg: "bg-off-track", ring: "ring-off-track/30" },
  unknown: { label: "Unknown", color: "text-muted-foreground", bg: "bg-muted-foreground", ring: "ring-muted" },
};

export function ProgressTowardTargetColumn({ selectedTarget, footer, scroll = true }: ProgressProps) {
  const emissions = useEmissionsData();
  const rootCls = "flex flex-col h-full";
  const wrap = (children: ReactNode) =>
    scroll ? <ScrollArea className="flex-1">{children}</ScrollArea> : <div>{children}</div>;

  const indEntry =
    selectedTarget && isIndicatorPanelTarget(selectedTarget)
      ? emissions.indicatorTargets?.[selectedTarget.id]
      : undefined;

  const observedForData = useMemo(() => {
    if (!selectedTarget) return null;
    return resolveObservedDataSetForTarget(selectedTarget, {
      timeseriesBySector: emissions.timeseriesBySector,
      progressBySector: emissions.progressBySector,
      economyWideTimeseries: emissions.economyWideTimeseries,
      isApiReachable: emissions.isApiReachable,
      dashboard: emissions.dashboard,
      reconciliation: emissions.reconciliation,
      getObservedMode: emissions.getObservedMode,
      indicatorTargets: emissions.indicatorTargets,
    });
  }, [
    selectedTarget,
    emissions.timeseriesBySector,
    emissions.progressBySector,
    emissions.economyWideTimeseries,
    emissions.isApiReachable,
    emissions.dashboard,
    emissions.reconciliation,
    emissions.getObservedMode,
    emissions.indicatorTargets,
  ]);

  if (!selectedTarget) {
    return <SelectTargetPlaceholder column="Progress" />;
  }

  const apiSector = getClimateTraceSectorForTarget(selectedTarget);
  const pr = apiSector ? emissions.progressBySector[apiSector] : undefined;
  const isLoadingProgress =
    (!!apiSector && !!emissions.sectorLoading[apiSector] && !pr) ||
    (isIndicatorPanelTarget(selectedTarget) && emissions.indicatorPanelLoading && !indEntry) ||
    (selectedTarget.sectorId === "economy-wide" &&
      emissions.summaryIsLoading &&
      emissions.economyWideTimeseries.length === 0);

  if (isLoadingProgress) {
    return <ColumnLoadingState title="Progress" />;
  }

  const { percent, status } = emissions.getProgressForTarget(selectedTarget);
  const districtProgressBlocked = isDistrictProgressBlocked(selectedTarget, emissions.isDistrictView);
  const liveLatest = getLiveLatestForTarget(selectedTarget, {
    progressBySector: emissions.progressBySector,
    economyWideTimeseries: emissions.economyWideTimeseries,
    indicatorTargets: emissions.indicatorTargets,
  });
  const isNationalOnlyTarget =
    isIndicatorPanelTarget(selectedTarget) || selectedTarget.sectorId === "economy-wide";
  const districtNote = emissions.isDistrictView ? (
    isNationalOnlyTarget ? (
      <div className="p-2 rounded-md bg-muted/60 border border-border text-[11px] text-muted-foreground">
        National-level indicator — district selection has no effect.
        No sub-national breakdown is available for this target.
      </div>
    ) : (
      <div className="p-2 rounded-md bg-muted/60 border border-border text-[11px] text-muted-foreground">
        Showing <span className="font-medium text-foreground">{emissions.districtName}</span> observed emissions.
        NDC targets are national, so progress is not scored at district level — values are for local context only.
      </div>
    )
  ) : null;
  const hasProgressData = percent != null;
  const displayPercent = hasProgressData ? percent : 0;
  const cfg = statusConfig[status];
  const isEmissionsCapTarget =
    selectedTarget.metricType === "emissions-reduction" &&
    selectedTarget.targetValue > selectedTarget.baselineValue;

  const bau2030 = pr?.bau_2030 ?? bau2030ForTarget(selectedTarget);

  const capPosition =
    isEmissionsCapTarget && bau2030 != null && liveLatest != null
      ? capTargetPosition(liveLatest.value, selectedTarget.targetValue, bau2030)
      : null;

  const zeroProgressNote =
    capPosition === "above_bau"
      ? "Emissions are too high — above both the limit and the no-new-policies level"
      : capPosition === "between_cap_and_bau"
        ? "Above the allowed limit — more reductions needed"
        : "Not yet moving toward this goal";

  const capProgressBar =
    isEmissionsCapTarget && bau2030 != null && liveLatest != null ? (
      <CapProgressScale
        latest={liveLatest.value}
        cap={selectedTarget.targetValue}
        bau={bau2030}
        unit={selectedTarget.unit}
      />
    ) : null;

  // Non-cap targets (growth metrics like forest/wetland cover, or true emission
  // reductions): show a starting-point → latest → goal scale, mirroring the cap card.
  const goalProgressBar =
    !isEmissionsCapTarget && liveLatest != null ? (
      <GoalProgressScale
        latest={liveLatest.value}
        baseline={selectedTarget.baselineValue}
        goal={selectedTarget.targetValue}
        baselineYear={selectedTarget.baselineYear}
        targetYear={selectedTarget.targetYear}
        unit={selectedTarget.unit}
        status={status}
      />
    ) : null;

  // One concise plain-language sentence on where this pledge stands.
  const statusNarrative =
    status === "on-track"
      ? "On track to meet this 2030 pledge — keeping current measures should hold the course."
      : status === "at-risk"
        ? "Progress has begun, but stronger or faster action is needed to reach the 2030 goal."
        : status === "off-track"
          ? "Off track — current efforts are not yet bending the numbers toward the 2030 goal."
          : "Not enough recent data to judge progress toward the 2030 goal.";

  if (!hasProgressData) {
    return (
      <div className={rootCls}>
        <div className="px-3 py-2 border-b border-border bg-muted/50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Progress</h3>
        </div>
        {wrap(
          <div className="p-4 space-y-3">
            {districtNote}
            <NoDataPlaceholder
              hint={
                districtProgressBlocked
                  ? "District progress is not scored against national NDC targets. See the Observed Data column for district emissions."
                  : "Progress requires observed values for the selected reporting period."
              }
            />
            <ProgressFormulaBlock
              selectedTarget={selectedTarget}
              isEmissionsCapTarget={isEmissionsCapTarget}
            />
            {footer}
          </div>,
        )}
      </div>
    );
  }

  return (
    <div className={rootCls}>
      <div className="px-3 py-2.5 border-b border-border dash-section-header">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Progress</h3>
      </div>
      {wrap(
        <div className="p-3 space-y-3">
          {districtNote}

          <Card className={cn("ring-2 dash-card-hover dash-fade-up", cfg.ring)}>
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="relative w-28 h-28 mb-3">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="52" fill="none"
                    stroke={`hsl(var(--${status === "unknown" ? "neutral" : status}))`}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(displayPercent / 100) * 327} 327`}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <CountUpNumber
                    value={displayPercent}
                    format={(v) => `${Math.round(v)}%`}
                    className={cn("text-2xl font-bold tabular-nums", cfg.color)}
                  />
                </div>
              </div>

              <div className="w-full max-w-[220px] mb-2">
                <Progress value={displayPercent} className="h-2" />
              </div>

              <Badge variant="outline" className={cn("text-xs px-3 py-1 font-semibold", cfg.color, cfg.ring)}>
                {cfg.label}
              </Badge>
              {hasProgressData && displayPercent === 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">{zeroProgressNote}</p>
              )}
              {hasProgressData && displayPercent === 100 && capPosition === "below_cap" && pr?.trace_yoy_pct != null && pr.trace_yoy_pct > 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  100% because emissions are still below the ceiling, even with +{pr.trace_yoy_pct}% year-on-year.
                </p>
              )}
              {!hasProgressData && (
                <p className="mt-1 text-[11px] text-muted-foreground">Not enough data to score progress</p>
              )}

              <p className="mt-2 max-w-[240px] text-[11px] text-muted-foreground leading-snug">
                {statusNarrative}
              </p>

              {capProgressBar}
              {goalProgressBar}

              <ProgressFormulaBlock
                selectedTarget={selectedTarget}
                isEmissionsCapTarget={isEmissionsCapTarget}
              />
            </CardContent>
          </Card>

          {footer}
        </div>,
      )}
    </div>
  );
}

function ProgressFormulaBlock({
  selectedTarget,
  isEmissionsCapTarget,
}: {
  selectedTarget: NDCTarget;
  isEmissionsCapTarget: boolean;
}) {
  const isTrueReduction =
    selectedTarget.metricType === "emissions-reduction" &&
    selectedTarget.targetValue < selectedTarget.baselineValue;

  let template: string;

  if (isEmissionsCapTarget) {
    template =
      "Progress = (without new policies − measured) ÷ (without new policies − pledge limit) × 100";
  } else if (isTrueReduction) {
    template = "Progress = (starting point − measured) ÷ (starting point − goal) × 100";
  } else {
    template = "Progress = (measured − starting point) ÷ (goal − starting point) × 100";
  }

  return (
    <div className="mt-3 w-full min-w-0 px-2.5 py-2 rounded-md bg-muted/40 border border-border text-center">
      <p className="text-[9px] uppercase tracking-wide font-semibold text-muted-foreground mb-1">
        Progress formula
      </p>
      <p className="text-[10px] text-foreground break-words leading-relaxed">{template}</p>
    </div>
  );
}

/**
 * Visual scale comparing today's emissions to the NDC ceiling and the no-policy
 * (BAU) level. Lower is better: staying at or below the red ceiling = meeting the
 * pledge. Designed to be readable without hovering — every line is labelled and a
 * plain-language legend sits below.
 */
function CapProgressScale({
  latest,
  cap,
  bau,
  unit,
}: {
  latest: number;
  cap: number;
  bau: number;
  unit: string;
}) {
  // Keep the no-policy (BAU) level in the scale maths so the bar proportions stay
  // sensible, but it is no longer shown as its own legend row or marker.
  const max = Math.max(bau, cap, latest) * 1.05;
  const leftPct = (v: number) => Math.min(100, Math.max(0, (v / max) * 100));

  // Lower emissions are better. Colour the current bar by where it sits.
  const tone =
    latest <= cap
      ? { bar: "bg-on-track", text: "text-on-track" }
      : latest <= bau
        ? { bar: "bg-at-risk", text: "text-at-risk" }
        : { bar: "bg-off-track", text: "text-off-track" };

  const fmt = (v: number) => `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })}`;

  return (
    <div className="w-full max-w-[250px] mt-3 text-left">
      <p className="text-[10px] font-semibold text-foreground">
        Today's emissions vs the 2030 pledge
      </p>
      <p className="text-[9px] text-muted-foreground mb-2">Lower is better — stay at or below the ceiling.</p>

      {/* Track: 0 (left) → no-policy level (right) */}
      <div className="relative h-3 rounded-full bg-muted overflow-visible">
        {/* current emissions fill */}
        <div
          className={cn("absolute top-0 bottom-0 left-0 rounded-full transition-all", tone.bar)}
          style={{ width: `${leftPct(latest)}%` }}
        />
        {/* NDC ceiling marker */}
        <div
          className="absolute -top-1 -bottom-1 w-[2px] bg-off-track z-10"
          style={{ left: `${leftPct(cap)}%` }}
        />
      </div>

      {/* Plain-language legend with values */}
      <div className="mt-2.5 space-y-1">
        <LegendRow swatch={<span className={cn("h-2 w-2 rounded-full", tone.bar)} />} label="Latest emissions" value={`${fmt(latest)} ${unit}`} valueClass={tone.text} />
        <LegendRow swatch={<span className="h-2.5 w-[2px] bg-off-track" />} label="NDC ceiling (2030 target)" value={`${fmt(cap)} ${unit}`} valueClass="text-off-track" />
      </div>
    </div>
  );
}

function LegendRow({
  swatch,
  label,
  value,
  valueClass,
}: {
  swatch: ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      <span className="flex h-2.5 w-2.5 items-center justify-center shrink-0">{swatch}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("ml-auto font-semibold tabular-nums", valueClass)}>{value}</span>
    </div>
  );
}

/**
 * Scale for non-cap targets: how far the latest value has moved from the starting
 * point toward the 2030 goal. Reads left→right (start → goal) for both growth and
 * reduction targets, with a labelled legend and verdict — mirrors CapProgressScale.
 */
function GoalProgressScale({
  latest,
  baseline,
  goal,
  baselineYear,
  targetYear,
  unit,
  status,
}: {
  latest: number;
  baseline: number;
  goal: number;
  baselineYear: number;
  targetYear: number;
  unit: string;
  status: ProgressStatus;
}) {
  const higherIsBetter = goal >= baseline;
  const denom = goal - baseline || 1;
  const frac = (latest - baseline) / denom; // 0 at start, 1 at goal
  const fillPct = Math.min(100, Math.max(0, frac * 100));

  const tone =
    status === "on-track"
      ? { bar: "bg-on-track", text: "text-on-track" }
      : status === "at-risk"
        ? { bar: "bg-at-risk", text: "text-at-risk" }
        : status === "off-track"
          ? { bar: "bg-off-track", text: "text-off-track" }
          : { bar: "bg-muted-foreground", text: "text-muted-foreground" };

  const fmt = (v: number) =>
    `${v.toLocaleString(undefined, { maximumFractionDigits: unit.includes("%") ? 1 : 1 })}${unit.includes("%") ? "%" : ` ${unit}`}`;

  return (
    <div className="w-full max-w-[250px] mt-3 text-left">
      <p className="text-[10px] font-semibold text-foreground">Progress toward the 2030 goal</p>
      <p className="text-[9px] text-muted-foreground mb-2">
        {higherIsBetter ? "Higher is better — grow toward the goal." : "Lower is better — bring it down to the goal."}
      </p>

      {/* Track: starting point (left) → 2030 goal (right) */}
      <div className="relative h-3 rounded-full bg-muted overflow-visible">
        <div className={cn("absolute top-0 bottom-0 left-0 rounded-full transition-all", tone.bar)} style={{ width: `${fillPct}%` }} />
        {/* goal marker at right edge */}
        <div className="absolute -top-1 -bottom-1 right-0 w-[2px] bg-on-track z-10" />
      </div>

      <div className="mt-2.5 space-y-1">
        <LegendRow swatch={<span className={cn("h-2 w-2 rounded-full", tone.bar)} />} label={`Latest (${targetYear > baselineYear ? "now" : baselineYear})`} value={fmt(latest)} valueClass={tone.text} />
        <LegendRow swatch={<span className="h-2.5 w-[2px] bg-on-track" />} label={`2030 goal`} value={fmt(goal)} valueClass="text-on-track" />
        <LegendRow swatch={<span className="h-2 w-2 rounded-full bg-muted-foreground/50" />} label={`Starting point (${baselineYear})`} value={fmt(baseline)} valueClass="text-muted-foreground" />
      </div>
    </div>
  );
}
