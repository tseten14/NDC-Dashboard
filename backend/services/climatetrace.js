/**
 * The direct line to the Climate TRACE API.
 *
 * Climate TRACE is an independent monitoring project that estimates greenhouse
 * gas emissions worldwide from satellite imagery and sensor data. It is this
 * app's source of observed emissions — the "what is actually happening" side,
 * as opposed to the "what was promised" side that comes from Uganda's NDC.
 *
 * This module handles the network calls themselves: fetching the national
 * snapshot, the individual emitting sites shown on the map, and the confidence
 * information that says how precisely each site is located. Answers are cached
 * briefly, and failures are reported rather than papered over with stand-in
 * numbers, so the app never silently shows invented data.
 */
import NodeCache from "node-cache";
import {
  CLIMATE_TRACE_BASE_URL,
  CLIMATE_TRACE_DOCS_URL,
  CLIMATE_TRACE_GADM_UGANDA,
  CLIMATE_TRACE_GAS,
  climateTraceUrl,
  fetchLocationEmissions,
  fetchSources,
  fetchUgandaCountryRanking,
  latestInventoryYear,
  toMtco2e,
  SOURCES_MAX_LIMIT,
} from "../../config/climateTrace.js";
import { recordCacheAccess, setRegisteredCacheSize } from "./cacheMetrics.js";
import { logCacheAccess, logger } from "../server/logger.js";

const cache = new NodeCache({ stdTTL: 86400 }); // 24h
const LIVE_CACHE_KEY = "ct:live:UGA:v7";
const LIVE_CACHE_TTL_SEC = 86400;

function liveCacheAgeSeconds() {
  const ttlMs = cache.getTtl(LIVE_CACHE_KEY);
  if (ttlMs == null || ttlMs <= 0) return null;
  return Math.max(0, LIVE_CACHE_TTL_SEC - Math.round(ttlMs / 1000));
}

function refreshLiveCacheSize() {
  setRegisteredCacheSize(cache.keys().length);
}

/**
 * Latest-year Uganda snapshot from Climate TRACE v7 rankings + national aggregate.
 */
export async function fetchLiveUgandaSnapshot() {
  const cached = cache.get(LIVE_CACHE_KEY);
  if (cached) {
    recordCacheAccess({ hit: true });
    logCacheAccess({ key: LIVE_CACHE_KEY, hit: true, age_seconds: liveCacheAgeSeconds() });
    refreshLiveCacheSize();
    return { ...cached, from_cache: true };
  }

  recordCacheAccess({ hit: false });
  logCacheAccess({ key: LIVE_CACHE_KEY, hit: false, age_seconds: null });

  try {
    const year = latestInventoryYear();
    const ranking = await fetchUgandaCountryRanking(year);

    let previousRank = null;
    let yoyChangeMt = null;
    try {
      const prev = await fetchUgandaCountryRanking(year - 1);
      previousRank = prev.rank ?? null;
      if (ranking.emissionsQuantity != null && prev.emissionsQuantity != null) {
        yoyChangeMt = toMtco2e(ranking.emissionsQuantity - prev.emissionsQuantity);
      }
    } catch {
      // prior year may be unavailable for some builds
    }

    const result = {
      api_version: "v7",
      inventory_year: year,
      co2e_mtco2e: toMtco2e(ranking.emissionsQuantity),
      rank: ranking.rank ?? null,
      previous_rank: previousRank,
      yoy_change_mtco2e: yoyChangeMt,
      yoy_change_pct: ranking.emissionsPercentChange ?? null,
      emissions_per_capita: ranking.emissionsPerCapita ?? null,
      stale: false,
      fetched_at: new Date().toISOString(),
    };

    cache.set(LIVE_CACHE_KEY, result);
    refreshLiveCacheSize();
    return result;
  } catch (err) {
    logger.error({ err, event: "climatetrace_live_failed" }, err.message);
    const stale = cache.get(LIVE_CACHE_KEY);
    if (stale) return { ...stale, stale: true, error: err.message };
    return {
      api_version: "v7",
      co2e_mtco2e: null,
      rank: null,
      previous_rank: null,
      yoy_change_mtco2e: null,
      stale: true,
      error: err.message,
    };
  }
}

/**
 * Cached asset/source-level emissions for a location (1h TTL).
 * Defaults to the latest inventory year when year is not provided.
 */
