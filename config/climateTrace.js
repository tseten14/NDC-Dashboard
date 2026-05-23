/**
 * Climate TRACE HTTP API (v7).
 * Docs: https://api.climatetrace.org/v7/docs/index.html
 */

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
  return Math.max(INVENTORY_YEAR_MIN, y >= 2025 ? y - 1 : y);
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
  const summary =
    data?.totals?.summaries?.find((s) => s.gas === CLIMATE_TRACE_GAS) ??
    data?.totals?.summaries?.[0];
  const tonnes = summary?.emissionsQuantity;
  if (tonnes == null) return null;
  return { year, tonnes, mtco2e: toMtco2e(tonnes), location: data?.location ?? null };
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
  const uga = data?.rankings?.find((r) => r.country === CLIMATE_TRACE_GADM_UGANDA);
  if (!uga) throw new Error("Uganda (UGA) not found in rankings response");
  return uga;
}
