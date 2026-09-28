/** Annual Climate TRACE snapshots: one response supplies totals and every sector.
 * Missing years/sectors stay null. Never substitute estimates from another year.
 */
import NodeCache from "node-cache";
import { SECTOR_MAP, ALL_TRACE_SLUGS } from "../../config/ndcTargets.js";
import { fetchLocationEmissions, latestInventoryYear, INVENTORY_YEAR_MIN } from "../../config/climateTrace.js";
import { UGANDA_NATIONAL_GADM, SUBNATIONAL_INVENTORY_YEAR_MIN } from "../../config/ugandaDistrictGadm.js";
import { recordCacheAccess, setRegisteredCacheSize } from "./cacheMetrics.js";
import { logSlugFetch } from "../server/logger.js";
import { roundMtco2e } from "../../shared/emissionsUnits.js";

const snapshots = new NodeCache({ stdTTL: 3600 });
const pending = new Map();
const waiting = [];
let active = 0;

// The public API asks callers to keep request volume low. Bound concurrency
// across all users and share in-flight requests for the same geography/year.
async function withSlot(fn) {
  if (active >= 4) await new Promise((resolve) => waiting.push(resolve));
  else active++;
  try { return await fn(); }
  finally {
    const next = waiting.shift();
    if (next) next();
    else active--;
  }
}

function minYear(gadmId) {
  return gadmId === UGANDA_NATIONAL_GADM ? INVENTORY_YEAR_MIN : SUBNATIONAL_INVENTORY_YEAR_MIN;
}

async function snapshot(year, gadmId) {
  const key = `${gadmId}:${year}`;
  const cached = snapshots.get(key);
  recordCacheAccess({ hit: cached !== undefined });
  if (cached !== undefined) return cached;
  if (pending.has(key)) return pending.get(key);
  const promise = withSlot(async () => {
    const started = Date.now();
    try {
      const row = await fetchLocationEmissions(year, gadmId);
      snapshots.set(key, row, row.total_tonnes == null || ALL_TRACE_SLUGS.some((slug) => row.by_sector[slug] == null) ? 60 : 3600);
      logSlugFetch({ slug: "__ALL__", year, gadm_id: gadmId, status: "success", duration_ms: Date.now() - started });
      return row;
    } catch (error) {
      // Short failure cache prevents upstream retry storms; never cache a
      // derived sector series for longer than its missing source snapshot.
      snapshots.set(key, null, 60);
      logSlugFetch({ slug: "__ALL__", year, gadm_id: gadmId, status: "failure", duration_ms: Date.now() - started, error: error.message });
      return null;
    } finally {
      setRegisteredCacheSize(snapshots.keys().length);
    }
  }).finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}

export async function warmSlugYears(since, to, gadmId = UGANDA_NATIONAL_GADM) {
  const years = [];
  for (let year = Math.max(since, minYear(gadmId)); year <= Math.min(to, latestInventoryYear()); year++) years.push(year);
  await Promise.all(years.map((year) => snapshot(year, gadmId)));
}

export async function getUiSectorTimeseries(sector, since = INVENTORY_YEAR_MIN, to = latestInventoryYear(), gadmId = UGANDA_NATIONAL_GADM) {
  await warmSlugYears(since, to, gadmId);
  const series = [];
  for (let year = Math.max(since, minYear(gadmId)); year <= Math.min(to, latestInventoryYear()); year++) {
    const row = await snapshot(year, gadmId);
    const parts = (SECTOR_MAP[sector] ?? []).map((slug) => row?.by_sector[slug]);
    const value = parts.length && parts.every((part) => part != null)
      ? roundMtco2e(parts.reduce((sum, part) => sum + part, 0) / 1e6) : null;
    series.push({ year, value });
  }
  return series;
}

export async function getLocationTotalMt(year, gadmId = UGANDA_NATIONAL_GADM) {
  const row = await snapshot(year, gadmId);
  return row?.total_tonnes == null ? null : roundMtco2e(row.total_tonnes / 1e6);
}

export async function getLocationTimeseries(since, to, gadmId = UGANDA_NATIONAL_GADM) {
  await warmSlugYears(since, to, gadmId);
  const series = [];
  for (let year = Math.max(since, minYear(gadmId)); year <= Math.min(to, latestInventoryYear()); year++) {
    series.push({ year, value: await getLocationTotalMt(year, gadmId) });
  }
  return series;
}

export async function getSlugBreakdownForYear(year, gadmId = UGANDA_NATIONAL_GADM) {
  const row = await snapshot(year, gadmId);
  // Preserve raw precision until the final sum (rounding each sector first
  // caused reconciliation differences and lost small district emissions).
  const breakdown = Object.fromEntries(ALL_TRACE_SLUGS.map((slug) => [slug, row?.by_sector[slug] == null ? null : row.by_sector[slug] / 1e6]));
  return { year, breakdown, missing_slugs: ALL_TRACE_SLUGS.filter((slug) => breakdown[slug] == null) };
}

export async function getMissingSlugsForSectorYear(sector, year, gadmId = UGANDA_NATIONAL_GADM) {
  const row = await snapshot(year, gadmId);
  return (SECTOR_MAP[sector] ?? []).filter((slug) => row?.by_sector[slug] == null);
}

export function clearClimateTraceCache() {
  snapshots.flushAll();
  setRegisteredCacheSize(0);
}
