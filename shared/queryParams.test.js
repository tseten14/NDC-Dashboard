import { describe, it, expect } from "vitest";
import {
  parseInventoryYear,
  parseOptionalInventoryYear,
  parseInventoryRange,
  parsePositiveInt,
} from "./queryParams.js";

describe("parseInventoryYear", () => {
  it("accepts valid years in range", () => {
    expect(parseInventoryYear("2020")).toEqual({ value: 2020 });
  });

  it("rejects NaN and out-of-range values", () => {
    expect(parseInventoryYear("foo").error).toMatch(/integer/);
    expect(parseInventoryYear("2010", { minYear: 2015 }).error).toMatch(/between/);
    expect(parseInventoryYear("2099", { maxYear: 2025 }).error).toMatch(/between/);
  });
});

describe("parseOptionalInventoryYear", () => {
  it("returns default when absent", () => {
    expect(parseOptionalInventoryYear(undefined, 2024)).toEqual({ value: 2024 });
  });
});

describe("parseInventoryRange", () => {
  it("parses since and to with defaults", () => {
    const r = parseInventoryRange({}, { defaultSince: 2015, defaultTo: 2025, maxYear: 2025 });
    expect(r).toEqual({ since: 2015, to: 2025 });
  });

  it("rejects inverted ranges", () => {
    expect(parseInventoryRange({ since: "2024", to: "2020" }).error).toMatch(/since/);
  });

  it("rejects invalid since", () => {
    expect(parseInventoryRange({ since: "abc" }).error).toMatch(/integer/);
  });
});

describe("parsePositiveInt", () => {
  it("returns default for empty input", () => {
    expect(parsePositiveInt(undefined, 25)).toBe(25);
  });

  it("caps at max", () => {
    expect(parsePositiveInt("500", 25, { max: 200 })).toBe(200);
  });

  it("returns null for invalid values", () => {
    expect(parsePositiveInt("x", 25)).toBeNull();
    expect(parsePositiveInt("-1", 25)).toBeNull();
  });
});