export async function getSources({ gadmId = CLIMATE_TRACE_GADM_UGANDA, year, subsectors = "", limit = 50, offset = 0 } = {}) {
  const effectiveYear = year ?? latestInventoryYear();
  const key = `ct:sources:${gadmId}:${effectiveYear}:${subsectors}:${limit}:${offset}`;
  const cached = cache.get(key);
  if (cached) {
    recordCacheAccess({ hit: true });
    logCacheAccess({ key, hit: true, age_seconds: null });
    refreshLiveCacheSize();
    return { ...cached, from_cache: true };
  }

  recordCacheAccess({ hit: false });
  logCacheAccess({ key, hit: false, age_seconds: null });

  const result = await fetchSources({ gadmId, year: effectiveYear, subsectors, limit, offset });
  cache.set(key, result, 3600);
  refreshLiveCacheSize();
  return { ...result, from_cache: false };
}

/** Page cap when summing located sources (protects against very large national sets). */
const SPATIAL_MAX_ROWS = 2000;

/**
 * Spatial-certainty breakdown for a location/year.
 *
 * Compares the COMPLETE aggregate emissions (which include the country's
 * spatially-uncertain emissions distributed here via proxies) against the sum
 * of LOCATED sources (assets + mapped forestry/buildings/agriculture/roads).
 * The difference is the proxy-distributed remainder (SUEs) — emissions assigned
 * to this area statistically rather than observed at a known source. Surfacing
 * this lets users judge how spatially reliable a district figure is.
 *
 * Cheap for a district (few source rows); national sets are capped + flagged.
 */
export async function getSpatialConfidence({ gadmId = CLIMATE_TRACE_GADM_UGANDA, year } = {}) {
  const effectiveYear = year ?? latestInventoryYear();
  const key = `ct:spatial:${gadmId}:${effectiveYear}`;
  const cached = cache.get(key);
  if (cached) {
    recordCacheAccess({ hit: true });
    logCacheAccess({ key, hit: true, age_seconds: null });
    refreshLiveCacheSize();
    return { ...cached, from_cache: true };
  }
  recordCacheAccess({ hit: false });
  logCacheAccess({ key, hit: false, age_seconds: null });

  const agg = await fetchLocationEmissions(effectiveYear, gadmId);
  const aggregateTonnes = agg.total_tonnes ?? 0;

  const PAGE = SOURCES_MAX_LIMIT;
  let offset = 0;
  let locatedTonnes = 0;
  let assetCount = 0;
  let aggregationCount = 0;
  let truncated = false;
  const locatedBySector = {};
  for (;;) {
    const { sources } = await fetchSources({ gadmId, year: effectiveYear, limit: PAGE, offset });
    for (const s of sources) {
      const t = s.emissions_tco2e ?? 0;
      locatedTonnes += t;
      const sec = s.sector ?? "unknown";
      locatedBySector[sec] = (locatedBySector[sec] ?? 0) + t;
      if (s.is_asset) assetCount += 1;
      else aggregationCount += 1;
    }
    offset += PAGE;
    if (sources.length < PAGE) break;
    if (offset >= SPATIAL_MAX_ROWS) {
      truncated = true;
      break;
    }
  }

  const certainTonnes = aggregateTonnes > 0 ? Math.min(locatedTonnes, aggregateTonnes) : locatedTonnes;
  const uncertainTonnes = Math.max(0, aggregateTonnes - certainTonnes);
  const certainPct = aggregateTonnes > 0 ? +((certainTonnes / aggregateTonnes) * 100).toFixed(1) : null;

  const sectorKeys = new Set([...Object.keys(agg.by_sector), ...Object.keys(locatedBySector)]);
  const sectors = [...sectorKeys]
    .map((sec) => {
      const total = agg.by_sector[sec] ?? 0;
      const located = Math.min(locatedBySector[sec] ?? 0, total > 0 ? total : Infinity);
      return {
        sector: sec,
        total_mtco2e: toMtco2e(total),
        located_mtco2e: toMtco2e(located),
        distributed_mtco2e: toMtco2e(Math.max(0, total - located)),
        certain_pct: total > 0 ? +((located / total) * 100).toFixed(1) : null,
      };
    })
    .filter((s) => (s.total_mtco2e ?? 0) > 0)
    .sort((a, b) => (b.total_mtco2e ?? 0) - (a.total_mtco2e ?? 0));

  const result = {
    gadm_id: gadmId,
    year: effectiveYear,
    aggregate_mtco2e: toMtco2e(aggregateTonnes),
    located_mtco2e: toMtco2e(certainTonnes),
    distributed_mtco2e: toMtco2e(uncertainTonnes),
    certain_pct: certainPct,
    uncertain_pct: certainPct != null ? +(100 - certainPct).toFixed(1) : null,
    located_source_count: assetCount,
    located_aggregation_count: aggregationCount,
    truncated,
    sectors,
  };
  cache.set(key, result, 3600);
  refreshLiveCacheSize();
  return { ...result, from_cache: false };
}

