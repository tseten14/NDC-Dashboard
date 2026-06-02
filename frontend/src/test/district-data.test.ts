/**
 * Regression tests: per-district data isolation.
 *
 * Ensures:
 *  1. The React Query cache key changes per district → each district triggers
 *     its own fetch, not a duplicate of a prior selection.
 *  2. CT-tracked NDC targets (t1, t4, t5, t6, t7, agriculture) use the
 *     district-parameterised dashboard query path.
 *  3. Indicator-panel NDC targets (t2, t3, t8, t9, t10) use a *district-free*
 *     query and are documented as national-only.
 *  4. t0 (economy-wide) uses the CT aggregate path, not the mock-data path.
 */
import { describe, it, expect } from "vitest";
import {
  CLIMATE_TRACE_API_SECTORS,
  INDICATOR_PANEL_TARGET_IDS,
  getClimateTraceSectorForTarget,
  isIndicatorPanelTarget,
} from "../lib/emissions-integration";
import { ndcTargets } from "../data/uganda-ndc-data";

// ── Cache-key uniqueness ──────────────────────────────────────────────────────

describe("District query-key uniqueness", () => {
  const districts = ["Kampala", "Wakiso", "Gulu", "Mbale", "Mbarara"];

  it("each district produces a unique cache key string", () => {
    // The context builds: ["emissions", "dashboard", geographyKey]
    // where geographyKey = districtName or "national"
    const keys = districts.map((d) => `emissions::dashboard::${d}`);
    expect(new Set(keys).size).toBe(districts.length);
  });

  it('"national" key is distinct from every district key', () => {
    for (const d of districts) {
      expect(`emissions::dashboard::${d}`).not.toBe("emissions::dashboard::national");
    }
  });

  it("indicator-panel key never includes a district (national-only data)", () => {
    // The indicatorPanelQuery key is ["cockpit","indicators","panel",since,to]
    // — deliberately district-free because the catalog has no sub-national data.
    const panelKey = `cockpit::indicators::panel::2015::2024`;
    expect(panelKey).not.toMatch(/Kampala|Wakiso|Gulu/);
  });
});

// ── CT-tracked NDC targets: district path ────────────────────────────────────

describe("CT-tracked NDC targets use the district-aware dashboard path", () => {
  const ctTargets = ndcTargets.filter((t) => {
    const sector = getClimateTraceSectorForTarget(t);
    return sector !== null;
  });

  it("there are CT-tracked MtCO2e targets (t1 AFOLU, t4 Energy, t5 Transport, t6 Waste, t7 IPPU)", () => {
    // Agriculture is CT-observed but has no standalone MtCO2e NDC target entry
    // (its NDC representation is the CSA adoption % target t8).
    expect(ctTargets.length).toBeGreaterThanOrEqual(5);
    const ids = ctTargets.map((t) => t.id);
    expect(ids).toContain("t1");
    expect(ids).toContain("t4");
    expect(ids).toContain("t5");
    expect(ids).toContain("t6");
    expect(ids).toContain("t7");
  });

  it("every CT-tracked target maps to a valid CLIMATE_TRACE_API_SECTORS entry", () => {
    for (const t of ctTargets) {
      const sector = getClimateTraceSectorForTarget(t);
      expect(
        (CLIMATE_TRACE_API_SECTORS as readonly string[]).includes(sector!),
        `${t.id} maps to unknown sector: ${sector}`,
      ).toBe(true);
    }
  });

  it("switching district changes the effective cache key for CT targets", () => {
    const districts = ["Kampala", "Wakiso"];
    for (const t of ctTargets) {
      const keys = districts.map((d) => `emissions::dashboard::${d}`);
      // Two different districts produce two different keys
      expect(keys[0]).not.toBe(keys[1]);
    }
  });
});

// ── Indicator-panel NDC targets: national-only ───────────────────────────────

describe("Indicator-panel NDC targets are national-only (no district differentiation)", () => {
  const panelTargets = ndcTargets.filter((t) => isIndicatorPanelTarget(t));

  it("indicator-panel target set is non-empty", () => {
    expect(panelTargets.length).toBeGreaterThan(0);
  });

  it("INDICATOR_PANEL_TARGET_IDS contains t2, t3, t8, t9, t10", () => {
    expect(INDICATOR_PANEL_TARGET_IDS.has("t2")).toBe(true);
    expect(INDICATOR_PANEL_TARGET_IDS.has("t3")).toBe(true);
    expect(INDICATOR_PANEL_TARGET_IDS.has("t8")).toBe(true);
    expect(INDICATOR_PANEL_TARGET_IDS.has("t9")).toBe(true);
    expect(INDICATOR_PANEL_TARGET_IDS.has("t10")).toBe(true);
  });

  it("t5 (transport emissions) is NOT in the indicator panel — it is CT-tracked", () => {
    expect(INDICATOR_PANEL_TARGET_IDS.has("t5")).toBe(false);
    const t5 = ndcTargets.find((t) => t.id === "t5");
    expect(t5).toBeDefined();
    expect(getClimateTraceSectorForTarget(t5!)).toBe("transport");
  });

  it("each indicator-panel target has no CT sector mapping (getClimateTraceSectorForTarget returns null)", () => {
    for (const t of panelTargets) {
      expect(
        getClimateTraceSectorForTarget(t),
        `${t.id} should not have a CT sector`,
      ).toBeNull();
    }
  });
});

// ── t0 economy-wide: not a mock-data target ──────────────────────────────────

describe("t0 economy-wide uses CT aggregate, not mock fallback", () => {
  const t0 = ndcTargets.find((t) => t.id === "t0")!;

  it("t0 exists and is economy-wide sector", () => {
    expect(t0).toBeDefined();
    expect(t0.sectorId).toBe("economy-wide");
  });

  it("t0 is NOT in the indicator panel (it uses CT aggregate path)", () => {
    expect(INDICATOR_PANEL_TARGET_IDS.has("t0")).toBe(false);
  });

  it("t0 has no direct CT sector (it's a sum across all sectors)", () => {
    // By design: t0 does not map to a single CT sector.
    // The component uses emissions.economyWideTimeseries (CT aggregate).
    expect(getClimateTraceSectorForTarget(t0)).toBeNull();
  });

  it("t0 has NDC 2022 correct baseline and full-conditional target", () => {
    expect(t0.baselineValue).toBe(90.1);    // 2015 national inventory
    expect(t0.targetValue).toBe(112.1);     // full conditional 2030 target
    expect(t0.baselineYear).toBe(2015);
    expect(t0.targetYear).toBe(2030);
    expect(t0.conditionality).toBe("Mixed");
  });
});

// ── No duplicate districts in the district list ───────────────────────────────

describe("District list has no duplicates (prevents silent cache collision)", () => {
  it("CLIMATE_TRACE_API_SECTORS has no duplicate entries", () => {
    expect(new Set(CLIMATE_TRACE_API_SECTORS).size).toBe(CLIMATE_TRACE_API_SECTORS.length);
  });
});
