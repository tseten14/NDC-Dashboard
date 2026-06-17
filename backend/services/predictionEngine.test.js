import { describe, it, expect } from "vitest";
import { jsForecastSector } from "./predictionEngine.js";

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
});
