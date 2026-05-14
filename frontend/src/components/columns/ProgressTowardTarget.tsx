import { useMemo } from "react";
import { type NDCTarget, type ProgressStatus, getObservedDataForTarget } from "@/data/uganda-ndc-data";
import { useEmissionsData } from "@/context/EmissionsDataContext";
import { getClimateTraceSectorForTarget, isIndicatorPanelTarget, buildIndicatorPanelObservedDataSet } from "@/lib/emissions-integration";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  if (!selectedTarget) {
    return <EmptyState />;
  }

  const { percent, status, source } = emissions.getProgressForTarget(selectedTarget);
  const cfg = statusConfig[status];

  const apiSector = getClimateTraceSectorForTarget(selectedTarget);
  const pr = apiSector ? emissions.progressBySector[apiSector] : undefined;

  const indEntry = isIndicatorPanelTarget(selectedTarget)
    ? emissions.indicatorTargets?.[selectedTarget.id]
    : undefined;

  const observedForData = useMemo(() => {
    if (indEntry?.timeseries?.length) return buildIndicatorPanelObservedDataSet(selectedTarget, indEntry);
    return getObservedDataForTarget(selectedTarget.id) ?? null;
  }, [selectedTarget, indEntry]);

  const latestRow = observedForData?.historicalData?.[observedForData.historicalData.length - 1];

  const latestDisplay =
    source === "api" && pr?.latest_value != null
      ? `${pr.latest_value} ${selectedTarget.unit}`
      : latestRow != null
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
      ? "Climate TRACE v6 (seeded to Supabase) + NDC baseline/target"
      : source === "catalog"
        ? "Indicators API (Supabase) + NDC baseline/target"
        : "Latest observed value from MRV data sources";

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border bg-muted/50">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Progress</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          {/* Main progress card */}
          <Card className={cn("ring-2", cfg.ring)}>
            <CardContent className="p-4 flex flex-col items-center text-center">
              {/* Circular progress indicator */}
              <div className="relative w-28 h-28 mb-3">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="52" fill="none"
                    stroke={`hsl(var(--${status === "unknown" ? "neutral" : status}))`}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(percent / 100) * 327} 327`}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn("text-2xl font-bold", cfg.color)}>{percent}%</span>
                </div>
              </div>

              {/* Status label */}
              <Badge variant="outline" className={cn("text-xs px-3 py-1 font-semibold", cfg.color, cfg.ring)}>
                {cfg.label}
              </Badge>

              {/* Target summary */}
              <div className="mt-3 text-[10px] text-muted-foreground space-y-0.5">
                <p>{baselineDisplay}</p>
                <p>{targetDisplay}</p>
                {latestDisplay && (
                  <p className="font-medium text-foreground">
                    Latest: {latestDisplay}
                    {source === "api" && pr?.latest_year != null && (
                      <span className="text-muted-foreground font-normal"> ({pr.latest_year})</span>
                    )}
                    {source === "catalog" && latestRow != null && (
                      <span className="text-muted-foreground font-normal"> ({latestRow.year})</span>
                    )}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Methodology tooltip */}
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
                      <p className="text-muted-foreground italic">QA/QC warnings degrade status. Insufficient data yields "Unknown."</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>

          {/* Data quality note */}
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

function EmptyState() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border bg-muted/50">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Progress</h3>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-muted-foreground text-center">Select a target to view progress</p>
      </div>
    </div>
  );
}
