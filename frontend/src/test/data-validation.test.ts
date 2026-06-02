import { describe, it, expect } from "vitest";
import {
  validateEmissionsPoint,
  validateSectorTimeseries,
  validateDashboardTimeseries,
  type ValidationIssue,
} from "../lib/data-validation";

// ── helpers ──────────────────────────────────────────────────────────────────

function rules(issues: ValidationIssue[]): string[] {
  return issues.map((i) => i.rule);
}

// ── validateEmissionsPoint ────────────────────────────────────────────────────

describe("validateEmissionsPoint", () => {
  it("accepts a normal positive value for a valid year", () => {
    expect(validateEmissionsPoint(5.34, 2022, "energy")).toEqual([]);
  });

  it("accepts null (missing data) without any issues", () => {
    expect(validateEmissionsPoint(null, 2022, "energy")).toEqual([]);
  });

  it("flags negative emissions as an error", () => {
    const issues = validateEmissionsPoint(-1.2, 2022, "energy");
    expect(rules(issues)).toContain("negative-emissions");
    expect(issues.find((i) => i.rule === "negative-emissions")?.severity).toBe("error");
  });

  it("warns on exactly-zero value (ambiguous: real-zero vs missing)", () => {
    const issues = validateEmissionsPoint(0, 2022, "energy");
    expect(rules(issues)).toContain("zero-ambiguity");
    expect(issues.find((i) => i.rule === "zero-ambiguity")?.severity).toBe("warn");
  });

  it("errors on year before national minimum (2015)", () => {
    const issues = validateEmissionsPoint(5, 2014, "energy", "national");
    expect(rules(issues)).toContain("out-of-range-year");
  });

  it("errors on district year before 2021", () => {
    const issues = validateEmissionsPoint(1.2, 2019, "energy", "district");
    expect(rules(issues)).toContain("out-of-range-year");
  });

  it("accepts district year of 2021 (earliest allowed)", () => {
    expect(validateEmissionsPoint(1.2, 2021, "energy", "district")).toEqual([]);
  });

  it("warns when value exceeds implausible magnitude ceiling for that sector", () => {
    // afolu ceiling is 200 MtCO2e
    const issues = validateEmissionsPoint(250, 2022, "afolu");
    expect(rules(issues)).toContain("implausible-magnitude");
  });

  it("accepts value just below the sector ceiling", () => {
    const issues = validateEmissionsPoint(199, 2022, "afolu");
    expect(rules(issues)).not.toContain("implausible-magnitude");
  });

  it("warns on a future year", () => {
    const futureYear = new Date().getFullYear() + 2;
    const issues = validateEmissionsPoint(5, futureYear, "energy");
    expect(rules(issues)).toContain("future-year");
  });
});

// ── validateSectorTimeseries ──────────────────────────────────────────────────

describe("validateSectorTimeseries", () => {
  it("returns no issues for a clean timeseries", () => {
    const ts = [
      { year: 2021, value: 5.33 },
      { year: 2022, value: 5.34 },
      { year: 2023, value: null },
      { year: 2024, value: 5.54 },
    ];
    expect(validateSectorTimeseries(ts, "energy")).toEqual([]);
  });

  it("collects issues from multiple bad points in one pass", () => {
    const ts = [
      { year: 2022, value: -3 },   // negative
      { year: 2022, value: 0 },    // zero-ambiguity
      { year: 2014, value: 5 },    // out-of-range year
    ];
    const issues = validateSectorTimeseries(ts, "energy");
    const r = rules(issues);
    expect(r).toContain("negative-emissions");
    expect(r).toContain("zero-ambiguity");
    expect(r).toContain("out-of-range-year");
  });

  it("returns empty array for an empty timeseries", () => {
    expect(validateSectorTimeseries([], "waste")).toEqual([]);
  });
});

// ── validateDashboardTimeseries ───────────────────────────────────────────────

describe("validateDashboardTimeseries", () => {
  it("validates every sector in a dashboard payload", () => {
    const payload = {
      energy: [{ year: 2022, value: 5.34 }],
      waste:  [{ year: 2022, value: -1 }],   // bad value
    };
    const issues = validateDashboardTimeseries(payload);
    expect(issues.some((i) => i.rule === "negative-emissions")).toBe(true);
  });

  it("passes a clean full-sector payload without issues", () => {
    const clean = {
      afolu:       [{ year: 2022, value: 27.5 }],
      energy:      [{ year: 2022, value: 5.34 }],
      transport:   [{ year: 2022, value: 8.29 }],
      ippu:        [{ year: 2022, value: 0.7 }],
      agriculture: [{ year: 2022, value: 29.1 }],
      waste:       [{ year: 2022, value: 2.5 }],
    };
    expect(validateDashboardTimeseries(clean)).toEqual([]);
  });
});
