import type {
  NDCTarget,
  ObservedDataPoint,
  ObservedDataSet,
  DataProvenance,
  ProgressStatus,
  QAQCStatus,
} from "@/data/uganda-ndc-data";
import {
  calculateProgress,
  deriveTraceDataQuality,
  reconciliationDeltaPercent,
  reviewDashboardQaqc,
  uiStatusFromApiStatus,
} from "@/lib/progress";
import { bau2030ForTarget, getObservedDataForTarget } from "@/data/uganda-ndc-data";
import type { ProgressResponse } from "@/lib/api";
import { roundMtco2e } from "@/lib/emissions-units";

export type { ProgressResponse };

export const CLIMATE_TRACE_API_SECTORS = ["afolu", "energy", "transport", "ippu", "agriculture", "waste"] as const;
export type ClimatetraceApiSector = (typeof CLIMATE_TRACE_API_SECTORS)[number];

/** True when the target is a national MtCO₂e trajectory we can back with Climate TRACE + NDC API. */
export function isMtco2eEmissionsTarget(target: NDCTarget): boolean {
  if (target.metricType !== "emissions-reduction") return false;
  const u = target.unit.toLowerCase().replace(/\s/g, "");
  return u.includes("mtco");
}

/** Maps dashboard NDC target → API sector key (same names as `config/ndcTargets.js`). */
export function getClimateTraceSectorForTarget(target: NDCTarget): ClimatetraceApiSector | null {
  if (!isMtco2eEmissionsTarget(target)) return null;
  const map: Partial<Record<NDCTarget["sectorId"], ClimatetraceApiSector>> = {
    afolu: "afolu",
    energy: "energy",
    transport: "transport",
    waste: "waste",
    ippu: "ippu",
    agriculture: "agriculture",
  };
  return map[target.sectorId] ?? null;
}

/**
 * For indicator-panel targets (non-MtCO2e) the parent sectorId still maps to a
 * CT-tracked sector. In district view we use that sector's timeseries as the
 * best available district-specific proxy (zero extra API calls — data is already
 * in the dashboard query response).
 *
 * e.g. Forest-cover (afolu) and Wetlands (afolu) → "afolu" district timeseries.
 *      Electricity capacity/access (energy)      → "energy" district timeseries.
 *      CSA adoption (agriculture)                → "agriculture" district timeseries.
 */
export function getProxySectorForTarget(target: NDCTarget): ClimatetraceApiSector | null {
  if (isMtco2eEmissionsTarget(target)) return null; // already has a direct CT sector
  const map: Partial<Record<NDCTarget["sectorId"], ClimatetraceApiSector>> = {
    afolu: "afolu",
    energy: "energy",
    transport: "transport",
    waste: "waste",
    ippu: "ippu",
    agriculture: "agriculture",
  };
  return map[target.sectorId] ?? null;
}

/** Human-readable label for the proxy chart when showing CT district data for a non-emissions target. */
export function getProxySectorLabel(target: NDCTarget): string {
  const labels: Partial<Record<NDCTarget["sectorId"], string>> = {
    afolu: "AFOLU (forestry & land use)",
    energy: "Energy sector",
    agriculture: "Agriculture sector",
    transport: "Transport sector",
    waste: "Waste sector",
    ippu: "IPPU sector",
  };
  return labels[target.sectorId] ?? target.sectorId;
}

export function apiStatusToProgressStatus(s: string): ProgressStatus {
  return uiStatusFromApiStatus(s);
}

export interface LiveObservedQualityHints {
  missingSlugs?: string[];
  dataStale?: boolean;
  reconciliationDeltaPct?: number | null;
  reconciliationDeltaMt?: number | null;
  reconciliationReferenceMt?: number | null;
}

function linearTargetValue(year: number, by: number, bv: number, ty: number, tv: number): number {
  if (ty === by) return bv;
  const t = (year - by) / (ty - by);
  return bv + (tv - bv) * t;
}

/**
 * Build an ObservedDataSet from Climate TRACE timeseries + NDC baseline/target used by the API.
 */
