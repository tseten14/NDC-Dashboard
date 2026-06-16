/**
 * HTTP client for the Uganda NDC Express API (`server.js`, `/api/v1/*`).
 *
 * Dev: leave `VITE_API_BASE_URL` unset — Vite proxies `/api` → `API_PORT` (8787).
 * Prod: same-origin `/api/v1` unless `VITE_API_BASE_URL` points at a separate API host.
 *
 * Emissions: dashboard, timeseries, progress, districts, sources, map, predictions,
 * spatial-confidence, trackability. Catalog + ingest helpers are also defined here.
 *
 * @see docs/ARCHITECTURE.md
 */

import type { IndicatorPanelEntry } from "./emissions-integration";
import type {
  PolicyCatalogDocumentResponse,
  PolicyPassageCorpusMetaResponse,
  PolicyPassageDocument,
  PolicyPassagesListResponse,
  PolicyPassagesSearchResponse,
  PolicyDocumentsCuratedResponse,
  PolicyDocumentsListResponse,
  PolicyDocumentsMetaResponse,
  PolicyTopicsResponse,
} from "./policy-documents";
import type { ZodType } from "zod";
import {
  safeParseOrLog,
  emissionsDashboardSchema,
  indicatorPanelResponseSchema,
  ingestScanReportSchema,
} from "./schemas";

/** Same-origin in dev (Vite proxy) and production; override with VITE_API_BASE_URL. */
export function resolveApiHost(): string {
  const env = import.meta.env.VITE_API_BASE_URL?.trim();
  if (import.meta.env.DEV) {
    return env || "";
  }
  if (env && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(env)) {
    return env.replace(/\/$/, "");
  }
  return "";
}

const BASE = resolveApiHost();

function ingestWriteHeaders(extra: HeadersInit = {}): HeadersInit {
  const key = import.meta.env.VITE_INGEST_API_KEY?.trim();
  return key ? { ...extra, "x-api-key": key } : extra;
}

