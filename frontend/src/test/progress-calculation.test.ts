import { describe, it, expect } from "vitest";
import {
  calculateProgressPercent,
  computeSectorProgress,
  capTargetPosition,
} from "../../../shared/progress.js";
import { NDC_TARGETS } from "../../../config/ndcTargets.js";

describe("calculateProgressPercent — emissions cap targets (target > baseline)", () => {
  it("AFOLU: falling TRACE emissions below the 2030 cap scores as on-track progress", () => {
    const pct = calculateProgressPercent(
      {
        baselineValue: 77.6,
        targetValue: 91.8,
        metricType: "emissions-reduction",
        bau2030: 122.2,
      },
      { latestValue: 27.84 },
    );
    expect(pct).toBe(100);
  });

  it("without BAU metadata, still scores 100% when latest is below the 2030 cap", () => {
    const withoutBau = calculateProgressPercent(
      {
        baselineValue: 77.6,
        targetValue: 91.8,
        metricType: "emissions-reduction",
      },
      { latestValue: 27.84 },
    );
    expect(withoutBau).toBe(100);
  });

  it("true reduction target still uses baseline → target path", () => {
    const pct = calculateProgressPercent(
      {
        baselineValue: 100,
        targetValue: 80,
        metricType: "emissions-reduction",
      },
      { latestValue: 90 },
    );
    expect(pct).toBe(50);
  });
});

describe("progressFromLiveApiFields (stale API progress_pct)", () => {
  it("recalculates 100% for AFOLU when API still returns 0", async () => {
    const { progressFromLiveApiFields } = await import("@/lib/emissions-integration");
    const { ndcTargets } = await import("@/data/uganda-ndc-data");
    const afolu = ndcTargets.find((t) => t.id === "t1")!;
    const result = progressFromLiveApiFields(
      {
        sector: "afolu",
        unit: "MtCO2e",
        label: "AFOLU",
        condition: "Mixed",
        baseline_year: 2015,
        baseline_value: 77.6,
        target_year: 2030,
        target_value: 91.8,
        latest_year: 2024,
        latest_value: 27.84,
        progress_pct: 0,
        status: "off_track",
        data_source: "Climate TRACE",
        bau_2030: 122.2,
      },
      afolu,
    );
    expect(result.percent).toBe(100);
    expect(result.status).toBe("on-track");
  });
});

describe("computeSectorProgress", () => {
  it("marks AFOLU cap progress using BAU metadata from config", () => {
    const result = computeSectorProgress(27.84, NDC_TARGETS.afolu, 2024);
    expect(result?.progress_pct).toBe(100);
    expect(result?.progress_method).toBe("bau_cap");
  });
});
