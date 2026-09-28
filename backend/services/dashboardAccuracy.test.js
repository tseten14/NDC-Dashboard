// Exercise the real fetch -> cache -> aggregation -> dashboard code path.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ALL_TRACE_SLUGS } from "../../config/ndcTargets.js";
import { fetchLocationEmissions, fetchSectorEmissionsForYear } from "../../config/climateTrace.js";
import { clearClimateTraceCache, getUiSectorTimeseries } from "./climateTraceTimeseries.js";
import { getEmissionsDashboard, getProvenancePayload, traceYoYPct } from "./emissionsData.js";

function response(body) { return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } }); }
function aggregate(overrides = {}) {
  return { totals: { summaries: [{ gas: "co2e_100yr", emissionsQuantity: 10_500_000 }] }, sectors: { summaries: ALL_TRACE_SLUGS.map((sector) => ({ sector, gas: "co2e_100yr", emissionsQuantity: sector === "mineral-extraction" ? 1_500_000 : 1_000_000 })) }, ...overrides };
}

beforeEach(() => { clearClimateTraceCache(); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("dashboard accuracy through the production service", () => {
  it("uses the selected year, includes mining in country totals and requests one aggregate per year", async () => {
    const fetcher = vi.fn(async (url) => {
      const query = new URL(url);
      if (query.pathname.includes("rankings")) return response({ rankings: [{ country: "UGA", emissionsQuantity: Number(query.searchParams.get("start")) === 2023 ? 10_500_000 : 9_000_000, rank: 93 }] });
      expect(query.searchParams.get("gas")).toBe("co2e_100yr");
      expect(query.searchParams.get("gadmId")).toBe("UGA");
      expect(query.searchParams.has("sectors")).toBe(false);
      return response(aggregate());
    });
    vi.stubGlobal("fetch", fetcher);
    const d = await getEmissionsDashboard(2023, 2023);
    expect(d.inventory_year).toBe(2023);
    expect(d.total_co2e_mtco2e).toBe(10.5);
    expect(d.total_timeseries).toEqual([{ year: 2023, value: 10.5 }]);
    expect(d.timeseries.energy[0].value).toBe(3);
    expect(d.reconciliation.ui_sector_sum_mt).toBe(9);
    expect(d.reconciliation.delta_mt).toBe(0);
    expect(d.progress.afolu.progress_pct).toBeNull();
    expect(d.progress.agriculture.progress_pct).toBeNull();
    expect(fetcher.mock.calls.filter(([url]) => String(url).includes("/sources/emissions"))).toHaveLength(1);
  });

  it("never replaces a missing district total with a partial sector sum or another year", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url) => response(aggregate(new URL(url).searchParams.get("year") === "2025" ? { totals: { summaries: [{ gas: "co2e_100yr", emissionsQuantity: null }] } } : {}))));
    const d = await getEmissionsDashboard(2024, 2025, { gadmId: "UGA.16_1", districtName: "Kampala" });
    expect(d.total_co2e_mtco2e).toBeNull();
    expect(d.total_timeseries[1].value).toBeNull();
    expect(d.data_stale).toBe(true);
    expect(Object.values(d.progress).every((row) => row.progress_pct === null)).toBe(true);
  });

  it("retains null sector estimates, retries after the short cache, and does not interpolate", async () => {
    let missing = true;
    vi.stubGlobal("fetch", vi.fn(async () => {
      const body = aggregate();
      body.sectors.summaries.find((s) => s.sector === "buildings").emissionsQuantity = missing ? null : 2_000_000;
      return response(body);
    }));
    expect(await getUiSectorTimeseries("energy", 2025, 2025)).toEqual([{ year: 2025, value: null }]);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 61_000);
    missing = false;
    expect(await getUiSectorTimeseries("energy", 2025, 2025)).toEqual([{ year: 2025, value: 4 }]);
  });

  it("fails closed for upstream errors and never claims unavailable data was validated", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const d = await getEmissionsDashboard(2025, 2025, { gadmId: "UGA.16_1" });
    expect(d.total_co2e_mtco2e).toBeNull();
    expect(Object.values(d.sectors).every((s) => s.latest_value === null)).toBe(true);
    const provenance = await getProvenancePayload();
    expect(provenance.validated).toBe(false);
    expect(provenance.qa_qc_status).not.toBe("OK");
  });

  it("rejects a different gas instead of using the first returned gas", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ totals: { summaries: [{ gas: "co2", emissionsQuantity: 123 }] } })));
    await expect(fetchLocationEmissions(2025)).rejects.toThrow("wrong gas");
    await expect(fetchSectorEmissionsForYear(2025, "power")).rejects.toThrow("wrong gas");
  });

  it("only labels adjacent positive-baseline years as year-on-year percentages", () => {
    expect(traceYoYPct([{ year: 2023, value: 10 }, { year: 2024, value: null }, { year: 2025, value: 12 }], 2025, 12)).toBeNull();
    expect(traceYoYPct([{ year: 2024, value: -10 }, { year: 2025, value: -5 }], 2025, -5)).toBeNull();
    expect(traceYoYPct([{ year: 2024, value: 10 }, { year: 2025, value: 12 }], 2025, 12)).toBe(20);
  });
});
