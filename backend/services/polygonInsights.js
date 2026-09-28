/**
 * Filters mapped Climate TRACE sources by a selected district boundary and calculates transparent coverage summaries.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { BOUNDARY_PROVENANCE, districtById, geometryAreaKm2, pointInGeometry, validateTranslatorGeometry } from "./translator/geometry.js";
import { getTranslatorSources, TRANSLATOR_YEARS, TRACE_PROVIDER, sumValues } from "./translator/climateTrace.js";

export { geometryAreaKm2, pointInGeometry, validateTranslatorGeometry } from "./translator/geometry.js";

export function summarizeSources(sources) {
  const measured = sources.filter((source) => source.mtco2e != null);
  const total = sumValues(measured.map((source) => source.mtco2e));
  const grouped = new Map();
  for (const source of sources) {
    const entries = grouped.get(source.sector) ?? [];
    entries.push(source);
    grouped.set(source.sector, entries);
  }
  return {
    total: measured.length || !sources.length ? total : null,
    missing: sources.length - measured.length,
    sectors: [...grouped.entries()].map(([sector, entries]) => {
      const values = entries.filter((source) => source.mtco2e != null);
      const amount = values.length ? sumValues(values.map((source) => source.mtco2e)) : null;
      return { sector, mtco2e: amount, source_count: entries.length, missing_emissions_count: entries.length - values.length, share_pct: amount != null && total > 0 ? amount / total * 100 : null };
    }).sort((first, second) => (second.mtco2e ?? -Infinity) - (first.mtco2e ?? -Infinity)),
  };
}

export async function getPolygonInsights({ geometry, year, sectors, selectionKind = "custom", districtId }, loadSources = getTranslatorSources) {
  if (!TRANSLATOR_YEARS.includes(year)) return { error: "unsupported_year" };
  if (!["custom", "district"].includes(selectionKind)) return { error: "invalid_selection_kind" };
  if (sectors !== undefined && (!Array.isArray(sectors) || sectors.length > 50 || sectors.some((sector) => typeof sector !== "string" || !/^[a-z][a-z0-9-]{0,99}$/.test(sector)))) return { error: "invalid_sectors" };
  let validation;
  let selectionName = "Custom area";
  if (selectionKind === "district") {
    const district = districtById.get(districtId);
    if (!district) return { error: "district_not_found" };
    geometry = district.geometry;
    selectionName = district.properties.shapeName;
    const areaKm2 = geometryAreaKm2(geometry);
    validation = { ok: true, areaKm2, districts: [{ name: selectionName, boundary_id: districtId, overlap_pct: 100, overlap_km2: areaKm2 }] };
  } else {
    validation = validateTranslatorGeometry(geometry);
    if (!validation.ok) return { error: validation.error };
  }
  const selected = await loadSources(year);
  const knownSectors = new Set(selected.points.map((point) => point.sector));
  if (sectors?.some((sector) => !knownSectors.has(sector))) return { error: "unknown_sector" };
  const filterSources = (dataset) => dataset.points.filter((point) => (sectors === undefined || sectors.includes(point.sector)) && pointInGeometry([point.lng, point.lat], geometry));
  const sources = filterSources(selected);
  const summary = summarizeSources(sources);
  const yearly = new Map([[year, { dataset: selected, sources }]]);
  const queue = TRANSLATOR_YEARS.filter((value) => value !== year);
  await Promise.all([0, 1].map(async () => {
    while (queue.length) {
      const nextYear = queue.shift();
      try {
        const dataset = await loadSources(nextYear);
        yearly.set(nextYear, { dataset, sources: filterSources(dataset) });
      } catch { yearly.set(nextYear, null); }
    }
  }));
  const trend = TRANSLATOR_YEARS.map((value) => {
    const entry = yearly.get(value);
    if (!entry) return { year: value, status: "unavailable", mapped_total_mtco2e: null, source_count: null, complete_year: false, retrieved_at: null };
    const yearlySummary = summarizeSources(entry.sources);
    return { year: value, status: yearlySummary.missing ? "missing_emissions" : "available", mapped_total_mtco2e: yearlySummary.total, source_count: entry.sources.length, complete_year: entry.dataset.period.complete_year, retrieved_at: entry.dataset.retrieved_at };
  });
  const byKind = (kind) => summarizeSources(sources.filter((point) => point.source_kind === kind)).total;
  return {
    schema_version: "2.0", geometry, selection_name: selectionName, year, period: selected.period,
    area_km2: validation.areaKm2, intersected_districts: validation.districts, boundary_provenance: BOUNDARY_PROVENANCE,
    mapped_total_mtco2e: summary.total, source_count: sources.length, missing_emissions_count: summary.missing,
    asset_count: sources.filter((point) => point.source_kind === "asset").length,
    administrative_source_count: sources.filter((point) => point.source_kind === "administrative").length,
    unknown_source_count: sources.filter((point) => point.source_kind === "unknown").length,
    asset_total_mtco2e: byKind("asset"), administrative_total_mtco2e: byKind("administrative"), unknown_total_mtco2e: byKind("unknown"),
    sectors: summary.sectors, filters: { sectors: sectors ?? null },
    top_sources: sources.filter((point) => point.mtco2e != null).sort((first, second) => second.mtco2e - first.mtco2e).slice(0, 10),
    sources, trend, coverage: selected.coverage,
    spatial_confidence: { scope: "mapped_sources_only", complete_inventory: false, explanation: "Facility points represent mapped sources. Administrative points represent emissions across a larger area: its entire value is included when its centroid lies inside your selection. This does not establish emissions physically inside a small polygon. Unlocated sources are excluded; missing estimates remain unavailable. Negative values represent net removals. This is not a complete territorial inventory." },
    provenance: { source: TRACE_PROVIDER.name, dataset_year: year, ...TRACE_PROVIDER, retrieved_at: selected.retrieved_at },
    indicators: [{ provider_id: TRACE_PROVIDER.id, metric: "mapped_emissions", value: summary.total, units: TRACE_PROVIDER.units, spatial_method: TRACE_PROVIDER.spatial_method, period: selected.period, coverage: selected.coverage }],
  };
}
