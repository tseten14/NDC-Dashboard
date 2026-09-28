import type { FeatureCollection } from "geojson";
import type { MapSourcePoint, PolygonInsightsResponse } from "./api";

export function sourceKey(point: MapSourcePoint) {
  return point.key ?? `${point.id}:${point.subsector}:${point.lat}:${point.lng}`;
}

export function formatEmissions(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "Unavailable";
  const magnitude = Math.abs(value);
  if (magnitude >= 1) return `${value.toLocaleString(undefined, { maximumFractionDigits: 3 })} million tonnes`;
  if (magnitude >= 0.001) return `${(value * 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} thousand tonnes`;
  return `${(value * 1e6).toLocaleString(undefined, { maximumFractionDigits: 3 })} tonnes`;
}

export function translatorError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const messages: Record<string, string> = {
    polygon_self_intersects: "The polygon crosses itself. Undo a point or draw it again.",
    polygon_must_be_inside_uganda: "Keep the whole polygon within Uganda's mapped boundary.",
    geometry_too_complex: "Use at most 511 points for a custom polygon.",
    polygon_must_be_closed: "Close the polygon with at least three distinct points.",
    invalid_polygon: "This polygon is invalid. Undo a point or draw it again.",
    invalid_polygon_holes: "Polygon holes must lie inside the outer boundary without overlapping.",
    polygon_has_no_area: "The points must enclose an area.",
    district_not_found: "This district is no longer available. Reload the boundary list.",
    unknown_sector: "A selected sector is unavailable for this year. Choose All sectors.",
    polygon_insights_failed: "Climate TRACE analysis could not finish. Please retry; incomplete totals are not displayed.",
    rate_limited: "Too many requests. Please wait a few minutes and retry.",
  };
  return messages[message] ?? "Data could not be loaded. Check your connection and retry.";
}

export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function translatorCsv(result: PolygonInsightsResponse, label: string) {
  const rows = [
    ["District Translator summary", result.schema_version], ["Area", label], ["Year", result.year],
    ["Period", result.period.label], ["Complete year", result.period.complete_year], ["Units", "MtCO2e; CO2e 100-year GWP"],
    ["Area km2", result.area_km2], ["Mapped emissions MtCO2e", result.mapped_total_mtco2e],
    ["Mapped sources", result.source_count], ["Missing emissions", result.missing_emissions_count],
    ["Facility emissions MtCO2e", result.asset_total_mtco2e], ["Administrative centroid emissions MtCO2e", result.administrative_total_mtco2e],
    ["Source", result.provenance.source], ["API", result.provenance.api_url], ["API version", result.provenance.api_version],
    ["Published release", result.provenance.published_release.version], ["API dataset release", result.provenance.api_dataset_release ?? "Not reported by upstream"],
    ["Retrieved", result.provenance.retrieved_at], ["License", result.provenance.license], ["License URL", result.provenance.license_url],
    ["Boundary source", result.boundary_provenance.source], ["Boundary year", result.boundary_provenance.year],
    ["Boundary license", result.boundary_provenance.license], ["Boundary URL", result.boundary_provenance.url], ["Boundary note", result.boundary_provenance.note],
    ["Geometry GeoJSON", JSON.stringify(result.geometry)], ["District overlaps", JSON.stringify(result.intersected_districts)],
    ["Coverage", JSON.stringify(result.coverage)], ["Coverage note", result.spatial_confidence.explanation],
    ["Sector filter", result.filters.sectors === null ? "All" : result.filters.sectors.join("; ") || "None"], [],
    ["Source id", "Name", "Sector", "Subsector", "Type", "Latitude", "Longitude", "MtCO2e", "Year", "Source URL"],
    ...result.sources.map((source) => [source.id, source.name, source.sector, source.subsector, source.source_kind, source.lat, source.lng, source.mtco2e, result.year, source.source_url]), [],
    ["Trend year", "Mapped emissions MtCO2e", "Mapped sources", "Status", "Complete year", "Retrieved"],
    ...result.trend.map((point) => [point.year, point.mapped_total_mtco2e, point.source_count, point.status, point.complete_year, point.retrieved_at]),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function translatorGeoJson(result: PolygonInsightsResponse, label: string): FeatureCollection {
  const { geometry, sources, ...summary } = result;
  return { type: "FeatureCollection", features: [
    { type: "Feature", geometry, properties: { ...summary, name: label, units: "MtCO2e" } },
    ...sources.map((source) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [source.lng, source.lat] }, properties: { ...source, year: result.year, units: "MtCO2e", retrieved_at: result.provenance.retrieved_at } })),
  ] };
}

export function downloadAnalysis(result: PolygonInsightsResponse, label: string, format: "csv" | "geojson") {
  const content = format === "csv" ? translatorCsv(result, label) : JSON.stringify(translatorGeoJson(result, label));
  const url = URL.createObjectURL(new Blob([content], { type: format === "csv" ? "text/csv;charset=utf-8" : "application/geo+json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `district-translator-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${result.year}.${format}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
