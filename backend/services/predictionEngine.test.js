import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { clearPredictionCache, getSectorPredictions, jsForecastSector } from "./predictionEngine.js";
import { NDC_TARGETS } from "../../config/ndcTargets.js";

vi.mock("./emissionsData.js", () => ({ getEmissionsDashboard: vi.fn() }));
import { getEmissionsDashboard } from "./emissionsData.js";

beforeEach(() => { clearPredictionCache(); vi.stubEnv("VERCEL", "1"); });
afterEach(() => vi.unstubAllEnvs());

describe("jsForecastSector", () => {
  it("returns insufficient_data when OLS cannot fit (duplicate years)", () => {
    const result = jsForecastSector(
      [
        { year: 2022, value: 5 },
        { year: 2022, value: 6 },
        { year: 2022, value: 7 },
      ],
      { label: "Energy", unit: "MtCO2e", baseline: 4, target: 3 },
      2030,
    );

    expect(result.status).toBe("insufficient_data");
    expect(result.predicted_value).toBeNull();
    expect(result.note).toMatch(/forecast model/i);
  });

  it("preserves negative land removals and missing observed years", () => {
    const points = [{ year: 2021, value: -1 }, { year: 2022, value: null }, { year: 2023, value: -3 }, { year: 2024, value: -4 }];
    const result = jsForecastSector(points, { allow_negative: true, target: null }, 2030);
    expect(result.history).toEqual(points);
    expect(result.predicted_value).toBe(-10);
    expect(result.status).toBe("unknown");
    expect(result.gap).toBeNull();
  });

  it.each(["UGA", "UGA.16_1"])("scores only compatible national targets for %s", async (gadmId) => {
    const points = [{ year: 2021, value: 0.000042 }, { year: 2022, value: null }, { year: 2023, value: 0.00004 }, { year: 2024, value: 0.000038 }];
    getEmissionsDashboard.mockResolvedValue({ inventory_year: 2025, timeseries: Object.fromEntries(Object.keys(NDC_TARGETS).map((key) => [key, points])) });
    const result = await getSectorPredictions({ gadmId });
    expect(result.summary.total_gap).toBeNull();
    expect(result.summary.total_target).toBeNull();
    expect(result.methodology).toMatch(/regression/);
    expect(result.methodology).not.toMatch(/GRU/);
    for (const [sector, prediction] of Object.entries(result.predictions)) {
      expect(prediction.history).toEqual(points);
      if (gadmId !== "UGA" || NDC_TARGETS[sector].progress_comparable === false) {
        expect(prediction.comparison_available).toBe(false);
        expect(prediction.target_value).toBeNull();
        expect(prediction.status).toBe("unknown");
        expect(prediction.gap).toBeNull();
      }
    }
  });
});
