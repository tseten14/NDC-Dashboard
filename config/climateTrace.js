/**
 * Climate TRACE HTTP API (v7).
 * Docs: https://api.climatetrace.org/v7/docs/index.html
 */

import {
  climateTraceEmissionsResponseSchema,
  climateTraceRankingsResponseSchema,
  climateTraceSourcesResponseSchema,
} from "../shared/schemas/climateTrace.schema.js";
import { safeParseOrLog } from "../shared/validate.js";

export const CLIMATE_TRACE_API_VERSION = "v7";
export const CLIMATE_TRACE_BASE_URL = `https://api.climatetrace.org/${CLIMATE_TRACE_API_VERSION}`;
export const CLIMATE_TRACE_DOCS_URL = `${CLIMATE_TRACE_BASE_URL}/docs/index.html`;
export const CLIMATE_TRACE_GADM_UGANDA = "UGA";
export const CLIMATE_TRACE_GAS = "co2e_100yr";
export const CLIMATE_TRACE_SOURCE_TAG = "climatetrace_api_v7";

/** Country-level annual totals in v7 sources/emissions (GADM0). */
export const INVENTORY_YEAR_MIN = 2015;

/** Latest complete inventory year (current calendar year may be incomplete). */
export function latestInventoryYear() {
  const y = new Date().getFullYear();
  // Cap at 2025: CT v7 March 2026 dataset confirmed through 2025.
  return Math.min(2025, Math.max(INVENTORY_YEAR_MIN, y >= 2026 ? y - 1 : y));
}

export function defaultInventoryRange() {
  const to = latestInventoryYear();
  return { since: INVENTORY_YEAR_MIN, to };
}

/** v7 aggregate emissions are reported in tonnes (co2e_100yr). */
export function toMtco2e(tonnes) {
  if (tonnes == null || Number.isNaN(Number(tonnes))) return null;
  return +(+tonnes / 1_000_000).toFixed(2);
}

export function climateTraceUrl(path, params = {}) {
  const base = path.startsWith("http") ? path : `${CLIMATE_TRACE_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/**
 * Annual national (or gadm) total for one Climate TRACE sector slug.
 * GET /v7/sources/emissions
 */
export async function fetchSectorEmissionsForYear(year, sectorSlug, gadmId = CLIMATE_TRACE_GADM_UGANDA) {
  const url = climateTraceUrl("/sources/emissions", {
    year,
    gas: CLIMATE_TRACE_GAS,
    gadmId,
    sectors: sectorSlug,
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Climate TRACE API error: ${res.status} (${url})`);
  const data = await res.json();
  const parsed = safeParseOrLog(climateTraceEmissionsResponseSchema, data, "climateTrace.emissions");
  if (!parsed.ok) {
    throw new Error("Climate TRACE emissions response failed schema validation");
  }
  const summary =
    parsed.data?.totals?.summaries?.find((s) => s.gas === CLIMATE_TRACE_GAS) ??
    parsed.data?.totals?.summaries?.[0];
  const tonnes = summary?.emissionsQuantity;
  if (tonnes == null) return null;
  return { year, tonnes, mtco2e: toMtco2e(tonnes), location: parsed.data?.location ?? null };
}

/**
 * Full aggregate emissions for a location and year, including the per-sector
 * breakdown. GET /v7/sources/emissions returns the COMPLETE aggregate product:
 * spatially-certain (located asset/area) emissions PLUS the country's
 * spatially-uncertain emissions (SUEs) distributed to this admin area via
 * proxies (population, nightlights, land use). At GADM0 this equals the "best"
 * country estimate (matches /rankings); at GADM1/2 the SUEs are proxy-allocated.
 * See Climate TRACE "Disaggregation of Spatially Uncertain Emissions".
 */
