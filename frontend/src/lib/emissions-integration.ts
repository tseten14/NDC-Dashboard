import type {
  NDCTarget,
  ObservedDataPoint,
  ObservedDataSet,
  DataProvenance,
  ProgressStatus,
} from "@/data/uganda-ndc-data";
import { deriveTraceDataQuality, reconciliationDeltaPercent, uiStatusFromApiStatus } from "@/lib/progress";

export const CLIMATE_TRACE_API_SECTORS = ["afolu", "energy", "ippu", "agriculture", "waste"] as const;
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
    waste: "waste",
    ippu: "ippu",
    agriculture: "agriculture",
  };
  return map[target.sectorId] ?? null;
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
function latestNonNullPoint(timeseries: { year: number; value: number | null }[]) {
  for (let i = timeseries.length - 1; i >= 0; i--) {
    const { year, value } = timeseries[i];
    if (value != null && !Number.isNaN(value)) {
      return { year, value: Math.round(value * 100) / 100 };
    }
  }
  return null;
}

export function buildLiveObservedDataSet(
  target: NDCTarget,
  timeseries: { year: number; value: number | null }[],
  baselineYear: number,
  baselineValue: number,
  targetYear: number,
  targetValue: number,
  qualityHints: LiveObservedQualityHints = {},
): ObservedDataSet {
  const historicalData: ObservedDataPoint[] = timeseries.map(({ year, value }) => ({
    year,
    value:
      value == null || Number.isNaN(value) ? null : Math.round(value * 100) / 100,
    target: Math.round(linearTargetValue(year, baselineYear, baselineValue, targetYear, targetValue) * 100) / 100,
  }));

  const latest = latestNonNullPoint(timeseries);
  const lastY = latest?.year ?? baselineYear;
  const lastV = latest?.value ?? baselineValue;

  const projectionBaseline: ObservedDataPoint[] = [];
  const span = Math.max(1, targetYear - lastY);
  for (let y = lastY + 1; y <= targetYear; y++) {
    const elapsed = y - lastY;
    const interp = lastV + (targetValue - lastV) * (elapsed / span);
    projectionBaseline.push({
      year: y,
      value: Math.round(interp * 100) / 100,
      target: Math.round(linearTargetValue(y, baselineYear, baselineValue, targetYear, targetValue) * 100) / 100,
    });
  }

  const derived = deriveTraceDataQuality({
    missingSlugs: qualityHints.missingSlugs,
    dataStale: qualityHints.dataStale,
    reconciliationDeltaPct:
      qualityHints.reconciliationDeltaPct ??
      reconciliationDeltaPercent(
        qualityHints.reconciliationDeltaMt,
        qualityHints.reconciliationReferenceMt,
      ),
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
    dataProviders: ["Climate TRACE v7", "Uganda NDC API"],
    historicalData,
    projectionBaseline,
    provenance,
  };
}

export const INDICATOR_PANEL_TARGET_IDS = new Set(["t2", "t3", "t5", "t8"]);

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

function mapQaqc(q: string): import("@/data/uganda-ndc-data").QAQCStatus {
  if (q === "warning" || q === "missing" || q === "inconsistent" || q === "ok") return q;
  return "ok";
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
        : Math.round(value * 100) / 100,
    target: Math.round(linearTargetValue(year, by, bv, ty, tv) * 100) / 100,
  }));

  const latest = latestNonNullPoint(entry.timeseries);
  const lastY = latest?.year ?? ty;
  const lastV = latest?.value ?? (typeof bv === "number" ? bv : target.baselineValue);

  const projectionBaseline: ObservedDataPoint[] = [];
  const span = Math.max(1, ty - lastY);
  for (let y = lastY + 1; y <= ty; y++) {
    const elapsed = y - lastY;
    const interp = lastV + (tv - lastV) * (elapsed / span);
    projectionBaseline.push({
      year: y,
      value: Math.round(interp * 100) / 100,
      target: Math.round(linearTargetValue(y, by, bv, ty, tv) * 100) / 100,
    });
  }

  const provenance: DataProvenance = {
    sourceType: mapSourceType(m.sourceType),
    mrvOwnerMinistry: m.mrvOwnerMinistry || "—",
    qaqcStatus: mapQaqc(m.qaqcStatus),
    lastUpdated: m.lastUpdated,
    isValidated: m.isValidated,
  };

  return {
    targetId: target.id,
    dataProviders: m.dataProviders?.length ? m.dataProviders : ["Uganda NDC API"],
    historicalData,
    projectionBaseline,
    provenance,
  };
}