/** For XMLHttpRequest-based ingest uploads (scan). */
export function applyIngestWriteHeaders(xhr: XMLHttpRequest) {
  const key = import.meta.env.VITE_INGEST_API_KEY?.trim();
  if (key) xhr.setRequestHeader("x-api-key", key);
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText}: ${body || path}`);
  }
  return res.json() as Promise<T>;
}

async function getJSONValidated<T>(path: string, schema: ZodType<T>, label: string): Promise<T> {
  const raw = await getJSON<unknown>(path);
  const parsed = safeParseOrLog(schema, raw, label);
  if (!parsed.ok) {
    throw new Error(`Invalid API response (${label})`);
  }
  return parsed.data;
}

async function postJSON<T>(path: string, body: unknown, headers: HeadersInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const detail =
      payload && typeof payload === "object" && "error" in payload
        ? String(payload.error)
        : `${res.status} ${res.statusText}`;
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export type NdcSectorKey = "afolu" | "energy" | "transport" | "ippu" | "agriculture" | "waste";
export type SectorStatus = "on_track" | "at_risk" | "mixed" | "off_track" | "unknown";

export interface SectorSummaryEntry {
  latest_year: number | null;
  latest_value: number | null;
  status: SectorStatus;
  progress_pct: number | null;
}

export interface TimeseriesPoint {
  year: number;
  value: number | null;
}

export interface TimeseriesResponse {
  sector: NdcSectorKey;
  unit: "MtCO2e";
  data_source: string;
  data_license: string;
  geography: "national" | "district";
  gadm_id?: string;
  district_name?: string | null;
  district_unavailable?: boolean;
  timeseries: TimeseriesPoint[];
}

export interface DistrictListEntry {
  name: string;
  gadm_id: string;
}

export interface DistrictsResponse {
  national: { gadm_id: string; name: string };
  districts: DistrictListEntry[];
  data_source: string;
  note: string;
}

export interface EmissionsSource {
  id: number | string | null;
  name: string | null;
  sector: string | null;
  subsector: string | null;
  source_type: string | null;
  asset_type: string | null;
  is_asset: boolean;
  centroid: { lat: number | null; lng: number | null } | null;
  emissions_tco2e: number | null;
  emissions_mtco2e: number | null;
  year: number | string | null;
}

export interface EmissionsSourcesResponse {
  year: number;
  gadm_id: string;
  limit: number;
  offset: number;
  count: number;
  sources: EmissionsSource[];
  geography: "national" | "district";
  district_name: string | null;
  data_source: string;
  data_license: string;
  note: string;
  from_cache?: boolean;
}

export interface TrackabilityVariable {
  id: string;
  label: string;
  description: string;
  measurement_type: string;
  unit: string;
  trackable: boolean;
  sector_slugs: string[];
  note: string | null;
}

export interface CountryTargetEntry {
  sector: string;
  variable_id: string | null;
  label: string;
  baseline_year: number;
  baseline: number;
  target_year: number;
  target: number;
  unit: string;
  condition: string;
  reduction_pct: number | null;
  climate_trace_trackable: boolean;
  climate_trace_slugs: string[];
}

export interface TrackabilityResponse {
  country: string;
  country_name: string;
  gadm_id: string;
  targets: CountryTargetEntry[];
  variables: TrackabilityVariable[];
  available_countries: string[];
  data_source: string;
  note: string;
}

export interface SpatialConfidenceSector {
  sector: string;
  total_mtco2e: number | null;
  located_mtco2e: number | null;
  distributed_mtco2e: number | null;
  certain_pct: number | null;
}

export interface SpatialConfidenceResponse {
  gadm_id: string;
  year: number;
  aggregate_mtco2e: number | null;
  located_mtco2e: number | null;
  distributed_mtco2e: number | null;
  certain_pct: number | null;
  uncertain_pct: number | null;
  located_source_count: number;
  located_aggregation_count: number;
  truncated: boolean;
  sectors: SpatialConfidenceSector[];
  geography: "national" | "district";
  district_name: string | null;
  data_source: string;
  data_license: string;
  methodology: string;
  methodology_url: string;
  from_cache?: boolean;
}

export interface MapSourcePoint {
  id: number | string | null;
  name: string | null;
  sector: string;
  subsector: string | null;
  is_asset: boolean;
  lat: number;
  lng: number;
  mtco2e: number | null;
}

export interface MapSectorTotal {
  sector: string;
  mtco2e: number | null;
}

export interface EmissionsMapResponse {
  gadm_id: string;
  year: number;
  point_count: number;
  asset_count: number;
  total_mtco2e: number;
  truncated: boolean;
  sectors: MapSectorTotal[];
  points: MapSourcePoint[];
  geography: "national" | "district";
  district_name: string | null;
  data_source: string;
  data_license: string;
  note: string;
  from_cache?: boolean;
}

/** Geography selector for emissions queries. Omit for national (UGA). */
export interface GeographyOpts {
  /** Climate TRACE GADM id, e.g. "UGA.16_1". */
  gadmId?: string;
  /** District display name, e.g. "Kampala" (resolved server-side). */
  district?: string;
}

export interface ProgressResponse {
  sector: NdcSectorKey;
  unit: "MtCO2e";
  label: string;
  condition: string;
  baseline_year: number;
  baseline_value: number;
  target_year: number;
  target_value: number;
  latest_year: number | null;
  latest_value: number | null;
  progress_pct: number | null;
  status: SectorStatus;
  data_source: string;
  methodology?: "ndc_baseline_vs_trace_observed" | "ndc_bau_cap_vs_trace_observed";
  progress_method?: "bau_cap" | "baseline_reduction" | null;
  bau_2030?: number | null;
  scope_note?: string | null;
  trace_yoy_pct?: number | null;
  baseline_vs_trace_delta_mt?: number | null;
  missing_slugs?: string[];
}

export interface SlugBreakdownBySector {
  reference_year: number;
  slugs: string[];
  values_mt: Record<string, number | null>;
  missing_slugs: string[];
}

export interface EmissionsReconciliation {
  reference_year: number;
  country_total_mt: number | null;
  sector_sum_mt: number | null;
  ui_sector_sum_mt: number | null;
  delta_mt: number | null;
  unmapped_slugs: string[];
  missing_slugs: string[];
  slug_breakdown: Record<string, number | null>;
  note?: string;
}

export interface EmissionsCoverage {
  methodology: string;
  sector_scope_notes: Record<string, string>;
  unmapped_slugs: string[];
}

export interface EmissionsDashboard {
  since: number;
  to: number;
  inventory_year: number;
  on_track: number;
  off_track: number;
  mixed: number;
  impl_gaps: number;
  mrv_gaps: number;
  global_rank: number | null;
  total_co2e_mtco2e: number | null;
  yoy_change_mtco2e: number | null;
  data_stale: boolean;
  from_cache: boolean;
  data_source: string;
  api_docs_url: string;
  geography?: "national" | "district";
  gadm_id?: string;
  district_name?: string | null;
  target_scope?: "national" | "district";
  timeseries: Partial<Record<NdcSectorKey, TimeseriesPoint[]>>;
  progress: Partial<Record<NdcSectorKey, ProgressResponse>>;
  sectors: Partial<Record<NdcSectorKey, SectorSummaryEntry>>;
  slug_breakdown_by_sector?: Partial<Record<NdcSectorKey, SlugBreakdownBySector>>;
  reconciliation?: EmissionsReconciliation;
  coverage?: EmissionsCoverage;
}

export interface EmissionsSummary {
  on_track: number;
  off_track: number;
  mixed: number;
  impl_gaps: number;
  mrv_gaps: number;
  global_rank: number | null;
  total_co2e_mtco2e: number | null;
  yoy_change_mtco2e: number | null;
  data_stale: boolean;
  from_cache: boolean;
  data_source?: string;
  api_docs_url?: string;
  sectors: Partial<Record<NdcSectorKey, SectorSummaryEntry>>;
  reconciliation?: EmissionsReconciliation;
}

export type PredictionStatus =
  | "on_track"
  | "at_risk"
  | "off_track"
  | "unknown"
  | "insufficient_data";

export interface PredictionForecastPoint {
  year: number;
  yhat: number | null;
  lower: number | null;
  upper: number | null;
}

export interface SectorPrediction {
  label: string;
  unit: string;
  history: { year: number; value: number | null }[];
  forecast: PredictionForecastPoint[];
  predicted_value: number | null;
  predicted_lower?: number | null;
  predicted_upper?: number | null;
  target_value: number | null;
  baseline_value: number | null;
  bau_2030?: number | null;
  condition?: string | null;
  reduction_below_bau_pct?: number | null;
  gap: number | null;
  gap_pct: number | null;
  status: PredictionStatus;
  model: string | null;
  r2: number | null;
  n_points: number;
  note: string | null;
}

export interface PredictionsResponse {
  ok: boolean;
  engine: string;
  target_year: number;
  predictions: Partial<Record<NdcSectorKey, SectorPrediction>>;
  summary: {
    on_track: number;
    at_risk: number;
    off_track: number;
    unknown: number;
    insufficient_data: number;
    total_predicted: number | null;
    total_target: number | null;
    total_gap: number | null;
  };
  geography: "national" | "district";
  gadm_id: string;
  district_name: string | null;
  observed_from: number;
  observed_to: number;
  data_source: string;
  methodology: string;
  target_scope: string;
  from_cache: boolean;
}

function applyGeography(q: URLSearchParams, opts?: GeographyOpts) {
  if (opts?.gadmId) q.set("gadm_id", opts.gadmId);
  else if (opts?.district) q.set("district", opts.district);
}

export const emissionsApi = {
  dashboard: (since?: number, to?: number, opts?: GeographyOpts) => {
    const q = new URLSearchParams();
    if (since != null) q.set("since", String(since));
    if (to != null) q.set("to", String(to));
    applyGeography(q, opts);
    const qs = q.toString();
    return getJSONValidated<EmissionsDashboard>(
      `/api/v1/emissions/dashboard${qs ? `?${qs}` : ""}`,
      emissionsDashboardSchema,
      "emissions.dashboard",
    );
  },
  districts: () => getJSON<DistrictsResponse>("/api/v1/emissions/districts"),
  trackability: (country?: string) =>
    getJSON<TrackabilityResponse>(
      `/api/v1/emissions/trackability${country ? `?country=${encodeURIComponent(country)}` : ""}`,
    ),
  sources: (opts?: GeographyOpts, params?: { year?: number; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    applyGeography(q, opts);
    if (params?.year != null) q.set("year", String(params.year));
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.offset != null) q.set("offset", String(params.offset));
    const qs = q.toString();
    return getJSON<EmissionsSourcesResponse>(`/api/v1/emissions/sources${qs ? `?${qs}` : ""}`);
  },
  predictions: (opts?: GeographyOpts) => {
    const q = new URLSearchParams();
    applyGeography(q, opts);
    const qs = q.toString();
    return getJSON<PredictionsResponse>(`/api/v1/emissions/predictions${qs ? `?${qs}` : ""}`);
  },
  spatialConfidence: (opts?: GeographyOpts, year?: number) => {
    const q = new URLSearchParams();
    applyGeography(q, opts);
    if (year != null) q.set("year", String(year));
    const qs = q.toString();
    return getJSON<SpatialConfidenceResponse>(`/api/v1/emissions/spatial-confidence${qs ? `?${qs}` : ""}`);
  },
  map: (opts?: GeographyOpts, year?: number) => {
    const q = new URLSearchParams();
    applyGeography(q, opts);
    if (year != null) q.set("year", String(year));
    const qs = q.toString();
    return getJSON<EmissionsMapResponse>(`/api/v1/emissions/map${qs ? `?${qs}` : ""}`);
  },
  summary: () => getJSON<EmissionsSummary>("/api/v1/emissions/summary"),
  timeseries: (sector: NdcSectorKey, since?: number, to?: number, opts?: GeographyOpts) => {
    const q = new URLSearchParams({ sector });
    if (since != null) q.set("since", String(since));
    if (to != null) q.set("to", String(to));
    applyGeography(q, opts);
    return getJSON<TimeseriesResponse>(`/api/v1/emissions/timeseries?${q}`);
  },
  progress: (sector: NdcSectorKey, since?: number, to?: number, opts?: GeographyOpts) => {
    const q = new URLSearchParams({ sector });
    if (since != null) q.set("since", String(since));
    if (to != null) q.set("to", String(to));
    applyGeography(q, opts);
    return getJSON<ProgressResponse>(`/api/v1/emissions/progress?${q}`);
  },
  provenance: () => getJSON<Record<string, unknown>>("/api/v1/provenance"),
  climateTraceHealth: () =>
    getJSON<{ status: string; latency_ms?: number; http_status?: number; last_checked: string }>(
      "/api/v1/health/climatetrace",
    ),
};

export interface IndicatorPanelResponse {
  since: number;
  to: number;
  targets: Record<string, IndicatorPanelEntry>;
  data_source: string;
}

export interface CatalogActivityRow {
  id: string;
  target_id: string;
  sort_order: number;
  body: Record<string, unknown>;
}

export interface CatalogMitigationRow {
  id: string;
  target_id: string;
  sector_id: string;
  sort_order: number;
  body: Record<string, unknown>;
}

export interface IngestHealthResponse {
  ok: boolean;
  analysis: {
    tabular_engine: "pandas" | "javascript_fallback";
    python3: boolean;
    pandas_version?: string | null;
    install_hint?: string | null;
  };
}

export type IngestDatasetKind = "indicator_progress" | "activity_outputs" | "district_values";

export interface IngestImportPayload {
  filename: string;
  kind: IngestDatasetKind;
  mapping: Record<string, string>;
  rows: Record<string, unknown>[];
  status: "Draft" | "Published";
}

export interface IngestImportResponse {
  import_id: string;
  status: "Draft" | "Published";
  kind: IngestDatasetKind;
  rows_total: number;
  rows_ok: number;
  errors: Array<{ row: number; message: string }>;
  persisted: boolean;
}

export type IngestFileType = "pdf" | "csv" | "json";
export type IngestJobStatus = "pending" | "processing" | "complete" | "failed";
export type InferredColumnType = "number" | "date" | "text";
export type ObservationField = "year" | "value" | "source" | "target_id";

export interface IngestParseWarning {
  message: string;
  rowNumbers?: number[];
}

export interface IngestPdfInsights {
  pages: number;
  chars: number;
  parseEngine: string;
  about: Record<string, unknown>;
  analysis: Record<string, unknown>;
  recommendations: string[];
}

export interface IngestUploadResponse {
  jobId: string;
  fileType: IngestFileType;
  rowCount: number;
  headers: string[];
  inferredTypes: Record<string, InferredColumnType>;
  columnMapping: Partial<Record<ObservationField, string | null>>;
  pipelineDefaults?: PipelineFilterOptions;
  fileKind?: "policy_catalog" | "indicator";
  preview: Record<string, unknown>[];
  warnings: IngestParseWarning[];
  pdfInsights?: IngestPdfInsights;
}

export interface PipelineFilterOptions {
  ugandaOnly?: boolean;
  dropDuplicates?: boolean;
  latestYearOnly?: boolean;
  /** Catalog files without amounts: each row counts as 1 */
  documentCountMode?: boolean;
}

export interface PipelineStep {
  id: string;
  label: string;
  rowsBefore: number;
  rowsAfter: number;
  removed: number;
  detail?: string;
}

export interface PipelineScanResponse {
  jobId: string;
  status: "cleaned";
  rowsInput: number;
  rowsOutput: number;
  steps: PipelineStep[];
  cleanedRows: Record<string, unknown>[];
  preview: Record<string, unknown>[];
  issues: Array<{ row: number; message: string }>;
  geographyColumn: string | null;
  engine: "javascript";
  filtersApplied: PipelineFilterOptions;
}

export interface IngestConfirmPayload {
  jobId: string;
  finalColumnMapping: Partial<Record<ObservationField, string | null>>;
  pipelineFilters?: PipelineFilterOptions;
}

export interface IngestConfirmResponse {
  jobId: string;
  status: IngestJobStatus;
  rowsImported: number;
  rowsSkipped: number;
  errors: Array<{ row: number; message: string }>;
  persisted: boolean;
  persistenceMode?: "postgres" | "fallback" | "disabled";
  storage?: string | null;
  targetKeys?: string[];
  yearRange?: { min: number; max: number } | null;
  dashboardHint?: string | null;
  auditFile?: string;
}

export interface PersistenceObservationRow {
  id: string;
  target_id: string;
  year: number;
  value: number;
  source: string;
  as_of: string;
  is_estimated: boolean;
  is_validated: boolean;
  qaqc_status: string;
  created_at: string;
}

export const persistenceApi = {
  targetObservations: (targetId: string) =>
    getJSON<{ target_id: string; observations: PersistenceObservationRow[]; count: number }>(
      `/api/v1/targets/${encodeURIComponent(targetId)}/observations`,
    ),
};

export interface IngestJobRow {
  id: string;
  filename: string;
  file_type: IngestFileType;
  status: IngestJobStatus;
  row_count: number | null;
  error_message: string | null;
  created_by: string;
  created_at: string;
  completed_at: string | null;
}

async function postFormData<T>(path: string, formData: FormData, headers: HeadersInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: "POST", body: formData, headers });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const detail =
      payload && typeof payload === "object" && "error" in payload
        ? String(payload.error)
        : `${res.status} ${res.statusText}`;
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const ingestApi = {
  health: () => getJSON<IngestHealthResponse>("/api/v1/ingest/health"),
  importRows: (payload: IngestImportPayload) =>
    postJSON<IngestImportResponse>("/api/v1/ingest/files/import", payload, ingestWriteHeaders()),
  uploadFile: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return postFormData<IngestUploadResponse>("/api/v1/ingest/upload", fd, ingestWriteHeaders());
  },
  pipelineScan: async (payload: {
    jobId: string;
    columnMapping: Partial<Record<ObservationField, string | null>>;
    filters?: PipelineFilterOptions;
  }) => {
    const headers = ingestWriteHeaders();
    for (const path of ["/api/v1/ingest/clean", "/api/v1/ingest/pipeline/scan"]) {
      const res = await fetch(`${BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(payload),
      });
      if (res.ok) return res.json() as Promise<PipelineScanResponse>;
      if (res.status !== 404) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body && typeof body === "object" && "error" in body
            ? String(body.error)
            : `${res.status} ${res.statusText}`,
        );
      }
    }
    throw new Error("Clean endpoint not available — restart the API server (npm run start:api)");
  },
  confirmImport: (payload: IngestConfirmPayload) =>
    postJSON<IngestConfirmResponse>("/api/v1/ingest/confirm", payload, ingestWriteHeaders()),
  listJobs: (limit = 10) =>
    getJSON<{ jobs: IngestJobRow[]; count: number }>(`/api/v1/ingest/jobs?limit=${limit}`),
};

