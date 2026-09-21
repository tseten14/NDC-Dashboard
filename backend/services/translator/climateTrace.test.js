import { describe, expect, it } from "vitest";
import { collectTraceSources } from "./climateTrace.js";

const row = (id, overrides = {}) => ({ id, name: `Source ${id}`, sector: "power", subsector: "electricity-generation", country: "UGA", gas: "co2e_100yr", year: 2025, sourceType: "point", centroid: { latitude: 0.32, longitude: 32.57 }, emissionsQuantity: 0.123456789, ...overrides });

describe("Climate TRACE translator adapter", () => {
  it("retrieves beyond the previous 3000 row cap and retains exact precision", async () => {
    const all = Array.from({ length: 3101 }, (_, index) => row(index));
    const result = await collectTraceSources(2025, async (offset) => all.slice(offset, offset + 500), 500);
    expect(result.points).toHaveLength(3101);
    expect(result.points[0].mtco2e).toBe(0.123456789 / 1e6);
    expect(result.points[0].source_url).toContain("start=2025&end=2025&gas=co2e_100yr");
    expect(result.coverage.complete_pagination).toBe(true);
  });
  it("deduplicates matching records without collapsing different subsectors", async () => {
    const result = await collectTraceSources(2025, async () => [row(1), row(1), row(1, { subsector: "other" })]);
    expect(result.points).toHaveLength(2);
    expect(result.coverage.duplicate_rows).toBe(1);
  });
  it("rejects conflicting duplicate values", async () => {
    await expect(collectTraceSources(2025, async () => [row(1), row(1, { emissionsQuantity: 9 })])).rejects.toThrow("changed during pagination");
  });
  it("rejects pagination with no progress", async () => {
    await expect(collectTraceSources(2025, async () => [row(1)], 1)).rejects.toThrow("no progress");
  });
  it.each([{ year: 2024 }, { gas: "co2" }, { country: "KEN" }, { id: null }])("rejects a mismatched record: %j", async (overrides) => {
    await expect(collectTraceSources(2025, async () => [row(1, overrides)])).rejects.toThrow();
  });
  it("preserves zero, missing emissions, removals, and unknown source types", async () => {
    const result = await collectTraceSources(2025, async () => [row(1, { emissionsQuantity: 0 }), row(2, { emissionsQuantity: null }), row(3, { emissionsQuantity: -3.125 }), row(4, { sourceType: null }), row(5, { sourceType: "gadm-aggregation" }), row(6, { centroid: null })]);
    expect(result.points.map((point) => point.mtco2e)).toEqual([0, null, -0.000003125, 0.123456789 / 1e6, 0.123456789 / 1e6]);
    expect(result.coverage.missing_coordinates).toBe(1);
    expect(result.coverage.missing_emissions).toBe(1);
    expect(result.points[3].source_kind).toBe("unknown");
    expect(result.points[4].source_kind).toBe("administrative");
  });
  it("does not treat absent national data as a zero-source polygon", async () => {
    await expect(collectTraceSources(2025, async () => [])).rejects.toThrow("no Uganda dataset");
  });
  it("does not return partial totals when the next page fails", async () => {
    await expect(collectTraceSources(2025, async (offset) => { if (offset) throw new Error("upstream failure"); return [row(1)]; }, 1)).rejects.toThrow("upstream failure");
  });
});
