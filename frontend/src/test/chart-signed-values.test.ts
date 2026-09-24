import { describe, expect, it } from "vitest";
import {
  chartValueExtent,
  latestReportedPoint,
  signedAxisTicks,
} from "@/components/dashboard/ChartObservedProjected";

// Uganda AFOLU national, Climate TRACE co2e_100yr (MtCO₂e): a net sink in most years.
const AFOLU = [
  { year: 2015, value: 76.15 },
  { year: 2016, value: -7.13 },
  { year: 2017, value: 29.43 },
  { year: 2018, value: -53.45 },
  { year: 2019, value: 17.43 },
  { year: 2020, value: -164.98 },
  { year: 2021, value: -17.29 },
  { year: 2022, value: 4.91 },
  { year: 2023, value: -6.32 },
  { year: 2024, value: -55.18 },
  { year: 2025, value: -23.96 },
];

const rows = (series: { year: number; value: number | null }[]) =>
  series.map((p) => ({ year: p.year, observedValue: p.value, projectedValue: null, target: null }));

describe("latestReportedPoint", () => {
  it("reports the newest year even when it is a net sink", () => {
    expect(latestReportedPoint(AFOLU)).toEqual({ year: 2025, value: -23.96 });
  });

  it("skips zero-filled trailing years", () => {
    expect(latestReportedPoint([{ year: 2023, value: 0.4 }, { year: 2024, value: 0 }, { year: 2025, value: null }])).toEqual({
      year: 2023,
      value: 0.4,
    });
  });

  it("falls back to zero when nothing else was reported", () => {
    expect(latestReportedPoint([{ year: 2024, value: 0 }, { year: 2025, value: null }])).toEqual({ year: 2024, value: 0 });
  });
});

describe("chart axis for mixed-sign series", () => {
  it("keeps negative values inside the domain", () => {
    const [yMin, yMax] = chartValueExtent(rows(AFOLU));
    expect(yMin).toBeLessThan(-164.98);
    expect(yMax).toBeGreaterThan(76.15);
  });

  it("produces evenly spaced ticks through zero", () => {
    const [yMin, yMax] = chartValueExtent(rows(AFOLU));
    const ticks = signedAxisTicks(yMin, yMax)!;
    expect(ticks).toContain(0);
    expect(ticks[0]).toBeLessThanOrEqual(yMin);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(yMax);
    const steps = ticks.slice(1).map((t, i) => t - ticks[i]);
    expect(new Set(steps).size).toBe(1);
  });

  it("leaves all-positive series unchanged", () => {
    const energy = [{ year: 2024, value: 5.51 }, { year: 2025, value: 5.68 }];
    const [yMin] = chartValueExtent(rows(energy));
    expect(yMin).toBeGreaterThanOrEqual(0);
    expect(signedAxisTicks(...chartValueExtent(rows(energy)))).toBeUndefined();
  });
});