export async function fetchLocationEmissions(year, gadmId = CLIMATE_TRACE_GADM_UGANDA) {
  const url = climateTraceUrl("/sources/emissions", { year, gas: CLIMATE_TRACE_GAS, gadmId });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Climate TRACE API error: ${res.status} (${url})`);
  const data = await res.json();
  const parsed = safeParseOrLog(climateTraceEmissionsResponseSchema, data, "climateTrace.emissions");
  if (!parsed.ok) throw new Error("Climate TRACE emissions response failed schema validation");

  const totalSummary =
    parsed.data?.totals?.summaries?.find((s) => s.gas === CLIMATE_TRACE_GAS) ??
    parsed.data?.totals?.summaries?.[0];
  const bySector = {};
  for (const s of parsed.data?.sectors?.summaries ?? []) {
    if (s.gas != null && s.gas !== CLIMATE_TRACE_GAS) continue;
    if (s.sector == null) continue;
    bySector[s.sector] = (bySector[s.sector] ?? 0) + (s.emissionsQuantity ?? 0);
  }
  return {
    year,
    gadm_id: gadmId,
    total_tonnes: totalSummary?.emissionsQuantity ?? null,
    by_sector: bySector,
  };
}

/** Maximum sources requested per page from the Climate TRACE sources endpoint. */
export const SOURCES_MAX_LIMIT = 200;

/**
 * Asset / source-level emissions rows for a location and year.
 * GET /v7/sources (returns a flat array sorted by emissionsQuantity desc).
 * Mixes individual assets (e.g. power stations) and GADM aggregations
 * (forestry, buildings, agriculture, roads). Supports limit/offset pagination.
 */
export async function fetchSources({
  year = latestInventoryYear(),
  gadmId = CLIMATE_TRACE_GADM_UGANDA,
  subsectors = "",
  limit = 50,
  offset = 0,
} = {}) {
  const safeLimit = Math.min(Math.max(1, Number(limit) || 50), SOURCES_MAX_LIMIT);
  const safeOffset = Math.max(0, Number(offset) || 0);
  const url = climateTraceUrl("/sources", {
    year,
    gas: CLIMATE_TRACE_GAS,
    gadmId,
    subsectors,
    limit: safeLimit,
    offset: safeOffset,
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Climate TRACE sources error: ${res.status} (${url})`);
  const data = await res.json();
  const parsed = safeParseOrLog(climateTraceSourcesResponseSchema, data, "climateTrace.sources");
  if (!parsed.ok) {
    throw new Error("Climate TRACE sources response failed schema validation");
  }
  const sources = parsed.data.map((s) => ({
    id: s.id ?? null,
    name: s.name ?? null,
    sector: s.sector ?? null,
    subsector: s.subsector ?? null,
    source_type: s.sourceType ?? null,
    asset_type: s.assetType || null,
    is_asset: s.sourceType != null && s.sourceType !== "gadm-aggregation",
    centroid: s.centroid
      ? { lat: s.centroid.latitude ?? null, lng: s.centroid.longitude ?? null }
      : null,
    emissions_tco2e: s.emissionsQuantity ?? null,
    emissions_mtco2e: toMtco2e(s.emissionsQuantity),
    year: s.year ?? year,
  }));
  return { year, gadm_id: gadmId, limit: safeLimit, offset: safeOffset, count: sources.length, sources };
}

/**
 * Uganda row from country rankings for a calendar year.
 * GET /v7/rankings/countries
 */
export async function fetchUgandaCountryRanking(year) {
  const url = climateTraceUrl("/rankings/countries", {
    gas: CLIMATE_TRACE_GAS,
    start: String(year),
    end: String(year),
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Climate TRACE rankings error: ${res.status}`);
  const data = await res.json();
  const parsed = safeParseOrLog(climateTraceRankingsResponseSchema, data, "climateTrace.rankings");
  if (!parsed.ok) {
    throw new Error("Climate TRACE rankings response failed schema validation");
  }
  const uga = parsed.data?.rankings?.find((r) => r.country === CLIMATE_TRACE_GADM_UGANDA);
  if (!uga) throw new Error("Uganda (UGA) not found in rankings response");
  return uga;
}
