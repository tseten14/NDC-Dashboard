import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { policyCaseSchema } from "../shared/schemas/policyImpact.schema.js";
import { scoreCaseMatch, runPolicyImpactForecast } from "./policyImpactEngine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadCase(id) {
  const raw = readFileSync(join(__dirname, `../data/policy-cases/${id}.json`), "utf8");
  return policyCaseSchema.parse(JSON.parse(raw));
}

describe("policyImpactEngine", () => {
  const brazil = loadCase("kci-brazil-ag-credit");
  const africa = loadCase("kci-africa-energy-jobs");

  it("scores high match for same sector and intervention type", () => {
    const score = scoreCaseMatch(brazil, {
      intervention: { type: "agricultural_credit" },
      parameters: { scale: 1, sector: "AFOLU" },
      context: { country: "UGA" },
    });
    expect(score.match_score).toBeGreaterThan(0.7);
  });

  it("scores lower for mismatched sector and intervention", () => {
    const score = scoreCaseMatch(africa, {
      intervention: { type: "agricultural_credit" },
      parameters: { scale: 1, sector: "IPPU" },
    });
    expect(score.match_score).toBeLessThan(0.5);
  });

  it("returns impacts with provenance for agricultural credit forecast", () => {
    const result = runPolicyImpactForecast([brazil, africa], {
      objective: "Increase smallholder productivity",
      intervention: { type: "agricultural_credit", label: "Agricultural credit" },
      parameters: { scale: 1, timeline_years: 10, sector: "AFOLU" },
      context: { country: "UGA" },
    });
    expect(result.impacts.length).toBeGreaterThan(0);
    expect(result.matched_cases[0].id).toBe("kci-brazil-ag-credit");
    expect(result.impacts[0].provenance).toContain("Brazil");
    expect(result.trade_offs.length).toBeGreaterThan(0);
    expect(result.overall_confidence).toBeGreaterThan(0.3);
  });

  it("returns low-confidence fallback when no match", () => {
    const result = runPolicyImpactForecast([brazil], {
      objective: "Unknown policy",
      intervention: { type: "completely_unknown_xyz" },
      parameters: { scale: 1, timeline_years: 5, sector: "IPPU" },
    });
    expect(result.overall_confidence).toBeLessThanOrEqual(0.3);
    expect(result.disclaimers.some((d) => d.includes("No strong"))).toBe(true);
  });
});
