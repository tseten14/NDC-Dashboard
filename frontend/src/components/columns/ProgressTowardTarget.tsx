import { useMemo } from "react";
import { type NDCTarget, type ProgressStatus, type QAQCStatus } from "@/data/uganda-ndc-data";
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
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { bau2030ForTarget } from "@/data/uganda-ndc-data";
import { capTargetPosition } from "@/lib/progress";

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

  const latestRow = useMemo(() => {
    const rows = observedForData?.historicalData;
    if (!rows?.length) return undefined;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].value != null) return rows[i];
    }
    return undefined;
  }, [observedForData]);

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
  const latestDisplay =
    liveLatest != null
      ? `${liveLatest.value} ${selectedTarget.unit}`
      : latestRow != null && latestRow.value != null
        ? `${latestRow.value} ${selectedTarget.unit}`
        : null;

  const isEmissionsCapTarget =
    selectedTarget.metricType === "emissions-reduction" &&
    selectedTarget.targetValue > selectedTarget.baselineValue;

  const bau2030 = pr?.bau_2030 ?? bau2030ForTarget(selectedTarget);

  const baselineDisplay =
    source === "api" && pr
      ? isEmissionsCapTarget
        ? `2015 inventory (${pr.baseline_year}): ${pr.baseline_value} ${selectedTarget.unit}`
        : `Baseline (${pr.baseline_year}): ${pr.baseline_value} ${selectedTarget.unit}`
      : isEmissionsCapTarget
        ? `2015 inventory (${selectedTarget.baselineYear}): ${selectedTarget.baselineValue} ${selectedTarget.unit}`
        : `Baseline (${selectedTarget.baselineYear}): ${selectedTarget.baselineValue} ${selectedTarget.unit}`;

  const targetDisplay =
    source === "api" && pr
      ? isEmissionsCapTarget
        ? `2030 ceiling (${pr.target_year}): ${pr.target_value} ${selectedTarget.unit}`
        : `Target (${pr.target_year}): ${pr.target_value} ${selectedTarget.unit}`
      : isEmissionsCapTarget
        ? `2030 ceiling (${selectedTarget.targetYear}): ${selectedTarget.targetValue} ${selectedTarget.unit}`
        : `Target (${selectedTarget.targetYear}): ${selectedTarget.targetValue} ${selectedTarget.unit}`;

  const bauDisplay =
    isEmissionsCapTarget && bau2030 != null
      ? `No-policy trend (2030): ${bau2030} ${selectedTarget.unit}`
      : null;

  const progressFormulaNote =
    isEmissionsCapTarget && bau2030 != null && liveLatest != null
      ? `Progress = (${bau2030} − ${liveLatest.value}) ÷ (${bau2030} − ${selectedTarget.targetValue})`
      : null;

  const dataUsedLabel =
    source === "api"
      ? "Live satellite estimates + official NDC goals"
      : source === "catalog"
        ? "National indicators + official NDC goals"
        : "Latest reported observations";

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
      ? `Observed emissions (${liveLatest?.value} Mt) are at or below the ${selectedTarget.targetValue} Mt ceiling — that counts as full progress on this cap target, even if emissions rose slightly year-on-year.`
      : capPosition === "between_cap_and_bau"
        ? `Observed emissions are above the ${selectedTarget.targetValue} Mt ceiling but still below the no-policy trend (${bau2030} Mt) — partial progress.`
        : capPosition === "above_bau"
          ? `Observed emissions (${liveLatest?.value} Mt) are above both the ${selectedTarget.targetValue} Mt ceiling and the no-policy trend (${bau2030} Mt) — so progress is 0% until emissions fall back toward those levels.`
          : null;

  const zeroProgressNote =
    capPosition === "above_bau"
      ? "Well above the 2030 ceiling and the no-policy trend"
      : capPosition === "between_cap_and_bau"
        ? "Above the 2030 ceiling — more reduction needed"
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
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>{baselineDisplay}</p>
              <p>{targetDisplay}</p>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border bg-muted/50">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Progress</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
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
            <div className="p-2 rounded-md bg-at-risk/10 border border-at-risk/30 text-xs">
              <p className="font-medium text-at-risk">Note: two different ways of counting emissions</p>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">
                Uganda&apos;s official inventory baseline ({pr.baseline_value} Mt) and Climate TRACE&apos;s estimate (
                {pr.latest_value} Mt in {pr.latest_year}) use different methods — that is expected. Progress uses
                Climate TRACE observations compared to the NDC pledge.
              </p>
            </div>
          )}

          <Card className={cn("ring-2", cfg.ring)}>
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
                  <span className={cn("text-2xl font-bold", cfg.color)}>{displayPercent}%</span>
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

              {source === "api" && (
                <p className="mt-2 text-[11px] text-muted-foreground max-w-[240px] leading-relaxed">
                  Based on live Climate TRACE data compared to Uganda&apos;s NDC goal — indicative, not an official
                  government report.
                </p>
              )}

              {source === "api" && apiSector && pr?.trace_yoy_pct != null && (
                <p className="text-[11px] text-muted-foreground">
                  Year-on-year change ({pr.latest_year}): {pr.trace_yoy_pct >= 0 ? "+" : ""}
                  {pr.trace_yoy_pct}%
                </p>
              )}

              {capProgressBar}

              <div className="mt-3 text-xs text-muted-foreground space-y-0.5">
                <p>{baselineDisplay}</p>
                {bauDisplay && <p>{bauDisplay}</p>}
                <p>{targetDisplay}</p>
                {latestDisplay && (
                  <p className="font-medium text-foreground">
                    Latest: {latestDisplay}
                    {liveLatest != null && (
                      <span className="text-muted-foreground font-normal"> ({liveLatest.year})</span>
                    )}
                    {!liveLatest && source === "catalog" && latestRow != null && (
                      <span className="text-muted-foreground font-normal"> ({latestRow.year})</span>
                    )}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                      <HelpCircle className="h-3 w-3" />
                      How is this calculated?
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[260px] p-3">
                    <div className="text-xs space-y-1.5">
                      <p className="font-semibold">How progress is calculated</p>
                      <p><strong>Data:</strong> {dataUsedLabel}</p>
                      <p><strong>Starting point:</strong> {baselineDisplay}</p>
                      {bauDisplay && <p><strong>No-policy trend:</strong> {bauDisplay}</p>}
                      <p><strong>Goal:</strong> {targetDisplay}</p>
                      <p>
                        <strong>Approach:</strong>{" "}
                        {selectedTarget.metricType === "emissions-reduction"
                          ? isEmissionsCapTarget
                            ? "Compare observed emissions to the 'no extra policy' trend and the 2030 ceiling in the NDC"
                            : "Compare observed emissions to the reduction pledged in the NDC"
                          : "Use a related activity measure as a proxy"}
                      </p>
                      {progressFormulaNote && (
                        <p className="text-muted-foreground font-mono text-[10px]">{progressFormulaNote}</p>
                      )}
                      {pr?.scope_note && <p className="text-muted-foreground">{pr.scope_note}</p>}
                      <p className="text-muted-foreground">Data quality issues can lower the status. Missing data shows as &quot;Unknown.&quot;</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>

          {observedForData && observedForData.provenance.qaqcStatus !== "ok" && (
            <Card className="border-at-risk/30">
              <CardContent className="p-3">
                <p className="text-[10px] text-at-risk font-medium">
                  {qaqcProgressNote(observedForData.provenance.qaqcStatus)}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function qaqcProgressNote(status: QAQCStatus): string {
  if (status === "warning") {
    return "Some Climate TRACE source categories are incomplete or the cache may be stale — progress is indicative.";
  }
  if (status === "inconsistent") {
    return "Sector totals do not fully match the national reconciliation — progress status may be conservative.";
  }
  if (status === "missing") {
    return "No quality review is on file for this indicator yet — progress may show as unknown.";
  }
  return "Data quality concerns may affect the progress status.";
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
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-chart-3 z-10"
          style={{ left: pct(bau) }}
          title={`No-policy trend: ${bau} ${unit}`}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-chart-2 z-10"
          style={{ left: pct(cap) }}
          title={`NDC ceiling: ${cap} ${unit}`}
        />
        <div
          className="absolute top-0 bottom-0 h-full bg-chart-4/80 rounded-full"
          style={{ width: pct(latest) }}
          title={`Latest observed: ${latest} ${unit}`}
        />
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
        <span>0</span>
        <span className="text-chart-4">Latest {latest}</span>
        <span className="text-chart-2">Cap {cap}</span>
      </div>
    </div>
  );
}
