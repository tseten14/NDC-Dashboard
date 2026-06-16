import { useState, type ReactNode } from "react";
import { type NDCTarget, type ObservedDataSet, type TimeMode, getObservedDataForTarget, bau2030ForTarget } from "@/data/uganda-ndc-data";
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
import { emissionsChartDisplay } from "@/lib/emissions-units";
import {
  ObservedProjectedComposedChart,
  ObservedProjectedLegend,
  buildObservedProjectedRows,
  chartYAxisUnit,
  filterBarChartYears,
} from "@/components/dashboard/ChartObservedProjected";
import { MeasuredVsNdcChart } from "@/components/dashboard/MeasuredVsNdcChart";
import { ClimateTraceDatasetOverview } from "@/components/dashboard/ClimateTraceDatasetOverview";
import { ClimateTraceEstimationFlow } from "@/components/dashboard/ClimateTraceEstimationFlow";
import { ColumnLoadingState, NoDataPlaceholder, SelectTargetPlaceholder } from "@/components/dashboard/DashboardStates";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Database, Satellite, MapPin, CodeXml, ExternalLink } from "lucide-react";
import { DataProvenancePanel } from "@/components/DataProvenancePanel";
import { ViewSourceModal } from "@/components/ViewSourceModal";
import { CLIMATE_TRACE_API_DOCS_URL } from "@/lib/data-lineage";
import { CountUpNumber } from "@/components/dashboard/CountUpNumber";
import { cn } from "@/lib/utils";

interface ObservedDataProps {
  selectedTarget: NDCTarget | null;
  selectedMitigationOptions: string[];
  timeMode?: TimeMode;
  /** When false, render at natural height (no internal scroll) for a shared page scroll. */
  scroll?: boolean;
}

