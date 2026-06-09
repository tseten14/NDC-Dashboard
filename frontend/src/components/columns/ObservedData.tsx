import { type NDCTarget, type TimeMode, type ObservedDataSet, type QAQCStatus, getObservedDataForTarget, bau2030ForTarget } from "@/data/uganda-ndc-data";
import { useEmissionsData } from "@/context/EmissionsDataContext";
import {
  buildLiveObservedDataSet,
  getClimateTraceSectorForTarget,
  buildIndicatorPanelObservedDataSet,
  buildIngestedObservedDataSet,
  isIndicatorPanelTarget,
  isIngestedObservationSource,
  getProxySectorForTarget,
  getProxySectorLabel,
} from "@/lib/emissions-integration";
import { DataProvenanceBadge } from "@/components/DataProvenanceBadge";
import { useTargetObservations } from "@/hooks/use-target-observations";
import { reconciliationDeltaPercent } from "@/lib/progress";
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
  Line, Bar, XAxis, YAxis, CartesianGrid,
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
  const obsQuery = useTargetObservations(
    selectedTarget && isIndicatorPanelTarget(selectedTarget) ? selectedTarget.id : null,
  );
  const ingestedRows = (obsQuery.data?.observations ?? []).filter((o) =>
    isIngestedObservationSource(o.source),
  );
  const hasIngestedObs = ingestedRows.length > 0;
  const ingestSourceLabel = ingestedRows[ingestedRows.length - 1]?.source;

  if (!selectedTarget) {
    return <SelectTargetPlaceholder column="Observed Data" />;
  }

  const apiSector = getClimateTraceSectorForTarget(selectedTarget);
  const ts = apiSector ? emissions.timeseriesBySector[apiSector] : undefined;
  const pr = apiSector ? emissions.progressBySector[apiSector] : undefined;
  const observedMode = emissions.getObservedMode(selectedTarget);

  // For indicator-panel targets in district view, resolve the parent CT sector so we
  // can show real district-specific timeseries (zero extra API calls — already fetched).
  const proxySector = getProxySectorForTarget(selectedTarget);
  const proxyTs = proxySector ? emissions.timeseriesBySector[proxySector] : undefined;
  const proxyPr = proxySector ? emissions.progressBySector[proxySector] : undefined;
  const usingProxyData =
    emissions.isDistrictView &&
    isIndicatorPanelTarget(selectedTarget) &&
    !!proxySector &&
    !!proxyTs?.timeseries?.some((p) => p.value != null);

  const indEntry =
    !usingProxyData && isIndicatorPanelTarget(selectedTarget)
      ? emissions.indicatorTargets?.[selectedTarget.id]
      : undefined;

  const fetchingLive =
    !!apiSector &&
    !emissions.sectorError[apiSector] &&
    !!emissions.sectorLoading[apiSector] &&
    !ts;

  const fetchingProxy =
    usingProxyData &&
    !!proxySector &&
    !!emissions.sectorLoading[proxySector] &&
    !proxyTs;

  const fetchingIndicator =
    !usingProxyData &&
    isIndicatorPanelTarget(selectedTarget) &&
    !emissions.indicatorPanelError &&
    emissions.indicatorPanelLoading &&
    !indEntry;

  if (fetchingLive || fetchingProxy || fetchingIndicator) {
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
      pr.bau_2030 ?? bau2030ForTarget(selectedTarget),
    );
  } else if (
    selectedTarget.sectorId === "economy-wide" &&
    emissions.economyWideTimeseries.length > 0 &&
    emissions.isApiReachable
  ) {
    // Economy-wide: use CT-derived aggregate (sum of all sector timeseries) — real data, not mock
    observedData = buildLiveObservedDataSet(
      selectedTarget,
      emissions.economyWideTimeseries,
      selectedTarget.baselineYear,
      selectedTarget.baselineValue,
      selectedTarget.targetYear,
      selectedTarget.targetValue,
      { dataStale: emissions.dashboard?.data_stale },
      bau2030ForTarget(selectedTarget),
    );
  } else if (usingProxyData && proxyTs && proxyPr) {
    // District view + indicator-panel target: use the parent sector's CT district
    // timeseries as a real per-district proxy (already in memory, no new API calls).
    observedData = buildLiveObservedDataSet(
      selectedTarget,
      proxyTs.timeseries,
      proxyPr.baseline_year,
      proxyPr.baseline_value,
      proxyPr.target_year,
      proxyPr.target_value,
      { dataStale: emissions.dashboard?.data_stale },
      proxyPr.bau_2030 ?? bau2030ForTarget(selectedTarget),
    );
  } else if (hasIngestedObs && isIndicatorPanelTarget(selectedTarget) && observedMode === "live") {
    observedData =
      buildIngestedObservedDataSet(selectedTarget, ingestedRows, indEntry) ??
      (indEntry?.timeseries?.length
        ? buildIndicatorPanelObservedDataSet(selectedTarget, indEntry)
        : undefined);
  } else if (indEntry?.timeseries?.length && observedMode === "live") {
    observedData = buildIndicatorPanelObservedDataSet(selectedTarget, indEntry);
  } else if (
    emissions.isDistrictView &&
    apiSector &&
    ts &&
    !emissions.sectorLoading[apiSector] &&
    !emissions.sectorError[apiSector]
  ) {
    // District mode: live data was fetched but has no non-null values for this sector.
    // Don't fall back to national mock data — leave observedData undefined so the
    // NoDataPlaceholder below is shown with a district-specific hint.
    observedData = undefined;
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

  const noDataHint =
    emissions.isDistrictView && apiSector && ts && !emissions.sectorLoading[apiSector]
      ? `No Climate TRACE data available for ${emissions.districtName ?? "this district"} in this sector.`
      : "Try another target or check back when new data is published.";

  if (!observedData || !hasObservedValues) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-border bg-muted/50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Observed Data</h3>
        </div>
        <div className="flex-1 p-4">
          <NoDataPlaceholder hint={noDataHint} />
        </div>
      </div>
    );
  }

  const slugBreakdown = apiSector ? emissions.slugBreakdownBySector[apiSector] : undefined;
  const liveProgress = apiSector ? emissions.progressBySector[apiSector] : undefined;
  const isDistrictView = emissions.isDistrictView;
  const bauRef = liveProgress?.bau_2030 ?? bau2030ForTarget(selectedTarget);
  const isCapChart =
    !isDistrictView &&
    selectedTarget.metricType === "emissions-reduction" &&
    bauRef != null &&
    selectedTarget.targetValue > selectedTarget.baselineValue;
  const hasNullGaps =
    (apiSector || usingProxyData) &&
    observedData.historicalData.some((p) => p.value == null);
  const observedSeriesLabel = usingProxyData
    ? `${getProxySectorLabel(selectedTarget)} observed`
    : apiSector && observedMode === "live"
      ? "Climate TRACE observed"
      : isIndicatorPanelTarget(selectedTarget) && observedMode === "live"
        ? "Indicators API observed"
        : "Observed data";

  const latestObserved = [...observedData.historicalData].reverse().find((p) => p.value != null);
  // Proxy data is always in MtCO2e regardless of the indicator's native unit
  const yUnit = usingProxyData ? "MtCO₂e" : chartYAxisUnit(selectedTarget.unit);

  const historicalChartData = observedData.historicalData.map((p) => ({
    year: p.year,
    observedValue: p.value,
    projectedValue: null as number | null,
    target: isDistrictView ? null : p.target ?? null,
    bauPath: isDistrictView ? null : p.bauPath ?? null,
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
        {/* District badge — direct CT or proxy CT (both are real per-district data) */}
        {emissions.isDistrictView && emissions.districtName && (!!apiSector || usingProxyData) && (
          <Badge variant="outline" className="text-[8px] h-4 gap-0.5 shrink-0">
            <MapPin className="h-2.5 w-2.5" />
            {emissions.districtName}
          </Badge>
        )}
        {/* National badge only when in district view with no district data at all */}
        {emissions.isDistrictView && !apiSector && !usingProxyData && (
          <Badge variant="outline" className="text-[8px] h-4 gap-0.5 shrink-0 text-muted-foreground">
            National
          </Badge>
        )}
        {(apiSector || usingProxyData) && (
          <Badge variant="outline" className="text-[8px] h-4 gap-0.5 shrink-0">
            <Satellite className="h-2.5 w-2.5" />
            Climate TRACE
          </Badge>
        )}
        {isIndicatorPanelTarget(selectedTarget) && !usingProxyData && observedMode === "live" && !apiSector && (
          <Badge variant="outline" className="text-[8px] h-4 gap-0.5 shrink-0">
            <Database className="h-2.5 w-2.5" />
            Indicators API
          </Badge>
        )}
        {hasIngestedObs && (
          <DataProvenanceBadge count={ingestedRows.length} source={ingestSourceLabel} />
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
              <span className="text-[10px] text-muted-foreground">
                Latest: {latestObserved.value} ({latestObserved.year})
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

          {usingProxyData && proxySector && (
            <div className="p-2 rounded-md bg-primary/5 border border-primary/20 text-xs leading-snug">
              <p className="text-foreground font-medium">
                {emissions.districtName} — {getProxySectorLabel(selectedTarget)} emissions (Climate TRACE)
              </p>
              <p className="text-muted-foreground mt-0.5">
                The target metric ({selectedTarget.unit}) is tracked at national level only. Showing this
                district's {getProxySectorLabel(selectedTarget).toLowerCase()} emissions (MtCO₂e) from
                Climate TRACE as the best available district-specific data. Values differ per district.
              </p>
            </div>
          )}

          {!apiSector && !usingProxyData && isDistrictView && (
            <div className="p-2 rounded-md bg-muted/60 border border-border text-xs leading-snug">
              <p className="text-foreground font-medium">National-level indicator</p>
              <p className="text-muted-foreground mt-0.5">
                No district-level data is available for this indicator from any source.
                Showing national data for context.
              </p>
            </div>
          )}

          {hasIngestedObs && !apiSector && !usingProxyData && (
            <div className="p-2 rounded-md bg-primary/5 border border-primary/20 text-xs leading-snug">
              <p className="text-foreground font-medium">Includes file-ingested observations</p>
              <p className="text-muted-foreground mt-0.5">
                {ingestedRows.length} point(s) from Data Ingestion are merged into this chart. They are stored in
                the observations database and marked unverified until MRV validation.
              </p>
            </div>
          )}

          {apiSector && observedMode === "live" && !isDistrictView && liveProgress && (
            <div className="p-2 rounded-md bg-primary/5 border border-primary/20 text-xs leading-snug">
              <p className="text-foreground font-medium">What you&apos;re seeing</p>
              <p className="text-muted-foreground mt-0.5">
                {isCapChart ? (
                  <>
                    Bars are observed emissions. Yellow dashed = 2030 NDC ceiling ({selectedTarget.targetValue}{" "}
                    Mt); orange dashed = no-policy level in 2030 ({bauRef} Mt). Compare bars to those flat
                    reference lines — lower bars mean more progress toward the ceiling.
                  </>
                ) : (
                  <>
                    Solid bars are observed emissions from Climate TRACE. The dashed line is Uganda&apos;s official
                    NDC target path.
                  </>
                )}
              </p>
              {liveProgress.scope_note && (
                <p className="text-muted-foreground mt-1 text-[10px]">{liveProgress.scope_note}</p>
              )}
            </div>
          )}

          {hasNullGaps && (
            <p className="text-[11px] text-at-risk leading-relaxed">
              Some years have no observed data — gaps are shown as empty, not estimated.
            </p>
          )}

          {observedData.provenance.qaqcStatus !== "ok" && (
            <div className="flex items-start gap-2 p-2 rounded-md bg-at-risk/10 border border-at-risk/30">
              <AlertTriangle className="h-3.5 w-3.5 text-at-risk shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-medium text-at-risk">
                  {observedData.provenance.qaqcStatus === "warning" && "Data quality check flagged possible issues."}
                  {observedData.provenance.qaqcStatus === "missing" && "No quality review has been completed yet."}
                  {observedData.provenance.qaqcStatus === "inconsistent" && "Data from different sources does not fully agree."}
                </p>
              </div>
            </div>
          )}

          <Card>
            <CardContent className="p-2 pt-3">
              <ResponsiveContainer width="100%" height={180}>
                {timeMode === "historical" ? (
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
                    {isCapChart && (
                      <Line
                        dataKey="bauPath"
                        name="2030 no-policy level"
                        stroke="hsl(var(--chart-3))"
                        strokeWidth={2}
                        strokeDasharray="6 3"
                        dot={false}
                      />
                    )}
                    <Line
                      dataKey="target"
                      name={isCapChart ? "2030 NDC ceiling" : "NDC target path"}
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </ComposedChart>
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
                    {isCapChart && (
                      <Line
                        dataKey="bauPath"
                        name="2030 no-policy level"
                        stroke="hsl(var(--chart-3))"
                        strokeWidth={2}
                        strokeDasharray="6 3"
                        dot={false}
                      />
                    )}
                    <Line
                      dataKey="target"
                      name={isCapChart ? "2030 NDC ceiling" : "NDC target path"}
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="5 5"
                    />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
              <ObservedProjectedLegend
                className="mt-2 px-1"
                showTarget={!isDistrictView}
                showBauPath={isCapChart}
                showProjected={timeMode === "projection" && !isDistrictView}
                capTarget={isCapChart}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Where this data comes from</h4>

              <div className="space-y-1.5">
                <ProvenanceRow label="Source" value={sourceTypeLabel(observedData.provenance.sourceType)} />
                <ProvenanceRow label="Responsible ministry" value={observedData.provenance.mrvOwnerMinistry} />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Quality check</span>
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
                          <p className="text-xs">This data has not yet been officially verified by the responsible ministry.</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
                <ProvenanceRow label="Last updated" value={new Date(observedData.provenance.lastUpdated).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })} />
                {slugBreakdown && Object.keys(slugBreakdown.values_mt).length > 0 && (
                  <div className="pt-1 border-t border-border mt-1">
                    <p className="text-xs text-muted-foreground mb-1">
                      Emissions breakdown ({slugBreakdown.reference_year})
                    </p>
                    {Object.entries(slugBreakdown.values_mt).map(([slug, mt]) => (
                      <div key={slug} className="flex items-start justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground shrink-0">{slug}</span>
                        <span className="text-[10px] text-foreground font-medium text-right">
                          {mt != null ? `${mt} Mt` : "missing"}
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
