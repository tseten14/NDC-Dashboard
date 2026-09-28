/**
 * Verifies Reconciliation behavior so regressions cannot silently change a published value, evidence boundary, or user workflow.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { describe, expect, it } from "vitest";
import { rollupDistrictSources, getTranslatorReconciliation } from "./reconciliation.js";

const square = (west, east) => ({ type: "Polygon", coordinates: [[[west, 0], [east, 0], [east, 1], [west, 1], [west, 0]]] });
const boundaries = [
  { feature: { properties: { shapeID: "A", shapeName: "A" }, geometry: square(30, 31) }, bounds: [30, 0, 31, 1] },
  { feature: { properties: { shapeID: "B", shapeName: "B" }, geometry: square(31, 32) }, bounds: [31, 0, 32, 1] },
];
const dataset = (points) => ({
  year: 2025, points, retrieved_at: "2026-09-28T12:00:00Z",
  coverage: { complete_pagination: true, missing_coordinates: 1 },
});

describe("district rollup", () => {
  it("assigns a shared-boundary source once and tracks exclusions", () => {
    const result = rollupDistrictSources(dataset([
      { lng: 30.5, lat: 0.5, mtco2e: 2 },
      { lng: 31, lat: 0.5, mtco2e: 3 },
      { lng: 31.5, lat: 0.5, mtco2e: null },
      { lng: 40, lat: 0.5, mtco2e: 10 },
    ]), boundaries);
    expect(result.assigned_source_count).toBe(3);
    expect(result.unmatched_source_count).toBe(1);
    expect(result.multiple_boundary_source_count).toBe(1);
    expect(result.mapped_district_rollup_mtco2e).toBe(5);
    expect(result.missing_emissions_count).toBe(1);
    expect(result.districts[0].known_mtco2e).toBe(5);
  });

  it("rejects incomplete source pagination", () => {
    expect(() => rollupDistrictSources({ ...dataset([]), coverage: { complete_pagination: false } }, boundaries)).toThrow("incomplete_source_pages");
  });

  it("compares complete-year mapped records with the national aggregate without claiming equivalence", async () => {
    const data = dataset([{ lng: 32.57, lat: 0.32, mtco2e: 1 }]);
    const result = await getTranslatorReconciliation(2025, async () => data, async () => ({ total_tonnes: 3000000 }));
    expect(result.national_aggregate_mtco2e).toBe(3);
    expect(result.mapped_district_rollup_mtco2e).toBe(1);
    expect(result.difference_mtco2e).toBe(2);
    expect(result.assigned_source_count).toBe(1);
    expect(result.provenance.api_dataset_release).toBeNull();
    await expect(getTranslatorReconciliation(2026, async () => data, async () => ({ total_tonnes: 0 }))).rejects.toThrow("unsupported_complete_year");
  });
});
