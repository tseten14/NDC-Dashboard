/**
 * Data-accuracy guardrails: validates Climate TRACE timeseries values before
 * they reach the chart layer. Catches suspicious values and distinguishes
 * "real zero" from "missing data" (null).
 *
 * Rules are intentionally lenient for production (console.warn) but throw in
 * tests so regressions surface immediately.
 */

export type ValidationSeverity = "warn" | "error";

export interface ValidationIssue {
  severity: ValidationSeverity;
  rule: string;
  field: string;
  value: unknown;
  message: string;
}

/** Earliest year for national data; 2021 for subnational. */
const NATIONAL_MIN_YEAR = 2015;
const DISTRICT_MIN_YEAR = 2021;
const MAX_YEAR = new Date().getFullYear() + 1;

/** Plausible per-sector upper bound for Uganda (MtCO2e). */
const SECTOR_MAX_MT: Record<string, number> = {
  afolu: 200,
  energy: 50,
  transport: 30,
  ippu: 10,
  agriculture: 60,
  waste: 15,
  economy_wide: 300,
};

/**
 * Sectors reported as a *net flux* (emissions minus removals) rather than a
 * gross source. Land-sector accounting follows IPCC convention, so a negative
 * value is a legitimate net sink — Climate TRACE reports Uganda's
 * forestry-and-land-use slug below zero in several years. Flagging those as
 * "impossible" produced false errors on live data, so negatives are only an
 * error for gross-source sectors (energy, transport, ippu, waste, agriculture).
 *
 * Magnitude is still bounded in both directions via SECTOR_MAX_MT, so a genuine
 * unit or sign error at implausible scale is still caught.
 */
const NET_FLUX_SECTORS = new Set(["afolu", "forestry_and_land_use", "economy_wide"]);

export function validateEmissionsPoint(
  value: number | null,
  year: number,
  sector: string,
  geography: "national" | "district" = "national",
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const minYear = geography === "district" ? DISTRICT_MIN_YEAR : NATIONAL_MIN_YEAR;

  // --- Missing data must be null, never 0 masquerading as absence ---
  // (real zero is valid, e.g. IPPU fluorinated-gases for some years, but
  //  we warn so callers can annotate the chart rather than rendering a bare 0)
  if (value === 0) {
    issues.push({
      severity: "warn",
      rule: "zero-ambiguity",
      field: "value",
      value,
      message: `${sector} ${year}: value is exactly 0 — confirm this is a real zero and not missing data.`,
    });
  }

  if (value !== null && value < 0 && !NET_FLUX_SECTORS.has(sector)) {
    issues.push({
      severity: "error",
      rule: "negative-emissions",
      field: "value",
      value,
      message: `${sector} ${year}: negative emissions (${value} MtCO2e) — impossible value; likely unit or sign error.`,
    });
  }

  if (year < minYear) {
    issues.push({
      severity: "error",
      rule: "out-of-range-year",
      field: "year",
      value: year,
      message: `${sector} ${year}: year ${year} is before the ${geography} inventory minimum (${minYear}).`,
    });
  }

  if (year > MAX_YEAR) {
    issues.push({
      severity: "warn",
      rule: "future-year",
      field: "year",
      value: year,
      message: `${sector} ${year}: year ${year} is in the future — may be a projection, not observation.`,
    });
  }

  // Bound magnitude in both directions: a net-flux sector can be negative, but a
  // sink far beyond the sector ceiling is still a unit error worth surfacing.
  const ceiling = SECTOR_MAX_MT[sector] ?? 300;
  if (value !== null && Math.abs(value) > ceiling) {
    issues.push({
      severity: "warn",
      rule: "implausible-magnitude",
      field: "value",
      value,
      message: `${sector} ${year}: ${value} MtCO2e exceeds the plausible magnitude for this sector (±${ceiling} MtCO2e) — check units.`,
    });
  }

  return issues;
}

export function validateSectorTimeseries(
  timeseries: { year: number; value: number | null }[],
  sector: string,
  geography: "national" | "district" = "national",
): ValidationIssue[] {
  if (!timeseries || timeseries.length === 0) return [];
  return timeseries.flatMap((pt) =>
    validateEmissionsPoint(pt.value, pt.year, sector, geography),
  );
}

/** Validate a full sector-keyed timeseries map from the dashboard response. */
export function validateDashboardTimeseries(
  timeseriesBySector: Record<string, { year: number; value: number | null }[]>,
  geography: "national" | "district" = "national",
): ValidationIssue[] {
  return Object.entries(timeseriesBySector).flatMap(([sector, ts]) =>
    validateSectorTimeseries(ts, sector, geography),
  );
}

/**
 * Surface issues via console.warn in development; throw in test environments
 * so the test suite catches bad data automatically.
 */
export function reportIssues(issues: ValidationIssue[]): void {
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warn");

  for (const w of warnings) {
    console.warn(`[data-validation] ${w.rule}: ${w.message}`);
  }

  if (errors.length > 0) {
    const msg = errors.map((e) => `${e.rule}: ${e.message}`).join("; ");
    if (import.meta.env.MODE === "test") {
      throw new Error(`[data-validation] Data errors detected: ${msg}`);
    }
    for (const e of errors) {
      console.error(`[data-validation] ${e.rule}: ${e.message}`);
    }
  }
}
