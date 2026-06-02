import { type NDCTarget, type TimeMode, type ObservedDataSet, type QAQCStatus, getObservedDataForTarget } from "@/data/uganda-ndc-data";
import { useEmissionsData } from "@/context/EmissionsDataContext";
import { buildLiveObservedDataSet, getClimateTraceSectorForTarget, buildIndicatorPanelObservedDataSet, isIndicatorPanelTarget } from "@/lib/emissions-integration";
import { reconciliationDeltaPercent } from "@/lib/progress";
import { DataLineageChip } from "@/components/DataLineageChip";
import { buildTargetLineage } from "@/lib/lineage";
import {
  ChartHatchPatternDef,
  ObservedProjectedLegend,
  buildObservedProjectedRows,
  chartYAxisUnit,
} from "@/components/dashboard/ChartObservedProjected";
import { ColumnLoadingState, NoDataPlaceholder, SelectTargetPlaceholder } from "@/components/dashboard/DashboardStates";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, CheckCircle2, HelpCircle, XCircle, Database, Satellite, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Area, ComposedChart,
} from "recharts";

const HATCH_ID = "observed-data-hatch";

interface ObservedDataProps {
  selectedTarget: NDCTarget | null;
  timeMode: TimeMode;
  selectedMitigationOptions: string[];
}

