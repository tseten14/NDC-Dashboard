import { describe, it, expect } from "vitest";
import {
  calculateProgressPercent,
  computeSectorProgress,
  capTargetPosition,
} from "../../../shared/progress.js";
import { NDC_TARGETS } from "../../../config/ndcTargets.js";

describe("progress requires supported values and movement toward the target", () => {
  it.each([null, undefined, Infinity, NaN])("does not calculate progress from an invalid observation: %s", (latestValue) => {
    expect(calculateProgressPercent({ baselineValue: 10, targetValue: 20, metricType: "capacity" }, { latestValue })).toBeNull();
  });
  it("does not turn missing targets into a zero-valued target", () => {
    expect(calculateProgressPercent({ baselineValue: null, targetValue: null, metricType: "emissions-reduction" }, { latestValue: 10 })).toBeNull();
  });
  it("does not count worsening coverage as progress", () => {
    expect(calculateProgressPercent({ baselineValue: 40, targetValue: 80, metricType: "coverage" }, { latestValue: 20 })).toBe(0);
    expect(calculateProgressPercent({ baselineValue: 40, targetValue: 80, metricType: "coverage" }, { latestValue: 60 })).toBe(50);
  });
  it("respects a decreasing non-emissions target", () => {
    expect(calculateProgressPercent({ baselineValue: 40, targetValue: 20, metricType: "intensity" }, { latestValue: 50 })).toBe(0);
    expect(calculateProgressPercent({ baselineValue: 40, targetValue: 20, metricType: "intensity" }, { latestValue: 30 })).toBe(50);
  });
});

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
  it("does not score forestry-only data against the full AFOLU pledge", async () => {
    const { progressFromLiveApiFields } = await import("@/lib/emissions-integration");
    const { ndcTargets } = await import("@/data/uganda-ndc-data");
    const afolu = ndcTargets.find((t) => t.id === "t1")!;
    const result = progressFromLiveApiFields(
      {
        sector: "afolu",
        progress_comparable: false,
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
    expect(result.percent).toBeNull();
    expect(result.status).toBe("unknown");
  });
});

describe("computeSectorProgress", () => {
  it("leaves AFOLU progress unknown because the observed scope differs", () => {
    const result = computeSectorProgress(27.84, NDC_TARGETS.afolu, 2024);
    expect(result).toBeNull();
  });
});
