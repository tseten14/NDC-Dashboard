import NodeCache from "node-cache";
import { CLASSIFICATION_MAPPINGS, classificationMapping } from "../../config/classificationMappings.js";
import {
  CLIMATE_TRACE_API_VERSION, CLIMATE_TRACE_DOCS_URL, CLIMATE_TRACE_GAS,
  CLIMATE_TRACE_GADM_UGANDA, TRACE_RELEASE, fetchSubsectorEmissionsForYear,
  latestInventoryYear,
} from "../../config/climateTrace.js";

const cache = new NodeCache({ stdTTL: 3600 });
const pending = new Map();

export function classificationCatalog() {
  return {
    geography: "UGA",
    unit: "MtCO2e",
    gas: CLIMATE_TRACE_GAS,
    year_min: 2015,
    latest_complete_year: latestInventoryYear(),
    latest_available_year: Number(TRACE_RELEASE.data_through.slice(0, 4)),
    categories: Object.entries(CLASSIFICATION_MAPPINGS).map(([code, mapping]) => ({ code, ...mapping, coverage: "partial" })),
    provenance: {
      source: "Climate TRACE", api_version: CLIMATE_TRACE_API_VERSION,
      api_url: CLIMATE_TRACE_DOCS_URL, published_release: TRACE_RELEASE,
      api_dataset_release: null,
    },
  };
}

export async function getClassificationSeries(code, since, to, load = fetchSubsectorEmissionsForYear) {
  const mapping = classificationMapping(code);
  if (!mapping) throw new Error("unknown_category");
  const years = Array.from({ length: to - since + 1 }, (_, index) => since + index);
  const results = await Promise.allSettled(years.map((year) => load(year, mapping.subsector, CLIMATE_TRACE_GADM_UGANDA)));
  if (results.every((item) => item.status === "rejected")) throw new Error("climate_trace_unavailable");
  return {
    category: { code, ...mapping, coverage: "partial" },
    geography: "UGA", unit: "MtCO2e", gas: CLIMATE_TRACE_GAS, since, to,
    series: results.map((item, index) => {
      const year = years[index];
      const row = item.status === "fulfilled" ? item.value : null;
      return {
        year, value_mtco2e: row?.mtco2e ?? null,
        status: item.status === "rejected" ? "upstream_error" : row == null ? "no_data" : "available",
        complete_year: year <= latestInventoryYear(),
        source_url: row?.source_url ?? null,
      };
    }),
    retrieved_at: new Date().toISOString(),
    provenance: classificationCatalog().provenance,
  };
}

export async function getCachedClassificationSeries(code, since, to) {
  const key = `${CLIMATE_TRACE_API_VERSION}:${TRACE_RELEASE.version}:${code}:${since}:${to}`;
  const cached = cache.get(key);
  if (cached) return cached;
  if (pending.has(key)) return pending.get(key);
  const request = getClassificationSeries(code, since, to)
    .then((result) => { cache.set(key, result); return result; })
    .finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}
