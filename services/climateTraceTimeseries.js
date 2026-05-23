import NodeCache from "node-cache";
import { SECTOR_MAP, ALL_TRACE_SLUGS } from "../config/ndcTargets.js";
import {
  fetchSectorEmissionsForYear,
  latestInventoryYear,
  INVENTORY_YEAR_MIN,
} from "../config/climateTrace.js";

const SLUG_FETCH_RETRIES = 2;
const SLUG_NULL_CACHE_SEC = 300;

/** Per year+slug (1h). Sector series derived from slug cache. */
const slugCache = new NodeCache({ stdTTL: 3600 });
const sectorSeriesCache = new NodeCache({ stdTTL: 3600 });
let warmPromise = null;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchYearSlugMtOnce(year, slug) {
  const row = await fetchSectorEmissionsForYear(year, slug);
  return row?.mtco2e ?? null;
}

async function fetchYearSlugMt(year, slug) {
  const key = `slug:${year}:${slug}`;
  const hit = slugCache.get(key);
  if (hit !== undefined) return hit;

  let lastErr = null;
  for (let attempt = 0; attempt <= SLUG_FETCH_RETRIES; attempt++) {
    try {
      const value = await fetchYearSlugMtOnce(year, slug);
      slugCache.set(key, value);
      return value;
    } catch (err) {
      lastErr = err;
      if (attempt < SLUG_FETCH_RETRIES) {
        await sleep(400 * (attempt + 1));
      }
    }
  }

  console.warn(`[ClimateTrace v7] ${year}/${slug}:`, lastErr?.message ?? "failed");
  slugCache.set(key, null, SLUG_NULL_CACHE_SEC);
  return null;
}

/** Pre-fetch all slug×year pairs needed for dashboard sectors (deduped). */
export async function warmSlugYears(since, to) {
  const cacheKey = `warm:${since}:${to}`;
  if (warmPromise?.key === cacheKey) {
    await warmPromise.promise;
    return;
  }

  const tasks = [];
  for (let y = since; y <= to; y++) {
    const slugsNeeded = new Set(ALL_TRACE_SLUGS);
    for (const slug of slugsNeeded) {
      const k = `slug:${y}:${slug}`;
      if (slugCache.get(k) === undefined) {
        tasks.push(fetchYearSlugMt(y, slug));
      }
    }
  }

  warmPromise = {
    key: cacheKey,
    promise: Promise.all(tasks).then(() => {
      warmPromise = null;
    }),
  };
  await warmPromise.promise;
}

/**
 * Sum slugs for a UI sector — returns null unless every slug has data for that year
 * (avoids under-counting when an upstream call fails).
 */
async function sumSectorYear(sector, year) {
  const slugs = SECTOR_MAP[sector];
  if (!slugs?.length) return null;

  const values = await Promise.all(slugs.map((slug) => fetchYearSlugMt(year, slug)));
  if (values.some((v) => v == null)) return null;
  return +(values.reduce((a, b) => a + b, 0).toFixed(2));
}

/**
 * Timeseries for a dashboard sector; null years when upstream has no value (no interpolation).
 */
export async function getUiSectorTimeseries(sector, since = INVENTORY_YEAR_MIN, to = latestInventoryYear()) {
  const sinceY = Math.max(INVENTORY_YEAR_MIN, since);
  const toY = Math.min(to, latestInventoryYear());
  const cacheKey = `sector:${sector}:${sinceY}:${toY}`;
  const cached = sectorSeriesCache.get(cacheKey);
  if (cached) return cached;

  if (!SECTOR_MAP[sector]?.length) {
    const empty = [];
    for (let y = sinceY; y <= toY; y++) empty.push({ year: y, value: null });
    return empty;
  }

  await warmSlugYears(sinceY, toY);

  const series = [];
  for (let y = sinceY; y <= toY; y++) {
    const value = await sumSectorYear(sector, y);
    series.push({ year: y, value });
  }
  sectorSeriesCache.set(cacheKey, series);
  return series;
}

/** Per-slug MtCO2e for one year (all TRACE slugs including mineral-extraction). */
export async function getSlugBreakdownForYear(year) {
  await warmSlugYears(year, year);
  const breakdown = {};
  const missing = [];
  for (const slug of ALL_TRACE_SLUGS) {
    const mt = await fetchYearSlugMt(year, slug);
    breakdown[slug] = mt;
    if (mt == null) missing.push(slug);
  }
  return { year, breakdown, missing_slugs: missing };
}

/** Which slugs failed for a UI sector in a given year (strict aggregation). */
export async function getMissingSlugsForSectorYear(sector, year) {
  const slugs = SECTOR_MAP[sector];
  if (!slugs?.length) return [];
  const missing = [];
  for (const slug of slugs) {
    const v = await fetchYearSlugMt(year, slug);
    if (v == null) missing.push(slug);
  }
  return missing;
}

export function clearClimateTraceCache() {
  slugCache.flushAll();
  sectorSeriesCache.flushAll();
  warmPromise = null;
}
