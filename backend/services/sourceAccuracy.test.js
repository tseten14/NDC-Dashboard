/**
 * Verifies Source Accuracy behavior so regressions cannot silently change a published value, evidence boundary, or user workflow.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const raw = (id, emissionsQuantity, extras = {}) => ({ id, emissionsQuantity, name: `Source ${id}`,
  year: 2025, gas: "co2e_100yr", country: "UGA", sector: "forestry-and-land-use", subsector: "forest-land",
  sourceType: "gadm-aggregation", centroid: { latitude: 1, longitude: 32 }, ...extras });
const respond = (data) => ({ ok: true, headers: new Headers(), json: async () => data });

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe("Climate TRACE source integrity", () => {
  it.each([{ gas: "co2" }, { year: 2024 }, { country: "KEN" }, { id: null }])("rejects mismatched or unidentified rows: %j", async (invalid) => {
    vi.stubGlobal("fetch", vi.fn(async () => respond([raw(1, 25, invalid)])));
    const { fetchSources } = await import("../../config/climateTrace.js");
    await expect(fetchSources({ year: 2025 })).rejects.toThrow(/Climate TRACE/);
  });

  it("includes late negative removals beyond the former 3,000-row cap", async () => {
    const rows = Array.from({ length: 3101 }, (_, i) => raw(i, i < 3000 ? 1 : -100));
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      const q = new URL(url).searchParams;
      return respond(rows.slice(Number(q.get("offset")), Number(q.get("offset")) + Number(q.get("limit"))));
    }));
    const { getEmissionSourcesForMap } = await import("./climatetrace.js");
    const map = await getEmissionSourcesForMap({ year: 2025 });
    expect(map.point_count).toBe(3101);
    expect(map.total_mtco2e).toBe(-0.0071);
    expect(map.points[0].mtco2e).toBe(0.000001);
    expect(map.truncated).toBe(false);
  });

  it("keeps unknown emissions unavailable and excludes invalid coordinates", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respond([raw(1, null), raw(2, 2), raw(3, 100, { centroid: { latitude: 999, longitude: 32 } })])));
    const { getEmissionSourcesForMap } = await import("./climatetrace.js");
    const map = await getEmissionSourcesForMap({ year: 2025 });
    expect(map.total_mtco2e).toBeNull();
    expect(map.sectors[0].mtco2e).toBeNull();
    expect(map.points[0].mtco2e).toBeNull();
    expect(map.missing_coordinates).toBe(1);
    expect(map.missing_emissions).toBe(1);
  });

  it("never interprets a signed coverage difference as a confidence score", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url) => respond(new URL(url).pathname.endsWith("/emissions")
      ? { totals: { summaries: [{ gas: "co2e_100yr", emissionsQuantity: -1000 }] }, sectors: { summaries: [{ sector: "forestry-and-land-use", gas: "co2e_100yr", emissionsQuantity: -1000 }] } }
      : [raw(1, -2000)])));
    const { getSpatialConfidence } = await import("./climatetrace.js");
    const data = await getSpatialConfidence({ year: 2025 });
    expect(data.aggregate_mtco2e).toBe(-0.001);
    expect(data.located_mtco2e).toBe(-0.002);
    expect(data.difference_mtco2e).toBe(0.001);
    expect(data.certain_pct).toBeNull();
    expect(data.distributed_mtco2e).toBeNull();
    expect(data.sectors).toHaveLength(1);
  });

  it("rejects stalled pagination rather than presenting a partial total", async () => {
    const { collectLocationSources } = await import("./climatetrace.js");
    const page = Array.from({ length: 200 }, (_, id) => ({ id, subsector: "x", emissions_tco2e: 1 }));
    await expect(collectLocationSources("UGA", 2025, async () => ({ sources: page }))).rejects.toThrow(/no progress/);
  });
});