export function latestNonNullPoint(timeseries: { year: number; value: number | null }[]) {
  for (let i = timeseries.length - 1; i >= 0; i--) {
    const { year, value } = timeseries[i];
    if (value != null && !Number.isNaN(value)) {
      return { year, value: roundMtco2e(value)! };
    }
  }
  return null;
}

/** Linear path from the latest observation to a 2030 terminal value (BAU or NDC target). */
export function buildProjectionPoints(
  timeseries: { year: number; value: number | null }[],
  targetYear: number,
  terminalValue?: number | null,
): { year: number; value: number }[] {
  const latest = latestNonNullPoint(timeseries);
  if (!latest) return [];

  const endValue =
    terminalValue != null && Number.isFinite(terminalValue) ? terminalValue : latest.value;
  const span = Math.max(1, targetYear - latest.year);
  const points: { year: number; value: number }[] = [];

  for (let y = latest.year + 1; y <= targetYear; y++) {
    const elapsed = y - latest.year;
    const value = latest.value + (endValue - latest.value) * (elapsed / span);
    points.push({
      year: y,
      value: Math.max(0, roundMtco2e(value) ?? 0),
    });
  }

  return points;
}

/** Unified progress from NDC metadata + latest observed point (all target types). */
export function progressFromTargetAndLatest(
  target: NDCTarget,
  latestValue: number | null | undefined,
  latestYear: number | null | undefined,
  options: { bau2030?: number | null; qaqcStatus?: string } = {},
): { percent: number | null; status: ProgressStatus } {
  if (latestValue == null || Number.isNaN(latestValue)) {
    return { percent: null, status: "unknown" };
  }
  return calculateProgress(
    {
      baselineYear: target.baselineYear,
      baselineValue: target.baselineValue,
      targetYear: target.targetYear,
      targetValue: target.targetValue,
      metricType: target.metricType,
      bau2030: options.bau2030 ?? bau2030ForTarget(target),
    },
    {
      latestValue,
      latestYear,
      qaqcStatus: options.qaqcStatus ?? "ok",
    },
  );
}

export function progressFromEconomyWideTimeseries(
  target: NDCTarget,
  series: { year: number; value: number | null }[],
): { percent: number | null; status: ProgressStatus } {
  const latest = latestNonNullPoint(series);
  if (!latest) return { percent: null, status: "unknown" };
  return progressFromTargetAndLatest(target, latest.value, latest.year);
}

/** Latest observed point for progress display (API sector, economy-wide sum, or indicators). */
export function getLiveLatestForTarget(
  target: NDCTarget,
  ctx: {
    progressBySector: Partial<Record<ClimatetraceApiSector, ProgressResponse>>;
    economyWideTimeseries: { year: number; value: number | null }[];
    indicatorTargets?: Record<string, IndicatorPanelEntry>;
  },
): { year: number; value: number } | null {
  const sector = getClimateTraceSectorForTarget(target);
  if (sector) {
    const pr = ctx.progressBySector[sector];
    if (pr?.latest_value != null && pr.latest_year != null) {
      return { year: pr.latest_year, value: pr.latest_value };
    }
  }
  if (target.sectorId === "economy-wide" && ctx.economyWideTimeseries.length > 0) {
    const latest = latestNonNullPoint(ctx.economyWideTimeseries);
    if (latest) return { year: latest.year, value: latest.value };
  }
  const ind = isIndicatorPanelTarget(target) ? ctx.indicatorTargets?.[target.id] : undefined;
  if (ind?.timeseries?.length) {
    const latest = latestNonNullPoint(ind.timeseries);
    if (latest) return { year: latest.year, value: latest.value };
  }
  return null;
}

/**
 * Reference lines for charts.
 * BAU-cap targets (Uganda NDC 2022): the ceiling and no-policy level are 2030 absolutes —
 * show them as flat horizontal references, not a rising path from the 2015 inventory.
 * True reduction targets still use a linear baseline → 2030 goal path.
 */
