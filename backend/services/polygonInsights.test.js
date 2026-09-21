import { describe, expect, it, vi } from "vitest";
import { geometryAreaKm2, pointInGeometry, validateTranslatorGeometry, getPolygonInsights, summarizeSources } from "./polygonInsights.js";
import { districtById, intersectedDistricts } from "./translator/geometry.js";

const kampalaTriangle = {
  type: "Polygon",
  coordinates: [[[32.54, 0.29], [32.61, 0.31], [32.57, 0.36], [32.54, 0.29]]],
};

describe("District Translator geometry", () => {
  it("accepts a closed Uganda polygon and calculates its area", () => {
    const result = validateTranslatorGeometry(kampalaTriangle);
    expect(result.ok).toBe(true);
    expect(geometryAreaKm2(kampalaTriangle)).toBeGreaterThan(1);
  });

  it("filters points against polygon boundaries", () => {
    expect(pointInGeometry([32.57, 0.32], kampalaTriangle)).toBe(true);
    expect(pointInGeometry([31.5, 0.32], kampalaTriangle)).toBe(false);
  });

  it("rejects open and out-of-country polygons", () => {
    expect(validateTranslatorGeometry({ type: "Polygon", coordinates: [[[32.5, 0.2], [32.6, 0.2], [32.6, 0.3]]] }).error).toBe("polygon_must_be_closed");
    expect(validateTranslatorGeometry({ type: "Polygon", coordinates: [[[10, 10], [11, 10], [11, 11], [10, 10]]] }).error).toBe("polygon_must_be_inside_uganda");
  });

  it("rejects self-intersecting polygons", () => {
    const bowTie = { type: "Polygon", coordinates: [[[32.54, 0.29], [32.61, 0.36], [32.54, 0.36], [32.61, 0.29], [32.54, 0.29]]] };
    expect(validateTranslatorGeometry(bowTie).error).toBe("polygon_self_intersects");
  });
});

describe("Translator geometry robustness", () => {
  it.each([null, {}, { type: "Polygon" }, { type: "Polygon", coordinates: null }, { type: "Polygon", coordinates: [] }, { type: "Polygon", coordinates: [null] }, { type: "MultiPolygon", coordinates: [null] }, { type: "Polygon", coordinates: [[null, [], 2, null]] }])("rejects malformed input without throwing: %j", (geometry) => {
    expect(validateTranslatorGeometry(geometry).ok).toBe(false);
  });
  it("rejects nonfinite coordinates and excessive vertices", () => {
    const broken = structuredClone(kampalaTriangle);
    broken.coordinates[0][1][0] = Infinity;
    expect(validateTranslatorGeometry(broken).error).toBe("invalid_coordinate");
    expect(validateTranslatorGeometry({ type: "Polygon", coordinates: [Array.from({ length: 514 }, () => [32.5, 0.3])] }).error).toBe("geometry_too_complex");
  });
  it("handles holes and boundary points consistently", () => {
    const geometry = { type: "Polygon", coordinates: [ [[32, 0], [33, 0], [33, 1], [32, 1], [32, 0]], [[32.4, 0.4], [32.6, 0.4], [32.6, 0.6], [32.4, 0.6], [32.4, 0.4]] ] };
    expect(pointInGeometry([32.5, 0.5], geometry)).toBe(false);
    expect(pointInGeometry([32, 0], geometry)).toBe(true);
    expect(pointInGeometry([32.4, 0.5], geometry)).toBe(true);
    expect(geometryAreaKm2(geometry)).toBeLessThan(geometryAreaKm2({ ...geometry, coordinates: [geometry.coordinates[0]] }));
  });
  it("rejects holes outside their shell and overlapping polygon parts", () => {
    const hole = { ...kampalaTriangle, coordinates: [...kampalaTriangle.coordinates, [[33, 1], [33.1, 1], [33.1, 1.1], [33, 1]]] };
    expect(validateTranslatorGeometry(hole).ok).toBe(false);
    expect(validateTranslatorGeometry({ type: "MultiPolygon", coordinates: [kampalaTriangle.coordinates, kampalaTriangle.coordinates] }).ok).toBe(false);
  });
  it("calculates intersection area rather than sampled grid cells", () => {
    const result = intersectedDistricts(kampalaTriangle);
    expect(result.outside_area_km2).toBeLessThan(1e-6);
    expect(result.districts.reduce((sum, entry) => sum + entry.overlap_km2, 0)).toBeCloseTo(geometryAreaKm2(kampalaTriangle), 5);
    expect(result.districts.some((entry) => entry.name === "Kampala")).toBe(true);
    expect(result.districts.every((entry) => !entry.name.startsWith("Uganda district"))).toBe(true);
  });
});

