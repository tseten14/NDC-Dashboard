/**
 * Tiny client for the Uganda NDC emissions API (Express server in `server.js`).
 * Base URL comes from `VITE_API_BASE_URL` and defaults to localhost:8787.
 */

import type { IndicatorPanelEntry } from "./emissions-integration";

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

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText}: ${body || path}`);
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
  sectors: Partial<Record<NdcSectorKey, SectorSummaryEntry>>;
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
}

export const emissionsApi = {
  dashboard: (since?: number, to?: number) => {
    const q = new URLSearchParams();
    if (since != null) q.set("since", String(since));
    if (to != null) q.set("to", String(to));
    const qs = q.toString();
    return getJSON<EmissionsDashboard>(`/api/v1/emissions/dashboard${qs ? `?${qs}` : ""}`);
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

export const cockpitApi = {
  indicatorPanel: (since = 2015, to = 2024) =>
    getJSON<IndicatorPanelResponse>(`/api/v1/indicators/panel?since=${since}&to=${to}`),
  catalogActivities: () => getJSON<{ activities: CatalogActivityRow[]; data_source: string }>("/api/v1/catalog/activities"),
  catalogMitigationOptions: () =>
    getJSON<{ options: CatalogMitigationRow[]; data_source: string }>("/api/v1/catalog/mitigation-options"),
};
