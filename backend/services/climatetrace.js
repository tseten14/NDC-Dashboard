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
  CLIMATE_TRACE_API_VERSION,
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
const LIVE_CACHE_KEY = `ct:live:UGA:${CLIMATE_TRACE_API_VERSION}`;
const LIVE_CACHE_TTL_SEC = 3600;

function liveCacheAgeSeconds(key) {
  const ttlMs = cache.getTtl(key);
  if (ttlMs == null || ttlMs <= 0) return null;
  return Math.max(0, LIVE_CACHE_TTL_SEC - Math.round((ttlMs - Date.now()) / 1000));
}

function refreshLiveCacheSize() {
  setRegisteredCacheSize(cache.keys().length);
}

/**
 * Latest-year Uganda snapshot from Climate TRACE v7 rankings + national aggregate.
 */
export async function fetchLiveUgandaSnapshot(year = latestInventoryYear()) {
  const key = `${LIVE_CACHE_KEY}:${year}`;
  const cached = cache.get(key);
  if (cached) {
    recordCacheAccess({ hit: true });
    logCacheAccess({ key, hit: true, age_seconds: liveCacheAgeSeconds(key) });
    refreshLiveCacheSize();
    return { ...cached, from_cache: true };
  }

  recordCacheAccess({ hit: false });
  logCacheAccess({ key, hit: false, age_seconds: null });

  try {
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
      api_version: CLIMATE_TRACE_API_VERSION,
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

    cache.set(key, result, LIVE_CACHE_TTL_SEC);
    refreshLiveCacheSize();
    return result;
  } catch (err) {
    logger.error({ err, event: "climatetrace_live_failed" }, err.message);
    const stale = cache.get(key);
    const safeError = "Climate TRACE data is temporarily unavailable.";
    if (stale) return { ...stale, stale: true, error: safeError };
    return {
      api_version: CLIMATE_TRACE_API_VERSION,
      co2e_mtco2e: null,
      rank: null,
      previous_rank: null,
      yoy_change_mtco2e: null,
      stale: true,
      error: safeError,
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

/** Fetch a complete source list or fail; a capped, descending list omits removals. */
export async function collectLocationSources(gadmId, year, load = fetchSources) {
  const seen = new Map();
  for (let offset = 0; offset < 50_000; offset += SOURCES_MAX_LIMIT) {
    const { sources } = await load({ gadmId, year, limit: SOURCES_MAX_LIMIT, offset });
    let added = 0;
    for (const source of sources) {
      const key = `${source.id}:${source.subsector ?? ""}`;
      const signature = JSON.stringify(source);
      if (seen.has(key)) {
        if (seen.get(key).signature !== signature) throw new Error("Climate TRACE changed during pagination; retry");
      } else {
        seen.set(key, { source, signature });
        added++;
      }
    }
    if (sources.length < SOURCES_MAX_LIMIT) return [...seen.values()].map(({ source }) => source);
    if (!added) throw new Error("Climate TRACE pagination made no progress");
  }
  throw new Error("Climate TRACE source safety limit reached; no incomplete total was calculated");
}

function hasCoordinates(source) {
  return Number.isFinite(source.centroid?.lat) && Math.abs(source.centroid.lat) <= 90
    && Number.isFinite(source.centroid?.lng) && Math.abs(source.centroid.lng) <= 180;
}

function completeSum(sources) {
  if (sources.some((source) => source.emissions_tco2e == null)) return null;
  return sources.reduce((sum, source) => sum + source.emissions_tco2e, 0);
}

/**
 * Source coverage comparison for a location/year. The aggregate-minus-source
 * difference cannot establish spatial certainty. Preserve signed net emissions
 * and unavailable values, and fetch the full list before calculating a total.
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
  const aggregateTonnes = agg.total_tonnes;
  const sources = await collectLocationSources(gadmId, effectiveYear);
  const located = sources.filter(hasCoordinates);
  const locatedTonnes = completeSum(located);
  const locatedBySector = Object.groupBy(located, (source) => source.sector ?? "unknown");

  const sectorKeys = new Set([...Object.keys(agg.by_sector), ...Object.keys(locatedBySector)]);
  const sectors = [...sectorKeys]
    .map((sec) => {
      const total = agg.by_sector[sec] ?? null;
      const subtotal = completeSum(locatedBySector[sec] ?? []);
      return {
        sector: sec,
        total_mtco2e: toMtco2e(total),
        located_mtco2e: toMtco2e(subtotal),
        difference_mtco2e: total == null || subtotal == null ? null : toMtco2e(total - subtotal),
        distributed_mtco2e: null,
        certain_pct: null,
      };
    })
    .sort((a, b) => (b.total_mtco2e ?? 0) - (a.total_mtco2e ?? 0));

  const result = {
    gadm_id: gadmId,
    year: effectiveYear,
    aggregate_mtco2e: toMtco2e(aggregateTonnes),
    located_mtco2e: toMtco2e(locatedTonnes),
    difference_mtco2e: aggregateTonnes == null || locatedTonnes == null ? null : toMtco2e(aggregateTonnes - locatedTonnes),
    // The difference is not an API measurement of spatial certainty or proxy allocation.
    distributed_mtco2e: null,
    certain_pct: null,
    uncertain_pct: null,
    located_source_count: located.filter((source) => source.is_asset).length,
    located_aggregation_count: located.filter((source) => source.source_type === "gadm-aggregation").length,
    missing_coordinates: sources.length - located.length,
    missing_emissions: located.filter((source) => source.emissions_tco2e == null).length,
    truncated: false,
    sectors,
  };
  cache.set(key, result, 3600);
  refreshLiveCacheSize();
  return { ...result, from_cache: false };
}

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

  const sources = await collectLocationSources(gadmId, effectiveYear);
  const located = sources.filter(hasCoordinates);
  const points = [];
  const bySector = {};
    for (const s of located) {
      const lat = s.centroid?.lat;
      const lng = s.centroid?.lng;
      if (lat == null || lng == null) continue;
      const t = s.emissions_tco2e;
      const sec = s.sector ?? "unknown";
      if (t == null || bySector[sec] === null) bySector[sec] = null;
      else bySector[sec] = (bySector[sec] ?? 0) + t;
      points.push({
        id: s.id,
        name: s.name,
        sector: sec,
        subsector: s.subsector,
        is_asset: Boolean(s.is_asset),
        lat,
        lng,
        mtco2e: t == null ? null : t / 1_000_000,
      });
    }

  const sectors = Object.entries(bySector)
    .map(([sector, t]) => ({ sector, mtco2e: toMtco2e(t) }))
    .sort((a, b) => (b.mtco2e ?? 0) - (a.mtco2e ?? 0));

  const result = {
    gadm_id: gadmId,
    year: effectiveYear,
    point_count: points.length,
    asset_count: points.filter((p) => p.is_asset).length,
    total_mtco2e: toMtco2e(completeSum(located)),
    missing_coordinates: sources.length - located.length,
    missing_emissions: located.filter((source) => source.emissions_tco2e == null).length,
    truncated: false,
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
    // A health probe must never be the thing that hangs. Without a deadline
    // this endpoint would sit open for as long as the upstream kept the socket,
    // which is the opposite of what a health check is for.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    let res;
    try {
      res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    return {
      status: res.ok ? "ok" : "degraded",
      api_version: CLIMATE_TRACE_API_VERSION,
      docs_url: CLIMATE_TRACE_DOCS_URL,
      latency_ms: Date.now() - start,
      http_status: res.status,
      last_checked: new Date().toISOString(),
    };
  } catch (err) {
    return {
      status: "down",
      api_version: CLIMATE_TRACE_API_VERSION,
      docs_url: CLIMATE_TRACE_DOCS_URL,
      latency_ms: Date.now() - start,
      // Deliberately no error text: this response is public, and the upstream
      // message embeds the internal request URL.
      last_checked: new Date().toISOString(),
    };
  }
}

export { CLIMATE_TRACE_BASE_URL, CLIMATE_TRACE_DOCS_URL };