export const cockpitApi = {
  indicatorPanel: (since = 2015, to = 2024) =>
    getJSONValidated<IndicatorPanelResponse>(
      `/api/v1/indicators/panel?since=${since}&to=${to}`,
      indicatorPanelResponseSchema,
      "indicators.panel",
    ),
  catalogActivities: () => getJSON<{ activities: CatalogActivityRow[]; data_source: string }>("/api/v1/catalog/activities"),
  catalogMitigationOptions: () =>
    getJSON<{ options: CatalogMitigationRow[]; data_source: string }>("/api/v1/catalog/mitigation-options"),
};

export interface PolicyCaseSummary {
  id: string;
  title: string;
  country: string;
  sector: string;
  intervention_type: string;
  summary: string;
}

export interface PolicyCaseIndexResponse {
  version: string;
  description: string;
  source: string;
  cases: PolicyCaseSummary[];
  data_source: string;
}

export interface TefElement {
  id: string;
  label: string;
  intervention_type: string;
}

export interface PolicyImpactForecastRequest {
  objective: string;
  intervention: { type: string; label?: string };
  parameters: { scale: number; timeline_years: number; sector: string };
  context?: { country: string };
}

export interface PolicyImpactOutcome {
  category: string;
  direction: string;
  description: string;
  magnitude?: { value: number; unit: string; low?: number; high?: number };
  confidence: number;
  provenance: string;
  case_ids: string[];
}