function referencePathsForYear(
  year: number,
  baselineYear: number,
  baselineValue: number,
  targetYear: number,
  targetValue: number,
  bau2030: number | null | undefined,
): { target: number; bauPath?: number } {
  const isCap = bau2030 != null && targetValue > baselineValue && bau2030 > targetValue;
  if (isCap) {
    return {
      target: Math.round(targetValue * 100) / 100,
      bauPath: Math.round(bau2030 * 100) / 100,
    };
  }
  return {
    target: Math.round(linearTargetValue(year, baselineYear, baselineValue, targetYear, targetValue) * 100) / 100,
  };
}

export function buildLiveObservedDataSet(
  target: NDCTarget,
  timeseries: { year: number; value: number | null }[],
  baselineYear: number,
  baselineValue: number,
  targetYear: number,
  targetValue: number,
  qualityHints: LiveObservedQualityHints = {},
  bau2030?: number | null,
): ObservedDataSet {
  const historicalData: ObservedDataPoint[] = timeseries.map(({ year, value }) => {
    const paths = referencePathsForYear(year, baselineYear, baselineValue, targetYear, targetValue, bau2030);
    return {
      year,
      value: value == null || Number.isNaN(value) ? null : roundMtco2e(value),
      target: paths.target,
      ...(paths.bauPath != null ? { bauPath: paths.bauPath } : {}),
    };
  });

  const terminal2030 = bau2030 ?? targetValue;
  const projectionPoints = buildProjectionPoints(timeseries, targetYear, terminal2030);
  const projectionBaseline: ObservedDataPoint[] = projectionPoints.map(({ year, value }) => {
    const paths = referencePathsForYear(year, baselineYear, baselineValue, targetYear, targetValue, bau2030);
    return {
      year,
      value,
      target: paths.target,
      ...(paths.bauPath != null ? { bauPath: paths.bauPath } : {}),
    };
  });

  const derived = deriveTraceDataQuality({
    missingSlugs: qualityHints.missingSlugs,
    dataStale: qualityHints.dataStale,
    reconciliationDeltaPct:
      qualityHints.reconciliationDeltaPct ??
      reconciliationDeltaPercent(
        qualityHints.reconciliationDeltaMt,
        qualityHints.reconciliationReferenceMt,
      ),
    timeseries,
    unit: target.unit,
  });

  const provenance: DataProvenance = {
    sourceType: "observed-emissions-tracing",
    mrvOwnerMinistry: "Climate TRACE + national MRV",
    qaqcStatus: derived.qaqcStatus,
    lastUpdated: new Date().toISOString(),
    isValidated: derived.isValidated,
  };

  return {
    targetId: target.id,
    dataProviders: ["Climate Trace API", "Uganda NDC"],
    historicalData,
    projectionBaseline,
    provenance,
  };
}

// t2=forest cover, t3=electricity access, t8=CSA adoption, t9=wetlands coverage, t10=electricity capacity
// t5 was transport modal shift; now replaced by CT-tracked transport emissions (sectorId "transport")
export const INDICATOR_PANEL_TARGET_IDS = new Set(["t2", "t3", "t8", "t9", "t10"]);

export function isIndicatorPanelTarget(target: NDCTarget): boolean {
  return INDICATOR_PANEL_TARGET_IDS.has(target.id);
}

export interface IndicatorPanelMeta {
  targetId: string;
  baselineYear: number;
  baselineValue: number | null;
  targetYear: number;
  targetValue: number | null;
  unit: string;
  dataProviders: string[];
  sourceType: string;
  mrvOwnerMinistry: string;
  qaqcStatus: string;
  isValidated: boolean;
  lastUpdated: string;
}

export interface IndicatorPanelEntry {
  meta: IndicatorPanelMeta;
  timeseries: { year: number; value: number | null }[];
}

function mapSourceType(st: string): import("@/data/uganda-ndc-data").DataSourceType {
  if (st === "observed-eo") return "observed-eo";
  if (st === "observed-emissions-tracing") return "observed-emissions-tracing";
  if (st === "validated") return "validated";
  return "reported";
}

/**
 * Build ObservedDataSet from /api/v1/indicators/panel entry (non-MtCO₂e targets).
 */
