/**
 * Verifies Classification Series behavior so regressions cannot silently change a published value, evidence boundary, or user workflow.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSubsectorEmissionsForYear } from "../../config/climateTrace.js";
import { classificationCatalog, getClassificationSeries } from "./classificationSeries.js";

afterEach(() => vi.unstubAllGlobals());

describe("Climate TRACE classification series", () => {
  it("uses the v7 subsectors filter rather than the broader sectors filter", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ totals: { summaries: [{ gas: "co2e_100yr", emissionsQuantity: 11275000 }] } }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetcher);
    const result = await fetchSubsectorEmissionsForYear(2025, "enteric-fermentation-cattle-pasture");
    const url = new URL(fetcher.mock.calls[0][0]);
    expect(url.pathname).toBe("/v7/sources/emissions");
    expect(url.searchParams.get("subsectors")).toBe("enteric-fermentation-cattle-pasture");
    expect(url.searchParams.has("sectors")).toBe(false);
    expect(url.searchParams.get("gadmId")).toBe("UGA");
    expect(result.mtco2e).toBe(11.275);
  });

  it("retains zero, marks missing years unavailable, and labels the partial year", async () => {
    const result = await getClassificationSeries("3.A.1", 2024, 2026, async (year, slug) => {
      expect(slug).toBe("enteric-fermentation-cattle-pasture");
      if (year === 2025) return null;
      return { year, mtco2e: year === 2024 ? 0 : 1.5, source_url: "https://api.climatetrace.org/v7/sources/emissions" };
    });
    expect(result.category.coverage).toBe("partial");
    expect(result.series.map((entry) => entry.status)).toEqual(["available", "no_data", "available"]);
    expect(result.series[0].value_mtco2e).toBe(0);
    expect(result.series[1].value_mtco2e).toBeNull();
    expect(result.series[2].complete_year).toBe(false);
  });

  it("does not turn a broken upstream response into a displayed zero", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ totals: { summaries: [{ gas: "unexpected", emissionsQuantity: 0 }] } }), { status: 200 })));
    await expect(fetchSubsectorEmissionsForYear(2025, "rice-cultivation")).rejects.toThrow("unexpected gas");
    await expect(getClassificationSeries("3.C.7", 2025, 2025, async () => { throw new Error("offline"); })).rejects.toThrow("climate_trace_unavailable");
    expect(classificationCatalog().categories).toHaveLength(6);
    await expect(getClassificationSeries("constructor", 2025, 2025)).rejects.toThrow("unknown_category");
  });
});
