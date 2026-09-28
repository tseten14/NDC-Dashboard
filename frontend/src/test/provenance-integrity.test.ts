import { describe, expect, it } from "vitest";
import { buildDashboardFactLedger } from "@/lib/dashboard-ai-facts";
import { SECTOR_LINEAGE } from "@/lib/data-lineage";
import type { EmissionsDataContextValue } from "@/context/EmissionsDataContext";

describe("dashboard citations", () => {
  it("cites the selected district and all component categories for combined sectors", () => {
    const emissions = {
      dashboard: { gadm_id: "UGA.16_1", to: 2025, inventory_year: 2025, global_rank: null },
      progressBySector: {
        energy: { latest_year: 2025, latest_value: 0.244 },
        ippu: { latest_year: 2025, latest_value: 0.562 },
      },
      timeseriesBySector: {},
      reconciliation: { country_total_mt: 1.74, reference_year: 2025 },
    } as unknown as EmissionsDataContextValue;
    const facts = buildDashboardFactLedger(emissions, null);
    for (const sector of ["energy", "ippu"]) {
      const fact = facts.find(f => f.id === `fact_trace_${sector}_latest_2025`)!;
      const url = new URL(fact.source_url);
      expect(url.searchParams.get("gadmId")).toBe("UGA.16_1");
      expect(url.searchParams.has("sectors")).toBe(false);
      expect(fact.claim).toContain("UGA.16_1");
    }
    const total = facts.find(f => f.id === "fact_trace_country_total_2025")!;
    expect(new URL(total.source_url).searchParams.get("gadmId")).toBe("UGA.16_1");
    expect(total.claim).not.toContain("Uganda");
    expect(facts.some(f => f.id.startsWith("fact_trace_ranking"))).toBe(false);
  });

  it("does not invent confidence intervals or validation pipelines for provider data", () => {
    for (const lineage of Object.values(SECTOR_LINEAGE)) {
      expect(lineage.uncertaintyNote).toContain("does not provide a confidence interval");
      expect(lineage.dataVersion).toContain("does not identify its dataset release");
      expect(JSON.stringify(lineage)).not.toMatch(/EDGAR|ct_raw|ct_harmonised|±/);
    }
  });
});