export function buildIndicatorPanelObservedDataSet(target: NDCTarget, entry: IndicatorPanelEntry): ObservedDataSet {
  const m = entry.meta;
  const by = m.baselineYear;
  const bv = m.baselineValue ?? target.baselineValue;
  const ty = m.targetYear;
  const tv = m.targetValue ?? target.targetValue;

  const historicalData: ObservedDataPoint[] = entry.timeseries.map(({ year, value }) => ({
    year,
    value:
      value == null || Number.isNaN(value)
        ? null
        : roundMtco2e(value),
    target: Math.round(linearTargetValue(year, by, bv, ty, tv) * 100) / 100,
  }));

  const terminal2030 = tv ?? target.targetValue;
  const projectionPoints = buildProjectionPoints(entry.timeseries, ty, terminal2030);
  const projectionBaseline: ObservedDataPoint[] = projectionPoints.map(({ year, value }) => ({
    year,
    value,
    target: Math.round(linearTargetValue(year, by, bv, ty, tv) * 100) / 100,
  }));

  const reviewed = reviewDashboardQaqc(entry.timeseries, m.unit);

  const provenance: DataProvenance = {
    sourceType: mapSourceType(m.sourceType),
    mrvOwnerMinistry: m.mrvOwnerMinistry || "—",
    qaqcStatus: reviewed.qaqcStatus,
    lastUpdated: m.lastUpdated,
    isValidated: reviewed.isValidated,
  };

  return {
    targetId: target.id,
    dataProviders: m.dataProviders?.length ? m.dataProviders : ["Uganda NDC"],
    historicalData,
    projectionBaseline,
    provenance,
  };
}

export function isIngestedObservationSource(source: string): boolean {
  return source === "ingest-upload" || source.startsWith("ingest:");
}

export interface IngestedObservationInput {
  year: number;
  value: number;
  source: string;
  as_of: string;
  is_validated: boolean;
}

export function mergeIngestedIntoIndicatorEntry(
  entry: IndicatorPanelEntry,
  ingested: { year: number; value: number }[],
): IndicatorPanelEntry {
  const byYear = new Map(entry.timeseries.map((p) => [p.year, p.value]));
  for (const { year, value } of ingested) {
    byYear.set(year, value);
  }
  const timeseries = [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, value]) => ({ year, value }));
  return { ...entry, timeseries };
}

/** Overlay file-ingested observations onto an indicator-panel series. */
export function buildIngestedObservedDataSet(
  target: NDCTarget,
  rows: IngestedObservationInput[],
  baseEntry?: IndicatorPanelEntry,
): ObservedDataSet | null {
  const ingested = rows.filter((r) => isIngestedObservationSource(r.source));
  if (!ingested.length) return null;

  const timeseries = ingested.map((r) => ({ year: r.year, value: r.value }));
  const entry: IndicatorPanelEntry = baseEntry
    ? mergeIngestedIntoIndicatorEntry(baseEntry, timeseries)
    : {
        meta: {
          targetId: target.id,
          baselineYear: target.baselineYear,
          baselineValue: target.baselineValue,
          targetYear: target.targetYear,
          targetValue: target.targetValue,
          unit: target.unit,
          dataProviders: ["File ingest"],
          sourceType: "reported",
          mrvOwnerMinistry: "—",
          qaqcStatus: "ok",
          isValidated: false,
          lastUpdated: ingested[ingested.length - 1]?.as_of ?? new Date().toISOString(),
        },
        timeseries,
      };

  const dataset = buildIndicatorPanelObservedDataSet(target, entry);
  const reviewed = reviewDashboardQaqc(dataset.historicalData, target.unit);
  dataset.provenance = {
    ...dataset.provenance,
    sourceType: "reported",
    qaqcStatus: reviewed.qaqcStatus,
    isValidated: reviewed.isValidated,
    lastUpdated: ingested[ingested.length - 1]?.as_of ?? dataset.provenance.lastUpdated,
  };
  if (!dataset.dataProviders.includes("File ingest")) {
    dataset.dataProviders = [...dataset.dataProviders, "File ingest"];
  }
  return dataset;
}

/** QA/QC flags derived from a live Climate TRACE sector row. */
export function qaqcFromLiveProgress(
  pr: ProgressResponse,
  hints: { dataStale?: boolean; reconciliationDeltaPct?: number | null } = {},
): QAQCStatus {
  return deriveTraceDataQuality({
    missingSlugs: pr.missing_slugs,
    dataStale: hints.dataStale,
    reconciliationDeltaPct: hints.reconciliationDeltaPct,
  }).qaqcStatus;
}

