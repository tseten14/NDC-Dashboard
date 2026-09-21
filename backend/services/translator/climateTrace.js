import NodeCache from "node-cache";
import { climateTraceUrl, fetchUpstream, CLIMATE_TRACE_API_VERSION, CLIMATE_TRACE_GAS, CLIMATE_TRACE_DOCS_URL } from "../../../config/climateTrace.js";
import { climateTraceSourcesResponseSchema } from "../../../shared/schemas/climateTrace.schema.js";

export const TRACE_RELEASE = {
  version: "5.10.0",
  published_at: "2026-08-27",
  data_through: "2026-06",
  verified_at: "2026-09-20",
  url: "https://climatetrace.org/data",
};
export const TRANSLATOR_YEARS = Array.from({ length: Number(TRACE_RELEASE.data_through.slice(0, 4)) - 2020 }, (_, index) => 2021 + index);
export const DEFAULT_TRANSLATOR_YEAR = 2025;
export const TRACE_PROVIDER = {
  id: "climate-trace",
  name: "Climate TRACE",
  spatial_method: "point_filter",
  metric: "emissions",
  units: "MtCO2e",
  gas: CLIMATE_TRACE_GAS,
  api_version: CLIMATE_TRACE_API_VERSION,
  api_url: CLIMATE_TRACE_DOCS_URL,
  published_release: TRACE_RELEASE,
  api_dataset_release: null,
  license: "CC BY 4.0 (source-specific exceptions may apply)",
  license_url: "https://climatetrace.org/terms",
};

const cache = new NodeCache({ stdTTL: 3600, useClones: false });
const pending = new Map();
const PAGE_SIZE = 5000;
const MAX_ROWS = 50_000;

export function sumValues(values) {
  let total = 0;
  let compensation = 0;
  for (const value of values) {
    const adjusted = value - compensation;
    const next = total + adjusted;
    compensation = (next - total) - adjusted;
    total = next;
  }
  return total;
}

export async function collectTraceSources(year, fetchPage = async (offset) => {
  const payload = await fetchUpstream(climateTraceUrl("/sources", { year, gas: CLIMATE_TRACE_GAS, gadmId: "UGA", limit: PAGE_SIZE, offset }), "translator sources");
  return climateTraceSourcesResponseSchema.parse(payload);
}, pageSize = PAGE_SIZE) {
  const seen = new Map();
  const points = [];
  const coverage = { fetched_rows: 0, duplicate_rows: 0, missing_coordinates: 0, missing_emissions: 0, complete_pagination: false };
  for (let offset = 0; offset < MAX_ROWS;) {
    const rows = await fetchPage(offset);
    if (!Array.isArray(rows)) throw new Error("Climate TRACE returned an invalid source page");
    let added = 0;
    for (const row of rows) {
      coverage.fetched_rows++;
      if (Number(row.year) !== year || row.gas !== CLIMATE_TRACE_GAS || row.country !== "UGA") throw new Error("Climate TRACE returned a different year, gas, or country");
      if (row.id == null) throw new Error("Climate TRACE source identifier is missing");
      const key = `${row.id}:${row.subsector ?? ""}:${year}:${CLIMATE_TRACE_GAS}`;
      const signature = JSON.stringify([row.emissionsQuantity, row.centroid, row.sector, row.sourceType]);
      if (seen.has(key)) {
        if (seen.get(key) !== signature) throw new Error("Climate TRACE changed during pagination; retry the analysis");
        coverage.duplicate_rows++;
        continue;
      }
      seen.set(key, signature);
      added++;
      const latitude = row.centroid?.latitude;
      const longitude = row.centroid?.longitude;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
        coverage.missing_coordinates++;
        continue;
      }
      const tonnes = row.emissionsQuantity;
      if (tonnes == null) coverage.missing_emissions++;
      else if (!Number.isFinite(tonnes)) throw new Error("Climate TRACE returned invalid emissions");
      const kind = row.sourceType === "gadm-aggregation" ? "administrative" : row.sourceType ? "asset" : "unknown";
      points.push({ id: row.id, key, name: row.name ?? null, sector: row.sector ?? "unknown", subsector: row.subsector ?? null,
        source_type: row.sourceType ?? null, source_kind: kind, is_asset: kind === "asset", lat: latitude, lng: longitude,
        emissions_tco2e: tonnes ?? null, mtco2e: tonnes == null ? null : tonnes / 1_000_000,
        source_url: climateTraceUrl(`/sources/${encodeURIComponent(row.id)}`, { start: year, end: year, gas: CLIMATE_TRACE_GAS }) });
    }
    if (rows.length < pageSize) { coverage.complete_pagination = true; break; }
    if (!added) throw new Error("Climate TRACE pagination made no progress");
    offset += rows.length;
  }
  if (!coverage.complete_pagination) throw new Error("Climate TRACE source safety limit reached; no incomplete total was calculated");
  if (!seen.size) throw new Error("Climate TRACE has no Uganda dataset available for this year");
  return { year, points, coverage, retrieved_at: new Date().toISOString(), period: { year, complete_year: year < Number(TRACE_RELEASE.data_through.slice(0, 4)), label: year < Number(TRACE_RELEASE.data_through.slice(0, 4)) ? String(year) : `${year} partial year` } };
}

export async function getTranslatorSources(year) {
  if (!TRANSLATOR_YEARS.includes(year)) throw new Error("unsupported_year");
  const key = `${CLIMATE_TRACE_API_VERSION}:${TRACE_RELEASE.version}:${year}`;
  if (cache.has(key)) return cache.get(key);
  if (pending.has(key)) return pending.get(key);
  const request = collectTraceSources(year).then((result) => { cache.set(key, result); return result; }).finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}
