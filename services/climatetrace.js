import NodeCache from "node-cache";
import {
  CLIMATE_TRACE_BASE_URL,
  CLIMATE_TRACE_DOCS_URL,
  CLIMATE_TRACE_GADM_UGANDA,
  CLIMATE_TRACE_GAS,
  climateTraceUrl,
  fetchUgandaCountryRanking,
  latestInventoryYear,
  toMtco2e,
} from "../config/climateTrace.js";
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