/**
 * Observed dataset for progress / provenance — prefers live API over bundled mock fallbacks.
 */
export function resolveObservedDataSetForTarget(
  target: NDCTarget,
  ctx: {
    timeseriesBySector: Partial<
      Record<ClimatetraceApiSector, { timeseries: { year: number; value: number | null }[] }>
    >;
    progressBySector: Partial<Record<ClimatetraceApiSector, ProgressResponse>>;
    economyWideTimeseries: { year: number; value: number | null }[];
    isApiReachable: boolean;
    dashboard?: { data_stale?: boolean };
    reconciliation?: { delta_mt?: number | null; sector_sum_mt?: number | null };
    getObservedMode: (t: NDCTarget) => "live" | "mock";
    indicatorTargets?: Record<string, IndicatorPanelEntry>;
  },
): ObservedDataSet | null {
  const indEntry = isIndicatorPanelTarget(target) ? ctx.indicatorTargets?.[target.id] : undefined;
  if (indEntry?.timeseries?.length && ctx.getObservedMode(target) === "live") {
    return buildIndicatorPanelObservedDataSet(target, indEntry);
  }

  const apiSector = getClimateTraceSectorForTarget(target);
  const ts = apiSector ? ctx.timeseriesBySector[apiSector] : undefined;
  const pr = apiSector ? ctx.progressBySector[apiSector] : undefined;
  const observedMode = ctx.getObservedMode(target);

  if (apiSector && ts && pr && observedMode === "live") {
    return buildLiveObservedDataSet(
      target,
      ts.timeseries,
      pr.baseline_year,
      pr.baseline_value,
      pr.target_year,
      pr.target_value,
      {
        missingSlugs: pr.missing_slugs,
        dataStale: ctx.dashboard?.data_stale,
        reconciliationDeltaPct: reconciliationDeltaPercent(
          ctx.reconciliation?.delta_mt,
          ctx.reconciliation?.sector_sum_mt,
        ),
      },
      pr.bau_2030 ?? bau2030ForTarget(target),
    );
  }

  if (
    target.sectorId === "economy-wide" &&
    ctx.economyWideTimeseries.length > 0 &&
    ctx.isApiReachable
  ) {
    return buildLiveObservedDataSet(
      target,
      ctx.economyWideTimeseries,
      target.baselineYear,
      target.baselineValue,
      target.targetYear,
      target.targetValue,
      { dataStale: ctx.dashboard?.data_stale },
      bau2030ForTarget(target),
    );
  }

  return getObservedDataForTarget(target.id) ?? null;
}

/**
 * Recompute progress from live API fields (latest value + NDC metadata).
 * Avoids stale `progress_pct` when the API process has not picked up shared formula updates.
 */
export function progressFromLiveApiFields(
  pr: ProgressResponse,
  target: NDCTarget,
  qaqcHints: { dataStale?: boolean; reconciliationDeltaPct?: number | null } = {},
): { percent: number | null; status: ProgressStatus } {
  return progressFromTargetAndLatest(target, pr.latest_value, pr.latest_year, {
    bau2030: pr.bau_2030 ?? bau2030ForTarget(target),
    qaqcStatus: qaqcFromLiveProgress(pr, qaqcHints),
  });
}

/**
 * National NDC progress is not scored against a single district. NDC targets are
 * national pledges (e.g. "12% wetland coverage by 2030") with no district-level
 * target value, so a per-district progress % cannot be computed honestly — the
 * district's observed data is shown for local context instead.
 *
 * Exceptions: indicator-panel and economy-wide targets are explicitly national —
 * district selection has no effect, so their (national) score is kept and labelled
 * as such rather than blocked.
 */
export function isDistrictProgressBlocked(target: NDCTarget, isDistrictView: boolean): boolean {
  if (!isDistrictView) return false;
  if (isIndicatorPanelTarget(target) || target.sectorId === "economy-wide") return false;
  return true;
}