export function ObservedDataColumn({ selectedTarget, selectedMitigationOptions: _omit, timeMode = "historical", scroll = true }: ObservedDataProps) {
  const emissions = useEmissionsData();
  const rootCls = cn("flex flex-col", scroll && "h-full");
  const wrap = (children: ReactNode) =>
    scroll ? <ScrollArea className="flex-1">{children}</ScrollArea> : <div>{children}</div>;
  const [clickedPoint, setClickedPoint] = useState<{ year: number; value: number } | null>(null);
  const [viewSourceOpen, setViewSourceOpen] = useState(false);
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
      <div className={rootCls}>
        <div className="px-3 py-2 border-b border-border bg-muted/50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Observed Data</h3>
        </div>
        <div className="flex-1 p-4">
          <NoDataPlaceholder hint={noDataHint} />
        </div>
      </div>
    );
  }

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

  const latestObserved =
    [...observedData.historicalData].reverse().find((p) => p.value != null && p.value > 0) ??
    [...observedData.historicalData].reverse().find((p) => p.value != null);
  // Proxy data is always in MtCO2e regardless of the indicator's native unit
  const yUnit = usingProxyData ? "MtCO₂e" : chartYAxisUnit(selectedTarget.unit);

  const chartData = filterBarChartYears(
    observedData.historicalData.map((p) => ({
      year: p.year,
      observedValue: p.value,
      projectedValue: null as number | null,
      target: isDistrictView ? null : p.target ?? null,
      bauPath: isDistrictView ? null : p.bauPath ?? null,
    })),
    (p) => p.observedValue,
  );

  const showNdcTarget = !isDistrictView && chartData.some((d) => d.target != null);
  const ndcGoal = showNdcTarget ? selectedTarget.targetValue : null;
  const isGrowthTarget =
    !isCapChart &&
    selectedTarget.targetValue > selectedTarget.baselineValue;
  const ndcCompareValue = isCapChart
    ? selectedTarget.targetValue
    : isGrowthTarget
      ? selectedTarget.baselineValue
      : selectedTarget.targetValue;
  const ndcCompareLabel = isCapChart
    ? "NDC pledge limit"
    : isGrowthTarget
      ? `NDC baseline (${selectedTarget.baselineYear})`
      : "NDC pledge goal";
  const measuredCompareLabel = observedSeriesLabel.replace(/\s*observed\s*$/i, "").trim() || "Measured";

  const chartDisplay = emissionsChartDisplay(
    chartData.map((d) => d.observedValue),
    yUnit,
  );
  const scaledChartData = chartData.map((d) => ({
    ...d,
    observedValue: d.observedValue != null ? d.observedValue * chartDisplay.scale : null,
    target: d.target != null ? d.target * chartDisplay.scale : null,
    bauPath: d.bauPath != null ? d.bauPath * chartDisplay.scale : null,
  }));

  // Projected view: extend the measured series with the modelled path to 2030,
  // plus the NDC target path and (for cap targets) the no-extra-action line.
  const isProjected = timeMode === "projection";
  const scaledProjectedRows = buildObservedProjectedRows(
    observedData.historicalData,
    observedData.projectionBaseline,
  ).map((r) => ({
    year: r.year,
    observedValue: r.observedValue != null ? r.observedValue * chartDisplay.scale : null,
    projectedValue: r.projectedValue != null ? r.projectedValue * chartDisplay.scale : null,
    target: isDistrictView || r.target == null ? null : r.target * chartDisplay.scale,
    bauPath: isDistrictView || r.bauPath == null ? null : r.bauPath * chartDisplay.scale,
  }));
  const hasProjectionPath = scaledProjectedRows.some(
    (r) => r.projectedValue != null && r.observedValue == null,
  );
  const showProjection = isProjected && hasProjectionPath;
  // NDC "path to 2030 goal" target line removed by request — keep the projection clean.
  const projectionShowTarget = false;
  const projectionShowBau = isProjected && isCapChart && !isDistrictView;
  const chartRows = isProjected
    ? scaledProjectedRows
    : scaledChartData.map(({ year, observedValue }) => ({
        year,
        observedValue,
        projectedValue: null as number | null,
        target: null as number | null,
        bauPath: null as number | null,
      }));

  const latestVsNdc =
    latestObserved?.value != null && ndcGoal != null
      ? isCapChart
        ? latestObserved.value <= ndcGoal
          ? "below"
          : "above"
        : latestObserved.value >= ndcGoal
          ? "met"
          : "below"
      : null;

  return (
    <div className={rootCls}>
      <div className="px-3 py-2.5 border-b border-border dash-section-header flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
          {isProjected ? "Projected Path" : "Observed Data"}
        </h3>
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
        {((apiSector || usingProxyData) ||
          (isIndicatorPanelTarget(selectedTarget) &&
            !usingProxyData &&
            observedMode === "live" &&
            !apiSector)) && <ClimateTraceApiBadge />}
        {hasIngestedObs && (
          <DataProvenanceBadge count={ingestedRows.length} source={ingestSourceLabel} />
        )}
        {(apiSector || usingProxyData) && (
          <button
            type="button"
            onClick={() => setViewSourceOpen(true)}
            className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="View data lineage and source audit"
          >
            <CodeXml className="h-3 w-3" />
            <span className="hidden sm:inline">Source</span>
          </button>
        )}
      </div>
      {wrap(
        <div className="p-3 space-y-2.5">
          <div className="flex flex-wrap gap-1 items-center">
            {observedData.dataProviders.map(provider => (
              <Badge key={provider} variant="outline" className="text-[9px] h-5 gap-1">
                <Database className="h-2.5 w-2.5" />
                {provider}
              </Badge>
            ))}
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
                district&apos;s {getProxySectorLabel(selectedTarget).toLowerCase()} emissions from Climate TRACE
                as the best available district-specific data (chart units may switch to tCO₂e for small totals).
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
                Bars show measured emissions from Climate TRACE over time. The chart below compares the
                latest measured total with Uganda&apos;s NDC pledge ({selectedTarget.targetValue}{" "}
                {selectedTarget.unit}) — based on data collected so far, not a forecast.
              </p>
              {liveProgress.scope_note && (
                <p className="text-muted-foreground mt-1 text-[10px]">{liveProgress.scope_note}</p>
              )}
            </div>
          )}

          {hasNullGaps && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Some years have no observed data — gaps are shown as empty, not estimated.
            </p>
          )}

          {isProjected && (
            <div className="p-2 rounded-md bg-[hsl(var(--chart-1))]/10 border border-[hsl(var(--chart-1))]/30 text-xs leading-snug">
              <p className="text-foreground font-medium">Projected path to 2030</p>
              <p className="text-muted-foreground mt-0.5">
                The solid line is measured data; the dashed line extends it to {selectedTarget.targetYear} on a
                straight-line trajectory{projectionShowTarget ? ", shown against the NDC pledge path" : ""}. This is
                an illustrative projection, not a forecast.
              </p>
            </div>
          )}

          <Card className="dash-card-hover dash-fade-up">
            <CardContent className="p-2 pt-3 pb-2">
              {showNdcTarget && latestObserved?.value != null && ndcGoal != null && (
                <div className="mb-2 px-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px]">
                  <span className="text-muted-foreground">
                    Latest measured ({latestObserved.year}):{" "}
                    <span className="font-medium text-[hsl(var(--chart-3))] tabular-nums">
                      <CountUpNumber
                        value={latestObserved.value}
                        format={(v) => chartDisplay.formatValue(v)}
                      />{" "}
                      {chartDisplay.unitLabel}
                    </span>
                  </span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-muted-foreground">
                    {selectedTarget.targetYear} goal:{" "}
                    <span className="font-medium text-[hsl(var(--chart-2))]">
                      {chartDisplay.formatValue(ndcGoal)} {chartDisplay.unitLabel}
                    </span>
                  </span>
                  {latestVsNdc === "below" && isCapChart && (
                    <Badge variant="outline" className="text-[8px] h-4 bg-on-track/10 text-on-track border-on-track/30">
                      Below NDC pledge
                    </Badge>
                  )}
                  {latestVsNdc === "above" && isCapChart && (
                    <Badge variant="outline" className="text-[8px] h-4 bg-off-track/10 text-off-track border-off-track/30">
                      Above NDC pledge
                    </Badge>
                  )}
                  {latestVsNdc === "met" && !isCapChart && (
                    <Badge variant="outline" className="text-[8px] h-4 bg-on-track/10 text-on-track border-on-track/30">
                      At or above goal
                    </Badge>
                  )}
                  {latestVsNdc === "below" && !isCapChart && (
                    <Badge variant="outline" className="text-[8px] h-4 bg-muted/50 text-muted-foreground border-border">
                      Below goal path
                    </Badge>
                  )}
                </div>
              )}
              <ObservedProjectedComposedChart
                data={chartRows}
                yUnit={chartDisplay.unitLabel}
                formatTick={chartDisplay.formatValue}
                observedSeriesLabel={observedSeriesLabel}
                compareLines={isProjected}
                showProjection={showProjection}
                showTarget={projectionShowTarget}
                showBauPath={projectionShowBau}
                capTarget={isCapChart}
                onBarClick={
                  apiSector || usingProxyData
                    ? (point) =>
                        setClickedPoint({
                          year: point.year,
                          value: point.value / chartDisplay.scale,
                        })
                    : undefined
                }
              />
              <ObservedProjectedLegend
                className="mt-1 px-1"
                compareLines={isProjected}
                showTarget={projectionShowTarget}
                showBauPath={projectionShowBau}
                showProjected={showProjection}
                capTarget={isCapChart}
                dataSourceHref={
                  observedMode === "live" &&
                  (apiSector ||
                    usingProxyData ||
                    (isIndicatorPanelTarget(selectedTarget) && !usingProxyData && !apiSector))
                    ? CLIMATE_TRACE_API_DOCS_URL
                    : undefined
                }
              />
              {(apiSector || usingProxyData) && !clickedPoint && (
                <p className="text-[9px] text-muted-foreground/60 mt-1 px-1">
                  Click any {isProjected ? "measured point" : "bar"} to trace its data source
                </p>
              )}
            </CardContent>
          </Card>

          {showNdcTarget && ndcCompareValue != null && latestObserved?.value != null && (
            <MeasuredVsNdcChart
              measuredValue={latestObserved.value}
              measuredYear={latestObserved.year}
              ndcReference={ndcCompareValue}
              ndcReferenceLabel={ndcCompareLabel}
              measuredLabel={measuredCompareLabel}
              unit={chartDisplay.unitLabel}
              formatValue={chartDisplay.formatValue}
              higherIsBetter={isGrowthTarget}
              goalYear={isGrowthTarget ? selectedTarget.targetYear : undefined}
              goalValue={isGrowthTarget ? ndcGoal ?? undefined : undefined}
            />
          )}

          {clickedPoint && (
            <DataProvenancePanel
              year={clickedPoint.year}
              value={clickedPoint.value}
              unit={chartDisplay.unitLabel}
              sector={usingProxyData ? null : (apiSector ?? null)}
              sectorLabel={observedSeriesLabel}
              onDismiss={() => setClickedPoint(null)}
            />
          )}

          <Card>
            <CardContent className="p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Where this data comes from</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button asChild variant="outline" size="sm" className="justify-start text-xs gap-1.5 h-8">
                  <a href="https://climatetrace.org" target="_blank" rel="noopener noreferrer">
                    <Satellite className="h-3.5 w-3.5" /> Climate TRACE website
                    <ExternalLink className="h-3 w-3 ml-auto opacity-70" aria-hidden />
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm" className="justify-start text-xs gap-1.5 h-8">
                  <a href={CLIMATE_TRACE_API_DOCS_URL} target="_blank" rel="noopener noreferrer">
                    <CodeXml className="h-3.5 w-3.5" /> Climate TRACE API
                    <ExternalLink className="h-3 w-3 ml-auto opacity-70" aria-hidden />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {(apiSector || usingProxyData) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="justify-start text-xs gap-1.5 h-8">
                    <Database className="h-3.5 w-3.5" /> What's in Climate TRACE
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-sm">What&apos;s in Climate TRACE&apos;s dataset</DialogTitle>
                  </DialogHeader>
                  <ClimateTraceDatasetOverview />
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="justify-start text-xs gap-1.5 h-8">
                    <Satellite className="h-3.5 w-3.5" /> How the estimate is made
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-sm">How Climate TRACE estimates emissions</DialogTitle>
                  </DialogHeader>
                  <ClimateTraceEstimationFlow />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>,
      )}

      <ViewSourceModal
        open={viewSourceOpen}
        onOpenChange={setViewSourceOpen}
        sector={usingProxyData ? null : (apiSector ?? (selectedTarget?.sectorId === "economy-wide" ? "economy-wide" : null))}
      />
    </div>
  );
}

function ClimateTraceApiBadge() {
  return (
    <a
      href={CLIMATE_TRACE_API_DOCS_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Open Climate TRACE API documentation"
      className="inline-flex items-center gap-1.5 shrink-0 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary shadow-sm hover:bg-primary/15 hover:border-primary/50 transition-colors"
    >
      <Satellite className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Climate Trace API
      <ExternalLink className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
    </a>
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