export interface PolicyImpactForecastResponse {
  impacts: PolicyImpactOutcome[];
  trade_offs: Array<{
    id: string;
    positive_effect: string;
    negative_effect: string;
    affected_groups: string[];
    severity?: string;
    confidence: number;
    provenance?: string;
    case_ids?: string[];
  }>;
  pathway_diagram: { nodes: Array<{ id: string; kind: string; label: string }>; edges: Array<{ from: string; to: string }> };
  matched_cases: Array<{
    id: string;
    title: string;
    match_score: number;
    country: string;
    sector_score?: number;
    intervention_score?: number;
    region_score?: number;
    scale_score?: number;
  }>;
  overall_confidence: number;
  disclaimers: string[];
  data_source: string;
}

export const policyImpactApi = {
  listCases: () => getJSON<PolicyCaseIndexResponse>("/api/v1/policy-cases"),
  getCase: (id: string) => getJSON<{ case: Record<string, unknown>; data_source: string }>(`/api/v1/policy-cases/${id}`),
  forecast: (body: PolicyImpactForecastRequest) =>
    postJSON<PolicyImpactForecastResponse>("/api/v1/policy-impact/forecast", body),
  tefElements: (sector?: string) => {
    const qs = sector ? `?sector=${encodeURIComponent(sector)}` : "";
    return getJSON<{ sector: string; elements: TefElement[]; data_source: string }>(
      `/api/v1/policy-impact/tef-elements${qs}`,
    );
  },
};

