import { describe, it, expect } from "vitest";
import type { MitigationOption } from "@/data/uganda-ndc-data";
import { mitigationOptions } from "@/data/uganda-ndc-data";
import {
  DEFAULT_ASSUMPTIONS,
  parseAbatementMtPerYr,
  parseCostUSD,
  computeProjectEconomics,
  buildMaccCurve,
  investmentToCloseGap,
  maccSortKey,
} from "@/lib/climate-finance";

function option(overrides: Partial<MitigationOption> & Pick<MitigationOption, "id">): MitigationOption {
  return {
    targetId: "t1",
    sectorId: "afolu",
    title: "Test",
    description: "Test measure",
    emissionsReductionPotential: 1,
    emissionsReductionUnit: "MtCO₂e/yr",
    costEstimate: 10,
    costCurrency: "USD",
    costMagnitude: "million",
    confidence: "medium",
    ...overrides,
  };
}

describe("parseAbatementMtPerYr", () => {
  it("treats MtCO₂e/yr as annual megatonnes", () => {
    const r = parseAbatementMtPerYr(option({ id: "a", emissionsReductionPotential: 2.5, emissionsReductionUnit: "MtCO₂e/yr" }));
    expect(r.mtPerYr).toBe(2.5);
    expect(r.isAnnual).toBe(true);
  });

  it("converts ktCO₂e/yr to Mt/yr", () => {
    const r = parseAbatementMtPerYr(option({ id: "b", emissionsReductionPotential: 500, emissionsReductionUnit: "ktCO₂e/yr" }));
    expect(r.mtPerYr).toBeCloseTo(0.5);
    expect(r.isAnnual).toBe(true);
  });

  it("spreads cumulative MtCO₂e totals over the NDC period", () => {
    const r = parseAbatementMtPerYr(option({ id: "c", emissionsReductionPotential: 8, emissionsReductionUnit: "MtCO₂e" }));
    expect(r.mtPerYr).toBe(1);
    expect(r.isAnnual).toBe(false);
  });
});

describe("parseCostUSD", () => {
  it("converts million USD capex", () => {
    const r = parseCostUSD(option({ id: "d", costEstimate: 45, costMagnitude: "million" }));
    expect(r.amountUSD).toBe(45_000_000);
    expect(r.isAnnual).toBe(false);
  });

  it("treats million/yr as annual recurring cost", () => {
    const r = parseCostUSD(option({ id: "e", costEstimate: 15, costMagnitude: "million/yr" }));
    expect(r.amountUSD).toBe(15_000_000);
    expect(r.isAnnual).toBe(true);
  });
});

describe("computeProjectEconomics", () => {
  it("levelises capex and divides by annual tonnes for cost to abate", () => {
    const econ = computeProjectEconomics(
      option({ id: "f", emissionsReductionPotential: 1, costEstimate: 10, costMagnitude: "million" }),
      { carbonPrice: 20, lifetimeYears: 10, discountRate: 0.1 },
    );
    expect(econ.abatementTPerYr).toBe(1_000_000);
    expect(econ.capexUSD).toBe(10_000_000);
    expect(econ.costToAbateUSDPerT).toBeGreaterThan(0);
    expect(econ.annualRevenueUSD).toBe(20_000_000);
  });

  it("uses annual cost directly for recurring programmes", () => {
    const pes = mitigationOptions.find((o) => o.id === "m1")!;
    const econ = computeProjectEconomics(pes, DEFAULT_ASSUMPTIONS);
    expect(econ.costType).toBe("annual");
    expect(econ.costToAbateUSDPerT).toBeCloseTo(6, 0);
    expect(econ.abatementSource).toContain("NDC");
  });

  it("applies wider confidence bands for low-confidence data", () => {
    const econ = computeProjectEconomics(
      option({ id: "g", confidence: "low", costEstimate: 10 }),
      DEFAULT_ASSUMPTIONS,
    );
    expect(econ.costToAbateHighUSDPerT).toBeCloseTo((econ.costToAbateUSDPerT ?? 0) * 1.35, 0);
  });
});

describe("maccSortKey", () => {
  it("uses upper band for non-high confidence when ranking", () => {
    const econ = computeProjectEconomics(option({ id: "h", confidence: "medium" }), DEFAULT_ASSUMPTIONS);
    expect(maccSortKey(econ)).toBe(econ.costToAbateHighUSDPerT);
  });

  it("uses point estimate for high confidence", () => {
    const econ = computeProjectEconomics(option({ id: "i", confidence: "high" }), DEFAULT_ASSUMPTIONS);
    expect(maccSortKey(econ)).toBe(econ.costToAbateUSDPerT);
  });
});

describe("buildMaccCurve", () => {
  it("orders cheaper projects first and accumulates abatement", () => {
    const curve = buildMaccCurve(mitigationOptions, DEFAULT_ASSUMPTIONS);
    expect(curve.length).toBeGreaterThan(1);
    for (let i = 1; i < curve.length; i++) {
      expect(maccSortKey(curve[i])).toBeGreaterThanOrEqual(maccSortKey(curve[i - 1]));
      expect(curve[i].cumulativeAbatementMt).toBeGreaterThan(curve[i - 1].cumulativeAbatementMt);
    }
  });

  it("excludes options with zero abatement", () => {
    const curve = buildMaccCurve(
      [option({ id: "z", emissionsReductionPotential: 0 })],
      DEFAULT_ASSUMPTIONS,
    );
    expect(curve).toHaveLength(0);
  });
});

describe("investmentToCloseGap", () => {
  it("prorates the last project when the gap is partially met", () => {
    const opts = [
      option({ id: "p1", emissionsReductionPotential: 2, costEstimate: 5 }),
      option({ id: "p2", emissionsReductionPotential: 3, costEstimate: 20 }),
    ];
    const closure = investmentToCloseGap(2.5, opts, DEFAULT_ASSUMPTIONS);
    expect(closure.abatementSecuredMt).toBeCloseTo(2.5);
    expect(closure.optionsUsed).toHaveLength(2);
    expect(closure.optionsUsed[0].deploymentFraction).toBe(1);
    expect(closure.optionsUsed[1].deploymentFraction).toBeCloseTo(0.5 / 3);
  });

  it("does not exceed the gap when stacking projects", () => {
    const closure = investmentToCloseGap(1, mitigationOptions.slice(0, 3), DEFAULT_ASSUMPTIONS);
    expect(closure.abatementSecuredMt).toBeCloseTo(1, 5);
    expect(closure.shortfallMt).toBe(0);
  });
});