/** Page cap when collecting geolocated sources for the map. */
const MAP_MAX_ROWS = 3000;

/**
 * Collect geolocated emission sources for the GIS map. Paginates the /sources
 * endpoint (asset-level + GADM aggregations), keeps only rows with a centroid,
 * and returns lean rows ready to plot. Also returns per-sector totals and the
 * total emissions across returned rows. Cached for an hour.
 */
export async function getEmissionSourcesForMap({ gadmId = CLIMATE_TRACE_GADM_UGANDA, year } = {}) {
  const effectiveYear = year ?? latestInventoryYear();
  const key = `ct:map:${gadmId}:${effectiveYear}`;
  const cached = cache.get(key);
  if (cached) {
    recordCacheAccess({ hit: true });
    logCacheAccess({ key, hit: true, age_seconds: null });
    refreshLiveCacheSize();
    return { ...cached, from_cache: true };
  }
  recordCacheAccess({ hit: false });
  logCacheAccess({ key, hit: false, age_seconds: null });

  const PAGE = SOURCES_MAX_LIMIT;
  let offset = 0;
  let truncated = false;
  const points = [];
  const bySector = {};
  for (;;) {
    const { sources } = await fetchSources({ gadmId, year: effectiveYear, limit: PAGE, offset });
    for (const s of sources) {
      const lat = s.centroid?.lat;
      const lng = s.centroid?.lng;
      if (lat == null || lng == null) continue;
      const t = s.emissions_tco2e ?? 0;
      const sec = s.sector ?? "unknown";
      bySector[sec] = (bySector[sec] ?? 0) + t;
      points.push({
        id: s.id,
        name: s.name,
        sector: sec,
        subsector: s.subsector,
        is_asset: Boolean(s.is_asset),
        lat,
        lng,
        mtco2e: toMtco2e(t),
      });
    }
    offset += PAGE;
    if (sources.length < PAGE) break;
    if (offset >= MAP_MAX_ROWS) {
      truncated = true;
      break;
    }
  }

  const sectors = Object.entries(bySector)
    .map(([sector, t]) => ({ sector, mtco2e: toMtco2e(t) }))
    .sort((a, b) => (b.mtco2e ?? 0) - (a.mtco2e ?? 0));
  const totalMtco2e = sectors.reduce((sum, s) => sum + (s.mtco2e ?? 0), 0);

  const result = {
    gadm_id: gadmId,
    year: effectiveYear,
    point_count: points.length,
    asset_count: points.filter((p) => p.is_asset).length,
    total_mtco2e: +totalMtco2e.toFixed(4),
    truncated,
    sectors,
    points,
  };
  cache.set(key, result, 3600);
  refreshLiveCacheSize();
  return { ...result, from_cache: false };
}

export async function checkApiHealth() {
  const start = Date.now();
  const year = latestInventoryYear();
  try {
    const url = climateTraceUrl("/sources/emissions", {
      year,
      gas: CLIMATE_TRACE_GAS,
      gadmId: CLIMATE_TRACE_GADM_UGANDA,
    });
    const res = await fetch(url);
    return {
      status: res.ok ? "ok" : "degraded",
      api_version: "v7",
      docs_url: CLIMATE_TRACE_DOCS_URL,
      latency_ms: Date.now() - start,
      http_status: res.status,
      last_checked: new Date().toISOString(),
    };
  } catch (err) {
    return {
      status: "down",
      api_version: "v7",
      docs_url: CLIMATE_TRACE_DOCS_URL,
      latency_ms: Date.now() - start,
      error: err.message,
      last_checked: new Date().toISOString(),
    };
  }
}

export { CLIMATE_TRACE_BASE_URL, CLIMATE_TRACE_DOCS_URL };
