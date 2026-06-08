import type {
  NDCTarget,
  ObservedDataPoint,
  ObservedDataSet,
  DataProvenance,
  ProgressStatus,
} from "@/data/uganda-ndc-data";
import { deriveTraceDataQuality, reconciliationDeltaPercent, uiStatusFromApiStatus } from "@/lib/progress";

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
    dataProviders: ["Climate TRACE", "Uganda NDC API"],
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
  dataset.provenance = {
    ...dataset.provenance,
    sourceType: "reported",
    isValidated: ingested.some((r) => r.is_validated),
    lastUpdated: ingested[ingested.length - 1]?.as_of ?? dataset.provenance.lastUpdated,
  };
  if (!dataset.dataProviders.includes("File ingest")) {
    dataset.dataProviders = [...dataset.dataProviders, "File ingest"];
  }
  return dataset;
}
