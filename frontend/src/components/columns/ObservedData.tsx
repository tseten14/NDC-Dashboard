import { type NDCTarget, type TimeMode, type ObservedDataSet, type QAQCStatus, getObservedDataForTarget } from "@/data/uganda-ndc-data";
import { useEmissionsData } from "@/context/EmissionsDataContext";
import { buildLiveObservedDataSet, getClimateTraceSectorForTarget, buildIndicatorPanelObservedDataSet, isIndicatorPanelTarget } from "@/lib/emissions-integration";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, CheckCircle2, HelpCircle, XCircle, Database, Satellite } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Legend, Area, ComposedChart,
} from "recharts";

interface ObservedDataProps {
  selectedTarget: NDCTarget | null;
  timeMode: TimeMode;
  selectedMitigationOptions: string[];
}

export function ObservedDataColumn({ selectedTarget, timeMode, selectedMitigationOptions: _omit }: ObservedDataProps) {
  const emissions = useEmissionsData();

  if (!selectedTarget) {
    return <EmptyState />;
  }

  const apiSector = getClimateTraceSectorForTarget(selectedTarget);
  const ts = apiSector ? emissions.timeseriesBySector[apiSector] : undefined;
  const pr = apiSector ? emissions.progressBySector[apiSector] : undefined;

  const indEntry =
    isIndicatorPanelTarget(selectedTarget) ? emissions.indicatorTargets?.[selectedTarget.id] : undefined;

  const fetchingLive =
    !!apiSector &&
    !emissions.sectorError[apiSector] &&
    !!emissions.sectorLoading[apiSector] &&
    !ts;

  const fetchingIndicator =
    isIndicatorPanelTarget(selectedTarget) &&
    !emissions.indicatorPanelError &&
    emissions.indicatorPanelLoading &&
    !indEntry;

  if (fetchingLive || fetchingIndicator) {
    return <LoadingLiveState />;
  }

  let observedData: ObservedDataSet | undefined;
  if (apiSector && ts && pr && emissions.getObservedMode(selectedTarget) === "live") {
    observedData = buildLiveObservedDataSet(
      selectedTarget,
      ts.timeseries,
      pr.baseline_year,
      pr.baseline_value,
      pr.target_year,
      pr.target_value,
    );
  } else if (
    indEntry?.timeseries?.length &&
    emissions.getObservedMode(selectedTarget) === "live"
  ) {
    observedData = buildIndicatorPanelObservedDataSet(selectedTarget, indEntry);
  } else {
    observedData = getObservedDataForTarget(selectedTarget.id);
  }

  if (apiSector && emissions.sectorError[apiSector]) {
    return (
      <SectorErrorState
        message={emissions.sectorError[apiSector]?.message ?? "Climate TRACE data unavailable"}
      />
    );
  }

  if (!observedData) {
    return <NoDataState />;
  }

  const slugBreakdown = apiSector ? emissions.slugBreakdownBySector[apiSector] : undefined;
  const liveProgress = apiSector ? emissions.progressBySector[apiSector] : undefined;
  const hasNullGaps =
    apiSector &&
    emissions.getObservedMode(selectedTarget) === "live" &&
    observedData.historicalData.some((p) => p.value == null);

  const chartData =
    timeMode === "historical"
      ? observedData.historicalData
      : [
          ...observedData.historicalData.filter((p) => p.value != null).slice(-2),
          ...observedData.projectionBaseline,
        ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border bg-muted/50 flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Observed Data</h3>
        {apiSector && emissions.getObservedMode(selectedTarget) === "live" && (
          <Badge variant="outline" className="text-[8px] h-4 gap-0.5 shrink-0">
            <Satellite className="h-2.5 w-2.5" />
            Climate TRACE
          </Badge>
        )}
        {isIndicatorPanelTarget(selectedTarget) && emissions.getObservedMode(selectedTarget) === "live" && !apiSector && (
          <Badge variant="outline" className="text-[8px] h-4 gap-0.5 shrink-0">
            <Database className="h-2.5 w-2.5" />
            Indicators API
          </Badge>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {/* Data provider badges */}
          <div className="flex flex-wrap gap-1">
            {observedData.dataProviders.map(provider => (
              <Badge key={provider} variant="outline" className="text-[9px] h-5 gap-1">
                <Database className="h-2.5 w-2.5" />
                {provider}
              </Badge>
            ))}
          </div>

          {apiSector && emissions.getObservedMode(selectedTarget) === "live" && liveProgress && (
            <div className="p-2 rounded-md bg-primary/5 border border-primary/20 text-xs leading-snug">
              <p className="text-foreground font-medium">NDC policy lines vs Climate TRACE observed</p>
              <p className="text-muted-foreground mt-0.5">
                Bars/lines show TRACE satellite-model totals. Dashed target path uses Uganda NDC baselines — these
                differ from TRACE by design (not an API error).
              </p>
              {liveProgress.scope_note && (
                <p className="text-muted-foreground mt-1 italic">{liveProgress.scope_note}</p>
              )}
            </div>
          )}

          {hasNullGaps && (
            <p className="text-xs text-at-risk">
              Some years have no TRACE data (strict aggregation — missing sector slug). Chart gaps are not interpolated.
            </p>
          )}

          {/* QA/QC Warning banner */}
          {observedData.provenance.qaqcStatus !== "ok" && (
            <div className="flex items-start gap-2 p-2 rounded-md bg-at-risk/10 border border-at-risk/30">
              <AlertTriangle className="h-3.5 w-3.5 text-at-risk shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-medium text-at-risk">
                  {observedData.provenance.qaqcStatus === "warning" && "QA/QC Warning: Data quality check flagged issues."}
                  {observedData.provenance.qaqcStatus === "missing" && "QA/QC Missing: No quality assurance has been performed."}
                  {observedData.provenance.qaqcStatus === "inconsistent" && "QA/QC Inconsistent: Data shows inconsistencies across sources."}
                </p>
              </div>
            </div>
          )}

          {/* Chart */}
          <Card>
            <CardContent className="p-2 pt-3">
              <ResponsiveContainer width="100%" height={180}>
                {timeMode === "historical" ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      dataKey="value"
                      name="Climate TRACE observed"
                      fill="hsl(var(--chart-4))"
                      radius={[2, 2, 0, 0]}
                      connectNulls={false}
                    />
                    <Line
                      dataKey="target"
                      name="NDC target path"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </BarChart>
                ) : (
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area
                      dataKey="value"
                      name="Climate TRACE (projected)"
                      fill="hsl(var(--chart-1) / 0.15)"
                      stroke="hsl(var(--chart-1))"
                      connectNulls={false}
                    />
                    <Line
                      dataKey="target"
                      name="NDC target path"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="5 5"
                    />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Data Provenance Panel */}
          <Card>
            <CardContent className="p-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Data Provenance & Validation</h4>

              <div className="space-y-1.5">
                <ProvenanceRow label="Source type" value={sourceTypeLabel(observedData.provenance.sourceType)} />
                <ProvenanceRow label="MRV owner" value={observedData.provenance.mrvOwnerMinistry} />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">QA/QC status</span>
                  <QAQCBadge status={observedData.provenance.qaqcStatus} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Validated</span>
                  <div className="flex items-center gap-1">
                    {observedData.provenance.isValidated ? (
                      <Badge variant="outline" className="text-[9px] h-4 bg-on-track/10 text-on-track border-on-track/30">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Yes
                      </Badge>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-[9px] h-4 bg-at-risk/10 text-at-risk border-at-risk/30 cursor-help">
                            <HelpCircle className="h-2.5 w-2.5 mr-0.5" />Not validated
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[220px]">
                          <p className="text-xs">Data has not yet been validated by the responsible sector MRV authority.</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
                <ProvenanceRow label="Last updated" value={new Date(observedData.provenance.lastUpdated).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })} />
                {slugBreakdown && Object.keys(slugBreakdown.values_mt).length > 0 && (
                  <div className="pt-1 border-t border-border mt-1">
                    <p className="text-xs text-muted-foreground mb-1">
                      TRACE slug breakdown ({slugBreakdown.reference_year})
                    </p>
                    {Object.entries(slugBreakdown.values_mt).map(([slug, mt]) => (
                      <ProvenanceRow
                        key={slug}
                        label={slug}
                        value={mt != null ? `${mt} Mt` : "missing"}
                      />
                    ))}
                    {slugBreakdown.missing_slugs.length > 0 && (
                      <p className="text-xs text-at-risk mt-1">
                        Missing: {slugBreakdown.missing_slugs.join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}

function ProvenanceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[10px] text-muted-foreground shrink-0">{label}</span>
      <span className="text-[10px] text-foreground font-medium text-right">{value}</span>
    </div>
  );
}

function QAQCBadge({ status }: { status: QAQCStatus }) {
  const config: Record<QAQCStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
    ok: { label: "OK", className: "bg-on-track/10 text-on-track border-on-track/30", icon: CheckCircle2 },
    warning: { label: "Warning", className: "bg-at-risk/10 text-at-risk border-at-risk/30", icon: AlertTriangle },
    missing: { label: "Missing", className: "bg-off-track/10 text-off-track border-off-track/30", icon: XCircle },
    inconsistent: { label: "Inconsistent", className: "bg-at-risk/10 text-at-risk border-at-risk/30", icon: AlertTriangle },
  };
  const { label, className, icon: Icon } = config[status];
  return (
    <Badge variant="outline" className={cn("text-[9px] h-4", className)}>
      <Icon className="h-2.5 w-2.5 mr-0.5" />{label}
    </Badge>
  );
}

function sourceTypeLabel(type: string): string {
  const map: Record<string, string> = {
    "observed-eo": "Observed (Earth Observation)",
    "observed-emissions-tracing": "Observed (Emissions Tracing)",
    reported: "Reported (Sector Ministry)",
    validated: "Validated (National Authority)",
  };
  return map[type] || type;
}

function LoadingLiveState() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border bg-muted/50">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Observed Data</h3>
      </div>
      <div className="flex-1 p-3 space-y-2">
        <Skeleton className="h-4 w-[75%]" />
        <Skeleton className="h-[180px] w-full rounded-md" />
        <Skeleton className="h-16 w-full rounded-md" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border bg-muted/50">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Observed Data</h3>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-muted-foreground text-center">Select a target to view observed data</p>
      </div>
    </div>
  );
}

function SectorErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border bg-muted/50">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Observed Data</h3>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-destructive text-center">{message}</p>
      </div>
    </div>
  );
}

function NoDataState() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border bg-muted/50">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Observed Data</h3>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-muted-foreground text-center">No observed data available for this target</p>
      </div>
    </div>
  );
}
