/**
 * Tiny client for the Uganda NDC emissions API (Express server in `server.js`).
 * Base URL comes from `VITE_API_BASE_URL` and defaults to localhost:8787.
 */

import type { IndicatorPanelEntry } from "./emissions-integration";
import type { ZodType } from "zod";
import {
  safeParseOrLog,
  emissionsDashboardSchema,
  indicatorPanelResponseSchema,
  ingestScanReportSchema,
} from "./schemas";

/** Host only in dev; production uses same-origin paths (/api/v1/...). */
export function resolveApiHost(): string {
  const env = import.meta.env.VITE_API_BASE_URL?.trim();
  if (import.meta.env.DEV) {
    return env || "http://localhost:8787";
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

export type NdcSectorKey = "afolu" | "energy" | "ippu" | "agriculture" | "waste";
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
  district_unavailable?: boolean;
  timeseries: TimeseriesPoint[];
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
  methodology?: "ndc_baseline_vs_trace_observed";
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

export const emissionsApi = {
  dashboard: (since?: number, to?: number) => {
    const q = new URLSearchParams();
    if (since != null) q.set("since", String(since));
    if (to != null) q.set("to", String(to));
    const qs = q.toString();
    return getJSONValidated<EmissionsDashboard>(
      `/api/v1/emissions/dashboard${qs ? `?${qs}` : ""}`,
      emissionsDashboardSchema,
      "emissions.dashboard",
    );
  },
  summary: () => getJSON<EmissionsSummary>("/api/v1/emissions/summary"),
  timeseries: (sector: NdcSectorKey, since?: number, to?: number) => {
    const q = new URLSearchParams({ sector });
    if (since != null) q.set("since", String(since));
    if (to != null) q.set("to", String(to));
    return getJSON<TimeseriesResponse>(`/api/v1/emissions/timeseries?${q}`);
  },
  progress: (sector: NdcSectorKey, since?: number, to?: number) => {
    const q = new URLSearchParams({ sector });
    if (since != null) q.set("since", String(since));
    if (to != null) q.set("to", String(to));
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
  preview: Record<string, unknown>[];
  warnings: IngestParseWarning[];
  pdfInsights?: IngestPdfInsights;
}

export interface IngestConfirmPayload {
  jobId: string;
  finalColumnMapping: Partial<Record<ObservationField, string | null>>;
}

export interface IngestConfirmResponse {
  jobId: string;
  status: IngestJobStatus;
  rowsImported: number;
  rowsSkipped: number;
  errors: Array<{ row: number; message: string }>;
  persisted: boolean;
}

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
