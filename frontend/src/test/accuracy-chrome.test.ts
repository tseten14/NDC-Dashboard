import { describe, it, expect } from "vitest";
import { emissionsDashboardSchema } from "../../../shared/schemas/emissionsDashboard.schema.js";

/**
 * Contract: Accuracy Audit drawer + LiveEmissionsBanner read reconciliation
 * from the dashboard payload. Keep the shape stable.
 */
describe("emissions dashboard accuracy contract", () => {
  const base = {
    since: 2015,
    to: 2025,
    inventory_year: 2025,
    gas: "co2e_100yr",
    geography: "national",
    gadm_id: "UGA",
    district_name: null,
    target_scope: "national",
    on_track: 1,
    off_track: 0,
    mixed: 0,
    global_rank: 83,
    total_co2e_mtco2e: 70.26,
    yoy_change_mtco2e: 0,
    data_stale: false,
    from_cache: false,
    data_source: "Climate TRACE (live API)",
    timeseries: {},
    progress: {},
    sectors: {},
    reconciliation: {
      reference_year: 2023,
      country_total_mt: 70.26,
      sector_sum_mt: 70.27,
      ui_sector_sum_mt: 70.23,
      delta_mt: -0.01,
      unmapped_slugs: ["mineral-extraction"],
      missing_slugs: [],
      slug_breakdown: {
        agriculture: 44.4,
        "forestry-and-land-use": 0.448,
      },
      note: "test",
    },
  };

  it("accepts gas + reconciliation for accuracy chrome", () => {
    const parsed = emissionsDashboardSchema.parse(base);
    expect(parsed.gas).toBe("co2e_100yr");
    expect(parsed.reconciliation?.delta_mt).toBe(-0.01);
    expect(parsed.reconciliation?.slug_breakdown?.agriculture).toBe(44.4);
  });

  it("still accepts payloads without gas (optional)", () => {
    const { gas: _omit, ...withoutGas } = base;
    const parsed = emissionsDashboardSchema.parse(withoutGas);
    expect(parsed.gas).toBeUndefined();
    expect(parsed.reconciliation?.sector_sum_mt).toBe(70.27);
  });
});

describe("LiveEmissionsBanner accuracy affordances", () => {
  it("exports a mountable banner component", async () => {
    const mod = await import("@/components/LiveEmissionsBanner");
    expect(typeof mod.LiveEmissionsBanner).toBe("function");
  });

  it("exports AccuracyAuditDrawer", async () => {
    const mod = await import("@/components/AccuracyAuditDrawer");
    expect(typeof mod.AccuracyAuditDrawer).toBe("function");
  });

  it("exports FrameworkDivergenceCallout", async () => {
    const mod = await import("@/components/FrameworkDivergenceCallout");
    expect(typeof mod.FrameworkDivergenceCallout).toBe("function");
  });
});
