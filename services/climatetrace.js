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

const cache = new NodeCache({ stdTTL: 86400 }); // 24h

/**
 * Latest-year Uganda snapshot from Climate TRACE v7 rankings + national aggregate.
 */
export async function fetchLiveUgandaSnapshot() {
  const cacheKey = "ct:live:UGA:v7";
  const cached = cache.get(cacheKey);
  if (cached) return { ...cached, from_cache: true };

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

    cache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error("[ClimateTrace v7] Live API failed:", err.message);
    const stale = cache.get(cacheKey);
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
