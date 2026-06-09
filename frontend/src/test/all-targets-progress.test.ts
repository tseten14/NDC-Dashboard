import { describe, it, expect } from "vitest";
import { NDC_TARGETS } from "../../../config/ndcTargets.js";
import { computeSectorProgress } from "../../../shared/progress.js";
import { ndcTargets } from "@/data/uganda-ndc-data";
import {
  progressFromEconomyWideTimeseries,
  progressFromLiveApiFields,
  progressFromTargetAndLatest,
  isDistrictProgressBlocked,
  buildIndicatorPanelObservedDataSet,
  type IndicatorPanelEntry,
} from "@/lib/emissions-integration";
import { calculateProgress } from "@/data/uganda-ndc-data";

/** Representative Climate TRACE latest values (MtCO₂e) for national dashboard QA. */
const TRACE_LATEST: Record<string, number> = {
  afolu: 27.84,
  energy: 8.5,
  transport: 7.2,
  waste: 2.4,
  ippu: 0.75,
  agriculture: 24.0,
};

describe("MtCO₂e sector targets — BAU-cap formula", () => {
  const capSectors = ["afolu", "energy", "transport", "waste", "ippu"] as const;

  for (const sector of capSectors) {
    it(`${sector}: progress is not clamped to 0% when latest is below the NDC ceiling`, () => {
      const cfg = NDC_TARGETS[sector];
      const latest = TRACE_LATEST[sector];
      const result = computeSectorProgress(latest, cfg, 2024);
      expect(result).not.toBeNull();
      expect(result!.progress_method).toBe("bau_cap");
      expect(result!.progress_pct).toBeGreaterThan(0);
      if (latest <= cfg.target) {
        expect(result!.progress_pct).toBe(100);
      }
    });
  }

  it("agriculture CT slice uses baseline reduction (target < baseline)", () => {
    const result = computeSectorProgress(TRACE_LATEST.agriculture, NDC_TARGETS.agriculture, 2024);
    expect(result?.progress_method).toBe("baseline_reduction");
    expect(result?.progress_pct).toBeGreaterThan(0);
  });
});

describe("NDC dashboard targets (cards + progress column)", () => {
  const emissionCapIds = ["t0", "t1", "t4", "t5", "t6", "t7"] as const;

  for (const id of emissionCapIds) {
    it(`${id}: cap-style emissions target scores >0% when observed is below ceiling`, () => {
      const target = ndcTargets.find((t) => t.id === id)!;
      const latest =
        id === "t0"
          ? 95
          : id === "t1"
            ? TRACE_LATEST.afolu
            : id === "t4"
              ? TRACE_LATEST.energy
              : id === "t5"
                ? TRACE_LATEST.transport
                : id === "t6"
                  ? TRACE_LATEST.waste
                  : TRACE_LATEST.ippu;

      const { percent } = progressFromTargetAndLatest(target, latest, 2024);
      expect(percent).not.toBeNull();
      expect(percent!).toBeGreaterThan(0);
      if (latest <= target.targetValue) {
        expect(percent).toBe(100);
      }
    });
  }

  it("t0 economy-wide: live aggregate series drives progress (not mock fallback)", () => {
    const t0 = ndcTargets.find((t) => t.id === "t0")!;
    const series = [
      { year: 2020, value: 100 },
      { year: 2024, value: 95 },
    ];
    const { percent } = progressFromEconomyWideTimeseries(t0, series);
    expect(percent).toBeGreaterThan(0);
  });

  const indicatorFixtures: Record<
    string,
    { latest: number; expectPercent: number; expectStatus: "on-track" | "at-risk" | "off-track" | "unknown" }
  > = {
    t2: { latest: 14.9, expectPercent: 28, expectStatus: "at-risk" },
    t3: { latest: 1996.2, expectPercent: 25, expectStatus: "at-risk" },
    t8: { latest: 39.7, expectPercent: 21, expectStatus: "off-track" },
    t9: { latest: 9.38, expectPercent: 15, expectStatus: "unknown" },
    t10: { latest: 40, expectPercent: 31, expectStatus: "at-risk" },
  };

  for (const [id, { latest, expectPercent, expectStatus }] of Object.entries(indicatorFixtures)) {
    it(`${id}: indicator-panel progress uses increase-toward-target logic`, () => {
      const target = ndcTargets.find((t) => t.id === id)!;
      const entry: IndicatorPanelEntry = {
        meta: {
          targetId: id,
          baselineYear: target.baselineYear,
          baselineValue: target.baselineValue,
          targetYear: target.targetYear,
          targetValue: target.targetValue,
          unit: target.unit,
          dataProviders: ["test"],
          sourceType: "reported",
          mrvOwnerMinistry: "test",
          qaqcStatus: id === "t9" ? "missing" : "ok",
          isValidated: true,
          lastUpdated: "2024-01-01T00:00:00Z",
        },
        timeseries: [
          { year: target.baselineYear, value: target.baselineValue },
          { year: 2024, value: latest },
        ],
      };
      const obs = buildIndicatorPanelObservedDataSet(target, entry);
      const { percent, status } = calculateProgress(target, obs);
      expect(percent).toBe(expectPercent);
      expect(status).toBe(expectStatus);
    });
  }
});

describe("progressFromLiveApiFields", () => {
  it("ignores stale API progress_pct=0 for AFOLU cap target", () => {
    const afolu = ndcTargets.find((t) => t.id === "t1")!;
    const { percent } = progressFromLiveApiFields(
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
    expect(percent).toBe(100);
  });
});

describe("cap target chart reference lines", () => {
  it("uses flat 2030 ceiling and BAU levels, not a rising path from 2015", async () => {
    const { buildLiveObservedDataSet } = await import("@/lib/emissions-integration");
    const { ndcTargets } = await import("@/data/uganda-ndc-data");
    const afolu = ndcTargets.find((t) => t.id === "t1")!;
    const dataset = buildLiveObservedDataSet(
      afolu,
      [
        { year: 2015, value: 77.6 },
        { year: 2024, value: 27.84 },
      ],
      2015,
      77.6,
      2030,
      91.8,
      {},
      122.2,
    );
    const y2015 = dataset.historicalData.find((p) => p.year === 2015)!;
    const y2024 = dataset.historicalData.find((p) => p.year === 2024)!;
    expect(y2015.target).toBe(91.8);
    expect(y2024.target).toBe(91.8);
    expect(y2015.bauPath).toBe(122.2);
    expect(y2024.bauPath).toBe(122.2);
  });
});

describe("district view", () => {
  it("blocks national progress scoring for CT-backed sector targets", () => {
    const afolu = ndcTargets.find((t) => t.id === "t1")!;
    expect(isDistrictProgressBlocked(afolu, true)).toBe(true);
    expect(isDistrictProgressBlocked(afolu, false)).toBe(false);
  });

  it("still allows national indicators in district view", () => {
    const forest = ndcTargets.find((t) => t.id === "t2")!;
    expect(isDistrictProgressBlocked(forest, true)).toBe(false);
  });
});
