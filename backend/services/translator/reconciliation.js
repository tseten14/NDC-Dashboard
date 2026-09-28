import NodeCache from "node-cache";
import { CLIMATE_TRACE_API_VERSION, CLIMATE_TRACE_GAS, TRACE_RELEASE, fetchLocationEmissions, latestInventoryYear } from "../../../config/climateTrace.js";
import { districts, geometryBounds, pointInGeometry, BOUNDARY_PROVENANCE } from "./geometry.js";
import { getTranslatorSources, sumValues } from "./climateTrace.js";

const cache = new NodeCache({ stdTTL: 3600 });
const pending = new Map();
const orderedDistricts = districts.features.slice().sort((a, b) => a.properties.shapeID.localeCompare(b.properties.shapeID))
  .map((feature) => ({ feature, bounds: geometryBounds(feature.geometry) }));

/** Assign each source/subsector record to at most one pinned UBOS district. */
export function rollupDistrictSources(dataset, boundaries = orderedDistricts) {
  if (!dataset.coverage?.complete_pagination) throw new Error("incomplete_source_pages");
  const byId = new Map(boundaries.map(({ feature }) => [feature.properties.shapeID, { id: feature.properties.shapeID, name: feature.properties.shapeName, source_count: 0, missing_emissions_count: 0, known_mtco2e: 0 }]));
  let unmatchedCount = 0;
  let multipleBoundaryCount = 0;
  for (const source of dataset.points) {
    const matches = boundaries.filter(({ feature, bounds }) => source.lng >= bounds[0] && source.lng <= bounds[2] && source.lat >= bounds[1] && source.lat <= bounds[3] && pointInGeometry([source.lng, source.lat], feature.geometry));
    if (!matches.length) { unmatchedCount++; continue; }
    if (matches.length > 1) multipleBoundaryCount++;
    const district = byId.get(matches[0].feature.properties.shapeID);
    district.source_count++;
    if (source.mtco2e == null) district.missing_emissions_count++;
    else district.known_mtco2e += source.mtco2e;
  }
  const rows = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  return {
    districts: rows,
    assigned_source_count: rows.reduce((sum, row) => sum + row.source_count, 0),
    unmatched_source_count: unmatchedCount,
    multiple_boundary_source_count: multipleBoundaryCount,
    missing_emissions_count: rows.reduce((sum, row) => sum + row.missing_emissions_count, 0),
    mapped_district_rollup_mtco2e: sumValues(rows.map((row) => row.known_mtco2e)),
  };
}

export async function getTranslatorReconciliation(year, loadSources = getTranslatorSources, loadNational = fetchLocationEmissions) {
  if (!Number.isInteger(year) || year < 2021 || year > latestInventoryYear()) throw new Error("unsupported_complete_year");
  const [dataset, national] = await Promise.all([loadSources(year), loadNational(year)]);
  if (national.total_tonnes == null || !Number.isFinite(national.total_tonnes)) throw new Error("national_aggregate_unavailable");
  const mapped = rollupDistrictSources(dataset);
  const nationalTotal = national.total_tonnes / 1_000_000;
  return {
    year, gas: CLIMATE_TRACE_GAS, unit: "MtCO2e", boundary_count: mapped.districts.length,
    national_aggregate_mtco2e: nationalTotal,
    ...mapped,
    difference_mtco2e: mapped.missing_emissions_count ? null : nationalTotal - mapped.mapped_district_rollup_mtco2e,
    excluded_missing_coordinates: dataset.coverage.missing_coordinates,
    retrieved_at: dataset.retrieved_at,
    boundary_provenance: BOUNDARY_PROVENANCE,
    provenance: { source: "Climate TRACE", api_version: CLIMATE_TRACE_API_VERSION, published_release: TRACE_RELEASE, api_dataset_release: null },
    note: "The mapped rollup assigns each located source/subsector centroid to one 2020 UBOS district. Administrative source values can cover larger areas. The national aggregate also includes spatially uncertain emissions, so these figures have different scope and are not expected to match.",
  };
}

export async function getCachedTranslatorReconciliation(year) {
  const key = `${CLIMATE_TRACE_API_VERSION}:${TRACE_RELEASE.version}:${year}`;
  const cached = cache.get(key);
  if (cached) return cached;
  if (pending.has(key)) return pending.get(key);
  const request = getTranslatorReconciliation(year).then((result) => { cache.set(key, result); return result; }).finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}