export const documentsApi = {
  meta: () => getJSON<PolicyDocumentsMetaResponse>("/api/v1/documents/meta"),
  list: (params?: { category?: string; source?: string; q?: string; limit?: number; offset?: number }) => {
    const sp = new URLSearchParams();
    if (params?.category) sp.set("category", params.category);
    if (params?.source) sp.set("source", params.source);
    if (params?.q) sp.set("q", params.q);
    if (params?.limit != null) sp.set("limit", String(params.limit));
    if (params?.offset != null) sp.set("offset", String(params.offset));
    const qs = sp.toString();
    return getJSON<PolicyDocumentsListResponse>(`/api/v1/documents${qs ? `?${qs}` : ""}`);
  },
  curated: (sectorId: string, context: "dashboard" | "finance" = "dashboard") =>
    getJSON<PolicyDocumentsCuratedResponse>(
      `/api/v1/documents/curated?sectorId=${encodeURIComponent(sectorId)}&context=${context}`,
    ),
  passageCorpusMeta: () =>
    getJSON<PolicyPassageCorpusMetaResponse>("/api/v1/documents/passage-corpus/meta"),
  getCatalogDocument: (catalogId: string) =>
    getJSON<PolicyCatalogDocumentResponse>(
      `/api/v1/documents/catalog/${encodeURIComponent(catalogId)}`,
    ),
  getPassageDocument: (cprDocumentId: string) =>
    getJSON<PolicyPassageDocument>(
      `/api/v1/documents/${encodeURIComponent(cprDocumentId)}`,
    ),
  listPassages: (
    cprDocumentId: string,
    params?: { q?: string; topicId?: string; limit?: number; offset?: number },
  ) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set("q", params.q);
    if (params?.topicId) sp.set("topicId", params.topicId);
    if (params?.limit != null) sp.set("limit", String(params.limit));
    if (params?.offset != null) sp.set("offset", String(params.offset));
    const qs = sp.toString();
    return getJSON<PolicyPassagesListResponse>(
      `/api/v1/documents/${encodeURIComponent(cprDocumentId)}/passages${qs ? `?${qs}` : ""}`,
    );
  },
  listTopics: (documentId?: string) => {
    const qs = documentId ? `?documentId=${encodeURIComponent(documentId)}` : "";
    return getJSON<PolicyTopicsResponse>(`/api/v1/documents/topics${qs}`);
  },
  searchPassages: (params?: { q?: string; topicId?: string; limit?: number; offset?: number }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set("q", params.q);
    if (params?.topicId) sp.set("topicId", params.topicId);
    if (params?.limit != null) sp.set("limit", String(params.limit));
    if (params?.offset != null) sp.set("offset", String(params.offset));
    const qs = sp.toString();
    return getJSON<PolicyPassagesSearchResponse>(
      `/api/v1/documents/passages/search${qs ? `?${qs}` : ""}`,
    );
  },
};
