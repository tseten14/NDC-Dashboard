import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 86400 }); // 24h

const BASE_URL = "https://api.climatetrace.org/v6";

function toMtco2e(tonnes) {
  if (tonnes == null || Number.isNaN(Number(tonnes))) return null;
  return +(+tonnes / 1_000_000).toFixed(2);
}

/**
 * Latest-year Uganda snapshot from live API (national aggregate, all sectors).
 */
export async function fetchLiveUgandaSnapshot() {
  const cacheKey = "ct:live:UGA";
  const cached = cache.get(cacheKey);
  if (cached) return { ...cached, from_cache: true };

  try {
    const res = await fetch(`${BASE_URL}/country/emissions?countries=UGA`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    const uga = Array.isArray(data) ? data.find((d) => d.country === "UGA") || data[0] : data;

    if (!uga?.emissions?.co2e_100yr) {
      throw new Error("Missing co2e_100yr in response");
    }

    const result = {
      co2e_mtco2e: toMtco2e(uga.emissions.co2e_100yr),
      co2e_20yr_mtco2e: toMtco2e(uga.emissions.co2e_20yr),
      co2_mtco2e: toMtco2e(uga.emissions.co2),
      rank: uga.rank ?? null,
      previous_rank: uga.previousRank ?? null,
      yoy_change_mtco2e: toMtco2e(uga.emissionsChange?.co2e_100yr),
      stale: false,
      fetched_at: new Date().toISOString(),
    };

    cache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error("[ClimateTrace] Live API failed:", err.message);
    const stale = cache.get(cacheKey);
    if (stale) return { ...stale, stale: true, error: err.message };
    return {
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
  try {
    const res = await fetch(`${BASE_URL}/country/emissions?countries=UGA`);
    return {
      status: res.ok ? "ok" : "degraded",
      latency_ms: Date.now() - start,
      http_status: res.status,
      last_checked: new Date().toISOString(),
    };
  } catch (err) {
    return {
      status: "down",
      latency_ms: Date.now() - start,
      error: err.message,
      last_checked: new Date().toISOString(),
    };
  }
}
