import { useMemo } from "react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { bau2030ForTarget } from "@/data/uganda-ndc-data";
import { CountUpNumber } from "@/components/dashboard/CountUpNumber";
import { capTargetPosition } from "@/lib/progress";
import { getTargetPlainLanguage } from "@/lib/target-plain-language";

interface ProgressProps {
  selectedTarget: NDCTarget | null;
}

const statusConfig: Record<ProgressStatus, { label: string; color: string; bg: string; ring: string }> = {
  "on-track": { label: "On Track", color: "text-on-track", bg: "bg-on-track", ring: "ring-on-track/30" },
  "at-risk": { label: "At Risk", color: "text-at-risk", bg: "bg-at-risk", ring: "ring-at-risk/30" },
  "off-track": { label: "Off Track", color: "text-off-track", bg: "bg-off-track", ring: "ring-off-track/30" },
  unknown: { label: "Unknown", color: "text-muted-foreground", bg: "bg-muted-foreground", ring: "ring-muted" },
};

export function ProgressTowardTargetColumn({ selectedTarget }: ProgressProps) {
  const emissions = useEmissionsData();

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

  const { percent, status, source } = emissions.getProgressForTarget(selectedTarget);
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

  // Plain-language description of this specific target's progress — wording for
  // a non-technical reader rather than formulas and numbers.
  const plain = getTargetPlainLanguage(selectedTarget);

  const statusNarrative =
    status === "on-track"
      ? "Uganda is on track to meet this 2030 pledge. Keeping the measures already in place should hold it on course."
      : status === "at-risk"
        ? "Progress has started, but this pledge is at risk — stronger or faster action is needed to reach the 2030 goal."
        : status === "off-track"
          ? "This pledge is off track. Current efforts are not yet bending the numbers toward the 2030 goal."
          : "There isn't enough recent data to say whether this pledge is on track for 2030.";

  const howItWorks = isEmissionsCapTarget
    ? "Because Uganda's economy is growing, the aim isn't to cut emissions below today's level — it's to keep them below where they would have climbed without new climate action."
    : selectedTarget.metricType === "emissions-reduction"
      ? "The aim here is to bring emissions down from where they are today."
      : "The aim here is to grow this measure toward its 2030 target.";

  const baselineMismatch =
    source === "api" &&
    pr?.baseline_vs_trace_delta_mt != null &&
    (Math.abs(pr.baseline_vs_trace_delta_mt) >= 5 ||
      (isEmissionsCapTarget &&
        pr.baseline_value > 0 &&
        Math.abs(pr.baseline_vs_trace_delta_mt) / pr.baseline_value >= 0.25));

  const capPosition =
    isEmissionsCapTarget && bau2030 != null && liveLatest != null
      ? capTargetPosition(liveLatest.value, selectedTarget.targetValue, bau2030)
      : null;

  const capExplainerText =
    capPosition === "below_cap"
      ? `Current emissions (${liveLatest?.value} Mt) are within the allowed limit of ${selectedTarget.targetValue} Mt — this counts as full progress, even if emissions ticked up slightly last year.`
      : capPosition === "between_cap_and_bau"
        ? `Current emissions are above the allowed limit (${selectedTarget.targetValue} Mt) but still lower than they would be without new policies (${bau2030} Mt) — partial progress.`
        : capPosition === "above_bau"
          ? `Current emissions (${liveLatest?.value} Mt) are above both the allowed limit (${selectedTarget.targetValue} Mt) and the no-new-policies level (${bau2030} Mt) — progress is 0% until emissions come back down.`
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

  if (!hasProgressData) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-border bg-muted/50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Progress</h3>
        </div>
        <ScrollArea className="flex-1">
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
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-border dash-section-header">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Progress</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {districtNote}
          {isEmissionsCapTarget && !emissions.isDistrictView && (
            <div className="p-2 rounded-md bg-primary/5 border border-primary/20 text-xs">
              <p className="font-medium text-foreground">This is a ceiling target, not a cut from 2015</p>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">
                Uganda pledged to stay below {selectedTarget.targetValue} Mt by 2030 — below the expected
                &ldquo;no extra policy&rdquo; level
                {bau2030 != null ? ` (${bau2030} Mt)` : ""}. Progress =
                {" "}(no-policy trend − latest) ÷ (no-policy trend − ceiling) × 100.
              </p>
              {capExplainerText && (
                <p className="text-foreground/90 mt-1.5 leading-relaxed">{capExplainerText}</p>
              )}
            </div>
          )}

          {baselineMismatch && pr && (
            <div className="p-2 rounded-md bg-muted/40 border border-border text-xs">
              <p className="font-medium text-foreground">Note: two different ways of counting emissions</p>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">
                Uganda&apos;s official inventory baseline ({pr.baseline_value} Mt) and Climate TRACE&apos;s estimate (
                {pr.latest_value} Mt in {pr.latest_year}) use different methods — that is expected. Progress uses
                Climate TRACE observations compared to the NDC pledge.
              </p>
            </div>
          )}

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

              {capProgressBar}

              <ProgressFormulaBlock
                selectedTarget={selectedTarget}
                isEmissionsCapTarget={isEmissionsCapTarget}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 text-xs space-y-2">
              <p className="font-semibold text-foreground">What this pledge means</p>
              <p className="text-muted-foreground leading-relaxed">{plain.summary}</p>
              <p className="font-semibold text-foreground pt-1">Where things stand</p>
              <p className="text-muted-foreground leading-relaxed">{statusNarrative}</p>
              <p className="font-semibold text-foreground pt-1">How to read this</p>
              <p className="text-muted-foreground leading-relaxed">{howItWorks}</p>
              {pr?.scope_note && <p className="text-muted-foreground leading-relaxed">{pr.scope_note}</p>}
            </CardContent>
          </Card>

        </div>
      </ScrollArea>
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
    <div className="mt-3 w-full px-2.5 py-2 rounded-md bg-muted/40 border border-border text-center">
      <p className="text-[9px] uppercase tracking-wide font-semibold text-muted-foreground mb-1">
        Progress formula
      </p>
      <p className="text-[10px] text-foreground whitespace-nowrap overflow-x-auto">{template}</p>
    </div>
  );
}

/** Visual scale: latest vs NDC ceiling vs no-policy BAU (lower is better). */
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
  const max = Math.max(bau, cap, latest) * 1.05;
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / max) * 100))}%`;
  return (
    <div className="w-full max-w-[240px] mt-2 text-left">
      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-chart-3 z-10 cursor-help"
              style={{ left: pct(bau) }}
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px] p-2.5 space-y-1">
            <p className="text-xs font-semibold">No-Policy Level (BAU): {bau} {unit}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Projected emissions if no additional climate policies are enacted — the
              Business-As-Usual baseline. Progress is measured relative to this line.
            </p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-chart-2 z-10 cursor-help"
              style={{ left: pct(cap) }}
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px] p-2.5 space-y-1">
            <p className="text-xs font-semibold">NDC Ceiling: {cap} {unit}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The maximum allowable emissions under the NDC commitment. Staying at or
              below this level by 2030 counts as meeting the national climate pledge.
            </p>
          </TooltipContent>
        </Tooltip>
        <div
          className="absolute top-0 bottom-0 h-full bg-chart-4/80 rounded-full"
          style={{ width: pct(latest) }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
        <span>0</span>
        <span className="text-chart-4">Latest {latest}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-chart-2 cursor-help underline decoration-dotted underline-offset-2">
              Cap {cap}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[200px] p-2">
            <p className="text-xs">NDC ceiling: max allowable emissions ({cap} {unit}) under the pledge.</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
