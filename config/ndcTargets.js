/**
 * Uganda NDC sector targets and Climate TRACE slug mapping.
 * AFOLU uses forestry + land-use only; agriculture slug maps to agriculture sector (separate from AFOLU).
 */

/**
 * Uganda's sector targets. `variable_id` links each target to a country-agnostic
 * measurable variable in config/measurableVariables.js (see multi-country design
 * notes in PROJECT_DOCUMENTATION.txt). The extra field is additive/backward-compatible.
 */
export const NDC_TARGETS = {
  afolu: {
    label: "AFOLU",
    variable_id: "forestry_landuse_emissions",
    baseline_year: 2015,
    baseline: 42.5,
    target_year: 2030,
    target: 33.15,
    unit: "MtCO2e",
    condition: "Mixed",
    category: "Emissions Reduction",
  },
  energy: {
    label: "ENERGY",
    variable_id: "energy_emissions",
    baseline_year: 2015,
    baseline: 6.2,
    target_year: 2030,
    target: 3.1,
    unit: "MtCO2e",
    condition: "Unconditional",
    category: "Renewable Energy",
  },
  ippu: {
    label: "IPPU",
    variable_id: "ippu_emissions",
    baseline_year: 2015,
    baseline: 1.8,
    target_year: 2030,
    target: 1.2,
    unit: "MtCO2e",
    condition: "Conditional",
    category: "Emissions Reduction",
  },
  agriculture: {
    label: "AGRICULTURE",
    variable_id: "agriculture_emissions",
    baseline_year: 2015,
    baseline: 28.4,
    target_year: 2030,
    target: 22.7,
    unit: "MtCO2e",
    condition: "Conditional",
    category: "Emissions Reduction",
  },
  waste: {
    label: "WASTE",
    variable_id: "waste_emissions",
    baseline_year: 2015,
    baseline: 3.8,
    target_year: 2030,
    target: 2.28,
    unit: "MtCO2e",
    condition: "Unconditional",
    category: "Emissions Reduction",
  },
};

/** Climate TRACE API slug → dashboard sector key (avoids double-counting agriculture into AFOLU). */
export const SLUG_TO_UI_SECTOR = {
  "forestry-and-land-use": "afolu",
  agriculture: "agriculture",
  power: "energy",
  transportation: "energy",
  buildings: "energy",
  "fossil-fuel-operations": "energy",
  manufacturing: "ippu",
  "fluorinated-gases": "ippu",
  waste: "waste",
};

/** Legacy-style map for seed script filters (sector → slugs). */
export const SECTOR_MAP = {
  afolu: ["forestry-and-land-use"],
  energy: ["power", "transportation", "buildings", "fossil-fuel-operations"],
  ippu: ["manufacturing", "fluorinated-gases"],
  agriculture: ["agriculture"],
  waste: ["waste"],
};

/** Slugs mapped to dashboard sectors (excludes mineral-extraction — reported separately). */
export const ALL_SECTOR_SLUGS = [
  "forestry-and-land-use",
  "agriculture",
  "power",
  "transportation",
  "buildings",
  "fossil-fuel-operations",
  "manufacturing",
  "fluorinated-gases",
  "waste",
];

/** Climate TRACE slug not in any NDC UI bucket; included in country reconciliation only. */
export const UNMAPPED_SECTOR_SLUGS = ["mineral-extraction"];

/** All slugs used for country total reconciliation (mapped + unmapped). */
export const ALL_TRACE_SLUGS = [...ALL_SECTOR_SLUGS, ...UNMAPPED_SECTOR_SLUGS];

/** Per-dashboard-sector scope notes for UI / API provenance. */
export const SECTOR_SCOPE_NOTES = {
  afolu:
    "Climate TRACE forestry-and-land-use only (not agriculture slug; separate Agriculture NDC target).",
  energy: "Sums power + transportation + buildings + fossil-fuel-operations (broader than narrow inventory energy line).",
  ippu: "Climate TRACE manufacturing + fluorinated-gases slugs (IPPU per IPCC). F-gases are currently 0 for Uganda in TRACE.",
  agriculture: "Climate TRACE agriculture slug only.",
  waste: "Climate TRACE waste slug.",
};

/** Years requested from Climate TRACE v7 (aligned with defaultInventoryRange). */
export const YEARS = [
  2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025,
];