export function ObservedDataColumn({ selectedTarget, timeMode, selectedMitigationOptions: _omit }: ObservedDataProps) {
  const emissions = useEmissionsData();

  if (!selectedTarget) {
    return <SelectTargetPlaceholder column="Observed Data" />;
  }

  const apiSector = getClimateTraceSectorForTarget(selectedTarget);
  const ts = apiSector ? emissions.timeseriesBySector[apiSector] : undefined;
  const pr = apiSector ? emissions.progressBySector[apiSector] : undefined;
  const observedMode = emissions.getObservedMode(selectedTarget);

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
    return <ColumnLoadingState title="Observed Data" />;
  }

  let observedData: ObservedDataSet | undefined;
  if (apiSector && ts && pr && observedMode === "live") {
    observedData = buildLiveObservedDataSet(
      selectedTarget,
      ts.timeseries,
      pr.baseline_year,
      pr.baseline_value,
      pr.target_year,
      pr.target_value,
      {
        missingSlugs: pr.missing_slugs,
        dataStale: emissions.dashboard?.data_stale,
        reconciliationDeltaPct: reconciliationDeltaPercent(
          emissions.reconciliation?.delta_mt,
          emissions.reconciliation?.sector_sum_mt,
        ),
      },
    );
  } else if (
    indEntry?.timeseries?.length &&
    observedMode === "live"
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

  const hasObservedValues = observedData?.historicalData.some((p) => p.value != null) ?? false;

  if (!observedData || !hasObservedValues) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-border bg-muted/50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Observed Data</h3>
        </div>
        <div className="flex-1 p-4">
          <NoDataPlaceholder hint="Try another target or refresh the dashboard when new MRV data is available." />
        </div>
      </div>
    );
  }

  const slugBreakdown = apiSector ? emissions.slugBreakdownBySector[apiSector] : undefined;
  const liveProgress = apiSector ? emissions.progressBySector[apiSector] : undefined;
  const hasNullGaps =
    apiSector &&
    observedMode === "live" &&
    observedData.historicalData.some((p) => p.value == null);
  const observedSeriesLabel =
    apiSector && observedMode === "live"
      ? "Climate TRACE observed"
      : isIndicatorPanelTarget(selectedTarget) && observedMode === "live"
        ? "Indicators API observed"
        : "Observed data";

  const { source: progressSource } = emissions.getProgressForTarget(selectedTarget);
  const lineage = buildTargetLineage(selectedTarget, emissions, progressSource);
  const latestObserved = [...observedData.historicalData].reverse().find((p) => p.value != null);
  const yUnit = chartYAxisUnit(selectedTarget.unit);

  const isDistrictView = emissions.isDistrictView;

  const historicalChartData = observedData.historicalData.map((p) => ({
    year: p.year,
    observedValue: p.value,
    projectedValue: null as number | null,
    // National NDC target paths are not meaningful at district level.
    target: isDistrictView ? null : p.target,
  }));

  const projectionChartData = buildObservedProjectedRows(
    observedData.historicalData,
    observedData.projectionBaseline,
  );

  const chartData =
    timeMode === "historical" || isDistrictView ? historicalChartData : projectionChartData;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border bg-muted/50 flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Observed Data</h3>
        {emissions.isDistrictView && emissions.districtName && (
          <Badge variant="outline" className="text-[8px] h-4 gap-0.5 shrink-0">
            <MapPin className="h-2.5 w-2.5" />
            {emissions.districtName}
          </Badge>
        )}
        {apiSector && observedMode === "live" && (
          <Badge variant="outline" className="text-[8px] h-4 gap-0.5 shrink-0">
            <Satellite className="h-2.5 w-2.5" />
            Climate TRACE
          </Badge>
        )}
        {isIndicatorPanelTarget(selectedTarget) && observedMode === "live" && !apiSector && (
          <Badge variant="outline" className="text-[8px] h-4 gap-0.5 shrink-0">
            <Database className="h-2.5 w-2.5" />
            Indicators API
          </Badge>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          <div className="flex flex-wrap gap-1 items-center">
            {observedData.dataProviders.map(provider => (
              <Badge key={provider} variant="outline" className="text-[9px] h-5 gap-1">
                <Database className="h-2.5 w-2.5" />
                {provider}
              </Badge>
            ))}
            {latestObserved && latestObserved.value != null && (
              <span className="text-[10px] text-muted-foreground flex flex-wrap items-center gap-1">
                Latest: {latestObserved.value} ({latestObserved.year})
                <DataLineageChip lineage={lineage} />
              </span>
            )}
          </div>

          {apiSector && observedMode === "live" && isDistrictView && (
            <div className="p-2 rounded-md bg-primary/5 border border-primary/20 text-xs leading-snug">
              <p className="text-foreground font-medium">
                {emissions.districtName} district emissions (Climate TRACE)
              </p>
              <p className="text-muted-foreground mt-0.5">
                District-level satellite-model totals from 2021 onward. National NDC target paths are omitted
                because NDC targets are set nationally, not per district.
              </p>
            </div>
          )}

          {apiSector && observedMode === "live" && !isDistrictView && liveProgress && (
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

          <Card>
            <CardContent className="p-2 pt-3">
              <ResponsiveContainer width="100%" height={180}>
                {timeMode === "historical" ? (
                  <BarChart data={chartData}>
                    <ChartHatchPatternDef id={HATCH_ID} />
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                      label={{
                        value: yUnit,
                        angle: -90,
                        position: "insideLeft",
                        offset: 10,
                        style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
                      }}
                    />
                    <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 11 }} />
                    <Bar
                      dataKey="observedValue"
                      name={observedSeriesLabel}
                      fill="hsl(var(--chart-4))"
                      radius={[2, 2, 0, 0]}
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
                    <ChartHatchPatternDef id={HATCH_ID} />
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                      label={{
                        value: yUnit,
                        angle: -90,
                        position: "insideLeft",
                        offset: 10,
                        style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
                      }}
                    />
                    <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 11 }} />
                    <Bar
                      dataKey="observedValue"
                      name={observedSeriesLabel}
                      fill="hsl(var(--chart-4))"
                      radius={[2, 2, 0, 0]}
                    />
                    <Area
                      dataKey="projectedValue"
                      name="NDC linear bridge (projected)"
                      fill={`url(#${HATCH_ID})`}
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      connectNulls
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
              <ObservedProjectedLegend className="mt-2 px-1" />
            </CardContent>
          </Card>

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
                      <div key={slug} className="flex items-start justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground shrink-0">{slug}</span>
                        <span className="text-[10px] text-foreground font-medium text-right flex flex-wrap items-center justify-end gap-1">
                          {mt != null ? `${mt} Mt` : "missing"}
                          {mt != null && <DataLineageChip lineage={lineage} />}
                        </span>
                      </div>
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
