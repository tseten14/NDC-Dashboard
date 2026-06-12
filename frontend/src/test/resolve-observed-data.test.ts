import { describe, it, expect } from "vitest";
import { buildProjectionPoints, resolveObservedDataSetForTarget } from "@/lib/emissions-integration";
import { ndcTargets } from "@/data/uganda-ndc-data";

describe("resolveObservedDataSetForTarget", () => {
  it("uses live Climate TRACE provenance for transport, not mock missing QA/QC", () => {
    const transport = ndcTargets.find((t) => t.id === "t5")!;
    const dataset = resolveObservedDataSetForTarget(transport, {
      timeseriesBySector: {
        transport: {
          timeseries: [
            { year: 2023, value: 8.8 },
            { year: 2024, value: 9.37 },
          ],
        },
      },
      progressBySector: {
        transport: {
          sector: "transport",
          unit: "MtCO2e",
          label: "TRANSPORT",
          condition: "Conditional",
          baseline_year: 2015,
          baseline_value: 4.2,
          target_year: 2030,
          target_value: 6.8,
          latest_year: 2024,
          latest_value: 9.37,
          progress_pct: 8,
          status: "off_track",
          data_source: "Climate TRACE",
          bau_2030: 9.6,
          missing_slugs: [],
        },
      },
      economyWideTimeseries: [],
      isApiReachable: true,
      getObservedMode: () => "live",
    });
    expect(dataset?.provenance.qaqcStatus).toBe("ok");
    expect(dataset?.dataProviders).toContain("Climate Trace API");
  });
});

describe("buildProjectionPoints", () => {
  it("projects toward BAU 2030 without collapsing to zero on a declining series", () => {
    const timeseries = [
      { year: 2023, value: 28 },
      { year: 2024, value: 24 },
      { year: 2025, value: 18 },
    ];
    const points = buildProjectionPoints(timeseries, 2030, 122.2);

    expect(points).toHaveLength(5);
    expect(points[0]?.year).toBe(2026);
    expect(points[0]?.value).toBeGreaterThan(18);
    expect(points[points.length - 1]?.value).toBeCloseTo(122.2, 1);
    expect(points.every((p) => p.value > 0)).toBe(true);
  });
});
