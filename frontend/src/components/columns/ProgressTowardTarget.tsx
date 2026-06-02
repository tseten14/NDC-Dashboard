import { useMemo } from "react";
import { type NDCTarget, type ProgressStatus, getObservedDataForTarget } from "@/data/uganda-ndc-data";
import { useEmissionsData } from "@/context/EmissionsDataContext";
import { getClimateTraceSectorForTarget, isIndicatorPanelTarget, buildIndicatorPanelObservedDataSet } from "@/lib/emissions-integration";
import { DataLineageChip } from "@/components/DataLineageChip";
import { buildTargetLineage } from "@/lib/lineage";
import { ColumnLoadingState, NoDataPlaceholder, SelectTargetPlaceholder } from "@/components/dashboard/DashboardStates";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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
    if (indEntry?.timeseries?.length) return buildIndicatorPanelObservedDataSet(selectedTarget, indEntry);
    return getObservedDataForTarget(selectedTarget.id) ?? null;
  }, [selectedTarget, indEntry]);

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
    (isIndicatorPanelTarget(selectedTarget) && emissions.indicatorPanelLoading && !indEntry);

  if (isLoadingProgress) {
    return <ColumnLoadingState title="Progress" />;
  }

  const { percent, status, source } = emissions.getProgressForTarget(selectedTarget);
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
  const lineage = buildTargetLineage(selectedTarget, emissions, source);

  const latestDisplay =
    source === "api" && pr?.latest_value != null
      ? `${pr.latest_value} ${selectedTarget.unit}`
      : latestRow != null && latestRow.value != null
        ? `${latestRow.value} ${selectedTarget.unit}`
        : null;

  const baselineDisplay =
    source === "api" && pr
      ? `Baseline (${pr.baseline_year}): ${pr.baseline_value} ${selectedTarget.unit}`
      : `Baseline (${selectedTarget.baselineYear}): ${selectedTarget.baselineValue} ${selectedTarget.unit}`;

  const targetDisplay =
    source === "api" && pr
      ? `Target (${pr.target_year}): ${pr.target_value} ${selectedTarget.unit}`
      : `Target (${selectedTarget.targetYear}): ${selectedTarget.targetValue} ${selectedTarget.unit}`;

  const dataUsedLabel =
    source === "api"
      ? "Climate TRACE (live API) + NDC baseline/target"
      : source === "catalog"
        ? "Indicators API + NDC baseline/target"
        : "Latest observed value from MRV data sources";

  const baselineMismatch =
    source === "api" &&
    pr?.baseline_vs_trace_delta_mt != null &&
    Math.abs(pr.baseline_vs_trace_delta_mt) >= 5;

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
                emissions.isDistrictView
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
          {baselineMismatch && pr && (
            <div className="p-2 rounded-md bg-at-risk/10 border border-at-risk/30 text-xs">
              <p className="font-medium text-at-risk">NDC baseline differs from TRACE observed</p>
              <p className="text-muted-foreground mt-0.5">
                Policy baseline ({pr.baseline_value} Mt) vs TRACE latest ({pr.latest_value} Mt, {pr.latest_year}): Δ{" "}
                {pr.baseline_vs_trace_delta_mt! >= 0 ? "+" : ""}
                {pr.baseline_vs_trace_delta_mt} Mt. Progress % uses NDC targets, not TRACE-aligned baselines.
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
              {displayPercent === 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">0% toward target — no reduction recorded yet</p>
              )}

              {source === "api" && (
                <p className="mt-2 text-xs text-muted-foreground max-w-[220px]">
                  % toward NDC target using Climate TRACE observed emissions — not official national MRV.
                </p>
              )}

              {source === "api" && pr?.trace_yoy_pct != null && (
                <p className="text-xs text-muted-foreground">
                  TRACE YoY ({pr.latest_year}): {pr.trace_yoy_pct >= 0 ? "+" : ""}
                  {pr.trace_yoy_pct}%
                </p>
              )}

              <div className="mt-3 text-xs text-muted-foreground space-y-0.5">
                <p className="flex flex-wrap items-center gap-1">
                  <span>{baselineDisplay}</span>
                  <DataLineageChip lineage={lineage} />
                </p>
                <p className="flex flex-wrap items-center gap-1">
                  <span>{targetDisplay}</span>
                  <DataLineageChip lineage={lineage} />
                </p>
                {latestDisplay && (
                  <p className="font-medium text-foreground flex flex-wrap items-center gap-1">
                    <span>
                      Latest: {latestDisplay}
                      {source === "api" && pr?.latest_year != null && (
                        <span className="text-muted-foreground font-normal"> ({pr.latest_year})</span>
                      )}
                      {source === "catalog" && latestRow != null && (
                        <span className="text-muted-foreground font-normal"> ({latestRow.year})</span>
                      )}
                    </span>
                    <DataLineageChip lineage={lineage} />
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
                      <p className="font-semibold">Progress Methodology</p>
                      <p><strong>Data used:</strong> {dataUsedLabel}</p>
                      <p><strong>Baseline:</strong> {baselineDisplay}</p>
                      <p><strong>Target:</strong> {targetDisplay}</p>
                      <p><strong>Method:</strong> {selectedTarget.metricType === "emissions-reduction" ? "Emissions-based" : "Activity-proxy-based"} progress calculation</p>
                      {pr?.methodology === "ndc_baseline_vs_trace_observed" && (
                        <p>
                          <strong>Formula:</strong> (NDC baseline − TRACE latest) / (NDC baseline − NDC target)
                        </p>
                      )}
                      {pr?.scope_note && <p className="italic">{pr.scope_note}</p>}
                      <p className="text-muted-foreground italic">QA/QC warnings degrade status. Insufficient data yields &quot;Unknown.&quot;</p>
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
                  ⚠ Progress status may be degraded due to data quality issues ({observedForData.provenance.qaqcStatus}).
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