const insidePoint = { id: 1, key: "1", sector: "power", source_kind: "asset", is_asset: true, lat: 0.32, lng: 32.57, mtco2e: 0.000000123456789 };
const dataset = (year, points = [insidePoint]) => ({ year, points, coverage: { fetched_rows: points.length, duplicate_rows: 0, missing_coordinates: 0, missing_emissions: 0, complete_pagination: true }, retrieved_at: "2026-09-20T10:00:00.000Z", period: { year, complete_year: year < 2026, label: String(year) } });

describe("Translator aggregation", () => {
  it("preserves fractional tonnes, removals, and missing values", () => {
    const sources = [insidePoint, { ...insidePoint, mtco2e: -0.0000001 }, { ...insidePoint, sector: "waste", mtco2e: null }];
    const result = summarizeSources(sources);
    expect(result.total).toBeCloseTo(0.000000023456789, 15);
    expect(result.missing).toBe(1);
    expect(result.sectors.find((entry) => entry.sector === "waste").mtco2e).toBeNull();
    expect(summarizeSources([{ ...insidePoint, mtco2e: null }]).total).toBeNull();
    expect(summarizeSources([]).total).toBe(0);
  });
  it("uses the same polygon for every trend and sums sector totals", async () => {
    const load = vi.fn(async (year) => dataset(year, [insidePoint, { ...insidePoint, id: 2, sector: "waste", mtco2e: 0.123456789 }, { ...insidePoint, id: 3, lng: 30 }]));
    const result = await getPolygonInsights({ geometry: kampalaTriangle, year: 2025 }, load);
    expect(result.source_count).toBe(2);
    expect(result.trend.every((entry) => entry.source_count === 2)).toBe(true);
    expect(result.sectors.reduce((sum, entry) => sum + entry.mtco2e, 0)).toBeCloseTo(result.mapped_total_mtco2e, 14);
    expect(result.provenance.retrieved_at).toBe("2026-09-20T10:00:00.000Z");
    expect(result.provenance.api_dataset_release).toBeNull();
    expect(load).toHaveBeenCalledTimes(6);
  });
  it("distinguishes all sectors from an explicitly empty filter", async () => {
    const load = async (year) => dataset(year);
    const all = await getPolygonInsights({ geometry: kampalaTriangle, year: 2025 }, load);
    const none = await getPolygonInsights({ geometry: kampalaTriangle, year: 2025, sectors: [] }, load);
    expect(all.source_count).toBe(1);
    expect(none.source_count).toBe(0);
    expect(none.mapped_total_mtco2e).toBe(0);
  });
  it("keeps selected-year results when a historical year fails", async () => {
    const load = async (year) => { if (year === 2022) throw new Error("offline"); return dataset(year); };
    const result = await getPolygonInsights({ geometry: kampalaTriangle, year: 2026 }, load);
    expect(result.source_count).toBe(1);
    expect(result.period.complete_year).toBe(false);
    expect(result.trend.find((entry) => entry.year === 2022).status).toBe("unavailable");
    expect(result.trend.find((entry) => entry.year === 2022).mapped_total_mtco2e).toBeNull();
  });
  it("fails selected-year errors rather than returning zero", async () => {
    await expect(getPolygonInsights({ geometry: kampalaTriangle, year: 2025 }, async () => { throw new Error("offline"); })).rejects.toThrow("offline");
  });
  it("resolves official district IDs server-side and ignores supplied geometry", async () => {
    const district = [...districtById.values()].find((feature) => feature.properties.shapeName === "Kampala");
    const result = await getPolygonInsights({ selectionKind: "district", districtId: district.properties.shapeID, geometry: { type: "Polygon", coordinates: [] }, year: 2025 }, async (year) => dataset(year));
    expect(result.geometry).toEqual(district.geometry);
    expect(result.selection_name).toBe("Kampala");
    expect(result.intersected_districts[0].overlap_pct).toBe(100);
  });
  it("validates the request before making upstream calls", async () => {
    const load = vi.fn();
    expect((await getPolygonInsights({ geometry: kampalaTriangle, year: "2025" }, load)).error).toBe("unsupported_year");
    expect((await getPolygonInsights({ geometry: kampalaTriangle, year: 2025, sectors: "power" }, load)).error).toBe("invalid_sectors");
    expect((await getPolygonInsights({ year: 2025, selectionKind: "district", districtId: "fake" }, load)).error).toBe("district_not_found");
    expect(load).not.toHaveBeenCalled();
  });
});
