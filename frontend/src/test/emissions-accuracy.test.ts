import { describe, it, expect } from "vitest";
import {
  NDC_TARGETS,
  SECTOR_MAP,
  SLUG_TO_UI_SECTOR,
  ALL_SECTOR_SLUGS,
  UNMAPPED_SECTOR_SLUGS,
  ALL_TRACE_SLUGS,
} from "../../../config/ndcTargets.js";
import { toMtco2e } from "../../../config/climateTrace.js";
import { COUNTRY_NDC_TARGETS, MEASURABLE_VARIABLES } from "../../../config/measurableVariables.js";

/**
 * These tests protect the property that makes the dashboard accurate: the sum of
 * the UI sectors must reconcile to Climate TRACE's country total. That only holds
 * if every Climate TRACE slug is counted exactly once (no double-count, none missing).
 */
describe("Climate TRACE sector mapping reconciliation", () => {
  it("SECTOR_MAP partitions ALL_SECTOR_SLUGS with no duplicates and no gaps", () => {
    const flat = Object.values(SECTOR_MAP).flat();
    // no slug appears in two UI sectors
    expect(new Set(flat).size).toBe(flat.length);
    // the union equals ALL_SECTOR_SLUGS exactly
    expect([...flat].sort()).toEqual([...ALL_SECTOR_SLUGS].sort());
  });

  it("SLUG_TO_UI_SECTOR agrees with SECTOR_MAP for every mapped slug", () => {
    for (const slug of ALL_SECTOR_SLUGS) {
      const uiSector = SLUG_TO_UI_SECTOR[slug];
      expect(uiSector, `slug ${slug} has no UI sector`).toBeTruthy();
      expect(SECTOR_MAP[uiSector]).toContain(slug);
    }
  });

  it("ALL_TRACE_SLUGS is the disjoint union of mapped + unmapped slugs", () => {
    const expected = [...ALL_SECTOR_SLUGS, ...UNMAPPED_SECTOR_SLUGS];
    expect([...ALL_TRACE_SLUGS].sort()).toEqual([...expected].sort());
    // mapped and unmapped never overlap
    const overlap = ALL_SECTOR_SLUGS.filter((s) => UNMAPPED_SECTOR_SLUGS.includes(s));
    expect(overlap).toEqual([]);
  });

  it("ALL_TRACE_SLUGS has no duplicate entries", () => {
    expect(new Set(ALL_TRACE_SLUGS).size).toBe(ALL_TRACE_SLUGS.length);
  });
});

describe("Unit conversion (tonnes -> MtCO2e)", () => {
  it("converts and rounds to 2 decimals", () => {
    expect(toMtco2e(1_000_000)).toBe(1);
    expect(toMtco2e(1_594_783.79)).toBe(1.59);
    expect(toMtco2e(0)).toBe(0);
  });

  it("returns null for nullish/NaN input", () => {
    expect(toMtco2e(null)).toBeNull();
    expect(toMtco2e(undefined)).toBeNull();
    expect(toMtco2e(Number.NaN)).toBeNull();
  });
});

describe("Multi-country target foundation (measurableVariables)", () => {
  it("Uganda AFOLU NDC 2022: target is 91.8 MtCO2e below sector BAU (not absolute reduction from 2015)", () => {
    // NDC_TARGETS holds the raw config (including bau_2030 / reduction_below_bau_pct).
    // COUNTRY_NDC_TARGETS copies only the fields forwarded by buildCountryTargets().
    const afoluRaw = NDC_TARGETS.afolu;
    const afoluBuilt = COUNTRY_NDC_TARGETS.UGA.targets.afolu;

    // Raw config: NDC 2022 BAU-relative numbers
    expect(afoluRaw.baseline).toBe(77.6);
    expect(afoluRaw.target).toBe(91.8);
    expect(afoluRaw.bau_2030).toBe(122.2);
    expect(afoluRaw.reduction_below_bau_pct).toBe(24.9);

    // Built target: CT-trackable, correct sector
    expect(afoluBuilt.climate_trace_trackable).toBe(true);
    expect(afoluBuilt.baseline).toBe(77.6);
    expect(afoluBuilt.target).toBe(91.8);
  });

  it("every trackable variable references at least one Climate TRACE slug", () => {
    type Variable = { climate_trace: { trackable?: boolean; sector_slugs: string[] } };
    for (const v of Object.values(MEASURABLE_VARIABLES) as Variable[]) {
      if (v.climate_trace?.trackable) {
        expect(v.climate_trace.sector_slugs.length).toBeGreaterThan(0);
      } else {
        expect(v.climate_trace.sector_slugs.length).toBe(0);
      }
    }
  });
});
